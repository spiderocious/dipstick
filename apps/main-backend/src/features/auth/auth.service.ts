import { SYSTEM_ROLE_PERMISSIONS } from '@dipstick/core';

import { withTransaction } from '@db/transaction.js';
import { hashPassword, verifyPassword } from '@lib/auth/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@lib/auth/jwt.js';
import { newId } from '@lib/ids.js';
import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type {
  MembershipDoc,
  OrgDoc,
  OtpDoc,
  RoleDoc,
  SessionDoc,
  UserDoc,
} from '@shared/types/documents.js';

import { auditService, type AuditService } from '../audit/audit.service.js';
import {
  membershipRepo,
  orgRepo,
  otpRepo,
  roleRepo,
  sessionRepo,
  userRepo,
  type MembershipRepo,
  type OrgRepo,
  type OtpRepo,
  type RoleRepo,
  type SessionRepo,
  type UserRepo,
} from './auth.repo.mongo.js';
import { env } from '../../env.js';

export interface RegisterInput {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

const now = (): string => new Date().toISOString();

// A dev-only OTP: deterministic so QA can verify without an SMS gateway (Module 1 has no
// SMS in v1). Returned in the register/resend response when not in production.
const generateOtpCode = (): string => '000000';

export class AuthService {
  private constructor(
    private readonly users: UserRepo = userRepo,
    private readonly orgs: OrgRepo = orgRepo,
    private readonly roles: RoleRepo = roleRepo,
    private readonly memberships: MembershipRepo = membershipRepo,
    private readonly otps: OtpRepo = otpRepo,
    private readonly sessions: SessionRepo = sessionRepo,
    private readonly audit: AuditService = auditService,
  ) {}
  private static instance: AuthService;
  static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  // Owner sign-up: creates user + org + three seeded roles + an org-wide ('*') membership
  // with the Owner role, atomically. Phone OTP must be verified before tokens are issued.
  async register(
    input: RegisterInput,
  ): Promise<ServiceResult<{ user: UserDoc; org: OrgDoc; devOtp: string | null }>> {
    const email = input.email.toLowerCase();
    if (await this.users.findByEmail(email)) {
      return fail(ERROR_CODE.CONFLICT, 'email_taken', { field: 'email' });
    }
    if (await this.users.findByPhone(input.phone)) {
      return fail(ERROR_CODE.CONFLICT, 'phone_taken', { field: 'phone' });
    }

    const ts = now();
    const userId = newId('user');
    const orgId = newId('org');

    const user: UserDoc = {
      _id: userId,
      name: input.name,
      email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      phoneVerifiedAt: null,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    };
    const org: OrgDoc = {
      _id: orgId,
      name: input.businessName,
      wordmark: null,
      ownerId: userId,
      createdAt: ts,
      updatedAt: ts,
    };

    // Seed the three system roles for this org.
    const seededRoles: RoleDoc[] = (
      Object.entries(SYSTEM_ROLE_PERMISSIONS) as [
        keyof typeof SYSTEM_ROLE_PERMISSIONS,
        readonly string[],
      ][]
    ).map(([roleName, perms]) => ({
      _id: newId('role'),
      orgId,
      name: roleName,
      isSystem: true,
      permissions: [...perms] as RoleDoc['permissions'],
      createdAt: ts,
      updatedAt: ts,
    }));
    const ownerRole = seededRoles.find((r) => r.name === 'Owner')!;

    const membership: MembershipDoc = {
      _id: newId('membership'),
      orgId,
      userId,
      branchId: '*',
      roleId: ownerRole._id,
      defaultPumpId: null,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    };

    await withTransaction(async (tx) => {
      await this.users.insert(user, tx);
      await this.orgs.insert(org, tx);
      for (const role of seededRoles) await this.roles.insert(role, tx);
      await this.memberships.insert(membership, tx);
      await this.audit.record(
        { orgId, actorId: userId, action: 'org.created', entityType: 'org', entityId: orgId },
        tx,
      );
    });

    const code = generateOtpCode();
    await this.issueOtp(input.phone, userId, code);

    return ok({ user, org, devOtp: env.NODE_ENV === 'production' ? null : code });
  }

  private async issueOtp(phone: string, userId: string, code: string): Promise<void> {
    await this.otps.deleteByPhone(phone);
    const doc: OtpDoc = {
      _id: newId('otp'),
      phone,
      userId,
      codeHash: await hashPassword(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + env.OTP_TTL_SECONDS * 1000),
      createdAt: now(),
    };
    await this.otps.insert(doc);
  }

  async resendOtp(phone: string): Promise<ServiceResult<{ devOtp: string | null }>> {
    const user = await this.users.findByPhone(phone);
    if (!user) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found', { field: 'phone' });
    if (user.phoneVerifiedAt) return fail(ERROR_CODE.CONFLICT, 'phone_already_verified');
    const code = generateOtpCode();
    await this.issueOtp(phone, user._id, code);
    return ok({ devOtp: env.NODE_ENV === 'production' ? null : code });
  }

  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<ServiceResult<{ user: UserDoc; tokens: TokenPair }>> {
    const otp = await this.otps.findLatestByPhone(phone);
    if (!otp) return fail(ERROR_CODE.NOT_FOUND, 'otp_expired', { field: 'code' });
    if (otp.expiresAt.getTime() < Date.now()) {
      return fail(ERROR_CODE.INVALID_STATE, 'otp_expired', { field: 'code' });
    }
    if (otp.attempts >= env.OTP_MAX_ATTEMPTS) {
      return fail(ERROR_CODE.RATE_LIMITED, 'otp_too_many', { field: 'code' });
    }
    const matches = await verifyPassword(code, otp.codeHash);
    if (!matches) {
      await this.otps.incrementAttempts(otp._id);
      return fail(ERROR_CODE.VALIDATION, 'otp_invalid', { field: 'code' });
    }

    const user = await this.users.findById(otp.userId);
    if (!user) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found');

    const verifiedAt = now();
    await this.users.setPhoneVerified(user._id, verifiedAt);
    await this.otps.deleteByPhone(phone);

    const tokens = await this.issueTokens(user._id);
    return ok({ user: { ...user, phoneVerifiedAt: verifiedAt }, tokens });
  }

  async login(
    email: string,
    password: string,
  ): Promise<ServiceResult<{ user: UserDoc; tokens: TokenPair }>> {
    const user = await this.users.findByEmail(email.toLowerCase());
    // Same message + code whether the email is unknown or the password is wrong — never
    // reveal which. Field points at email so the form focuses the first input.
    if (!user) return fail(ERROR_CODE.UNAUTHENTICATED, 'invalid_credentials', { field: 'email' });
    if (!user.isActive) return fail(ERROR_CODE.FORBIDDEN, 'account_inactive');
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return fail(ERROR_CODE.UNAUTHENTICATED, 'invalid_credentials', { field: 'email' });
    }
    if (!user.phoneVerifiedAt) {
      return fail(ERROR_CODE.FORBIDDEN, 'phone_unverified', { field: 'phone' });
    }
    const tokens = await this.issueTokens(user._id);
    return ok({ user, tokens });
  }

  async refresh(refreshToken: string): Promise<ServiceResult<TokenPair>> {
    const claims = verifyRefreshToken(refreshToken);
    if (!claims) return fail(ERROR_CODE.UNAUTHENTICATED, 'token_invalid');
    const session = await this.sessions.findById(claims.sid);
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      return fail(ERROR_CODE.UNAUTHENTICATED, 'token_expired');
    }
    // Rotate: revoke the old session, issue a fresh pair.
    await this.sessions.revoke(session._id);
    const tokens = await this.issueTokens(claims.sub);
    return ok(tokens);
  }

  async logout(refreshToken: string): Promise<ServiceResult<null>> {
    const claims = verifyRefreshToken(refreshToken);
    if (claims) await this.sessions.revoke(claims.sid).catch(() => undefined);
    return ok(null);
  }

  private async issueTokens(userId: string): Promise<TokenPair> {
    const memberships = await this.memberships.findByUser(userId);
    // A user always has at least the org-wide membership; pick its org for the token.
    const orgId = memberships[0]?.orgId ?? '';
    const sessionId = newId('session');
    const refreshMs = 30 * 24 * 60 * 60 * 1000;
    const session: SessionDoc = {
      _id: sessionId,
      userId,
      orgId,
      expiresAt: new Date(Date.now() + refreshMs),
      createdAt: now(),
      revokedAt: null,
    };
    await this.sessions.insert(session);
    return {
      access_token: signAccessToken(userId, orgId),
      refresh_token: signRefreshToken(userId, sessionId),
    };
  }

  // /me — the user, their memberships (branch + role), and effective permissions per branch.
  async me(userId: string): Promise<
    ServiceResult<{
      user: UserDoc;
      memberships: Array<{ membership: MembershipDoc; role: RoleDoc | null }>;
    }>
  > {
    const user = await this.users.findById(userId);
    if (!user) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found');
    const memberships = await this.memberships.findByUser(userId);
    const enriched = await Promise.all(
      memberships.map(async (m) => ({ membership: m, role: await this.roles.findById(m.roleId) })),
    );
    return ok({ user, memberships: enriched });
  }

  async updateOrg(
    orgId: string,
    patch: { name?: string; wordmark?: string | null },
    actorId: string,
  ): Promise<ServiceResult<OrgDoc>> {
    const org = await this.orgs.findById(orgId);
    if (!org) return fail(ERROR_CODE.NOT_FOUND, 'org_not_found');
    await this.orgs.update(orgId, patch);
    await this.audit.record({
      orgId,
      actorId,
      action: 'org.updated',
      entityType: 'org',
      entityId: orgId,
      before: { name: org.name, wordmark: org.wordmark },
      after: patch,
    });
    return ok({ ...org, ...patch } as OrgDoc);
  }
}

export const authService = AuthService.getInstance();
