import { formatRelative } from '@dipstick/core';
import { useAudit, type AuditEntryWire, type RefMap } from '@dipstick/api';
import { AppEmptyState } from '@dipstick/ui';
import { useParams } from 'react-router-dom';

import { IconAudit } from '@icons';

import { IdRef } from '@shared/id-ref';
import { PageBody, PageHead, QueryState } from '@shared/screen';

const AUDIT_COPY = {
  overline: 'Audit log',
  title: 'Every state-changing action.',
  emptyTitle: 'Nothing logged yet.',
  emptyBody: 'Actions on this branch appear here, newest first.',
} as const;

export function AuditScreen() {
  const { branchId = '' } = useParams<{ branchId: string }>();
  const query = useAudit(branchId);

  return (
    <PageBody>
      <PageHead overline={AUDIT_COPY.overline} title={AUDIT_COPY.title} />
      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data}
        isEmpty={(d) => d.items.length === 0}
        empty={
          <AppEmptyState icon={<IconAudit size={40} aria-hidden="true" />} title={AUDIT_COPY.emptyTitle} description={AUDIT_COPY.emptyBody} />
        }
      >
        {({ items, refs }) => (
          <ol className="m-0 list-none p-0">
            {items.map((entry) => (
              <AuditRow key={entry.id} entry={entry} refs={refs} />
            ))}
          </ol>
        )}
      </QueryState>
    </PageBody>
  );
}

function AuditRow({ entry, refs }: { readonly entry: AuditEntryWire; readonly refs: RefMap }) {
  return (
    <li className="flex gap-4 border-b border-hair-soft py-3.5 last:border-b-0">
      <span className="w-32 flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-tertiary">
        {formatRelative(entry.at)}
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-ink">{entry.action}</span>
          <span className="text-[12px] text-ink-secondary">
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-tertiary">
              {entry.entity_type}
            </span>{' '}
            <IdRef id={entry.entity_id} refs={refs} className="text-[12px]" />
          </span>
        </div>
        {entry.note !== null && entry.note !== '' && (
          <p className="mt-1 font-serif text-[13px] italic leading-[1.45] text-ink-secondary">“{entry.note}”</p>
        )}
        <div className="mt-0.5 text-[11px] text-ink-tertiary">
          by <IdRef id={entry.actor_id} refs={refs} className="text-[11px]" />
        </div>
      </div>
    </li>
  );
}
