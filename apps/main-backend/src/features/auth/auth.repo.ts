import type {
  MembershipDoc,
  OrgDoc,
  OtpDoc,
  RoleDoc,
  SessionDoc,
  UserDoc,
} from '@shared/types/documents.js';

import type { Tx } from '@db/transaction.js';

// Repository interfaces for the auth/identity entities. Services depend on THESE, never on
// Mongo. A SQL implementation would satisfy the same contract.

export interface UserRepo {
  findById(id: string): Promise<UserDoc | null>;
  findByEmail(email: string): Promise<UserDoc | null>;
  findByPhone(phone: string): Promise<UserDoc | null>;
  insert(doc: UserDoc, tx?: Tx): Promise<void>;
  setPhoneVerified(id: string, at: string): Promise<void>;
}

export interface OrgRepo {
  findById(id: string): Promise<OrgDoc | null>;
  insert(doc: OrgDoc, tx?: Tx): Promise<void>;
  update(id: string, patch: Partial<Pick<OrgDoc, 'name' | 'wordmark'>>): Promise<void>;
}

export interface RoleRepo {
  findById(id: string): Promise<RoleDoc | null>;
  findByOrg(orgId: string): Promise<RoleDoc[]>;
  findByName(orgId: string, name: string): Promise<RoleDoc | null>;
  insert(doc: RoleDoc, tx?: Tx): Promise<void>;
  update(
    id: string,
    patch: Partial<Pick<RoleDoc, 'name' | 'permissions'>>,
  ): Promise<void>;
  delete(id: string): Promise<void>;
  countAssignments(roleId: string): Promise<number>;
}

export interface MembershipRepo {
  findById(id: string): Promise<MembershipDoc | null>;
  findByUser(userId: string): Promise<MembershipDoc[]>;
  findByOrgAndUser(orgId: string, userId: string): Promise<MembershipDoc[]>;
  // The membership that governs access to a branch: an exact branch match, or the org-wide
  // ('*') membership. Returns the most specific match (branch over '*').
  findForBranch(orgId: string, userId: string, branchId: string): Promise<MembershipDoc | null>;
  findByOrgBranch(orgId: string, branchId: string): Promise<MembershipDoc[]>;
  countByRole(roleId: string): Promise<number>;
  // Count active memberships whose role grants ALL of the given permissions (last-owner check).
  countWithPermissions(orgId: string, permissions: string[]): Promise<number>;
  insert(doc: MembershipDoc, tx?: Tx): Promise<void>;
  update(
    id: string,
    patch: Partial<Pick<MembershipDoc, 'roleId' | 'defaultPumpId' | 'isActive'>>,
  ): Promise<void>;
}

export interface OtpRepo {
  insert(doc: OtpDoc): Promise<void>;
  findLatestByPhone(phone: string): Promise<OtpDoc | null>;
  incrementAttempts(id: string): Promise<void>;
  deleteByPhone(phone: string): Promise<void>;
}

export interface SessionRepo {
  insert(doc: SessionDoc, tx?: Tx): Promise<void>;
  findById(id: string): Promise<SessionDoc | null>;
  revoke(id: string): Promise<void>;
}
