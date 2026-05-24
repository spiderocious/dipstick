import { ROUTES } from '@dipstick/core';
import { useLogout, type BranchWire } from '@dipstick/api';
import { AppButton, AppSelect } from '@dipstick/ui';
import { type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { IconLogout } from '@icons';

import { useAuth } from '@shared/auth';
import { DrawerService } from '@shared/drawer';

import { ShellNotifications } from './shell-notifications.tsx';

interface ShellTopbarProps {
  readonly branchId: string;
  readonly branches: BranchWire[];
}

export function ShellTopbar({ branchId, branches }: ShellTopbarProps) {
  const navigate = useNavigate();
  const { me } = useAuth();
  const logout = useLogout();

  function handleBranchChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next !== '') navigate(ROUTES.BRANCH_DAYBOOK(next));
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSettled: () => navigate(ROUTES.LOGIN, { replace: true }),
    });
    DrawerService.toast('Signed out.', { mark: '✓ SIGNED OUT' });
  }

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-sheet-edge bg-paper px-6">
      {branches.length > 0 && (
        <AppSelect value={branchId} onChange={handleBranchChange} aria-label="Current branch" className="min-w-[180px]">
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.is_archived ? ' · archived' : ''}
            </option>
          ))}
        </AppSelect>
      )}

      <div className="ml-auto flex items-center gap-3">
        <ShellNotifications />
        <span className="font-sans text-[13px] text-ink-secondary">{me?.user.name}</span>
        <AppButton variant="ghost" size="sm" leadingIcon={<IconLogout size={15} />} onClick={handleLogout}>
          Sign out
        </AppButton>
      </div>
    </header>
  );
}
