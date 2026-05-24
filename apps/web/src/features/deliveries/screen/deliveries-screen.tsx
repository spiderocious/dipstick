import { P, ROUTES, formatNaira, type Product } from '@dipstick/core';
import { useDeliveries } from '@dipstick/api';
import { AppButton, AppEmptyState, AppPill, AppProductMark } from '@dipstick/ui';
import { Link, useParams } from 'react-router-dom';

import { IconForward, IconPlus, IconTruck } from '@icons';

import { useAuth } from '@shared/auth';
import { PageBody, PageHead, QueryState } from '@shared/screen';
import { formatLitres } from '@shared/format';

import { DELIVERIES_COPY, DELIVERY_STAGE_LABEL } from '../deliveries.copy.ts';
import { openRecordDelivery } from './parts/record-delivery-form.tsx';

const STAGE_TONE = (signed: boolean) => (signed ? 'ok' : 'info');

export function DeliveriesScreen() {
  const { branchId = '' } = useParams<{ branchId: string }>();
  const { can } = useAuth();
  const query = useDeliveries(branchId);

  return (
    <PageBody>
      <PageHead
        overline={DELIVERIES_COPY.overline}
        title={DELIVERIES_COPY.title}
        actions={
          can(P.CAN_RECORD_DELIVERY) ? (
            <AppButton leadingIcon={<IconPlus size={15} />} onClick={() => openRecordDelivery(branchId)}>
              {DELIVERIES_COPY.record}
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
            icon={<IconTruck size={40} aria-hidden="true" />}
            title={DELIVERIES_COPY.emptyTitle}
            description={DELIVERIES_COPY.emptyBody}
          />
        }
      >
        {(items) => (
          <div className="overflow-hidden rounded-card border border-sheet-edge">
            {items.map((d) => (
              <Link
                key={d.id}
                to={ROUTES.BRANCH_DELIVERY(branchId, d.id)}
                className="flex items-center gap-4 border-b border-hair bg-sheet px-5 py-4 last:border-b-0 hover:bg-recessed/40"
              >
                <AppProductMark product={d.product as Product} />
                <div className="min-w-0">
                  <div className="font-mono text-[13px] uppercase tracking-[0.06em] text-ink">{d.waybill_number}</div>
                  <div className="mt-0.5 font-serif text-[13px] text-ink-secondary">{d.supplier} · {d.driver_name}</div>
                </div>
                <span className="ml-auto font-mono text-[13px] tabular-nums text-ink-secondary">
                  {formatLitres(d.waybill_litres)} L
                </span>
                <span className="w-28 text-right font-mono text-[13px] tabular-nums text-ink">
                  {formatNaira(d.cost_per_litre_kobo)}
                </span>
                <AppPill tone={STAGE_TONE(d.stage === 'signed')} dot>
                  {DELIVERY_STAGE_LABEL[d.stage] ?? d.stage}
                </AppPill>
                <IconForward size={15} className="text-ink-tertiary" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </QueryState>
    </PageBody>
  );
}
