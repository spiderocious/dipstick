import { useAddStaff, useRoles, type AddStaffPayload } from '@dipstick/api';
import { AppButton, AppInput, AppSelect, FieldRow } from '@dipstick/ui';
import { useState, type FormEvent } from 'react';

import { DrawerService } from '@shared/drawer';
import { useApiError } from '@shared/errors';

import { STAFF_COPY } from '../../staff.copy.ts';

const FIELD = { name: 'name', email: 'email', phone: 'phone', role_id: 'role_id', password: 'password' } as const;

function AddStaffForm({ branchId, close }: { readonly branchId: string; readonly close: () => void }) {
  const add = useAddStaff(branchId);
  const roles = useRoles();
  const { fieldError, handleError, clearError } = useApiError();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const payload: AddStaffPayload = { name, email, phone, role_id: roleId, password };
    add.mutate(payload, {
      onSuccess: () => {
        DrawerService.toast(name, { mark: STAFF_COPY.addedMark });
        close();
      },
      onError: handleError,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <FieldRow label={STAFF_COPY.nameLabel} htmlFor={FIELD.name} error={fieldError(FIELD.name)}>
        <AppInput id={FIELD.name} value={name} onChange={(e) => setName(e.target.value)} />
      </FieldRow>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldRow label={STAFF_COPY.emailLabel} htmlFor={FIELD.email} error={fieldError(FIELD.email)}>
          <AppInput id={FIELD.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FieldRow>
        <FieldRow label={STAFF_COPY.phoneLabel} htmlFor={FIELD.phone} error={fieldError(FIELD.phone)}>
          <AppInput id={FIELD.phone} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FieldRow>
      </div>
      <FieldRow label={STAFF_COPY.role} htmlFor={FIELD.role_id} error={fieldError(FIELD.role_id)}>
        <AppSelect id={FIELD.role_id} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          <option value="">—</option>
          {(roles.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </AppSelect>
      </FieldRow>
      <FieldRow label={STAFF_COPY.passwordLabel} htmlFor={FIELD.password} error={fieldError(FIELD.password)}>
        <AppInput id={FIELD.password} type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
      </FieldRow>
      <div className="mt-1 flex justify-end gap-2">
        <AppButton type="button" variant="quiet" onClick={close}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={add.isPending}>
          {STAFF_COPY.save}
        </AppButton>
      </div>
    </form>
  );
}

export function openAddStaff(branchId: string): void {
  DrawerService.launch((close) => <AddStaffForm branchId={branchId} close={close} />, {
    eyebrow: STAFF_COPY.add,
    title: STAFF_COPY.add,
  });
}
