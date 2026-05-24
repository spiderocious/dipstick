import { P, ROUTES } from '@dipstick/core';
import { useBranches } from '@dipstick/api';
import { AppButton, AppEmptyState, AppPill } from '@dipstick/ui';
import { Link, useNavigate } from 'react-router-dom';

import { IconBranch, IconChart, IconForward, IconPlus } from '@icons';

import { useAuth } from '@shared/auth';
import { PageBody, PageHead, QueryState } from '@shared/screen';

import { BRANCHES_COPY } from '../branches.copy.ts';
import { openBranchCreate } from './parts/branch-form.tsx';

export function BranchesScreen() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const query = useBranches();
  const canCreate = can(P.CAN_CREATE_BRANCH);
  const canViewOverview = can(P.CAN_VIEW_ROLLUP);

  return (
    <PageBody>
      <PageHead
        overline={BRANCHES_COPY.overline}
        title={BRANCHES_COPY.title}
        actions={
          <div className="flex items-center gap-2">
            {canViewOverview && (
              <AppButton variant="secondary" leadingIcon={<IconChart size={15} />} onClick={() => navigate(ROUTES.DASHBOARD)}>
                {BRANCHES_COPY.overviewButton}
              </AppButton>
            )}
            {canCreate && (
              <AppButton leadingIcon={<IconPlus size={15} />} onClick={openBranchCreate}>
                {BRANCHES_COPY.newBranch}
              </AppButton>
            )}
          </div>
        }
      />
      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        data={query.data}
        isEmpty={(items) => items.length === 0}
        empty={
          <AppEmptyState
            icon={<IconBranch size={40} aria-hidden="true" />}
            title={BRANCHES_COPY.emptyTitle}
            description={BRANCHES_COPY.emptyBody}
          >
            {canCreate ? (
              <AppButton leadingIcon={<IconPlus size={15} />} onClick={openBranchCreate}>
                {BRANCHES_COPY.newBranch}
              </AppButton>
            ) : undefined}
          </AppEmptyState>
        }
      >
        {(items) => (
          <div className="overflow-hidden rounded-card border border-sheet-edge">
            {items.map((b) => (
              <Link
                key={b.id}
                to={ROUTES.BRANCH(b.id)}
                className="flex items-center gap-4 border-b border-hair bg-sheet px-5 py-4 last:border-b-0 hover:bg-recessed/40"
              >
                <div className="min-w-0">
                  <div className="font-serif text-[16px] font-medium text-ink">{b.name}</div>
                  <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-tertiary">
                    {b.city} · {b.state}
                  </div>
                </div>
                {b.is_archived && (
                  <AppPill tone="paper" className="ml-2">
                    {BRANCHES_COPY.archived}
                  </AppPill>
                )}
                <IconForward size={16} className="ml-auto text-ink-tertiary" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </QueryState>
    </PageBody>
  );
}
