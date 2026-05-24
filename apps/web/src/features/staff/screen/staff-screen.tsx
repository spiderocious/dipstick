import { P, formatNaira } from '@dipstick/core';
import { useStaff, useVarianceLeaderboard, type StaffMemberWire } from '@dipstick/api';
import {
  AppAvatar,
  AppButton,
  AppEmptyState,
  AppPill,
  AppSheet,
  SheetHead,
  type AppAvatarRole,
} from '@dipstick/ui';
import { useParams } from 'react-router-dom';

import { IconPlus, IconStaff } from '@icons';

import { useAuth } from '@shared/auth';
import { PageBody, PageHead, QueryState } from '@shared/screen';

import { STAFF_COPY } from '../staff.copy.ts';
import { openAddStaff } from './parts/add-staff-form.tsx';

// Map a role name to one of the avatar's three tints. Manager/Owner/Attendant are the seeded
// names; anything custom falls back to attendant.
function avatarRole(roleName: string): AppAvatarRole {
  const lower = roleName.toLowerCase();
  if (lower.includes('owner')) return 'owner';
  if (lower.includes('manager')) return 'manager';
  return 'attendant';
}

export function StaffScreen() {
  const { branchId = '' } = useParams<{ branchId: string }>();
  const { can } = useAuth();
  const query = useStaff(branchId);
  const leaderboard = useVarianceLeaderboard(branchId);

  return (
    <PageBody>
      <PageHead
        overline={STAFF_COPY.overline}
        title={STAFF_COPY.title}
        actions={
          can(P.CAN_MANAGE_STAFF) ? (
            <AppButton leadingIcon={<IconPlus size={15} />} onClick={() => openAddStaff(branchId)}>
              {STAFF_COPY.add}
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
            icon={<IconStaff size={40} aria-hidden="true" />}
            title={STAFF_COPY.emptyTitle}
            description={STAFF_COPY.emptyBody}
          />
        }
      >
        {(items) => (
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-card border border-sheet-edge">
              {items.map((m) => (
                <StaffRow key={m.id} member={m} />
              ))}
            </div>

            {(leaderboard.data ?? []).length > 0 && (
              <AppSheet pad="md">
                <SheetHead title={STAFF_COPY.leaderboardHeading} />
                <div className="flex flex-col">
                  {(leaderboard.data ?? []).map((row) => (
                    <div key={row.attendant_id} className="flex items-baseline gap-3 border-b border-hair-soft py-2 last:border-b-0">
                      <span className="font-serif text-[13px] text-ink">{row.attendant_id}</span>
                      <span className="ml-auto font-mono text-[11px] text-ink-tertiary">{row.shift_count} shifts</span>
                      <span
                        className={
                          row.variance_kobo > 0
                            ? 'w-28 text-right font-mono text-[13px] font-semibold tabular-nums text-oxblood'
                            : 'w-28 text-right font-mono text-[13px] tabular-nums text-emerald'
                        }
                      >
                        {row.variance_kobo === 0 ? '₦0.00' : formatNaira(-row.variance_kobo)}
                      </span>
                    </div>
                  ))}
                </div>
              </AppSheet>
            )}
          </div>
        )}
      </QueryState>
    </PageBody>
  );
}

function StaffRow({ member }: { readonly member: StaffMemberWire }) {
  return (
    <div className="flex items-center gap-4 border-b border-hair bg-sheet px-5 py-3.5 last:border-b-0">
      <AppAvatar name={member.user.name} role={avatarRole(member.role_name)} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-serif text-[15px] font-medium text-ink">{member.user.name}</span>
          {!member.is_active && <AppPill tone="paper">Inactive</AppPill>}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-ink-tertiary">{member.user.phone}</div>
      </div>
      <AppPill tone="ink" className="ml-2">
        {member.role_name}
      </AppPill>
      <span className="ml-auto font-mono text-[12px] tabular-nums text-ink-secondary">
        {member.shift_count_30d} shifts
      </span>
      <span
        className={
          member.variance_kobo_30d > 0
            ? 'w-28 text-right font-mono text-[12px] font-semibold tabular-nums text-oxblood'
            : 'w-28 text-right font-mono text-[12px] tabular-nums text-emerald'
        }
      >
        {member.variance_kobo_30d === 0 ? '₦0.00' : formatNaira(-member.variance_kobo_30d)}
      </span>
    </div>
  );
}
