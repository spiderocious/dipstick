import type { Request } from 'express';

import type { Permission } from '@dipstick/core';

// The authenticated principal, attached to req by requireAuth and enriched by
// resolveBranchScope. Controllers read `req.auth` (asserted present after requireAuth ran).
export interface AuthContext {
  userId: string;
  orgId: string;
  // Set once a branch is resolved for the request: the caller's effective permissions for
  // that branch, plus the membership/branch in play.
  branchId?: string;
  permissions?: Set<Permission>;
  membershipId?: string;
  // The attendant's own pump default — used by shift.close.own checks.
  defaultPumpId?: string | null;
}

export interface AuthedRequest extends Request {
  auth?: AuthContext;
}

// Narrow helper: after requireAuth, controllers call this to get a guaranteed AuthContext.
export const getAuth = (req: Request): AuthContext => {
  const auth = (req as AuthedRequest).auth;
  if (!auth) throw new Error('getAuth called before requireAuth ran');
  return auth;
};
