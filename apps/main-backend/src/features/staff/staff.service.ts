import type { ShiftWindow } from '@dipstick/core';

import { withTransaction } from '@db/transaction.js';
import { hashPassword } from '@lib/auth/password.js';
import { newId } from '@lib/ids.js';
import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type {
  BranchDoc,
  MembershipDoc,
  RosterDoc,
  ShiftDoc,
  UserDoc,
} from '@shared/types/documents.js';

import { auditService, type AuditService } from '../audit/audit.service.js';
import type { MembershipRepo, RoleRepo, UserRepo } from '../auth/auth.repo.js';
import { membershipRepo, roleRepo, userRepo } from '../auth/auth.repo.mongo.js';
import type { BranchRepo } from '../branches/branches.repo.js';
import { branchRepo } from '../branches/branches.repo.mongo.js';
import type { ShiftRepo } from '../shifts/shifts.repo.js';
import { shiftRepo } from '../shifts/shifts.repo.mongo.js';
import type { RosterRepo } from './staff.repo.js';
import { rosterRepo } from './staff.repo.mongo.js';
import type { StaffStatsRepo, UserTotals } from './staff-stats.repo.js';
import { staffStatsRepo } from './staff-stats.repo.js';

const now = (): string => new Date().toISOString();

export interface StaffDirectoryRow {
  membership: MembershipDoc;
  user: UserDoc | null;
  roleName: string | null;
  shiftCount30d: number;
  varianceKobo30d: number;
}

export interface StaffMembershipDetail {
  membership: MembershipDoc;
  branchName: string | null;
  roleName: string | null;
  permissions: string[];
}

export interface StaffDetail {
  user: UserDoc;
  memberships: StaffMembershipDetail[];
  metrics: UserTotals;
  recentShifts: ShiftDoc[];
}

export class StaffService {
  private constructor(
    private readonly users: UserRepo = userRepo,
    private readonly memberships: MembershipRepo = membershipRepo,
    private readonly roles: RoleRepo = roleRepo,
    private readonly roster: RosterRepo = rosterRepo,
    private readonly stats: StaffStatsRepo = staffStatsRepo,
    private readonly branches: BranchRepo = branchRepo,
    private readonly shifts: ShiftRepo = shiftRepo,
    private readonly audit: AuditService = auditService,
  ) {}
  private static instance: StaffService;
  static getInstance(): StaffService {
    if (!StaffService.instance) StaffService.instance = new StaffService();
    return StaffService.instance;
  }

  async directory(orgId: string, branchId: string): Promise<StaffDirectoryRow[]> {
    const memberships = await this.memberships.findByOrgBranch(orgId, branchId);
    const stats = await this.stats.attendantStats(branchId, 30);
    const statByUser = new Map(stats.map((s) => [s.attendantId, s]));
    return Promise.all(
      memberships.map(async (m) => {
        const [user, role] = await Promise.all([
          this.users.findById(m.userId),
          this.roles.findById(m.roleId),
        ]);
        const stat = statByUser.get(m.userId);
        return {
          membership: m,
          user,
          roleName: role?.name ?? null,
          shiftCount30d: stat?.shiftCount ?? 0,
          varianceKobo30d: stat?.netVarianceKobo ?? 0,
        };
      }),
    );
  }

  async add(
    orgId: string,
    branchId: string,
    input: {
      name: string;
      email: string;
      phone: string;
      roleId: string;
      defaultPumpId?: string | null;
      password?: string;
    },
    actorId: string,
  ): Promise<ServiceResult<{ membership: MembershipDoc; user: UserDoc }>> {
    const role = await this.roles.findById(input.roleId);
    if (!role || role.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'role_not_found', { field: 'role_id' });

    const email = input.email.toLowerCase();
    let user = await this.users.findByEmail(email);

    // If the user exists, reuse them; otherwise create. A clash on phone for a *different*
    // user is a conflict.
    if (user && user.phone !== input.phone) {
      const byPhone = await this.users.findByPhone(input.phone);
      if (byPhone && byPhone._id !== user._id) {
        return fail(ERROR_CODE.CONFLICT, 'phone_taken', { field: 'phone' });
      }
    }

    const ts = now();
    const membership: MembershipDoc = {
      _id: newId('membership'),
      orgId,
      userId: user?._id ?? newId('user'),
      branchId,
      roleId: input.roleId,
      defaultPumpId: input.defaultPumpId ?? null,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    };

    const createdUser: UserDoc | null = user
      ? null
      : {
          _id: membership.userId,
          name: input.name,
          email,
          phone: input.phone,
          passwordHash: await hashPassword(input.password ?? `temp-${newId('otp')}`),
          // Staff added by a manager are pre-verified — they did not self-sign-up.
          emailVerifiedAt: ts,
          phoneVerifiedAt: ts,
          isActive: true,
          createdAt: ts,
          updatedAt: ts,
        };

    await withTransaction(async (tx) => {
      if (createdUser) await this.users.insert(createdUser, tx);
      await this.memberships.insert(membership, tx);
      await this.audit.record(
        {
          orgId,
          branchId,
          actorId,
          action: 'staff.added',
          entityType: 'membership',
          entityId: membership._id,
          after: { userId: membership.userId, roleId: membership.roleId },
        },
        tx,
      );
    });

    user = createdUser ?? user;
    return ok({ membership, user: user as UserDoc });
  }

  async update(
    orgId: string,
    membershipId: string,
    patch: { roleId?: string; defaultPumpId?: string | null; isActive?: boolean },
    actorId: string,
  ): Promise<ServiceResult<MembershipDoc>> {
    const membership = await this.memberships.findById(membershipId);
    if (!membership || membership.orgId !== orgId)
      return fail(ERROR_CODE.NOT_FOUND, 'membership_not_found');

    if (patch.roleId) {
      const role = await this.roles.findById(patch.roleId);
      if (!role || role.orgId !== orgId)
        return fail(ERROR_CODE.NOT_FOUND, 'role_not_found', { field: 'role_id' });
    }

    const next: { roleId?: string; defaultPumpId?: string | null; isActive?: boolean } = {};
    if (patch.roleId !== undefined) next.roleId = patch.roleId;
    if (patch.defaultPumpId !== undefined) next.defaultPumpId = patch.defaultPumpId;
    if (patch.isActive !== undefined) next.isActive = patch.isActive;

    await this.memberships.update(membershipId, next);
    await this.audit.record({
      orgId,
      branchId: membership.branchId === '*' ? null : membership.branchId,
      actorId,
      action: 'staff.updated',
      entityType: 'membership',
      entityId: membershipId,
      before: { roleId: membership.roleId, isActive: membership.isActive },
      after: next,
    });
    return ok({ ...membership, ...next });
  }

  getRoster(branchId: string, weekStart: string): Promise<RosterDoc | null> {
    return this.roster.findByWeek(branchId, weekStart);
  }

  async setRoster(
    orgId: string,
    branchId: string,
    weekStart: string,
    assignments: Record<string, ShiftWindow[]>,
    actorId: string,
  ): Promise<ServiceResult<RosterDoc>> {
    const ts = now();
    const doc: RosterDoc = {
      _id: newId('roster'),
      orgId,
      branchId,
      weekStart,
      assignments,
      createdAt: ts,
      updatedAt: ts,
    };
    await this.roster.upsert(doc);
    await this.audit.record({
      orgId,
      branchId,
      actorId,
      action: 'roster.set',
      entityType: 'roster',
      entityId: doc._id,
    });
    return ok(doc);
  }

  // --- staff detail (per-person, org-wide) ---

  async getDetail(orgId: string, userId: string): Promise<ServiceResult<StaffDetail>> {
    const user = await this.users.findById(userId);
    if (!user) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found');

    const memberships = await this.memberships.findByOrgAndUser(orgId, userId);
    if (memberships.length === 0) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found');

    const detail: StaffMembershipDetail[] = await Promise.all(
      memberships.map(async (m) => {
        const [role, branch] = await Promise.all([
          this.roles.findById(m.roleId),
          m.branchId === '*'
            ? Promise.resolve<BranchDoc | null>(null)
            : this.branches.findById(m.branchId),
        ]);
        return {
          membership: m,
          branchName: m.branchId === '*' ? 'All branches' : (branch?.name ?? null),
          roleName: role?.name ?? null,
          permissions: role?.permissions ?? [],
        };
      }),
    );

    const [metrics, recentShifts] = await Promise.all([
      this.stats.userTotals(orgId, userId),
      this.shifts.findByAttendant(orgId, userId, 10),
    ]);

    return ok({ user, memberships: detail, metrics, recentShifts });
  }

  // A person's activity = audit entries they performed. The controller resolves refs; this
  // just exposes the actorId query shape (the audit repo is read where the route lives).

  // --- multi-branch: assign to another branch (additive membership) ---

  async assignToBranch(
    orgId: string,
    branchId: string,
    userId: string,
    roleId: string,
    actorId: string,
  ): Promise<ServiceResult<MembershipDoc>> {
    const user = await this.users.findById(userId);
    if (!user || user.isActive === false) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found');
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'branch_not_found');
    if (branch.isArchived) return fail(ERROR_CODE.INVALID_STATE, 'branch_archived');
    const role = await this.roles.findById(roleId);
    if (!role || role.orgId !== orgId)
      return fail(ERROR_CODE.NOT_FOUND, 'role_not_found', { field: 'role_id' });

    // Already assigned here? Reactivate a dormant membership rather than duplicate.
    const existing = (await this.memberships.findByOrgAndUser(orgId, userId)).find(
      (m) => m.branchId === branchId,
    );
    if (existing) {
      if (existing.isActive) return fail(ERROR_CODE.CONFLICT, 'already_member');
      await this.memberships.update(existing._id, { isActive: true, roleId });
      await this.audit.record({
        orgId,
        branchId,
        actorId,
        action: 'staff.assigned',
        entityType: 'membership',
        entityId: existing._id,
        after: { userId, roleId, reactivated: true },
      });
      return ok({ ...existing, isActive: true, roleId });
    }

    const ts = now();
    const membership: MembershipDoc = {
      _id: newId('membership'),
      orgId,
      userId,
      branchId,
      roleId,
      defaultPumpId: null,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    };
    await this.memberships.insert(membership);
    await this.audit.record({
      orgId,
      branchId,
      actorId,
      action: 'staff.assigned',
      entityType: 'membership',
      entityId: membership._id,
      after: { userId, roleId },
    });
    return ok(membership);
  }

  // --- trigger password reset (issues a fresh temp password) ---

  async resetPassword(
    orgId: string,
    userId: string,
    actorId: string,
  ): Promise<ServiceResult<{ tempPassword: string | null }>> {
    const user = await this.users.findById(userId);
    if (!user) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found');
    // Verify the caller and target share the org (the target must be a member).
    const shared = await this.memberships.findByOrgAndUser(orgId, userId);
    if (shared.length === 0) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found');

    const temp = `Dipstick-${newId('otp').slice(-8)}`;
    await this.users.update(userId, { passwordHash: await hashPassword(temp) });
    await this.audit.record({
      orgId,
      actorId,
      action: 'staff.password_reset',
      entityType: 'user',
      entityId: userId,
    });
    // Dev returns the temp password so QA/owner can hand it over; prod returns null (deliver
    // out of band / via the reset OTP channel once a real sender is wired).
    const dev = process.env['NODE_ENV'] !== 'production';
    return ok({ tempPassword: dev ? temp : null });
  }

  // --- edit account (the user record, not a membership) ---

  async editAccount(
    orgId: string,
    userId: string,
    patch: { name?: string; email?: string; phone?: string | null },
    actorId: string,
  ): Promise<ServiceResult<UserDoc>> {
    const user = await this.users.findById(userId);
    if (!user) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found');
    const shared = await this.memberships.findByOrgAndUser(orgId, userId);
    if (shared.length === 0) return fail(ERROR_CODE.NOT_FOUND, 'staff_not_found');

    const next: Partial<UserDoc> = {};
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.email !== undefined) {
      const email = patch.email.toLowerCase();
      if (email !== user.email) {
        const clash = await this.users.findByEmail(email);
        if (clash && clash._id !== userId)
          return fail(ERROR_CODE.CONFLICT, 'account_email_taken', { field: 'email' });
        next.email = email;
        next.emailVerifiedAt = null; // contact changed → re-verify
      }
    }
    if (patch.phone !== undefined) {
      const phone = patch.phone && patch.phone.length > 0 ? patch.phone : null;
      if (phone !== user.phone) {
        if (phone) {
          const clash = await this.users.findByPhone(phone);
          if (clash && clash._id !== userId)
            return fail(ERROR_CODE.CONFLICT, 'account_phone_taken', { field: 'phone' });
        }
        next.phone = phone;
        next.phoneVerifiedAt = null;
      }
    }

    await this.users.update(userId, next);
    await this.audit.record({
      orgId,
      actorId,
      action: 'staff.account_updated',
      entityType: 'user',
      entityId: userId,
      before: { name: user.name, email: user.email, phone: user.phone },
      after: next,
    });
    return ok({ ...user, ...next });
  }

  // Variance leaderboard: per-head net variance over 30 days, ascending (worst shortage first).
  async leaderboard(branchId: string): Promise<Array<{ attendantId: string; varianceKobo: number; shiftCount: number }>> {
    const stats = await this.stats.attendantStats(branchId, 30);
    return stats
      .map((s) => ({ attendantId: s.attendantId, varianceKobo: s.netVarianceKobo, shiftCount: s.shiftCount }))
      .sort((a, b) => a.varianceKobo - b.varianceKobo);
  }
}

export const staffService = StaffService.getInstance();
