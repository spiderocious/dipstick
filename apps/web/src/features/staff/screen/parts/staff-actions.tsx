import {
  useAssignBranch,
  useBranches,
  useEditAccount,
  useRoles,
  useUpdateStaff,
  type StaffDetailWire,
  type StaffMembershipDetailWire,
} from '@dipstick/api';
import { AppButton, AppInput, AppSelect, FieldRow } from '@dipstick/ui';
import { useState, type FormEvent } from 'react';

import { DrawerService } from '@shared/drawer';
import { useApiError } from '@shared/errors';

import { STAFF_DETAIL_COPY as C } from '../../staff.copy.ts';

// --- Change role (for one branch membership) ---

function ChangeRoleForm({
  membership,
  close,
}: {
  readonly membership: StaffMembershipDetailWire;
  readonly close: () => void;
}) {
  // Membership update is addressed by membershipId; branchId only scopes invalidation.
  const branchId = membership.branch_id === '*' ? '' : membership.branch_id;
  const update = useUpdateStaff(branchId, membership.id);
  const roles = useRoles();
  const { fieldError, handleError, clearError } = useApiError();
  const [roleId, setRoleId] = useState(membership.role_id);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    update.mutate(
      { role_id: roleId },
      {
        onSuccess: () => {
          DrawerService.toast(C.changeRoleTitle, { mark: C.roleChangedMark });
          close();
        },
        onError: handleError,
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <FieldRow label={C.assignRoleLabel} htmlFor="role_id" error={fieldError('role_id')}>
        <AppSelect id="role_id" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          {(roles.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </AppSelect>
      </FieldRow>
      <div className="mt-1 flex justify-end gap-2">
        <AppButton type="button" variant="quiet" onClick={close}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={update.isPending}>
          {C.changeRoleSave}
        </AppButton>
      </div>
    </form>
  );
}

export function openChangeRole(membership: StaffMembershipDetailWire): void {
  DrawerService.launch((close) => <ChangeRoleForm membership={membership} close={close} />, {
    eyebrow: C.changeRole,
    title: C.changeRoleTitle,
  });
}

// --- Assign to another branch ---

function AssignBranchForm({ userId, close }: { readonly userId: string; readonly close: () => void }) {
  const branches = useBranches();
  const roles = useRoles();
  const { fieldError, handleError, clearError } = useApiError();
  const [branchId, setBranchId] = useState('');
  const [roleId, setRoleId] = useState('');
  const assign = useAssignBranch(branchId, userId);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    if (branchId === '') return;
    assign.mutate(
      { role_id: roleId },
      {
        onSuccess: () => {
          DrawerService.toast(C.assignTitle, { mark: C.assignedMark });
          close();
        },
        onError: handleError,
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <FieldRow label={C.assignBranchLabel} htmlFor="branch_id" error={fieldError('branch_id')}>
        <AppSelect id="branch_id" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">—</option>
          {(branches.data ?? [])
            .filter((b) => !b.is_archived)
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
        </AppSelect>
      </FieldRow>
      <FieldRow label={C.assignRoleLabel} htmlFor="role_id" error={fieldError('role_id')}>
        <AppSelect id="role_id" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          <option value="">—</option>
          {(roles.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </AppSelect>
      </FieldRow>
      <div className="mt-1 flex justify-end gap-2">
        <AppButton type="button" variant="quiet" onClick={close}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={assign.isPending} disabled={branchId === '' || roleId === ''}>
          {C.assignSave}
        </AppButton>
      </div>
    </form>
  );
}

export function openAssignBranch(userId: string): void {
  DrawerService.launch((close) => <AssignBranchForm userId={userId} close={close} />, {
    eyebrow: C.assignBranch,
    title: C.assignTitle,
  });
}

// --- Edit account ---

function EditAccountForm({ detail, close }: { readonly detail: StaffDetailWire; readonly close: () => void }) {
  const edit = useEditAccount(detail.user.id);
  const { fieldError, handleError, clearError } = useApiError();
  const [name, setName] = useState(detail.user.name);
  const [email, setEmail] = useState(detail.user.email);
  const [phone, setPhone] = useState(detail.user.phone ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const trimmedPhone = phone.trim();
    edit.mutate(
      { name, email, phone: trimmedPhone.length > 0 ? trimmedPhone : null },
      {
        onSuccess: () => {
          DrawerService.toast(C.editTitle, { mark: C.editedMark });
          close();
        },
        onError: handleError,
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <FieldRow label={C.editNameLabel} htmlFor="name" error={fieldError('name')}>
        <AppInput id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </FieldRow>
      <FieldRow label={C.editEmailLabel} htmlFor="email" error={fieldError('email')}>
        <AppInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </FieldRow>
      <FieldRow label={C.editPhoneLabel} htmlFor="phone" error={fieldError('phone')}>
        <AppInput id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FieldRow>
      <div className="mt-1 flex justify-end gap-2">
        <AppButton type="button" variant="quiet" onClick={close}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={edit.isPending}>
          {C.editSave}
        </AppButton>
      </div>
    </form>
  );
}

export function openEditAccount(detail: StaffDetailWire): void {
  DrawerService.launch((close) => <EditAccountForm detail={detail} close={close} />, {
    eyebrow: C.editAccount,
    title: C.editTitle,
  });
}
