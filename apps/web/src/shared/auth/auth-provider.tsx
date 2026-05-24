import { ORG_WIDE_SCOPE, type Permission } from '@dipstick/core';
import { hasSession, useMe, type MeWire, type MembershipWire } from '@dipstick/api';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

// Auth context — exposes the current user, memberships, the effective permission set, and a
// `can()` gate the whole UI keys off. Permissions come from GET /me (per-membership effective
// set). The owner has an org-wide ('*') membership and therefore sees every branch.

interface AuthContextValue {
  readonly me: MeWire | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  /** Union of every membership's permissions. */
  readonly permissions: ReadonlySet<Permission>;
  /** True if the user has an org-wide membership (the owner). */
  readonly isOwner: boolean;
  /** Branch ids the user can see ('*' owners see all — represented by isOwner). */
  readonly branchScopes: readonly string[];
  can(permission: Permission): boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function collectPermissions(memberships: MembershipWire[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const m of memberships) {
    for (const p of m.permissions) set.add(p);
  }
  return set;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const enabled = hasSession();
  const { data, isLoading } = useMe(enabled);

  const value = useMemo<AuthContextValue>(() => {
    const me = data ?? null;
    const memberships = me?.memberships ?? [];
    const permissions = collectPermissions(memberships);
    const isOwner = memberships.some((m) => m.branch_id === ORG_WIDE_SCOPE);
    const branchScopes = memberships
      .map((m) => m.branch_id)
      .filter((id) => id !== ORG_WIDE_SCOPE);

    return {
      me,
      isLoading: enabled && isLoading,
      isAuthenticated: me !== null,
      permissions,
      isOwner,
      branchScopes,
      can: (permission) => permissions.has(permission),
    };
  }, [data, enabled, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
