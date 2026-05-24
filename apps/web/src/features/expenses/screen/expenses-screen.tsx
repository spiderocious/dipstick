import { P, formatNaira } from '@dipstick/core';
import { useExpenses } from '@dipstick/api';
import { AppButton, AppEmptyState, AppPill } from '@dipstick/ui';
import { useParams } from 'react-router-dom';

import { IconExpense, IconPlus } from '@icons';

import { useAuth } from '@shared/auth';
import { PageBody, PageHead, QueryState } from '@shared/screen';
import { EXPENSE_CATEGORY_LABEL } from '@shared/copy/labels.ts';

import { EXPENSES_COPY } from '../expenses.copy.ts';
import { openAddExpense } from './parts/add-expense-form.tsx';

export function ExpensesScreen() {
  const { branchId = '' } = useParams<{ branchId: string }>();
  const { can } = useAuth();
  const query = useExpenses(branchId);

  return (
    <PageBody>
      <PageHead
        overline={EXPENSES_COPY.overline}
        title={EXPENSES_COPY.title}
        actions={
          can(P.CAN_RECORD_EXPENSE) ? (
            <AppButton leadingIcon={<IconPlus size={15} />} onClick={() => openAddExpense(branchId)}>
              {EXPENSES_COPY.add}
            </AppButton>
          ) : undefined
        }
      />
      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data}
        isEmpty={(items) => items.length === 0}
        empty={
          <AppEmptyState
            icon={<IconExpense size={40} aria-hidden="true" />}
            title={EXPENSES_COPY.emptyTitle}
            description={EXPENSES_COPY.emptyBody}
          />
        }
      >
        {(items) => (
          <div className="overflow-hidden rounded-card border border-sheet-edge">
            {items.map((x) => (
              <div key={x.id} className="flex items-center gap-4 border-b border-hair bg-sheet px-5 py-3.5 last:border-b-0">
                <div className="min-w-0">
                  <div className="font-serif text-[14px] text-ink">{x.description}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-tertiary">
                    {EXPENSE_CATEGORY_LABEL[x.category as keyof typeof EXPENSE_CATEGORY_LABEL] ?? x.category} · {x.business_date}
                  </div>
                </div>
                {x.is_single_source && (
                  <AppPill tone="watch" className="ml-2">
                    {EXPENSES_COPY.singleSource}
                  </AppPill>
                )}
                <span className="ml-auto font-mono text-[14px] tabular-nums text-ink">{formatNaira(x.amount_kobo)}</span>
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </PageBody>
  );
}
