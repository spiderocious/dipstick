import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

/**
 * AppSkeleton / AppEmptyState — loading and empty.
 *
 * Visual spec: design-system/projects/dipstick/preview/25-skeletons-empty.html
 * Tokens:      design-system/projects/dipstick/preview/_foundation.css
 *
 * Loading is a faint paper-tone rectangle — no shimmer waltz. Empty states are
 * written like a ledger note ("no entries yet, here is what to do") and never
 * apologize.
 */
export type AppSkeletonSize = 'sm' | 'md' | 'lg';

export interface AppSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  size?: AppSkeletonSize;
  /** CSS width — e.g. '60%', 90 (px). */
  width?: string | number;
}

const SIZE_CLASSES: Record<AppSkeletonSize, string> = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-[22px]',
};

export function AppSkeleton({ size = 'md', width, className, style, ...rest }: AppSkeletonProps) {
  const widthStyle: CSSProperties =
    width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {};
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-[2px] bg-recessed', SIZE_CLASSES[size], className)}
      style={{ ...widthStyle, ...style }}
      {...rest}
    />
  );
}

export interface AppEmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** A 64×64-ish glyph. */
  icon?: ReactNode;
  /** Actions row — buttons, links. */
  children?: ReactNode;
  className?: string;
}

export function AppEmptyState({ title, description, icon, children, className }: AppEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-14 text-center', className)}>
      {icon !== undefined && <span className="text-ink-tertiary">{icon}</span>}
      <div className="font-serif text-[22px] font-semibold tracking-[-0.018em] text-ink">{title}</div>
      {description !== undefined && (
        <p className="m-0 max-w-[44ch] font-serif text-[14px] italic leading-[1.5] text-ink-tertiary">
          {description}
        </p>
      )}
      {children !== undefined && <div className="mt-2 flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  );
}
