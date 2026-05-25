import { P, ROUTES, formatNaira } from '@dipstick/core';
import { useStaff, useVarianceLeaderboard, type RefMap, type StaffMemberWire } from '@dipstick/api';
import {
  AppAvatar,
  AppButton,
  AppEmptyState,
  AppPill,
  AppSheet,
  SheetHead,
  type AppAvatarRole,
} from '@dipstick/ui';
import { Link, useParams } from 'react-router-dom';

import { IconPlus, IconStaff } from '@icons';

import { useAuth } from '@shared/auth';
import { IdRef } from '@shared/id-ref';
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

  // The leaderboard endpoint returns bare attendant ids; resolve them to names using the
  // staff list we already loaded (a local RefMap, same shape <IdRef> consumes elsewhere).
  const staffRefs: RefMap = Object.fromEntries(
    (query.data ?? []).map((m) => [
      m.user_id,
      { type: 'user' as const, label: m.user.name, href_kind: 'user' as const },
    ]),
  );

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
                <StaffRow key={m.id} member={m} branchId={branchId} />
              ))}
            </div>

            {(leaderboard.data ?? []).length > 0 && (
              <AppSheet pad="md">
                <SheetHead title={STAFF_COPY.leaderboardHeading} />
                <div className="flex flex-col">
                  {(leaderboard.data ?? []).map((row) => (
                    <div key={row.attendant_id} className="flex items-baseline gap-3 border-b border-hair-soft py-2 last:border-b-0">
                      <IdRef id={row.attendant_id} refs={staffRefs} branchId={branchId} className="text-[13px]" />
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

function StaffRow({ member, branchId }: { readonly member: StaffMemberWire; readonly branchId: string }) {
  return (
    <Link
      to={ROUTES.BRANCH_STAFF_MEMBER(branchId, member.user_id)}
      className="flex items-center gap-3 border-b border-hair bg-sheet px-4 py-3.5 transition-colors last:border-b-0 hover:bg-sheet-edge/40 sm:gap-4 sm:px-5"
    >
      <AppAvatar name={member.user.name} role={avatarRole(member.role_name)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-serif text-[15px] font-medium text-ink">{member.user.name}</span>
          <AppPill tone="ink">{member.role_name}</AppPill>
          {!member.is_active && <AppPill tone="paper">Inactive</AppPill>}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-ink-tertiary">{member.user.phone ?? member.user.email}</div>
      </div>
      {/* 30-day stats — secondary detail, hidden on the narrowest phones */}
      <span className="hidden flex-shrink-0 font-mono text-[12px] tabular-nums text-ink-secondary sm:inline">
        {member.shift_count_30d} shifts
      </span>
      <span
        className={
          member.variance_kobo_30d > 0
            ? 'flex-shrink-0 font-mono text-[12px] font-semibold tabular-nums text-oxblood sm:w-28 sm:text-right'
            : 'flex-shrink-0 font-mono text-[12px] tabular-nums text-emerald sm:w-28 sm:text-right'
        }
      >
        {member.variance_kobo_30d === 0 ? '₦0.00' : formatNaira(-member.variance_kobo_30d)}
      </span>
    </Link>
  );
}
