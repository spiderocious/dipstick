import { P, SHIFT_WINDOW } from '@dipstick/core';
import { useRoster, useSaveRoster, useStaff } from '@dipstick/api';
import { AppButton, AppSheet, cn } from '@dipstick/ui';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useAuth } from '@shared/auth';
import { DrawerService } from '@shared/drawer';
import { PageBody, PageHead, QueryState, ScrollX } from '@shared/screen';
import { weekStartOf } from '@shared/format';
import { SHIFT_WINDOW_SHORT } from '@shared/copy/labels.ts';

import { ROSTER_COPY } from '../staff.copy.ts';

const DAYS_IN_WEEK = 7;

// Cycle a cell: morning → evening → off → morning.
function nextWindow(current: string): string {
  if (current === SHIFT_WINDOW.MORNING) return SHIFT_WINDOW.EVENING;
  if (current === SHIFT_WINDOW.EVENING) return SHIFT_WINDOW.OFF;
  return SHIFT_WINDOW.MORNING;
}

const CELL_TONE: Record<string, string> = {
  [SHIFT_WINDOW.MORNING]: 'bg-emerald/10 text-emerald border-emerald/30',
  [SHIFT_WINDOW.EVENING]: 'bg-ink text-paper border-ink',
  [SHIFT_WINDOW.OFF]: 'bg-recessed text-ink-tertiary border-sheet-edge',
};

export function RosterScreen() {
  const { branchId = '' } = useParams<{ branchId: string }>();
  const { can } = useAuth();
  const weekStart = weekStartOf();

  const staff = useStaff(branchId);
  const roster = useRoster(branchId, weekStart);
  const save = useSaveRoster(branchId);
  const canEdit = can(P.CAN_MANAGE_ROSTER);

  const [assignments, setAssignments] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (roster.data !== undefined) setAssignments(roster.data.assignments);
  }, [roster.data]);

  function cellWindow(userId: string, day: number): string {
    return assignments[userId]?.[day] ?? SHIFT_WINDOW.OFF;
  }

  function cycleCell(userId: string, day: number) {
    if (!canEdit) return;
    setAssignments((prev) => {
      const row = prev[userId] ?? new Array<string>(DAYS_IN_WEEK).fill(SHIFT_WINDOW.OFF);
      const next = [...row];
      next[day] = nextWindow(cellWindow(userId, day));
      return { ...prev, [userId]: next };
    });
  }

  function handleSave() {
    save.mutate(
      { week_start: weekStart, assignments },
      { onSuccess: () => DrawerService.toast(ROSTER_COPY.save, { mark: ROSTER_COPY.savedMark }) },
    );
  }

  return (
    <PageBody>
      <PageHead
        overline={`${ROSTER_COPY.overline} · ${ROSTER_COPY.weekOf} ${weekStart}`}
        title={ROSTER_COPY.title}
        actions={
          canEdit ? (
            <AppButton size="sm" loading={save.isPending} onClick={handleSave}>
              {ROSTER_COPY.save}
            </AppButton>
          ) : undefined
        }
      />
      <QueryState isLoading={staff.isLoading} isError={staff.isError} data={staff.data}>
        {(members) => (
          <AppSheet pad="md">
           <ScrollX>
            <div
              className="grid min-w-[640px] items-center gap-2"
              style={{ gridTemplateColumns: `140px repeat(${DAYS_IN_WEEK}, 1fr)` }}
            >
              <span />
              {ROSTER_COPY.days.map((d) => (
                <span key={d} className="text-center font-mono text-[10px] uppercase tracking-[0.1em] text-ink-tertiary">
                  {d}
                </span>
              ))}

              {members.map((m) => (
                <RosterRow
                  key={m.id}
                  name={m.user.name}
                  userId={m.user_id}
                  cellWindow={(day) => cellWindow(m.user_id, day)}
                  onCycle={(day) => cycleCell(m.user_id, day)}
                  editable={canEdit}
                />
              ))}
            </div>
           </ScrollX>
          </AppSheet>
        )}
      </QueryState>
    </PageBody>
  );
}

interface RosterRowProps {
  readonly name: string;
  readonly userId: string;
  readonly cellWindow: (day: number) => string;
  readonly onCycle: (day: number) => void;
  readonly editable: boolean;
}

function RosterRow({ name, cellWindow, onCycle, editable }: RosterRowProps) {
  return (
    <>
      <span className="font-serif text-[13px] text-ink">{name}</span>
      {Array.from({ length: DAYS_IN_WEEK }, (_, day) => {
        const w = cellWindow(day);
        return (
          <button
            key={day}
            type="button"
            disabled={!editable}
            onClick={() => onCycle(day)}
            className={cn(
              'rounded-[3px] border px-1 py-1.5 font-mono text-[10px] uppercase tracking-[0.04em] transition-colors',
              editable ? 'cursor-pointer' : 'cursor-default',
              CELL_TONE[w] ?? CELL_TONE[SHIFT_WINDOW.OFF],
            )}
          >
            {SHIFT_WINDOW_SHORT[w] ?? w}
          </button>
        );
      })}
    </>
  );
}
