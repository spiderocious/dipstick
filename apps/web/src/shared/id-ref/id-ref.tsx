import { ROUTES } from '@dipstick/core';
import type { RefMap, RefWire } from '@dipstick/api';
import { AppTooltip, cn } from '@dipstick/ui';
import { Link, useParams } from 'react-router-dom';

// Renders an opaque prefixed-ULID id as a HUMAN label, resolved via the `refs` map the
// backend returns alongside list data. Navigable refs (user/shift/delivery/branch) become a
// link wrapped in a "Go to <label>" tooltip; everything else renders as a plain label. An id
// missing from refs falls back to a muted mono string so the UI never breaks.
//
// Branch-scoped routes need a branchId: we take the ref's own branch when known, else the
// current route's :branchId (these screens are all branch-scoped).

interface IdRefProps {
  readonly id: string | null | undefined;
  readonly refs: RefMap;
  // Optional explicit branch for building branch-scoped hrefs (else the route param is used).
  readonly branchId?: string;
  readonly className?: string;
}

const hrefFor = (id: string, ref: RefWire, branchId: string | undefined): string | null => {
  switch (ref.href_kind) {
    case 'user':
      return branchId ? ROUTES.BRANCH_STAFF_MEMBER(branchId, id) : null;
    case 'shift':
      return branchId ? ROUTES.BRANCH_SHIFT(branchId, id) : null;
    case 'delivery':
      return branchId ? ROUTES.BRANCH_DELIVERY(branchId, id) : null;
    case 'branch':
      return ROUTES.BRANCH(id);
    default:
      return null;
  }
};

export function IdRef({ id, refs, branchId, className }: IdRefProps) {
  const params = useParams<{ branchId?: string }>();
  const resolvedBranch = branchId ?? params.branchId;

  if (!id) return <span className={cn('text-ink-tertiary', className)}>—</span>;

  const ref = refs[id];

  // Unknown id → muted, truncated mono fallback (never show the user a bare ULID prominently).
  if (!ref) {
    return (
      <span className={cn('font-mono text-[11px] text-ink-tertiary', className)} title={id}>
        {id}
      </span>
    );
  }

  const href = hrefFor(id, ref, resolvedBranch);
  const label = <span className={cn('font-serif', className)}>{ref.label}</span>;

  if (href === null) {
    // Label-only (role/pump/tank/roster/expense/org or missing branch context).
    return label;
  }

  return (
    <AppTooltip content={`Go to ${ref.label}`} compact>
      <Link to={href} className={cn('text-emerald underline-offset-2 hover:underline', className)}>
        {ref.label}
      </Link>
    </AppTooltip>
  );
}
