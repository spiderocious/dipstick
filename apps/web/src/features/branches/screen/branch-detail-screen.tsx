import { P, formatNaira, type Product } from '@dipstick/core';
import { useArchiveBranch, useBranch, type PumpWire, type TankWire } from '@dipstick/api';
import {
  AppButton,
  AppPill,
  AppProductMark,
  AppProgressBar,
  AppSheet,
  SheetHead,
  type AppProgressTone,
} from '@dipstick/ui';
import { useParams } from 'react-router-dom';

import { IconEdit } from '@icons';

import { useAuth } from '@shared/auth';
import { DrawerService } from '@shared/drawer';
import { PageBody, PageHead, QueryState } from '@shared/screen';
import { formatLitres } from '@shared/format';
import { PUMP_STATE_LABEL } from '@shared/copy/labels.ts';

import { BRANCH_DETAIL_COPY } from '../branches.copy.ts';

export function BranchDetailScreen() {
  const { branchId = '' } = useParams<{ branchId: string }>();
  const { can } = useAuth();
  const query = useBranch(branchId);
  const archive = useArchiveBranch(branchId);

  function handleArchive() {
    DrawerService.confirm(BRANCH_DETAIL_COPY.archiveTitle, BRANCH_DETAIL_COPY.archiveBody, {
      confirmLabel: BRANCH_DETAIL_COPY.archive,
      onConfirm: () =>
        archive.mutate(undefined, {
          onSuccess: () => DrawerService.toast(BRANCH_DETAIL_COPY.archive, { mark: BRANCH_DETAIL_COPY.archivedMark }),
        }),
    });
  }

  return (
    <PageBody>
      <QueryState isLoading={query.isLoading} isError={query.isError} data={query.data}>
        {(branch) => (
          <>
            <PageHead
              overline={`${BRANCH_DETAIL_COPY.overline} · ${branch.city}, ${branch.state}`}
              title={branch.name}
              actions={
                can(P.CAN_ARCHIVE_BRANCH) && !branch.is_archived ? (
                  <AppButton variant="danger" size="sm" onClick={handleArchive}>
                    {BRANCH_DETAIL_COPY.archive}
                  </AppButton>
                ) : undefined
              }
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <AppSheet pad="md">
                <SheetHead title={BRANCH_DETAIL_COPY.tanksHeading} />
                <div className="flex flex-col gap-4">
                  {branch.tanks.map((t) => (
                    <TankReadout key={t.id} tank={t} />
                  ))}
                  {branch.tanks.length === 0 && (
                    <p className="font-serif text-[13px] italic text-ink-tertiary">No tanks yet.</p>
                  )}
                </div>
              </AppSheet>

              <AppSheet pad="md">
                <SheetHead title={BRANCH_DETAIL_COPY.pumpsHeading} />
                <div className="flex flex-col gap-2.5">
                  {branch.pumps.map((p) => (
                    <PumpRow key={p.id} pump={p} />
                  ))}
                  {branch.pumps.length === 0 && (
                    <p className="font-serif text-[13px] italic text-ink-tertiary">No pumps yet.</p>
                  )}
                </div>
              </AppSheet>
            </div>

            <div className="mt-5">
              <AppSheet pad="md">
                <SheetHead title={BRANCH_DETAIL_COPY.settingsHeading} />
                <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                  <SettingRow k="Require closing dip" v={branch.settings.require_closing_dip ? 'Yes' : 'No'} />
                  <SettingRow k="Manager may set price" v={branch.settings.manager_may_set_price ? 'Yes' : 'No'} />
                  <SettingRow k="Variance flag" v={formatNaira(branch.settings.variance_flag_kobo)} />
                  <SettingRow k="Delivery tolerance" v={`${formatLitres(branch.settings.delivery_tolerance_litres)} L`} />
                </dl>
              </AppSheet>
            </div>

            <div className="mt-3 flex items-center gap-2 text-ink-tertiary">
              <IconEdit size={13} aria-hidden="true" />
              <span className="font-mono text-[11px] uppercase tracking-[0.06em]">{branch.id}</span>
            </div>
          </>
        )}
      </QueryState>
    </PageBody>
  );
}

function tankTone(pct: number, reorderPct: number): AppProgressTone {
  if (pct <= reorderPct) return 'short';
  if (pct <= reorderPct * 1.5) return 'watch';
  return 'ok';
}

function TankReadout({ tank }: { readonly tank: TankWire }) {
  const current = tank.current_litres ?? 0;
  const pct = tank.capacity_litres > 0 ? Math.round((current / tank.capacity_litres) * 100) : 0;
  const reorderPct =
    tank.capacity_litres > 0 ? Math.round((tank.reorder_threshold_litres / tank.capacity_litres) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <AppProductMark product={tank.product as Product} />
        <span className="ml-auto font-mono text-[13px] tabular-nums text-ink">
          {formatLitres(current)} <span className="text-ink-tertiary">/ {formatLitres(tank.capacity_litres)} L</span>
        </span>
      </div>
      <AppProgressBar value={pct} target={reorderPct} tone={tankTone(pct, reorderPct)} />
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-tertiary">
        {pct}% · {BRANCH_DETAIL_COPY.reorderAt} {formatLitres(tank.reorder_threshold_litres)} L
      </div>
    </div>
  );
}

function PumpRow({ pump }: { readonly pump: PumpWire }) {
  const tone = pump.state === 'offline' ? 'short' : pump.state === 'live' ? 'ok' : 'paper';
  return (
    <div className="flex items-center gap-3 border-b border-hair-soft pb-2.5 last:border-b-0">
      <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-ink-secondary">{pump.label}</span>
      <AppProductMark product={pump.product as Product} chipOnly />
      <AppPill tone={tone} className="ml-auto">
        {PUMP_STATE_LABEL[pump.state] ?? pump.state}
      </AppPill>
    </div>
  );
}

function SettingRow({ k, v }: { readonly k: string; readonly v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-hair-soft py-1.5">
      <dt className="font-sans text-[12px] text-ink-tertiary">{k}</dt>
      <dd className="m-0 font-mono text-[12px] tabular-nums text-ink">{v}</dd>
    </div>
  );
}
