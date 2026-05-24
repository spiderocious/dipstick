import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY, parseNairaToKobo } from '@dipstick/core';
import { useRecordExpense, type RecordExpensePayload } from '@dipstick/api';
import { AppButton, AppInput, AppSelect, FieldRow } from '@dipstick/ui';
import { useState, type FormEvent } from 'react';

import { DrawerService } from '@shared/drawer';
import { useApiError } from '@shared/errors';
import { todayBusinessDate } from '@shared/format';
import { EXPENSE_CATEGORY_LABEL } from '@shared/copy/labels.ts';

import { EXPENSES_COPY } from '../../expenses.copy.ts';

const FIELD = { category: 'category', description: 'description', amount_kobo: 'amount_kobo', witness: 'witness' } as const;

function AddExpenseForm({ branchId, close }: { readonly branchId: string; readonly close: () => void }) {
  const record = useRecordExpense(branchId);
  const { fieldError, handleError, clearError } = useApiError();

  const [category, setCategory] = useState<string>(EXPENSE_CATEGORY.GENERATOR_DIESEL);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [witness, setWitness] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const payload: RecordExpensePayload = {
      business_date: todayBusinessDate(),
      category,
      description,
      amount_kobo: parseNairaToKobo(amount),
      ...(witness !== '' ? { witness } : {}),
    };
    record.mutate(payload, {
      onSuccess: () => {
        DrawerService.toast(description, { mark: EXPENSES_COPY.addedMark });
        close();
      },
      onError: handleError,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <FieldRow label={EXPENSES_COPY.categoryLabel} htmlFor={FIELD.category} error={fieldError(FIELD.category)}>
        <AppSelect id={FIELD.category} value={category} onChange={(e) => setCategory(e.target.value)}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_LABEL[c]}
            </option>
          ))}
        </AppSelect>
      </FieldRow>
      <FieldRow label={EXPENSES_COPY.descriptionLabel} htmlFor={FIELD.description} error={fieldError(FIELD.description)}>
        <AppInput id={FIELD.description} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FieldRow>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldRow label={EXPENSES_COPY.amountLabel} htmlFor={FIELD.amount_kobo} error={fieldError(FIELD.amount_kobo)}>
          <AppInput id={FIELD.amount_kobo} numeric inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} leadingAffix="₦" />
        </FieldRow>
        <FieldRow label={EXPENSES_COPY.witnessLabel} htmlFor={FIELD.witness} error={fieldError(FIELD.witness)}>
          <AppInput id={FIELD.witness} value={witness} onChange={(e) => setWitness(e.target.value)} />
        </FieldRow>
      </div>
      <div className="mt-1 flex justify-end gap-2">
        <AppButton type="button" variant="quiet" onClick={close}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={record.isPending}>
          {EXPENSES_COPY.save}
        </AppButton>
      </div>
    </form>
  );
}

export function openAddExpense(branchId: string): void {
  DrawerService.launch((close) => <AddExpenseForm branchId={branchId} close={close} />, {
    eyebrow: EXPENSES_COPY.add,
    title: EXPENSES_COPY.add,
  });
}
