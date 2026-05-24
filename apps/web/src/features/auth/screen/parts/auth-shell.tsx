import type { ReactNode } from 'react';

// The auth canvas: warm paper, a single centered sheet, the Dipstick wordmark above it. No app
// chrome (sidebar/topbar) — these screens live outside the shell.
interface AuthShellProps {
  readonly overline: string;
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

export function AuthShell({ overline, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12 sm:px-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-7 text-center">
          <span className="font-serif text-[26px] font-semibold tracking-[-0.02em] text-ink">
            Dipstick<span className="text-emerald">.</span>
          </span>
        </div>

        <div className="rounded-card border border-sheet-edge bg-sheet px-7 py-7">
          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-tertiary">
            {overline}
          </div>
          <h1 className="m-0 font-serif text-[24px] font-semibold leading-[1.1] tracking-[-0.018em] text-ink">
            {title}
          </h1>
          <p className="mb-6 mt-1 font-serif text-[14px] italic leading-[1.4] text-ink-tertiary">
            {subtitle}
          </p>
          {children}
        </div>

        {footer !== undefined && <div className="mt-5 text-center">{footer}</div>}
      </div>
    </div>
  );
}
