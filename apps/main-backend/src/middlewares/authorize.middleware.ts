import type { NextFunction, Request, Response } from 'express';

import type { Permission } from '@dipstick/core';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { ForbiddenError } from '@lib/errors.js';
import { getAuth, type AuthedRequest } from '@lib/http/authedRequest.js';
import { messages } from '@lib/messages.js';
import { requestContext } from '@lib/http/requestContext.js';

import { membershipRepo, roleRepo } from '../features/auth/auth.repo.mongo.js';

// Resolve the caller's effective permissions for the branch this request targets and stash
// them on req.auth. branchId is read from the route param `:branchId` if present; otherwise
// the request is org-scoped and we use the org-wide ('*') membership.
//
// Cross-tenant / cross-branch access fails as 403 (forbidden) — never 404 — so existence is
// not leaked.
const loadScope = async (req: Request): Promise<void> => {
  const auth = getAuth(req);
  const branchId = (req.params['branchId'] as string | undefined) ?? null;

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
// multiple by passing several; ANY of them satisfies (OR). Use requireAll for AND semantics.
export const requirePermission = (...anyOf: Permission[]) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!auth.permissions) await loadScope(req);
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
