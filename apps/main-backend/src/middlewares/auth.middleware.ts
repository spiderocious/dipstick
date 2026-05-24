import type { NextFunction, Request, Response } from 'express';

import { UnauthenticatedError } from '@lib/errors.js';
import { verifyAccessToken } from '@lib/auth/jwt.js';
import type { AuthedRequest } from '@lib/http/authedRequest.js';
import { requestContext } from '@lib/http/requestContext.js';
import { messages } from '@lib/messages.js';

// Verifies the Bearer access token and attaches req.auth. Throws 1002 on any failure.
// Synchronous (jwt.verify is sync) so it composes without asyncHandler — but errors still
// flow to the error middleware because Express catches throws from sync middleware.
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthenticatedError(messages.get('token_invalid'));
  }
  const token = header.slice('Bearer '.length).trim();
  const claims = verifyAccessToken(token);
  if (!claims) throw new UnauthenticatedError(messages.get('token_expired'));

  (req as AuthedRequest).auth = { userId: claims.sub, orgId: claims.orgId };
  requestContext.set('userId', claims.sub);
  requestContext.set('orgId', claims.orgId);
  next();
};
