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
  OtpChannel,
  OtpDoc,
  RoleDoc,
  SessionDoc,
  UserDoc,
} from '@shared/types/documents.js';

import { auditService, type AuditService } from '../audit/audit.service.js';
import type {
  MembershipRepo,
  OrgRepo,
  OtpRepo,
  RoleRepo,
  SessionRepo,
  UserRepo,
} from './auth.repo.js';
import {
  membershipRepo,
  orgRepo,
  otpRepo,
  roleRepo,
  sessionRepo,
  userRepo,
} from './auth.repo.mongo.js';
import { channelTarget, isChannelVerified, isUserVerified, requiredChannels } from './verification.js';
import { env } from '../../env.js';

export interface RegisterInput {
  name: string;
  businessName: string;
  email: string;
  phone?: string | null;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

// What a pending-verification channel looks like in the response (which channels to verify,
// plus the dev code in non-prod so QA needn't wire a real sender).
export interface PendingChannel {
  channel: OtpChannel;
  target: string;
  devOtp: string | null;
}

const now = (): string => new Date().toISOString();

// A dev-only OTP: deterministic so QA can verify without an SMS/email gateway (no real sender
// in v1). Returned in the register/resend response when not in production.
const generateOtpCode = (): string => '000000';
const isDev = (): boolean => env.NODE_ENV !== 'production';

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
  // with the Owner role, atomically. The verification policy (env AUTH_VERIFICATION) decides
  // whether tokens are issued immediately (`none`) or after OTP on the required channel(s).
  async register(input: RegisterInput): Promise<
    ServiceResult<{
      user: UserDoc;
      org: OrgDoc;
      pending: PendingChannel[];
      tokens: TokenPair | null;
    }>
  > {
    const email = input.email.toLowerCase();
    const phone = input.phone && input.phone.length > 0 ? input.phone : null;

    if (await this.users.findByEmail(email)) {
      return fail(ERROR_CODE.CONFLICT, 'email_taken', { field: 'email' });
    }
    if (phone && (await this.users.findByPhone(phone))) {
      return fail(ERROR_CODE.CONFLICT, 'phone_taken', { field: 'phone' });
    }

    const ts = now();
    const userId = newId('user');
    const orgId = newId('org');

    const user: UserDoc = {
      _id: userId,
      name: input.name,
      email,
      phone,
      passwordHash: await hashPassword(input.password),
      emailVerifiedAt: null,
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

    // Determine what (if anything) must be verified, restricted to channels actually given.
    const channels = requiredChannels(user);

    if (channels.length === 0) {
      // Policy `none` (or no verifiable channel): auto-verify everything present and unlock now.
      if (user.email) await this.users.setEmailVerified(userId, ts);
      if (phone) await this.users.setPhoneVerified(userId, ts);
      const verifiedUser: UserDoc = {
        ...user,
        emailVerifiedAt: user.email ? ts : null,
        phoneVerifiedAt: phone ? ts : null,
      };
      const tokens = await this.issueTokens(userId);
      return ok({ user: verifiedUser, org, pending: [], tokens });
    }

    // Issue an OTP per required channel.
    const pending = await this.issuePending(user, channels);
    return ok({ user, org, pending, tokens: null });
  }

  private async issueOtp(
    channel: OtpChannel,
    target: string,
    userId: string,
    code: string,
  ): Promise<void> {
    await this.otps.deleteByTarget(channel, target);
    const doc: OtpDoc = {
      _id: newId('otp'),
      channel,
      target,
      userId,
      codeHash: await hashPassword(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + env.OTP_TTL_SECONDS * 1000),
      createdAt: now(),
    };
    await this.otps.insert(doc);
  }

  // Issue OTPs for the given channels of a user and return the pending descriptors. Shared
  // by register, login and verify (policy `both`) so all three return the same shape.
  private async issuePending(user: UserDoc, channels: OtpChannel[]): Promise<PendingChannel[]> {
    const pending: PendingChannel[] = [];
    for (const channel of channels) {
      const target = channelTarget(user, channel);
      if (!target) continue;
      const code = generateOtpCode();
      await this.issueOtp(channel, target, user._id, code);
      pending.push({ channel, target, devOtp: isDev() ? code : null });
    }
    return pending;
  }

  // Resend an OTP for a channel/target. Looks the user up by the channel's address.
  async resendOtp(
    channel: OtpChannel,
    target: string,
  ): Promise<ServiceResult<{ devOtp: string | null }>> {
    const user =
      channel === 'email'
        ? await this.users.findByEmail(target.toLowerCase())
        : await this.users.findByPhone(target);
    if (!user) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found', { field: channel });
    if (isChannelVerified(user, channel)) return fail(ERROR_CODE.CONFLICT, 'already_verified');
    const code = generateOtpCode();
    await this.issueOtp(channel, target, user._id, code);
    return ok({ devOtp: isDev() ? code : null });
  }

  // Verify a code for a channel/target. When every required channel is satisfied, tokens are
  // issued and `pending` is empty; otherwise tokens is null and `pending` lists what remains.
  async verifyOtp(
    channel: OtpChannel,
    target: string,
    code: string,
  ): Promise<ServiceResult<{ user: UserDoc; tokens: TokenPair | null; pending: PendingChannel[] }>> {
    const otp = await this.otps.findLatestByTarget(channel, target);
    if (!otp) return fail(ERROR_CODE.NOT_FOUND, 'otp_not_found', { field: 'code' });
    if (otp.expiresAt.getTime() < Date.now()) {
      return fail(ERROR_CODE.INVALID_STATE, 'otp_expired', { field: 'code' });
    }
    if (otp.attempts >= env.OTP_MAX_ATTEMPTS) {
      // Locked out until this OTP expires (then a fresh code must be requested). Tell the
      // client how long to wait via Retry-After — at least 1s.
      const retryAfter = Math.max(1, Math.ceil((otp.expiresAt.getTime() - Date.now()) / 1000));
      return fail(ERROR_CODE.RATE_LIMITED, 'otp_too_many', { field: 'code', retryAfter });
    }
    const matches = await verifyPassword(code, otp.codeHash);
    if (!matches) {
      await this.otps.incrementAttempts(otp._id);
      return fail(ERROR_CODE.VALIDATION, 'otp_invalid', { field: 'code' });
    }

    const found = await this.users.findById(otp.userId);
    if (!found) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found');

    const verifiedAt = now();
    if (channel === 'email') await this.users.setEmailVerified(found._id, verifiedAt);
    else await this.users.setPhoneVerified(found._id, verifiedAt);
    await this.otps.deleteByTarget(channel, target);

    const user: UserDoc = {
      ...found,
      emailVerifiedAt: channel === 'email' ? verifiedAt : found.emailVerifiedAt,
      phoneVerifiedAt: channel === 'phone' ? verifiedAt : found.phoneVerifiedAt,
    };

    if (!isUserVerified(user)) {
      // More channels still required (policy `both`). Issue fresh OTPs for them; no tokens yet.
      const remaining = requiredChannels(user).filter((ch) => !isChannelVerified(user, ch));
      const pending = await this.issuePending(user, remaining);
      return ok({ user, tokens: null, pending });
    }

    const tokens = await this.issueTokens(user._id);
    return ok({ user, tokens, pending: [] });
  }

  // Login. On valid credentials but an unverified account, returns success with tokens=null
  // and the `pending` channels (so the FE routes to OTP instead of the dashboard) — it
  // re-issues fresh OTPs for those channels. Bad credentials / inactive still fail.
  async login(
    email: string,
    password: string,
  ): Promise<
    ServiceResult<{ user: UserDoc; tokens: TokenPair | null; pending: PendingChannel[] }>
  > {
    const user = await this.users.findByEmail(email.toLowerCase());
    // Same message + code whether the email is unknown or the password is wrong — never
    // reveal which. Field points at email so the form focuses the first input.
    if (!user) return fail(ERROR_CODE.UNAUTHENTICATED, 'invalid_credentials', { field: 'email' });
    if (!user.isActive) return fail(ERROR_CODE.FORBIDDEN, 'account_inactive');
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return fail(ERROR_CODE.UNAUTHENTICATED, 'invalid_credentials', { field: 'email' });
    }

    if (!isUserVerified(user)) {
      // Re-issue OTPs for the still-unverified required channels and tell the FE to verify.
      const remaining = requiredChannels(user).filter((ch) => !isChannelVerified(user, ch));
      const pending = await this.issuePending(user, remaining);
      return ok({ user, tokens: null, pending });
    }

    const tokens = await this.issueTokens(user._id);
    return ok({ user, tokens, pending: [] });
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
    const userMemberships: MembershipDoc[] = await this.memberships.findByUser(userId);
    // A user always has at least the org-wide membership; pick its org for the token.
    const orgId = userMemberships[0]?.orgId ?? '';
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
    patch: { name?: string | undefined; wordmark?: string | null | undefined },
    actorId: string,
  ): Promise<ServiceResult<OrgDoc>> {
    const org = await this.orgs.findById(orgId);
    if (!org) return fail(ERROR_CODE.NOT_FOUND, 'org_not_found');
    // Drop undefined keys so exactOptionalPropertyTypes is satisfied at the repo boundary.
    const clean: { name?: string; wordmark?: string | null } = {};
    if (patch.name !== undefined) clean.name = patch.name;
    if (patch.wordmark !== undefined) clean.wordmark = patch.wordmark;
    await this.orgs.update(orgId, clean);
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
