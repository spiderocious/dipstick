import type { Collection, Document } from 'mongodb';

import { getDb } from '@db/client.js';
import { COLLECTION } from '@db/collections.js';

// Resolves opaque prefixed-ULID ids into human labels (+ whether they're navigable), so the
// UI can show "Tunde A." instead of "usr_01HV…". Reused by audit, daybook, and any screen
// that would otherwise leak raw ids. Read-only; tenant-scoped by orgId.

export type RefType =
  | 'user'
  | 'role'
  | 'shift'
  | 'delivery'
  | 'expense'
  | 'pump'
  | 'tank'
  | 'branch'
  | 'membership'
  | 'roster'
  | 'org';

// Only these get detail pages on the FE; the rest render as label-only.
export type RefHrefKind = 'user' | 'shift' | 'delivery' | 'branch' | null;

export interface Ref {
  type: RefType;
  label: string;
  hrefKind: RefHrefKind;
}

export type RefMap = Record<string, Ref>;

// Map an id's 3-letter prefix to its type. Unknown/extra prefixes resolve to null (omitted).
const PREFIX_TYPE: Record<string, RefType> = {
  usr: 'user',
  rol: 'role',
  shf: 'shift',
  dlv: 'delivery',
  exp: 'expense',
  pmp: 'pump',
  tnk: 'tank',
  brn: 'branch',
  mbr: 'membership',
  rst: 'roster',
  org: 'org',
};

const HREF_KIND: Record<RefType, RefHrefKind> = {
  user: 'user',
  shift: 'shift',
  delivery: 'delivery',
  branch: 'branch',
  role: null,
  expense: null,
  pump: null,
  tank: null,
  membership: 'user', // a membership points at a person — link to the user
  roster: null,
  org: null,
};

const typeOf = (id: string): RefType | null => {
  const prefix = id.slice(0, id.indexOf('_'));
  return PREFIX_TYPE[prefix] ?? null;
};

// A document whose identity is a string ULID (the workspace convention).
type StringIdDoc = Document & { _id: string };

interface Loaded {
  label: (doc: Document) => string;
  // Membership labels need the user's name; loaded in a second pass.
}

export class RefsService {
  private static instance: RefsService;
  static getInstance(): RefsService {
    if (!RefsService.instance) RefsService.instance = new RefsService();
    return RefsService.instance;
  }

  // Our `_id` is a string ULID (never an ObjectId), so type it as such — otherwise the driver
  // types `{ $in: string[] }` against ObjectId and rejects it.
  private coll(name: string): Collection<StringIdDoc> {
    return getDb().collection<StringIdDoc>(name);
  }

  // Of the given user ids, which are members of this org (any branch). Gates user-label
  // resolution so a cross-tenant id can never leak a person's name.
  private async orgMemberUserIds(orgId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const docs = await this.coll(COLLECTION.memberships)
      .find({ orgId, userId: { $in: userIds } })
      .project<{ userId: string }>({ userId: 1 })
      .toArray();
    return [...new Set(docs.map((d) => String(d.userId)))];
  }

  private collectionFor(type: RefType): string | null {
    switch (type) {
      case 'user':
        return COLLECTION.users;
      case 'role':
        return COLLECTION.roles;
      case 'shift':
        return COLLECTION.shifts;
      case 'delivery':
        return COLLECTION.deliveries;
      case 'expense':
        return COLLECTION.expenses;
      case 'pump':
        return COLLECTION.pumps;
      case 'tank':
        return COLLECTION.tanks;
      case 'branch':
        return COLLECTION.branches;
      case 'membership':
        return COLLECTION.memberships;
      case 'roster':
        return COLLECTION.roster;
      case 'org':
        return COLLECTION.orgs;
      default:
        return null;
    }
  }

  private labeller(type: RefType): Loaded['label'] {
    switch (type) {
      case 'user':
        return (d) => String(d['name'] ?? 'Unknown person');
      case 'role':
        return (d) => String(d['name'] ?? 'Role');
      case 'branch':
        return (d) => String(d['name'] ?? 'Branch');
      case 'org':
        return (d) => String(d['name'] ?? 'Business');
      case 'pump':
        return (d) => `Pump ${String(d['label'] ?? '')}`.trim();
      case 'tank':
        return (d) => `${String(d['product'] ?? 'Tank')} tank`;
      case 'shift':
        return (d) => {
          const date = d['businessDate'] ? ` · ${String(d['businessDate'])}` : '';
          return `Shift${date}`;
        };
      case 'delivery':
        return (d) => `Delivery${d['waybillNumber'] ? ` · ${String(d['waybillNumber'])}` : ''}`;
      case 'expense':
        return (d) => `Expense${d['category'] ? ` · ${String(d['category'])}` : ''}`;
      case 'roster':
        return (d) => `Roster${d['weekStart'] ? ` · ${String(d['weekStart'])}` : ''}`;
      case 'membership':
        return () => 'Assignment';
      default:
        return () => 'Record';
    }
  }

  // Resolve a flat list of ids into a { id: Ref } map. Ids of unknown/irrelevant prefix are
  // simply absent from the map (the FE falls back to a muted raw render).
  async resolveRefs(orgId: string, ids: readonly string[]): Promise<RefMap> {
    const unique = [...new Set(ids)].filter((id) => typeof id === 'string' && id.length > 0);

    // Group ids by their type so we can batch one query per collection.
    const byType = new Map<RefType, string[]>();
    for (const id of unique) {
      const type = typeOf(id);
      if (!type) continue;
      const arr = byType.get(type) ?? [];
      arr.push(id);
      byType.set(type, arr);
    }

    const out: RefMap = {};
    // Hold membership→userId so we can label memberships with the person's name.
    const membershipUserId = new Map<string, string>();

    await Promise.all(
      [...byType.entries()].map(async ([type, typeIds]) => {
        const collName = this.collectionFor(type);
        if (!collName) return;

        // `users` is a GLOBAL identity collection (no orgId field); `orgs` is keyed by its own
        // _id. For users we resolve by _id but gate to people who are members of THIS org, so a
        // foreign user id can't leak a name cross-tenant. All other docs carry orgId.
        if (type === 'user') {
          const memberUserIds = await this.orgMemberUserIds(orgId, typeIds);
          if (memberUserIds.length === 0) return;
          const docs = await this.coll(COLLECTION.users)
            .find({ _id: { $in: memberUserIds } })
            .toArray();
          const label = this.labeller('user');
          for (const doc of docs) {
            out[String(doc['_id'])] = { type, label: label(doc), hrefKind: HREF_KIND.user };
          }
          return;
        }

        const docs = await this.coll(collName)
          .find({ _id: { $in: typeIds }, ...(type === 'org' ? {} : { orgId }) })
          .toArray();
        const label = this.labeller(type);
        for (const doc of docs) {
          const id = String(doc['_id']);
          out[id] = { type, label: label(doc), hrefKind: HREF_KIND[type] };
          if (type === 'membership' && doc['userId']) {
            membershipUserId.set(id, String(doc['userId']));
          }
        }
      }),
    );

    // Second pass: label memberships with their user's name (and link to the user).
    const needUsers = [...new Set(membershipUserId.values())].filter((uid) => !out[uid]);
    if (needUsers.length > 0) {
      const memberUserIds = await this.orgMemberUserIds(orgId, needUsers);
      const users = await this.coll(COLLECTION.users)
        .find({ _id: { $in: memberUserIds } })
        .toArray();
      const nameById = new Map(users.map((d) => [String(d['_id']), String(d['name'] ?? '')]));
      for (const [mbrId, uid] of membershipUserId) {
        const name = nameById.get(uid) ?? out[uid]?.label;
        if (name && out[mbrId]) out[mbrId] = { ...out[mbrId]!, label: name };
      }
    }

    return out;
  }

  // Collect every id-looking string from arbitrary before/after audit payloads, so ids nested
  // in a diff also resolve. Shallow scan of string values that match the prefix pattern.
  collectIdsFromValue(value: unknown, into: Set<string>): void {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') {
      if (typeOf(value)) into.add(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const v of value) this.collectIdsFromValue(v, into);
      return;
    }
    if (typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>)) {
        this.collectIdsFromValue(v, into);
      }
    }
  }
}

export const refsService = RefsService.getInstance();
