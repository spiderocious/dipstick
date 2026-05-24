import { DELIVERY_STAGE, DELIVERY_STAGE_ORDER, P, formatNaira } from '@dipstick/core';
import {
  useDelivery,
  useSignDelivery,
  useStepDelivery,
  type DeliveryWire,
} from '@dipstick/api';
import { AppButton, AppFigure, AppInput, AppSheet, FieldRow, SheetHead } from '@dipstick/ui';
import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';

import { IconCheck } from '@icons';

import { useAuth } from '@shared/auth';
import { DrawerService } from '@shared/drawer';
import { useApiError } from '@shared/errors';
import { PageBody, PageHead, QueryState, ScrollX } from '@shared/screen';
import { formatLitres } from '@shared/format';

import { DELIVERY_DETAIL_COPY, DELIVERY_STAGE_LABEL } from '../deliveries.copy.ts';

const FIELD = { dip_before_litres: 'dip_before_litres', dip_after_litres: 'dip_after_litres', witness: 'witness' } as const;

export function DeliveryDetailScreen() {
  const { branchId = '', deliveryId = '' } = useParams<{ branchId: string; deliveryId: string }>();
  const query = useDelivery(deliveryId);

  return (
    <PageBody>
      <QueryState isLoading={query.isLoading} isError={query.isError} data={query.data}>
        {(delivery) => <DeliveryDetail delivery={delivery} branchId={branchId} />}
      </QueryState>
    </PageBody>
  );
}

function DeliveryDetail({ delivery, branchId }: { readonly delivery: DeliveryWire; readonly branchId: string }) {
  const { can } = useAuth();
  const signed = delivery.stage === DELIVERY_STAGE.SIGNED;
  const activeIndex = DELIVERY_STAGE_ORDER.indexOf(delivery.stage as (typeof DELIVERY_STAGE_ORDER)[number]);

  return (
    <>
      <PageHead overline={`${DELIVERY_DETAIL_COPY.overline} · ${delivery.waybill_number}`} title={delivery.supplier} />

      {/* Stage stepper — scrolls horizontally on a narrow phone rather than crushing labels */}
      <ScrollX className="mb-6">
      <ol className="flex min-w-[520px] items-center gap-2">
        {DELIVERY_STAGE_ORDER.map((stage, i) => {
          const done = i < activeIndex || signed;
          const active = i === activeIndex && !signed;
          return (
            <li key={stage} className="flex flex-1 items-center gap-2">
              <span
                className={
                  done
                    ? 'flex h-6 w-6 items-center justify-center rounded-full bg-emerald text-sheet'
                    : active
                      ? 'flex h-6 w-6 items-center justify-center rounded-full border border-ink text-ink'
                      : 'flex h-6 w-6 items-center justify-center rounded-full border border-hair text-ink-tertiary'
                }
              >
                {done ? <IconCheck size={13} aria-hidden="true" /> : <span className="font-mono text-[11px]">{i + 1}</span>}
              </span>
              <span className={active ? 'font-sans text-[12px] font-medium text-ink' : 'font-sans text-[12px] text-ink-tertiary'}>
                {DELIVERY_STAGE_LABEL[stage]}
              </span>
            </li>
          );
        })}
      </ol>
      </ScrollX>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <AppSheet pad="md">
          <SheetHead title={DELIVERY_DETAIL_COPY.waybillHeading} />
          <Row k={DELIVERY_DETAIL_COPY.driver} v={delivery.driver_name} />
          <Row k={DELIVERY_DETAIL_COPY.plate} v={delivery.truck_plate} />
          <Row k={DELIVERY_DETAIL_COPY.witness} v={delivery.witness ?? '—'} />
          <Row k={DELIVERY_DETAIL_COPY.waybillLitres} v={`${formatLitres(delivery.waybill_litres)} L`} />
          <Row k={DELIVERY_DETAIL_COPY.costPerLitre} v={formatNaira(delivery.cost_per_litre_kobo)} />
        </AppSheet>

        <AppSheet pad="md">
          <SheetHead title={DELIVERY_DETAIL_COPY.variance} />
          <Row k={DELIVERY_DETAIL_COPY.dipBefore} v={delivery.dip_before_litres !== null ? `${formatLitres(delivery.dip_before_litres)} L` : '—'} />
          <Row k={DELIVERY_DETAIL_COPY.dipAfter} v={delivery.dip_after_litres !== null ? `${formatLitres(delivery.dip_after_litres)} L` : '—'} />
          <div className="mt-3 border-t border-ink pt-3">
            {delivery.variance_litres !== null ? (
              <AppFigure
                value={`${delivery.variance_litres >= 0 ? '+' : ''}${formatLitres(delivery.variance_litres)}`}
                size="md"
                unit="L"
                tone={Math.abs(delivery.variance_litres) > 0 ? 'short' : 'ok'}
              />
            ) : (
              <span className="font-serif text-[14px] italic text-ink-tertiary">Pending both dips.</span>
            )}
          </div>
        </AppSheet>
      </div>

      {!signed && can(P.CAN_RECORD_DELIVERY) && <OffloadStep delivery={delivery} branchId={branchId} />}
    </>
  );
}

function Row({ k, v }: { readonly k: string; readonly v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-hair-soft py-2 last:border-b-0">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-tertiary">{k}</span>
      <span className="font-mono text-[13px] tabular-nums text-ink">{v}</span>
    </div>
  );
}

function OffloadStep({ delivery, branchId }: { readonly delivery: DeliveryWire; readonly branchId: string }) {
  const step = useStepDelivery(delivery.id, branchId);
  const sign = useSignDelivery(delivery.id, branchId);
  const { fieldError, handleError, clearError } = useApiError();

  const [dipBefore, setDipBefore] = useState(delivery.dip_before_litres?.toString() ?? '');
  const [dipAfter, setDipAfter] = useState(delivery.dip_after_litres?.toString() ?? '');
  const [witness, setWitness] = useState(delivery.witness ?? '');

  function handleSaveStep(e: FormEvent) {
    e.preventDefault();
    clearError();
    step.mutate(
      {
        ...(dipBefore !== '' ? { dip_before_litres: Number(dipBefore) } : {}),
        ...(dipAfter !== '' ? { dip_after_litres: Number(dipAfter) } : {}),
        ...(witness !== '' ? { witness } : {}),
      },
      {
        onSuccess: () => DrawerService.toast(DELIVERY_DETAIL_COPY.saveStep, { mark: DELIVERY_DETAIL_COPY.steppedMark }),
        onError: handleError,
      },
    );
  }

  function handleSign() {
    clearError();
    sign.mutate(
      { witness },
      {
        onSuccess: () => DrawerService.toast(DELIVERY_DETAIL_COPY.sign, { mark: DELIVERY_DETAIL_COPY.signedMark }),
        onError: handleError,
      },
    );
  }

  return (
    <div className="mt-5">
      <AppSheet pad="md">
        <SheetHead title={DELIVERY_STAGE_LABEL[delivery.stage] ?? delivery.stage} />
        <form onSubmit={handleSaveStep} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2" noValidate>
          <FieldRow label={DELIVERY_DETAIL_COPY.dipBefore} htmlFor={FIELD.dip_before_litres} error={fieldError(FIELD.dip_before_litres)}>
            <AppInput id={FIELD.dip_before_litres} numeric inputMode="decimal" value={dipBefore} onChange={(e) => setDipBefore(e.target.value)} trailingAffix="L" />
          </FieldRow>
          <FieldRow label={DELIVERY_DETAIL_COPY.dipAfter} htmlFor={FIELD.dip_after_litres} error={fieldError(FIELD.dip_after_litres)}>
            <AppInput id={FIELD.dip_after_litres} numeric inputMode="decimal" value={dipAfter} onChange={(e) => setDipAfter(e.target.value)} trailingAffix="L" />
          </FieldRow>
          <FieldRow label={DELIVERY_DETAIL_COPY.witnessLabel} htmlFor={FIELD.witness} error={fieldError(FIELD.witness)} className="sm:col-span-2">
            <AppInput id={FIELD.witness} value={witness} onChange={(e) => setWitness(e.target.value)} />
          </FieldRow>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <AppButton type="submit" variant="secondary" loading={step.isPending}>
              {DELIVERY_DETAIL_COPY.saveStep}
            </AppButton>
            <AppButton type="button" loading={sign.isPending} onClick={handleSign}>
              {DELIVERY_DETAIL_COPY.sign}
            </AppButton>
          </div>
        </form>
      </AppSheet>
    </div>
  );
}
