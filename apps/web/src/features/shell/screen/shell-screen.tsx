import { Outlet } from 'react-router-dom';

import { ShellSidebar } from '../parts/shell-sidebar.tsx';
import { ShellTopbar } from '../parts/shell-topbar.tsx';
import { useCurrentBranch } from '../utils/use-current-branch.ts';

// The authed app shell — sidebar (permission-gated nav) + topbar (branch switcher,
// notifications, sign-out) + the routed screen in the outlet. Lives behind AuthGuard.
export function ShellScreen() {
  const { branchId, branches } = useCurrentBranch();

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      <ShellSidebar branchId={branchId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellTopbar branchId={branchId} branches={branches} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
