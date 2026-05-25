import { P, formatNaira, formatRelative } from '@dipstick/core';
import {
  useResetPassword,
  useStaffActivity,
  useStaffDetail,
  useUpdateStaff,
  type AuditEntryWire,
  type RefMap,
  type StaffDetailWire,
  type StaffMembershipDetailWire,
} from '@dipstick/api';
import { AppAvatar, AppButton, AppPill, AppSheet, SheetHead } from '@dipstick/ui';
import { useParams } from 'react-router-dom';

import { useAuth } from '@shared/auth';
import { DrawerService } from '@shared/drawer';
import { useApiError } from '@shared/errors';
import { IdRef } from '@shared/id-ref';
import { PageBody, PageHead, QueryState } from '@shared/screen';

import { STAFF_DETAIL_COPY as C } from '../staff.copy.ts';
import { openAssignBranch, openChangeRole, openEditAccount } from './parts/staff-actions.tsx';

export function StaffDetailScreen() {
  const { branchId = '', userId = '' } = useParams<{ branchId: string; userId: string }>();
  const detail = useStaffDetail(userId);
  const activity = useStaffActivity(userId);

  return (
    <PageBody>
      <PageHead overline={C.overline} title={detail.data?.user.name ?? ' '} />
      <QueryState
        isLoading={detail.isLoading}
        isError={detail.isError}
        data={detail.data}
      >
        {(data) => (
          <StaffDetailBody
            data={data}
            branchId={branchId}
            activity={activity.data?.items ?? []}
            activityRefs={activity.data?.refs ?? {}}
          />
        )}
      </QueryState>
    </PageBody>
  );
}

function StaffDetailBody({
  data,
  branchId,
  activity,
  activityRefs,
}: {
  readonly data: StaffDetailWire;
  readonly branchId: string;
  readonly activity: readonly AuditEntryWire[];
  readonly activityRefs: RefMap;
}) {
  const { can } = useAuth();
  const { user, memberships, metrics, recent_shifts } = data;
  const canManage = can(P.CAN_MANAGE_STAFF);

  // Avatar tint from the first non-org role name.
  const primaryRole = memberships.find((m) => m.branch_id !== '*')?.role_name ?? memberships[0]?.role_name ?? '';
  const avatarRole = primaryRole.toLowerCase().includes('owner')
    ? 'owner'
    : primaryRole.toLowerCase().includes('manager')
      ? 'manager'
      : 'attendant';

  // Deactivate/reactivate operate on the branch membership in view (or the first one).
  const membershipForBranch =
    memberships.find((m) => m.branch_id === branchId) ?? memberships.find((m) => m.branch_id !== '*') ?? memberships[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <AppSheet pad="md">
        <div className="flex flex-wrap items-center gap-4">
          <AppAvatar name={user.name} size="lg" role={avatarRole} />
          <div className="min-w-0 flex-1">
            <div className="font-serif text-[20px] font-medium text-ink">{user.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-ink-tertiary">
              <span>{user.email}</span>
              <span>·</span>
              <span>{user.phone ?? 'no phone'}</span>
              {user.email_verified && <AppPill tone="ok" dot>email</AppPill>}
              {user.phone !== null && user.phone_verified && <AppPill tone="ok" dot>phone</AppPill>}
              {!user.is_active && <AppPill tone="short">Inactive</AppPill>}
            </div>
          </div>
        </div>

        {canManage && membershipForBranch && (
          <ActionBar detail={data} membership={membershipForBranch} userId={user.id} isActive={user.is_active} />
        )}
      </AppSheet>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label={C.totalShifts} value={String(metrics.shift_count_total)} />
        <Metric label={C.shifts30d} value={String(metrics.shift_count_30d)} />
        <Metric
          label={C.variance30d}
          value={metrics.variance_kobo_30d === 0 ? '₦0.00' : formatNaira(-metrics.variance_kobo_30d)}
          tone={metrics.variance_kobo_30d > 0 ? 'short' : 'ok'}
        />
      </div>

      {/* Branches & roles */}
      <AppSheet pad="md">
        <SheetHead title={C.branchesHeading} />
        <div className="flex flex-col">
          {memberships.map((m) => (
            <BranchRow key={m.id} membership={m} canManage={canManage} />
          ))}
        </div>
      </AppSheet>

      {/* Recent shifts */}
      <AppSheet pad="md">
        <SheetHead title={C.shiftsHeading} />
        {recent_shifts.length === 0 ? (
          <p className="py-2 font-serif text-[13px] italic text-ink-tertiary">{C.noShifts}</p>
        ) : (
          <div className="flex flex-col">
            {recent_shifts.map((s) => (
              <div key={s.id} className="flex items-baseline gap-3 border-b border-hair-soft py-2 last:border-b-0">
                <span className="font-mono text-[11px] text-ink-tertiary">{s.business_date}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-tertiary">{s.status}</span>
                <span className="ml-auto font-mono text-[12px] tabular-nums text-ink-secondary">
                  {s.litres ?? 0} L
                </span>
                <span
                  className={
                    (s.variance_kobo ?? 0) > 0
                      ? 'w-28 text-right font-mono text-[12px] font-semibold tabular-nums text-oxblood'
                      : 'w-28 text-right font-mono text-[12px] tabular-nums text-emerald'
                  }
                >
                  {(s.variance_kobo ?? 0) === 0 ? '₦0.00' : formatNaira(-(s.variance_kobo ?? 0))}
                </span>
              </div>
            ))}
          </div>
        )}
      </AppSheet>

      {/* Activity (audit by this person) */}
      <AppSheet pad="md">
        <SheetHead title={C.activityHeading} />
        {activity.length === 0 ? (
          <p className="py-2 font-serif text-[13px] italic text-ink-tertiary">{C.noActivity}</p>
        ) : (
          <ol className="m-0 list-none p-0">
            {activity.map((entry) => (
              <li key={entry.id} className="flex gap-4 border-b border-hair-soft py-3 last:border-b-0">
                <span className="w-28 flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-tertiary">
                  {formatRelative(entry.at)}
                </span>
                <div className="min-w-0">
                  <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-ink">
                    {entry.action}
                  </span>{' '}
                  <IdRef id={entry.entity_id} refs={activityRefs} branchId={branchId} className="text-[12px]" />
                </div>
              </li>
            ))}
          </ol>
        )}
      </AppSheet>
    </div>
  );
}

function ActionBar({
  detail,
  membership,
  userId,
  isActive,
}: {
  readonly detail: StaffDetailWire;
  readonly membership: StaffMembershipDetailWire;
  readonly userId: string;
  readonly isActive: boolean;
}) {
  const branchId = membership.branch_id === '*' ? '' : membership.branch_id;
  const update = useUpdateStaff(branchId, membership.id);
  const reset = useResetPassword(userId);
  const { handleError } = useApiError();

  function toggleActive() {
    DrawerService.confirm(
      isActive ? C.deactivateTitle : C.reactivate,
      isActive ? C.deactivateBody : '',
      {
        confirmLabel: isActive ? C.deactivate : C.reactivate,
        onConfirm: () =>
          update.mutate(
            { is_active: !isActive },
            {
              onSuccess: () =>
                DrawerService.toast(detail.user.name, {
                  mark: isActive ? C.deactivatedMark : C.reactivatedMark,
                }),
              onError: handleError,
            },
          ),
      },
    );
  }

  function resetPassword() {
    DrawerService.confirm(C.resetTitle, C.resetBody, {
      confirmLabel: C.resetPassword,
      onConfirm: () =>
        reset.mutate(undefined, {
          onSuccess: (data) =>
            DrawerService.toast(
              data.temp_password ? `${C.tempPasswordLabel}: ${data.temp_password}` : C.resetTitle,
              { mark: C.resetMark },
            ),
          onError: handleError,
        }),
    });
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-hair-soft pt-4">
      <AppButton size="sm" variant="secondary" onClick={() => openChangeRole(membership)}>
        {C.changeRole}
      </AppButton>
      <AppButton size="sm" variant="secondary" onClick={() => openAssignBranch(userId)}>
        {C.assignBranch}
      </AppButton>
      <AppButton size="sm" variant="secondary" onClick={() => openEditAccount(detail)}>
        {C.editAccount}
      </AppButton>
      <AppButton size="sm" variant="quiet" onClick={resetPassword}>
        {C.resetPassword}
      </AppButton>
      <AppButton size="sm" variant={isActive ? 'danger' : 'secondary'} onClick={toggleActive}>
        {isActive ? C.deactivate : C.reactivate}
      </AppButton>
    </div>
  );
}

function BranchRow({
  membership,
  canManage,
}: {
  readonly membership: StaffMembershipDetailWire;
  readonly canManage: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-hair-soft py-2.5 last:border-b-0">
      <span className="font-serif text-[14px] text-ink">{membership.branch_name ?? '—'}</span>
      <AppPill tone="ink">{membership.role_name}</AppPill>
      {!membership.is_active && <AppPill tone="paper">Inactive</AppPill>}
      {canManage && membership.branch_id !== '*' && (
        <AppButton
          size="sm"
          variant="quiet"
          className="ml-auto"
          onClick={() => openChangeRole(membership)}
        >
          {C.changeRole}
        </AppButton>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { readonly label: string; readonly value: string; readonly tone?: 'ok' | 'short' }) {
  const valueClass =
    tone === 'short'
      ? 'font-mono text-[20px] font-semibold tabular-nums text-oxblood'
      : tone === 'ok'
        ? 'font-mono text-[20px] tabular-nums text-emerald'
        : 'font-mono text-[20px] tabular-nums text-ink';
  return (
    <div className="rounded-card border border-sheet-edge bg-sheet px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-tertiary">{label}</div>
      <div className={`mt-1 ${valueClass}`}>{value}</div>
    </div>
  );
}
