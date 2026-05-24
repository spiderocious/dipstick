import { useDeleteRole, useRoles, type RoleWire } from '@dipstick/api';
import { AppButton, AppPill } from '@dipstick/ui';

import { IconPlus, IconRole } from '@icons';

import { DrawerService } from '@shared/drawer';
import { PageBody, PageHead, QueryState } from '@shared/screen';

import { ROLES_COPY } from '../../staff/staff.copy.ts';
import { openRoleForm } from './parts/role-form.tsx';

export function RolesScreen() {
  const query = useRoles();
  const remove = useDeleteRole();

  function handleDelete(role: RoleWire) {
    DrawerService.voidConfirm(ROLES_COPY.deleteTitle, ROLES_COPY.deleteBody, {
      confirmWord: 'DELETE',
      onConfirm: () =>
        remove.mutate(role.id, {
          onSuccess: () => DrawerService.toast(role.name, { mark: ROLES_COPY.deletedMark }),
        }),
    });
  }

  return (
    <PageBody>
      <PageHead
        overline={ROLES_COPY.overline}
        title={ROLES_COPY.title}
        actions={
          <AppButton leadingIcon={<IconPlus size={15} />} onClick={() => openRoleForm(null)}>
            {ROLES_COPY.newRole}
          </AppButton>
        }
      />
      <QueryState isLoading={query.isLoading} isError={query.isError} data={query.data}>
        {(roles) => (
          <div className="overflow-hidden rounded-card border border-sheet-edge">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center gap-3 border-b border-hair bg-sheet px-5 py-3.5 last:border-b-0">
                <IconRole size={16} className="text-ink-tertiary" aria-hidden="true" />
                <span className="font-serif text-[15px] font-medium text-ink">{role.name}</span>
                {role.is_system && <AppPill tone="paper">{ROLES_COPY.systemRole}</AppPill>}
                <span className="ml-2 font-mono text-[11px] text-ink-tertiary">
                  {role.permissions.length} permissions
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <AppButton variant="quiet" size="sm" onClick={() => openRoleForm(role)}>
                    Edit
                  </AppButton>
                  {!role.is_system && (
                    <AppButton variant="danger" size="sm" onClick={() => handleDelete(role)}>
                      Delete
                    </AppButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </PageBody>
  );
}
