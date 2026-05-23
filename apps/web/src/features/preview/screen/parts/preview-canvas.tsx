import type { ReactNode } from 'react';

interface PageHeadProps {
  readonly index: string;
  readonly title: string;
  readonly subtitle?: string;
}

export function PageHead({ index, title, subtitle }: PageHeadProps) {
  return (
    <div className="mb-9">
      <div
        className="font-mono uppercase mb-1"
        style={{ fontSize: '11px', color: 'var(--ink-3)', letterSpacing: '0.14em' }}
      >
        {index}
      </div>
      <h1
        className="font-serif font-medium"
        style={{ fontSize: '30px', letterSpacing: '-0.022em', color: 'var(--ink)', margin: 0 }}
      >
        {title}
      </h1>
      {subtitle !== undefined && subtitle !== '' && (
        <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface SectionBreakProps {
  readonly label: string;
}

export function SectionBreak({ label }: SectionBreakProps) {
  return (
    <div className="flex items-center gap-4 my-12">
      <span style={{ width: '24px', height: '1px', background: 'var(--hair)', display: 'block' }} />
      <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
        {label}
      </span>
      <span style={{ flex: 1, height: '1px', background: 'var(--hair)' }} />
    </div>
  );
}

interface RefBlockProps {
  readonly title?: string;
  readonly children: ReactNode;
}

export function RefBlock({ title = 'Variants · sizes · states', children }: RefBlockProps) {
  return (
    <div
      className="rounded-[14px]"
      style={{ background: 'var(--recessed)', border: '1px solid var(--hair)', padding: '22px' }}
    >
      <div
        className="font-sans font-semibold uppercase mb-3"
        style={{ fontSize: '11px', letterSpacing: '0.14em', color: 'var(--ink-3)' }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

interface RefRowProps {
  readonly label: string;
  readonly children: ReactNode;
}

export function RefRow({ label, children }: RefRowProps) {
  return (
    <div
      className="grid gap-4 py-3 items-center"
      style={{ gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--hair-soft)' }}
    >
      <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-3 items-center">{children}</div>
    </div>
  );
}
