import { ROUTES } from '@dipstick/core';
import { hasSession } from '@dipstick/api';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from './auth-provider.tsx';

// Gate for the authed app shell. No token → straight to login. Token but /me still loading →
// a quiet paper-toned wait. Token rejected (me failed to load) → also bounce to login.
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (!hasSession()) return <Navigate to={ROUTES.LOGIN} replace />;
  if (isLoading) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-paper font-mono text-[11px] uppercase tracking-[0.14em] text-ink-tertiary"
      >
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  return <>{children}</>;
}
