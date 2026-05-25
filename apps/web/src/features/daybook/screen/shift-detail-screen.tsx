import { P, SHIFT_STATUS, VARIANCE_STATUS, VOID_WORD, formatNaira, parseNairaToKobo } from '@dipstick/core';
import {
  useCloseShift,
  usePostShift,
  useShift,
  useVoidShift,
  type RefMap,
  type ShiftWire,
} from '@dipstick/api';
import { AppButton, AppFigure, AppInput, AppPill, AppSheet, FieldRow, SheetHead, type AppPillTone } from '@dipstick/ui';
import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';

import { useAuth } from '@shared/auth';
import { DrawerService } from '@shared/drawer';
import { useApiError } from '@shared/errors';
import { PageBody, PageHead, QueryState } from '@shared/screen';
import { formatLitres, formatMeter, todayBusinessDate } from '@shared/format';
import { SHIFT_STATUS_LABEL } from '@shared/copy/labels.ts';

import { SHIFT_COPY } from '../daybook.copy.ts';

const STATUS_TONE: Record<string, AppPillTone> = {
  [SHIFT_STATUS.OPEN]: 'info',
  [SHIFT_STATUS.CLOSED]: 'paper',
  [SHIFT_STATUS.POSTED]: 'ok',
  [SHIFT_STATUS.VOIDED]: 'short',
};

const FIELD = { closing_meter: 'closing_meter', cash_declared_kobo: 'cash_declared_kobo' } as const;

export function ShiftDetailScreen() {
  const { branchId = '', shiftId = '' } = useParams<{ branchId: string; shiftId: string }>();
  const query = useShift(shiftId);

  return (
    <PageBody>
      <QueryState isLoading={query.isLoading} isError={query.isError} data={query.data}>
        {(shift) => <ShiftDetail shift={shift} branchId={branchId} />}
      </QueryState>
    </PageBody>
  );
}

function ShiftDetail({
  shift,
  branchId,
}: {
  readonly shift: ShiftWire & { refs: RefMap };
  readonly branchId: string;
}) {
  const { can } = useAuth();
  // Resolve attendant + pump ids to names for the header (fall back to the raw id).
  const attendantName = shift.refs[shift.attendant_id]?.label ?? shift.attendant_id;
  const pumpName = shift.refs[shift.pump_id]?.label ?? shift.pump_id;
  const date = shift.business_date || todayBusinessDate();
  const post = usePostShift(shift.id, branchId, date);
  const voidShift = useVoidShift(shift.id, branchId, date);

  const status = shift.status;
  const isClosed = status === SHIFT_STATUS.CLOSED;
  const isPosted = status === SHIFT_STATUS.POSTED;

  function handlePost() {
    post.mutate(undefined, {
      onSuccess: () => DrawerService.toast(SHIFT_COPY.post, { mark: SHIFT_COPY.postedMark }),
    });
  }

  function handleVoid() {
    DrawerService.voidConfirm(SHIFT_COPY.voidTitle, SHIFT_COPY.voidBody, {
      confirmWord: VOID_WORD,
      onConfirm: (reason) =>
        voidShift.mutate(
          { reason, confirm: VOID_WORD },
          { onSuccess: () => DrawerService.toast(SHIFT_COPY.voidShift, { mark: SHIFT_COPY.voidedMark }) },
        ),
    });
  }

  return (
    <>
      <PageHead
        overline={`${SHIFT_COPY.overline} · ${pumpName}`}
        title={attendantName}
        actions={
          <div className="flex items-center gap-2">
            <AppPill tone={STATUS_TONE[status] ?? 'default'} dot>
              {SHIFT_STATUS_LABEL[status] ?? status}
            </AppPill>
            {isClosed && can(P.CAN_POST_SHIFT) && (
              <AppButton size="sm" loading={post.isPending} onClick={handlePost}>
                {SHIFT_COPY.post}
              </AppButton>
            )}
            {isPosted && can(P.CAN_VOID_SHIFT) && (
              <AppButton variant="danger" size="sm" onClick={handleVoid}>
                {SHIFT_COPY.voidShift}
              </AppButton>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <AppSheet pad="md">
          <SheetHead title={SHIFT_COPY.meterTrail} />
          <Trail k={SHIFT_COPY.opening} v={`${formatMeter(shift.opening_meter)}`} />
          <Trail k={SHIFT_COPY.closing} v={shift.closing_meter !== null ? formatMeter(shift.closing_meter) : '—'} />
          <Trail k={SHIFT_COPY.dispensed} v={shift.litres !== null ? `${formatLitres(shift.litres)} L` : '—'} strong />
        </AppSheet>

        <AppSheet pad="md">
          <SheetHead title={SHIFT_COPY.cashTrail} />
          <Trail
            k={SHIFT_COPY.expectedGross}
            v={shift.expected_gross_kobo !== null ? formatNaira(shift.expected_gross_kobo) : '—'}
          />
          <Trail
            k={SHIFT_COPY.cashDeclared}
            v={shift.cash_declared_kobo !== null ? formatNaira(shift.cash_declared_kobo) : '—'}
          />
          <VarianceTrail shift={shift} />
        </AppSheet>
      </div>

      {status === SHIFT_STATUS.OPEN && <CloseForm shift={shift} branchId={branchId} date={date} />}
    </>
  );
}

function Trail({ k, v, strong }: { readonly k: string; readonly v: string; readonly strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-hair-soft py-2 last:border-b-0">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-tertiary">{k}</span>
      <span className={strong ? 'font-mono text-[15px] font-semibold tabular-nums text-ink' : 'font-mono text-[13px] tabular-nums text-ink'}>
        {v}
      </span>
    </div>
  );
}

function VarianceTrail({ shift }: { readonly shift: ShiftWire }) {
  if (shift.variance_kobo === null) return <Trail k={SHIFT_COPY.expectedGross} v="—" />;
  const short = shift.variance_status === VARIANCE_STATUS.SHORT;
  const over = shift.variance_status === VARIANCE_STATUS.OVER;
  return (
    <div className="mt-2 flex items-baseline justify-between border-t border-ink pt-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-tertiary">{SHIFT_COPY.variance}</span>
      <AppFigure
        value={shift.variance_kobo === 0 ? '0.00' : formatNaira(Math.abs(shift.variance_kobo), { withSymbol: false })}
        size="sm"
        naira
        tone={short ? 'short' : over ? 'default' : 'ok'}
      />
    </div>
  );
}

function CloseForm({ shift, branchId, date }: { readonly shift: ShiftWire; readonly branchId: string; readonly date: string }) {
  const close = useCloseShift(shift.id, branchId, date);
  const { fieldError, handleError, clearError } = useApiError();
  const [closingMeter, setClosingMeter] = useState('');
  const [cash, setCash] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    close.mutate(
      { closing_meter: Number(closingMeter), cash_declared_kobo: parseNairaToKobo(cash) },
      {
        onSuccess: () => DrawerService.toast(SHIFT_COPY.closePump, { mark: SHIFT_COPY.closedMark }),
        onError: handleError,
      },
    );
  }

  return (
    <div className="mt-5">
      <AppSheet pad="md">
        <SheetHead title={SHIFT_COPY.closePump} />
        <form onSubmit={handleSubmit} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2" noValidate>
          <FieldRow label={SHIFT_COPY.closingMeterLabel} htmlFor={FIELD.closing_meter} error={fieldError(FIELD.closing_meter)}>
            <AppInput
              id={FIELD.closing_meter}
              numeric
              inputMode="decimal"
              value={closingMeter}
              invalid={fieldError(FIELD.closing_meter) !== undefined}
              onChange={(e) => setClosingMeter(e.target.value)}
              trailingAffix="L"
            />
          </FieldRow>
          <FieldRow label={SHIFT_COPY.cashDeclaredLabel} htmlFor={FIELD.cash_declared_kobo} error={fieldError(FIELD.cash_declared_kobo)}>
            <AppInput
              id={FIELD.cash_declared_kobo}
              numeric
              inputMode="decimal"
              value={cash}
              invalid={fieldError(FIELD.cash_declared_kobo) !== undefined}
              onChange={(e) => setCash(e.target.value)}
              leadingAffix="₦"
            />
          </FieldRow>
          <div className="flex justify-end sm:col-span-2">
            <AppButton type="submit" loading={close.isPending}>
              {SHIFT_COPY.closePump}
            </AppButton>
          </div>
        </form>
      </AppSheet>
    </div>
  );
}
