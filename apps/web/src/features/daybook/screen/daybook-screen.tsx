import { P, ROUTES, VARIANCE_STATUS, formatNaira } from '@dipstick/core';
import { usePostBalanced, useDaybook, type ShiftWire } from '@dipstick/api';
import {
  AppButton,
  AppEmptyState,
  AppFlag,
  AppTable,
  AppTbody,
  AppTd,
  AppTfoot,
  AppTh,
  AppThead,
  AppTr,
} from '@dipstick/ui';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { IconBack, IconDaybook, IconForward } from '@icons';

import { useAuth } from '@shared/auth';
import { DrawerService } from '@shared/drawer';
import { PageBody, PageHead, QueryState, ScrollX } from '@shared/screen';
import { formatLitres, todayBusinessDate } from '@shared/format';
import { SHIFT_WINDOW_SHORT, VARIANCE_LABEL } from '@shared/copy/labels.ts';

import { DAYBOOK_COPY } from '../daybook.copy.ts';

const VARIANCE_FLAG_TONE = {
  [VARIANCE_STATUS.BALANCED]: 'ok',
  [VARIANCE_STATUS.SHORT]: 'short',
  [VARIANCE_STATUS.OVER]: 'over',
} as const;

const DATE_PARAM = 'date' as const;

function shiftDate(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function DaybookScreen() {
  const { branchId = '' } = useParams<{ branchId: string }>();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [date] = useState(params.get(DATE_PARAM) ?? todayBusinessDate());

  const query = useDaybook(branchId, date);
  const postBalanced = usePostBalanced(branchId, date);

  function goToDate(next: string) {
    setParams({ [DATE_PARAM]: next });
  }

  function handlePostAll() {
    postBalanced.mutate(undefined, {
      onSuccess: (data) =>
        DrawerService.toast(DAYBOOK_COPY.postedAllMessage(data.posted), { mark: DAYBOOK_COPY.postedAllMark }),
    });
  }

  return (
    <PageBody>
      <PageHead
        overline={`${DAYBOOK_COPY.overline} · ${date}`}
        title="The day"
        actions={
          <div className="flex items-center gap-2">
            <AppButton variant="ghost" size="sm" leadingIcon={<IconBack size={14} />} onClick={() => goToDate(shiftDate(date, -1))}>
              {DAYBOOK_COPY.prevDay}
            </AppButton>
            <AppButton variant="ghost" size="sm" trailingIcon={<IconForward size={14} />} onClick={() => goToDate(shiftDate(date, 1))}>
              {DAYBOOK_COPY.nextDay}
            </AppButton>
            {can(P.CAN_POST_SHIFT) && (
              <AppButton size="sm" loading={postBalanced.isPending} onClick={handlePostAll}>
                {DAYBOOK_COPY.postAllBalanced}
              </AppButton>
            )}
          </div>
        }
      />

      <QueryState isLoading={query.isLoading} isError={query.isError} data={query.data}>
        {(data) => (
          <QueryState
            isLoading={false}
            isError={false}
            data={data.shifts}
            isEmpty={(shifts) => shifts.length === 0}
            empty={
              <AppEmptyState
                icon={<IconDaybook size={40} aria-hidden="true" />}
                title={DAYBOOK_COPY.emptyTitle}
                description={DAYBOOK_COPY.emptyBody}
              />
            }
          >
            {(shifts) => <ReconTable branchId={branchId} shifts={shifts} onOpenShift={(id) => navigate(ROUTES.BRANCH_SHIFT(branchId, id))} />}
          </QueryState>
        )}
      </QueryState>
    </PageBody>
  );
}

interface ReconTableProps {
  readonly branchId: string;
  readonly shifts: ShiftWire[];
  readonly onOpenShift: (shiftId: string) => void;
}

function ReconTable({ shifts, onOpenShift }: ReconTableProps) {
  const totals = shifts.reduce(
    (acc, s) => ({
      litres: acc.litres + (s.litres ?? 0),
      gross: acc.gross + (s.expected_gross_kobo ?? 0),
      declared: acc.declared + (s.cash_declared_kobo ?? 0),
      variance: acc.variance + (s.variance_kobo ?? 0),
    }),
    { litres: 0, gross: 0, declared: 0, variance: 0 },
  );

  return (
    <ScrollX>
    <AppTable className="min-w-[640px]">
      <AppThead>
        <AppTr>
          <AppTh>{DAYBOOK_COPY.attendant}</AppTh>
          <AppTh numeric>{DAYBOOK_COPY.litres}</AppTh>
          <AppTh numeric>{DAYBOOK_COPY.expected}</AppTh>
          <AppTh numeric>{DAYBOOK_COPY.declared}</AppTh>
          <AppTh numeric>{DAYBOOK_COPY.variance}</AppTh>
        </AppTr>
      </AppThead>
      <AppTbody>
        {shifts.map((s) => {
          const status = s.variance_status ?? VARIANCE_STATUS.BALANCED;
          const flagTone = VARIANCE_FLAG_TONE[status as keyof typeof VARIANCE_FLAG_TONE] ?? 'ok';
          const varianceTone = status === VARIANCE_STATUS.SHORT ? 'short' : status === VARIANCE_STATUS.OVER ? 'over' : 'ok';
          return (
            <AppTr key={s.id} voided={s.is_voided} className="cursor-pointer" onClick={() => onOpenShift(s.id)}>
              <AppTd variant="name">
                <div className="flex flex-col">
                  <span>{s.attendant_id}</span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-tertiary">
                    {s.pump_id} · {SHIFT_WINDOW_SHORT[s.window] ?? s.window}
                  </span>
                </div>
              </AppTd>
              <AppTd variant="numeric">{s.litres !== null ? `${formatLitres(s.litres)} L` : '—'}</AppTd>
              <AppTd variant="numeric">{s.expected_gross_kobo !== null ? formatNaira(s.expected_gross_kobo) : '—'}</AppTd>
              <AppTd variant="numeric">{s.cash_declared_kobo !== null ? formatNaira(s.cash_declared_kobo) : '—'}</AppTd>
              <AppTd variant="numeric" tone={varianceTone}>
                {s.variance_kobo !== null ? (
                  <span className="inline-flex items-center gap-2">
                    {s.variance_kobo === 0 ? '₦0.00' : formatNaira(-s.variance_kobo)}
                    <AppFlag tone={flagTone}>{VARIANCE_LABEL[status] ?? status}</AppFlag>
                  </span>
                ) : (
                  '—'
                )}
              </AppTd>
            </AppTr>
          );
        })}
      </AppTbody>
      <AppTfoot>
        <AppTr>
          <AppTd variant="name" foot>
            {DAYBOOK_COPY.shiftTotal}
          </AppTd>
          <AppTd variant="numeric" foot>
            {formatLitres(totals.litres)} L
          </AppTd>
          <AppTd variant="numeric" foot>
            {formatNaira(totals.gross)}
          </AppTd>
          <AppTd variant="numeric" foot>
            {formatNaira(totals.declared)}
          </AppTd>
          <AppTd variant="numeric" foot tone={totals.variance > 0 ? 'short' : undefined}>
            {totals.variance === 0 ? '₦0.00' : formatNaira(-totals.variance)}
          </AppTd>
        </AppTr>
      </AppTfoot>
    </AppTable>
    </ScrollX>
  );
}
