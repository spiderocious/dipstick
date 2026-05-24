import { ROUTES } from '@dipstick/core';
import { Link, Outlet } from 'react-router-dom';

import { AccountMenu } from '../parts/account-menu.tsx';

// Full-width authed layout with NO sidebar — used for the branches list, the overview, and
// settings. The sidebar shell only appears once you enter a branch. A slim header carries the
// wordmark (back to the branches list) and the account menu.
export function BareLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-sheet-edge bg-paper px-4 sm:px-8">
        <Link to={ROUTES.BRANCHES} className="font-serif text-[20px] font-semibold tracking-[-0.02em] text-ink">
          Dipstick<span className="text-emerald">.</span>
        </Link>
        <div className="ml-auto">
          <AccountMenu />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
