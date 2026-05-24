import { P, type Permission } from '@dipstick/core';

import { newId } from '@lib/ids.js';
import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type { RoleDoc } from '@shared/types/documents.js';

import { auditService, type AuditService } from '../audit/audit.service.js';
import type { MembershipRepo, RoleRepo } from '../auth/auth.repo.js';
import { membershipRepo, roleRepo } from '../auth/auth.repo.mongo.js';

// The two permissions that constitute "full ownership". If a change would drop the org to
// zero active memberships holding BOTH, we refuse it (last-owner lockout protection).
const OWNERSHIP_PERMISSIONS: Permission[] = [P.CAN_MANAGE_ROLES, P.CAN_MANAGE_STAFF];

export class RolesService {
  private constructor(
    private readonly roles: RoleRepo = roleRepo,
    private readonly memberships: MembershipRepo = membershipRepo,
    private readonly audit: AuditService = auditService,
  ) {}
  private static instance: RolesService;
  static getInstance(): RolesService {
    if (!RolesService.instance) RolesService.instance = new RolesService();
    return RolesService.instance;
  }

  list(orgId: string): Promise<RoleDoc[]> {
    return this.roles.findByOrg(orgId);
  }

  async create(
    orgId: string,
    input: { name: string; permissions: Permission[] },
    actorId: string,
  ): Promise<ServiceResult<RoleDoc>> {
    if (await this.roles.findByName(orgId, input.name)) {
      return fail(ERROR_CODE.CONFLICT, 'role_name_taken', { field: 'name' });
    }
    const ts = new Date().toISOString();
    const doc: RoleDoc = {
      _id: newId('role'),
      orgId,
      name: input.name,
      isSystem: false,
      permissions: input.permissions,
      createdAt: ts,
      updatedAt: ts,
    };
    await this.roles.insert(doc);
    await this.audit.record({
      orgId,
      actorId,
      action: 'role.created',
      entityType: 'role',
      entityId: doc._id,
      after: { name: doc.name, permissions: doc.permissions },
    });
    return ok(doc);
  }

  async update(
    orgId: string,
    roleId: string,
    patch: { name?: string; permissions?: Permission[] },
    actorId: string,
  ): Promise<ServiceResult<RoleDoc>> {
    const role = await this.roles.findById(roleId);
    if (!role || role.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'role_not_found');

    if (patch.name && patch.name !== role.name) {
      const clash = await this.roles.findByName(orgId, patch.name);
      if (clash && clash._id !== roleId) {
        return fail(ERROR_CODE.CONFLICT, 'role_name_taken', { field: 'name' });
      }
    }

    // If this edit strips ownership permissions from the role, ensure SOME active membership
    // still holds full ownership afterwards.
    if (patch.permissions && this.dropsOwnership(role, patch.permissions)) {
      const stillOwned = await this.someoneElseRetainsOwnership(orgId, roleId);
      if (!stillOwned) return fail(ERROR_CODE.BUSINESS_RULE, 'last_owner');
    }

    await this.roles.update(roleId, patch);
    await this.audit.record({
      orgId,
      actorId,
      action: 'role.updated',
      entityType: 'role',
      entityId: roleId,
      before: { name: role.name, permissions: role.permissions },
      after: patch,
    });
    return ok({ ...role, ...patch, updatedAt: new Date().toISOString() });
  }

  async remove(orgId: string, roleId: string, actorId: string): Promise<ServiceResult<null>> {
    const role = await this.roles.findById(roleId);
    if (!role || role.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'role_not_found');
    if (role.isSystem) return fail(ERROR_CODE.CONFLICT, 'role_system_undeletable');
    const assigned = await this.roles.countAssignments(roleId);
    if (assigned > 0) return fail(ERROR_CODE.CONFLICT, 'role_in_use');
    await this.roles.delete(roleId);
    await this.audit.record({
      orgId,
      actorId,
      action: 'role.deleted',
      entityType: 'role',
      entityId: roleId,
      before: { name: role.name },
    });
    return ok(null);
  }

  private dropsOwnership(role: RoleDoc, nextPermissions: Permission[]): boolean {
    const hadOwnership = OWNERSHIP_PERMISSIONS.every((p) => role.permissions.includes(p));
    const keepsOwnership = OWNERSHIP_PERMISSIONS.every((p) => nextPermissions.includes(p));
    return hadOwnership && !keepsOwnership;
  }

  // True if at least one active membership NOT on `excludingRoleId` still grants ownership.
  private async someoneElseRetainsOwnership(
    orgId: string,
    excludingRoleId: string,
  ): Promise<boolean> {
    const owners = await this.memberships.countWithPermissions(orgId, OWNERSHIP_PERMISSIONS);
    if (owners > 1) return true;
    // Exactly one path to ownership: if it's via the role being edited, the edit would
    // remove the last owner. We approximate by checking whether any membership on a
    // DIFFERENT owning role exists.
    const onThisRole = await this.memberships.countByRole(excludingRoleId);
    return owners - (onThisRole > 0 ? 1 : 0) >= 1;
  }
}

export const rolesService = RolesService.getInstance();
