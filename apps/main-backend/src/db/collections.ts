// Central collection-name registry. Mongo-specific naming lives here so a DB swap touches
// this file + the *.repo.mongo.ts files only.
export const COLLECTION = {
  orgs: 'orgs',
  users: 'users',
  memberships: 'memberships',
  roles: 'roles',
  branches: 'branches',
  tanks: 'tanks',
  pumps: 'pumps',
  roster: 'roster',
  shifts: 'shifts',
  dips: 'dips',
  deliveries: 'deliveries',
  prices: 'prices',
  expenses: 'expenses',
  notes: 'notes',
  notifications: 'notifications',
  audit: 'audit_log',
  otps: 'otps',
  sessions: 'refresh_tokens',
} as const;
