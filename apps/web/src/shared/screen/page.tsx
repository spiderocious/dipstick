import { AppSkeleton, cn } from '@dipstick/ui';
import type { ReactNode } from 'react';

import { IconAlert } from '@icons';

// Shared screen scaffold. PageHead is the ledger "stamp": mono overline + serif title + meta,
// over a heavy ink rule. PageBody pads the broadsheet column.

interface PageHeadProps {
  readonly overline?: string;
  readonly title: ReactNode;
  readonly meta?: ReactNode;
  readonly actions?: ReactNode;
}

export function PageHead({ overline, title, meta, actions }: PageHeadProps) {
  return (
    <div className="mb-8 flex items-end gap-4 border-b border-ink pb-4">
      <div className="min-w-0">
        {overline !== undefined && (
          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-tertiary">
            {overline}
          </div>
        )}
        <h1 className="m-0 font-serif text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink">
          {title}
        </h1>
      </div>
      {meta !== undefined && (
        <div className="ml-auto font-mono text-[11px] text-ink-tertiary">{meta}</div>
      )}
      {actions !== undefined && (
        <div className={cn('flex items-center gap-2', meta === undefined && 'ml-auto')}>{actions}</div>
      )}
    </div>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-[1100px] px-10 py-10', className)}>{children}</div>;
}

// QueryState — the loading / error / empty / loaded gate every data screen uses.
interface QueryStateProps<T> {
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly data: T | undefined;
  readonly isEmpty?: (data: T) => boolean;
  readonly empty?: ReactNode;
  readonly children: (data: T) => ReactNode;
}

export function QueryState<T>({ isLoading, isError, data, isEmpty, empty, children }: QueryStateProps<T>) {
  if (isLoading) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <AppSkeleton width="40%" size="lg" />
        <AppSkeleton width="100%" />
        <AppSkeleton width="90%" />
        <AppSkeleton width="95%" />
      </div>
    );
  }
  if (isError || data === undefined) {
    return (
      <div role="alert" className="flex items-center gap-3 rounded-card border border-sheet-edge bg-sheet px-5 py-4">
        <IconAlert size={18} className="text-oxblood" aria-hidden="true" />
        <span className="font-serif text-[14px] italic text-ink-secondary">
          Couldn’t load this. Check your connection and try again.
        </span>
      </div>
    );
  }
  if (isEmpty?.(data) === true && empty !== undefined) return <>{empty}</>;
  return <>{children(data)}</>;
}
