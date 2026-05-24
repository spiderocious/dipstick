import { useCreateBranch, type CreateBranchPayload } from '@dipstick/api';
import { AppButton, AppInput, FieldRow } from '@dipstick/ui';
import { useState, type FormEvent } from 'react';

import { useApiError } from '@shared/errors';
import { DrawerService } from '@shared/drawer';

import { BRANCHES_COPY, BRANCH_FORM_COPY } from '../../branches.copy.ts';

const FIELD = { name: 'name', city: 'city', state: 'state' } as const;

// Create-branch form, rendered inside a launched modal. `close` dismisses on success.
export function BranchCreateForm({ close }: { readonly close: () => void }) {
  const create = useCreateBranch();
  const { fieldError, handleError, clearError } = useApiError();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const payload: CreateBranchPayload = { name, city, state: stateName };
    create.mutate(payload, {
      onSuccess: () => {
        DrawerService.toast(name, { mark: BRANCHES_COPY.createdMark });
        close();
      },
      onError: handleError,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <FieldRow label={BRANCH_FORM_COPY.nameLabel} htmlFor={FIELD.name} error={fieldError(FIELD.name)}>
        <AppInput
          id={FIELD.name}
          value={name}
          invalid={fieldError(FIELD.name) !== undefined}
          onChange={(e) => setName(e.target.value)}
        />
      </FieldRow>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldRow label={BRANCH_FORM_COPY.cityLabel} htmlFor={FIELD.city} error={fieldError(FIELD.city)}>
          <AppInput
            id={FIELD.city}
            value={city}
            invalid={fieldError(FIELD.city) !== undefined}
            onChange={(e) => setCity(e.target.value)}
          />
        </FieldRow>
        <FieldRow label={BRANCH_FORM_COPY.stateLabel} htmlFor={FIELD.state} error={fieldError(FIELD.state)}>
          <AppInput
            id={FIELD.state}
            value={stateName}
            invalid={fieldError(FIELD.state) !== undefined}
            onChange={(e) => setStateName(e.target.value)}
          />
        </FieldRow>
      </div>
      <div className="mt-1 flex justify-end gap-2">
        <AppButton type="button" variant="quiet" onClick={close}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={create.isPending}>
          {BRANCH_FORM_COPY.save}
        </AppButton>
      </div>
    </form>
  );
}

export function openBranchCreate(): void {
  DrawerService.launch((close) => <BranchCreateForm close={close} />, {
    eyebrow: BRANCH_FORM_COPY.createOverline,
    title: BRANCH_FORM_COPY.createTitle,
  });
}
