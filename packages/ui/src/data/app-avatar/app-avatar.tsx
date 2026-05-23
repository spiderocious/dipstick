import { type HTMLAttributes } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppAvatar — initials on a paper-toned circle.
 *
 * Visual spec: design-system/projects/dipstick/preview/26-avatars-pills.html  (.av)
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css  (.av-* :392-423)
 *
 * Three role tints, never random: owner = ink, manager = emerald, attendant =
 * paper. Initials are derived from the name unless `initials` is supplied.
 */
export type AppAvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AppAvatarRole = 'owner' | 'manager' | 'attendant';

export interface AppAvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  initials?: string;
  size?: AppAvatarSize;
  role?: AppAvatarRole;
}

const SIZE_CLASSES: Record<AppAvatarSize, string> = {
  sm: 'h-[22px] w-[22px] text-[9px]',
  md: 'h-8 w-8 text-[11px]',
  lg: 'h-11 w-11 text-sm',
  xl: 'h-[72px] w-[72px] text-[22px]',
};

const ROLE_CLASSES: Record<AppAvatarRole, string> = {
  owner: 'bg-ink text-paper border-ink',
  manager: 'bg-emerald/10 text-emerald border-emerald/40',
  attendant: 'bg-recessed text-ink-secondary border-sheet-edge',
};

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function AppAvatar({
  name,
  initials,
  size = 'md',
  role = 'attendant',
  className,
  ...rest
}: AppAvatarProps) {
  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        'inline-flex flex-shrink-0 select-none items-center justify-center rounded-full border font-sans font-semibold tracking-[0.02em]',
        SIZE_CLASSES[size],
        ROLE_CLASSES[role],
        className,
      )}
      {...rest}
    >
      {initials ?? deriveInitials(name)}
    </span>
  );
}

export interface AppPulseProps extends HTMLAttributes<HTMLSpanElement> {
  /** Accessible label, e.g. "On shift". */
  label?: string;
}

/** Live-shift indicator — an emerald dot with an expanding ring. */
export function AppPulse({ label = 'Live', className, ...rest }: AppPulseProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('ds-pulse inline-block h-1.5 w-1.5 rounded-full bg-emerald', className)}
      {...rest}
    />
  );
}
