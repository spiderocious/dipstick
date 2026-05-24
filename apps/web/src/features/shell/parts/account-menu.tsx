import { ROUTES } from '@dipstick/core';
import { useLogout } from '@dipstick/api';
import { AppButton } from '@dipstick/ui';
import { useNavigate } from 'react-router-dom';

import { IconLogout } from '@icons';

import { useAuth } from '@shared/auth';
import { DrawerService } from '@shared/drawer';

import { ShellNotifications } from './shell-notifications.tsx';

const SIGNED_OUT_MARK = '✓ SIGNED OUT' as const;

// The right-hand account cluster — notifications, the signed-in user's name, sign-out. Shared by
// both the bare top bar (branches/overview) and the branch shell topbar.
export function AccountMenu() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, {
      onSettled: () => navigate(ROUTES.LOGIN, { replace: true }),
    });
    DrawerService.toast('Signed out.', { mark: SIGNED_OUT_MARK });
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <ShellNotifications />
      <span className="hidden font-sans text-[13px] text-ink-secondary sm:inline">{me?.user.name}</span>
      <AppButton variant="ghost" size="sm" leadingIcon={<IconLogout size={15} />} onClick={handleLogout}>
        <span className="hidden sm:inline">Sign out</span>
        <span className="sm:hidden">Out</span>
      </AppButton>
    </div>
  );
}
