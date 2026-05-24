import type { ShiftWindow } from '@dipstick/core';

import { withTransaction } from '@db/transaction.js';
import { hashPassword } from '@lib/auth/password.js';
import { newId } from '@lib/ids.js';
import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type { MembershipDoc, RosterDoc, UserDoc } from '@shared/types/documents.js';

import { auditService, type AuditService } from '../audit/audit.service.js';
import type { MembershipRepo, RoleRepo, UserRepo } from '../auth/auth.repo.js';
import { membershipRepo, roleRepo, userRepo } from '../auth/auth.repo.mongo.js';
import type { RosterRepo } from './staff.repo.js';
import { rosterRepo } from './staff.repo.mongo.js';
import type { StaffStatsRepo } from './staff-stats.repo.js';
import { staffStatsRepo } from './staff-stats.repo.js';

const now = (): string => new Date().toISOString();

export interface StaffDirectoryRow {
  membership: MembershipDoc;
  user: UserDoc | null;
  roleName: string | null;
  shiftCount30d: number;
  varianceKobo30d: number;
}

export class StaffService {
  private constructor(
    private readonly users: UserRepo = userRepo,
    private readonly memberships: MembershipRepo = membershipRepo,
    private readonly roles: RoleRepo = roleRepo,
    private readonly roster: RosterRepo = rosterRepo,
    private readonly stats: StaffStatsRepo = staffStatsRepo,
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

  // Variance leaderboard: per-head net variance over 30 days, ascending (worst shortage first).
  async leaderboard(branchId: string): Promise<Array<{ attendantId: string; varianceKobo: number; shiftCount: number }>> {
    const stats = await this.stats.attendantStats(branchId, 30);
    return stats
      .map((s) => ({ attendantId: s.attendantId, varianceKobo: s.netVarianceKobo, shiftCount: s.shiftCount }))
      .sort((a, b) => a.varianceKobo - b.varianceKobo);
  }
}

export const staffService = StaffService.getInstance();
