import { usePermissions, useCreateRole, useUpdateRole, type RoleWire } from '@dipstick/api';
import { AppButton, AppCheckbox, AppInput, FieldRow } from '@dipstick/ui';
import { useState, type FormEvent } from 'react';

import { DrawerService } from '@shared/drawer';
import { useApiError } from '@shared/errors';

import { ROLES_COPY } from '../../../staff/staff.copy.ts';

const FIELD = { name: 'name', permissions: 'permissions' } as const;

function RoleForm({ role, close }: { readonly role: RoleWire | null; readonly close: () => void }) {
  const permissions = usePermissions();
  const create = useCreateRole();
  const update = useUpdateRole(role?.id ?? '');
  const { fieldError, handleError, clearError } = useApiError();

  const [name, setName] = useState(role?.name ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const payload = { name, permissions: Array.from(selected) };
    const mutation = role === null ? create : update;
    mutation.mutate(payload, {
      onSuccess: () => {
        DrawerService.toast(name, { mark: ROLES_COPY.savedMark });
        close();
      },
      onError: handleError,
    });
  }

  const pending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <FieldRow label={ROLES_COPY.nameLabel} htmlFor={FIELD.name} error={fieldError(FIELD.name)}>
        <AppInput id={FIELD.name} value={name} onChange={(e) => setName(e.target.value)} />
      </FieldRow>

      <div>
        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">
          {ROLES_COPY.permissionsHeading}
        </div>
        <div className="grid max-h-[320px] grid-cols-1 gap-1.5 overflow-y-auto rounded-card border border-sheet-edge bg-recessed/40 p-3">
          {(permissions.data ?? []).map((perm) => (
            <AppCheckbox
              key={perm.key}
              checked={selected.has(perm.key)}
              onChange={() => toggle(perm.key)}
              label={perm.description}
            />
          ))}
        </div>
        {fieldError(FIELD.permissions) !== undefined && (
          <p className="mt-1 font-sans text-[11px] text-oxblood">{fieldError(FIELD.permissions)}</p>
        )}
      </div>

      <div className="mt-1 flex justify-end gap-2">
        <AppButton type="button" variant="quiet" onClick={close}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={pending}>
          {ROLES_COPY.save}
        </AppButton>
      </div>
    </form>
  );
}

export function openRoleForm(role: RoleWire | null): void {
  DrawerService.launch((close) => <RoleForm role={role} close={close} />, {
    eyebrow: ROLES_COPY.overline,
    title: role === null ? ROLES_COPY.newRole : role.name,
    maxWidth: 560,
  });
}
