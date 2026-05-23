import { AppButton, AppEmptyState, AppSheet, AppSkeleton } from '@dipstick/ui';

import { IconCheck, IconDaybook, IconSearch } from '@icons';

import { PageHead, RefBlock, SectionBreak } from './preview-canvas.tsx';

function SkeletonRow() {
  return (
    <div
      className="grid items-baseline gap-4 py-3.5"
      style={{ gridTemplateColumns: '1fr 90px 130px 130px 28px', borderTop: '1px solid var(--hair)' }}
    >
      <div>
        <AppSkeleton size="lg" width="60%" />
        <AppSkeleton size="sm" width="30%" className="mt-1.5" />
      </div>
      <AppSkeleton width={60} className="ml-auto" />
      <AppSkeleton width={90} className="ml-auto" />
      <AppSkeleton width={80} className="ml-auto" />
      <AppSkeleton width={12} className="ml-auto" />
    </div>
  );
}

export function SkeletonPart() {
  return (
    <div>
      <PageHead
        index="38 / DISPLAY"
        title="Skeleton & empty"
        subtitle="AppSkeleton · AppEmptyState from @dipstick/ui"
      />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Loading is a faint paper-tone rectangle — no shimmer waltz. Empty states are written like a ledger
        note: "no entries yet, here is what to do." They never apologize.
      </p>

      <RefBlock title="Skeleton — day-book loading">
        <div className="w-full">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </RefBlock>

      <SectionBreak label="Empty — fresh branch" />
      <AppSheet>
        <AppEmptyState
          icon={<IconDaybook size={56} strokeWidth={1.5} />}
          title="No shifts yet today."
          description="Today is fresh. Open a pump shift when the first attendant clocks in — the day-book will start filling from the top."
        >
          <AppButton>Open morning shift</AppButton>
          <AppButton variant="secondary">Carry over from yesterday</AppButton>
        </AppEmptyState>
      </AppSheet>

      <SectionBreak label="Empty — no variances" />
      <AppSheet>
        <AppEmptyState
          icon={<IconCheck size={56} strokeWidth={1.5} />}
          title="Every shift balanced this week."
          description="Twelve shifts posted across Mokola, all variance at zero. This is rare — note it in the owner's review."
        />
      </AppSheet>

      <SectionBreak label="Empty — no search results" />
      <AppSheet>
        <AppEmptyState
          icon={<IconSearch size={56} strokeWidth={1.5} />}
          title={'Nothing matches "tunde 2024".'}
          description="Try Tunde Salami without the year, or open the staff page to find archived attendants."
        >
          <AppButton variant="secondary">Clear search</AppButton>
        </AppEmptyState>
      </AppSheet>
    </div>
  );
}
