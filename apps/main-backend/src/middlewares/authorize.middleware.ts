import type { NextFunction, Request, Response } from 'express';

import type { Permission } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ForbiddenError } from '@lib/errors.js';
import { getAuth, type AuthedRequest } from '@lib/http/authedRequest.js';
import { messages } from '@lib/messages.js';
import { requestContext } from '@lib/http/requestContext.js';

import { membershipRepo, roleRepo } from '../features/auth/auth.repo.mongo.js';

// Resolves the target branch this request scopes to. Some routes carry no `:branchId` but
// still operate on a branch-scoped resource (e.g. PATCH /staff/:membershipId targets the
// staff member's branch). A route may supply a resolver to find that branch; otherwise the
// `:branchId` route param is used, and absent both the request is treated as org-wide ('*').
export type BranchResolver = (req: Request) => Promise<string | null>;

// Resolve the caller's effective permissions for the branch this request targets and stash
// them on req.auth.
//
// Scoping precedence: an explicit resolver's branchId, else the `:branchId` route param,
// else org-wide. The caller's membership for that branch is matched (exact branch, or their
// org-wide '*' membership) — so an Owner ('*') always resolves, and a branch-scoped Manager
// resolves when the target is their branch.
//
// Cross-tenant / cross-branch access fails as 403 (forbidden) — never 404 — so existence is
// not leaked.
const loadScope = async (req: Request, resolver?: BranchResolver): Promise<void> => {
  const auth = getAuth(req);
  const resolved = resolver ? await resolver(req) : null;
  const branchId = resolved ?? (req.params['branchId'] as string | undefined) ?? null;

  const membership = branchId
    ? await membershipRepo.findForBranch(auth.orgId, auth.userId, branchId)
    : (await membershipRepo.findByUser(auth.userId)).find((m) => m.branchId === '*') ?? null;

  if (!membership) throw new ForbiddenError(messages.get('not_a_member'));

  const role = await roleRepo.findById(membership.roleId);
  const permissions = new Set<Permission>(role?.permissions ?? []);

  const a = (req as AuthedRequest).auth!;
  if (branchId) a.branchId = branchId;
  a.permissions = permissions;
  a.membershipId = membership._id;
  a.defaultPumpId = membership.defaultPumpId;
  requestContext.set('role', role?.name ?? 'unknown');
};

// requirePermission(P.X) — resolves scope (once) then asserts the permission. Compose
// multiple by passing several; ANY of them satisfies (OR).
export const requirePermission = (...anyOf: Permission[]) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!auth.permissions) await loadScope(req);
    const perms = getAuth(req).permissions!;
    const allowed = anyOf.some((p) => perms.has(p));
    if (!allowed) throw new ForbiddenError(messages.get('forbidden'));
    next();
  });

// Like requirePermission, but scope resolves against a branch the route computes (e.g. the
// branch of the resource named by a non-:branchId param). Used where the resource id is not
// itself a branch but belongs to one (PATCH /staff/:membershipId).
export const requirePermissionForBranch = (resolver: BranchResolver, ...anyOf: Permission[]) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    await loadScope(req, resolver);
    const perms = getAuth(req).permissions!;
    const allowed = anyOf.some((p) => perms.has(p));
    if (!allowed) throw new ForbiddenError(messages.get('forbidden'));
    next();
  });

// Resolve scope without asserting a specific permission (e.g. for an endpoint gated only by
// membership). Useful as the first middleware where the handler does its own fine checks.
export const resolveScope = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!auth.permissions) await loadScope(req);
    next();
  },
);
