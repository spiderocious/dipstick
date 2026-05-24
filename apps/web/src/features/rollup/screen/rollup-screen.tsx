import { ROUTES, formatNaira } from '@dipstick/core';
import { useRollup, type RollupBranchWire, type RollupTodoWire } from '@dipstick/api';
import { AppButton, AppFigure, AppPill, AppSheet, type AppPillTone } from '@dipstick/ui';
import { Link, useNavigate } from 'react-router-dom';

import { IconBack, IconForward } from '@icons';

import { PageBody, PageHead, QueryState } from '@shared/screen';
import { formatLitres } from '@shared/format';

import { ROLLUP_COPY, STATUS_LABEL, STATUS_TONE } from '../rollup.copy.ts';

export function RollupScreen() {
  const navigate = useNavigate();
  const query = useRollup();

  return (
    <PageBody>
      <PageHead
        overline={ROLLUP_COPY.overline}
        title={ROLLUP_COPY.title}
        actions={
          <AppButton variant="ghost" size="sm" leadingIcon={<IconBack size={14} />} onClick={() => navigate(ROUTES.BRANCHES)}>
            {ROLLUP_COPY.backToBranches}
          </AppButton>
        }
      />
      <QueryState isLoading={query.isLoading} isError={query.isError} data={query.data}>
        {(data) => (
          <div className="flex flex-col gap-7">
            <p className="font-serif text-[18px] italic leading-[1.5] text-ink-secondary">{data.lead}</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <Totals label={ROLLUP_COPY.litres} value={formatLitres(data.totals.litres)} unit="L" />
              <Totals label={ROLLUP_COPY.gross} value={formatNaira(data.totals.gross_kobo, { withSymbol: false })} naira />
              <Totals
                label={ROLLUP_COPY.variance}
                value={formatNaira(Math.abs(data.totals.variance_kobo), { withSymbol: false })}
                naira
                tone={data.totals.variance_kobo > 0 ? 'short' : 'default'}
              />
            </div>

            <section>
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-tertiary">
                {ROLLUP_COPY.branchesHeading}
              </h2>
              <div className="overflow-hidden rounded-card border border-sheet-edge">
                {data.branches.map((b) => (
                  <BranchRow key={b.id} branch={b} />
                ))}
              </div>
            </section>

            <TodoList todo={data.todo} />
          </div>
        )}
      </QueryState>
    </PageBody>
  );
}

function Totals({
  label,
  value,
  unit,
  naira,
  tone = 'default',
}: {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly naira?: boolean;
  readonly tone?: 'default' | 'short';
}) {
  return (
    <AppSheet pad="md">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-tertiary">{label}</div>
      <div className="mt-2">
        <AppFigure value={value} size="md" unit={unit} naira={naira} tone={tone} />
      </div>
    </AppSheet>
  );
}

function BranchRow({ branch }: { readonly branch: RollupBranchWire }) {
  const tone: AppPillTone = STATUS_TONE[branch.status] ?? 'default';
  const varianceClass =
    branch.variance_kobo > 0
      ? 'font-mono text-[13px] font-semibold tabular-nums text-oxblood'
      : 'font-mono text-[13px] tabular-nums text-emerald';
  return (
    <Link
      to={ROUTES.BRANCH_DAYBOOK(branch.id)}
      className="flex flex-col gap-2 border-b border-hair bg-sheet px-4 py-3.5 last:border-b-0 hover:bg-recessed/40 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
    >
      {/* Name + status (+ chevron on mobile, pinned right) */}
      <div className="flex min-w-0 items-center gap-3 sm:flex-1">
        <span className="min-w-0 truncate font-serif text-[15px] font-medium text-ink">{branch.name}</span>
        <AppPill tone={tone} dot>
          {STATUS_LABEL[branch.status] ?? branch.status}
        </AppPill>
        <IconForward size={15} className="ml-auto text-ink-tertiary sm:hidden" aria-hidden="true" />
      </div>
      {/* Figures — wrap to a second line on mobile, inline-right on desktop */}
      <div className="flex items-baseline gap-5 sm:gap-4">
        <span className="font-mono text-[13px] tabular-nums text-ink-secondary">{formatLitres(branch.litres)} L</span>
        <span className="font-mono text-[13px] tabular-nums text-ink sm:w-32 sm:text-right">
          {formatNaira(branch.gross_kobo)}
        </span>
        <span className={`${varianceClass} sm:w-28 sm:text-right`}>
          {branch.variance_kobo === 0 ? '₦0.00' : formatNaira(-branch.variance_kobo)}
        </span>
      </div>
      <IconForward size={15} className="hidden flex-shrink-0 text-ink-tertiary sm:block" aria-hidden="true" />
    </Link>
  );
}

function TodoList({ todo }: { readonly todo: RollupTodoWire[] }) {
  if (todo.length === 0) {
    return (
      <AppSheet pad="md">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-tertiary">
          {ROLLUP_COPY.todoHeading}
        </div>
        <p className="mt-2 font-serif text-[14px] italic text-ink-tertiary">{ROLLUP_COPY.todoEmpty}</p>
      </AppSheet>
    );
  }
  return (
    <section>
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-tertiary">
        {ROLLUP_COPY.todoHeading}
      </h2>
      <div className="flex flex-col gap-2">
        {todo.map((item, i) => (
          <div
            key={`${item.branch_id}-${i}`}
            className="flex items-center gap-3 rounded-[2px] border border-sheet-edge border-l-[3px] border-l-oxblood bg-sheet px-4 py-3"
          >
            <Link to={ROUTES.BRANCH_DAYBOOK(item.branch_id)} className="font-serif text-[14px] text-ink hover:underline">
              {item.message}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
