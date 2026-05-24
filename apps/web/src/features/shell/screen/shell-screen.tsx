import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { ShellSidebar } from '../parts/shell-sidebar.tsx';
import { ShellTopbar } from '../parts/shell-topbar.tsx';
import { useCurrentBranch } from '../utils/use-current-branch.ts';

// The in-branch shell — sidebar (branch-scoped nav + back-to-branches) + topbar (branch switcher,
// account menu) + the routed screen. On desktop the sidebar is a static column; on mobile it is a
// hidden drawer toggled by the topbar hamburger. Only mounts under /branches/:branchId/*.
export function ShellScreen() {
  const { branchId, branches } = useCurrentBranch();
  const branchName = branches.find((b) => b.id === branchId)?.name ?? '';
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile drawer whenever the route changes (a nav tap navigated).
  const closeNav = () => setNavOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      <ShellSidebar
        key={pathname}
        branchId={branchId}
        branchName={branchName}
        open={navOpen}
        onClose={closeNav}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellTopbar branchId={branchId} branches={branches} onOpenNav={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
