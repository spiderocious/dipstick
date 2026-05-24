import type { Collection } from 'mongodb';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';
import type { Tx } from '@db/transaction.js';
import type {
  MembershipDoc,
  OrgDoc,
  OtpDoc,
  RoleDoc,
  SessionDoc,
  UserDoc,
} from '@shared/types/documents.js';

import type {
  MembershipRepo,
  OrgRepo,
  OtpRepo,
  RoleRepo,
  SessionRepo,
  UserRepo,
} from './auth.repo.js';

// Mongo implementations. ObjectId is never used — `_id` is our string ULID. The `session`
// option from a Tx is threaded into writes that participate in a transaction.
const sess = (tx?: Tx) => (tx ? { session: tx.session } : {});

const users = (): Collection<UserDoc> => getDb().collection<UserDoc>(COLLECTION.users);
const orgs = (): Collection<OrgDoc> => getDb().collection<OrgDoc>(COLLECTION.orgs);
const roles = (): Collection<RoleDoc> => getDb().collection<RoleDoc>(COLLECTION.roles);
const memberships = (): Collection<MembershipDoc> =>
  getDb().collection<MembershipDoc>(COLLECTION.memberships);
const otps = (): Collection<OtpDoc> => getDb().collection<OtpDoc>(COLLECTION.otps);
const sessions = (): Collection<SessionDoc> =>
  getDb().collection<SessionDoc>(COLLECTION.sessions);

export const userRepo: UserRepo = {
  findById: (id) => users().findOne({ _id: id }),
  findByEmail: (email) => users().findOne({ email: email.toLowerCase() }),
  findByPhone: (phone) => users().findOne({ phone }),
  insert: async (doc, tx) => {
    await users().insertOne(doc, sess(tx));
  },
  setPhoneVerified: async (id, at) => {
    await users().updateOne({ _id: id }, { $set: { phoneVerifiedAt: at, updatedAt: at } });
  },
};

export const orgRepo: OrgRepo = {
  findById: (id) => orgs().findOne({ _id: id }),
  insert: async (doc, tx) => {
    await orgs().insertOne(doc, sess(tx));
  },
  update: async (id, patch) => {
    await orgs().updateOne(
      { _id: id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
    );
  },
};

export const roleRepo: RoleRepo = {
  findById: (id) => roles().findOne({ _id: id }),
  findByOrg: (orgId) => roles().find({ orgId }).sort({ createdAt: 1 }).toArray(),
  findByName: (orgId, name) => roles().findOne({ orgId, name }),
  insert: async (doc, tx) => {
    await roles().insertOne(doc, sess(tx));
  },
  update: async (id, patch) => {
    await roles().updateOne(
      { _id: id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
    );
  },
  delete: async (id) => {
    await roles().deleteOne({ _id: id });
  },
  countAssignments: (roleId) => memberships().countDocuments({ roleId, isActive: true }),
};

export const membershipRepo: MembershipRepo = {
  findById: (id) => memberships().findOne({ _id: id }),
  findByUser: (userId) => memberships().find({ userId, isActive: true }).toArray(),
  findByOrgAndUser: (orgId, userId) =>
    memberships().find({ orgId, userId, isActive: true }).toArray(),
  findForBranch: async (orgId, userId, branchId) => {
    // Prefer an exact branch membership; fall back to the org-wide '*' membership.
    const exact = await memberships().findOne({ orgId, userId, branchId, isActive: true });
    if (exact) return exact;
    return memberships().findOne({ orgId, userId, branchId: '*', isActive: true });
  },
  findByOrgBranch: (orgId, branchId) =>
    memberships().find({ orgId, branchId, isActive: true }).toArray(),
  countByRole: (roleId) => memberships().countDocuments({ roleId, isActive: true }),
  countWithPermissions: async (orgId, permissions) => {
    // Roles in this org that hold ALL the given permissions, then count active memberships
    // assigned to any of them. Two cheap queries beat a join.
    const grantingRoles = await roles()
      .find({ orgId, permissions: { $all: permissions } })
      .project<{ _id: string }>({ _id: 1 })
      .toArray();
    if (grantingRoles.length === 0) return 0;
    const roleIds = grantingRoles.map((r) => r._id);
    return memberships().countDocuments({ orgId, roleId: { $in: roleIds }, isActive: true });
  },
  insert: async (doc, tx) => {
    await memberships().insertOne(doc, sess(tx));
  },
  update: async (id, patch) => {
    await memberships().updateOne(
      { _id: id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
    );
  },
};

export const otpRepo: OtpRepo = {
  insert: async (doc) => {
    await otps().insertOne(doc);
  },
  findLatestByPhone: (phone) => otps().find({ phone }).sort({ createdAt: -1 }).limit(1).next(),
  incrementAttempts: async (id) => {
    await otps().updateOne({ _id: id }, { $inc: { attempts: 1 } });
  },
  deleteByPhone: async (phone) => {
    await otps().deleteMany({ phone });
  },
};

export const sessionRepo: SessionRepo = {
  insert: async (doc, tx) => {
    await sessions().insertOne(doc, sess(tx));
  },
  findById: (id) => sessions().findOne({ _id: id }),
  revoke: async (id) => {
    await sessions().updateOne(
      { _id: id },
      { $set: { revokedAt: new Date().toISOString() } },
    );
  },
};
