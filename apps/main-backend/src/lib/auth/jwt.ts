import jwt from 'jsonwebtoken';

import { env } from '../../env.js';

// Access token claims. orgId is carried so authorization can resolve memberships without a
// round-trip on every request; permissions are resolved per-branch in the middleware.
export interface AccessClaims {
  sub: string; // userId
  orgId: string;
  typ: 'access';
}

export interface RefreshClaims {
  sub: string;
  sid: string; // session/refresh-token id (for revocation)
  typ: 'refresh';
}

export const signAccessToken = (userId: string, orgId: string): string =>
  jwt.sign({ sub: userId, orgId, typ: 'access' } satisfies AccessClaims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);

export const signRefreshToken = (userId: string, sessionId: string): string =>
  jwt.sign(
    { sub: userId, sid: sessionId, typ: 'refresh' } satisfies RefreshClaims,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions,
  );

// Returns claims on success, null on any failure (expired, malformed, wrong secret/type).
// The controller maps null to a 1002 auth error — verification never throws upward.
export const verifyAccessToken = (token: string): AccessClaims | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded !== 'object' || decoded === null) return null;
    const claims = decoded as Partial<AccessClaims>;
    if (claims.typ !== 'access' || !claims.sub || !claims.orgId) return null;
    return { sub: claims.sub, orgId: claims.orgId, typ: 'access' };
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): RefreshClaims | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    if (typeof decoded !== 'object' || decoded === null) return null;
    const claims = decoded as Partial<RefreshClaims>;
    if (claims.typ !== 'refresh' || !claims.sub || !claims.sid) return null;
    return { sub: claims.sub, sid: claims.sid, typ: 'refresh' };
  } catch {
    return null;
  }
};
