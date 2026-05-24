import { ROUTES } from '@dipstick/core';
import { type BranchWire } from '@dipstick/api';
import { AppSelect } from '@dipstick/ui';
import { type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { IconMenu } from '@icons';

import { AccountMenu } from './account-menu.tsx';

interface ShellTopbarProps {
  readonly branchId: string;
  readonly branches: BranchWire[];
  /** Opens the mobile nav drawer. */
  readonly onOpenNav: () => void;
}

// Topbar inside a branch — a mobile menu button, the branch switcher (jumps to that branch's
// day-book) + the account menu. The wordmark and nav live in the sidebar; this bar is branch-scoped.
export function ShellTopbar({ branchId, branches, onOpenNav }: ShellTopbarProps) {
  const navigate = useNavigate();

  function handleBranchChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next !== '') navigate(ROUTES.BRANCH_DAYBOOK(next));
  }

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-sheet-edge bg-paper px-3 sm:gap-4 sm:px-6">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenNav}
        className="-ml-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[3px] text-ink-secondary hover:bg-recessed hover:text-ink lg:hidden"
      >
        <IconMenu size={20} aria-hidden="true" />
      </button>

      {branches.length > 0 && (
        <AppSelect
          value={branchId}
          onChange={handleBranchChange}
          aria-label="Current branch"
          wrapperClassName="min-w-0 flex-shrink sm:min-w-[180px]"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.is_archived ? ' · archived' : ''}
            </option>
          ))}
        </AppSelect>
      )}
      <div className="ml-auto">
        <AccountMenu />
      </div>
    </header>
  );
}
