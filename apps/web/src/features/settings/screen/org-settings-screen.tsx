import { ORG_WIDE_SCOPE } from '@dipstick/core';
import { useMe, useUpdateOrg } from '@dipstick/api';
import { AppButton, AppInput, AppSheet, FieldRow, SheetHead } from '@dipstick/ui';
import { useEffect, useState, type FormEvent } from 'react';

import { DrawerService } from '@shared/drawer';
import { useApiError } from '@shared/errors';
import { PageBody, PageHead, QueryState } from '@shared/screen';

const ORG_COPY = {
  overline: 'Business profile',
  title: 'Your business.',
  heading: 'Display & reports',
  nameLabel: 'Business display name',
  wordmarkLabel: 'Report wordmark',
  wordmarkHelp: 'Shown on printed and exported reports.',
  save: 'Save changes',
  savedMark: '✓ SAVED',
} as const;

const FIELD = { name: 'name', wordmark: 'wordmark' } as const;

export function OrgSettingsScreen() {
  const query = useMe();
  // The org name lives on the owner membership's org; derive the display from /me indirectly.
  const orgName = query.data?.memberships.find((m) => m.branch_id === ORG_WIDE_SCOPE)?.role_name;
  void orgName;

  return (
    <PageBody>
      <PageHead overline={ORG_COPY.overline} title={ORG_COPY.title} />
      <QueryState isLoading={query.isLoading} isError={query.isError} data={query.data}>
        {() => <OrgForm />}
      </QueryState>
    </PageBody>
  );
}

function OrgForm() {
  const update = useUpdateOrg();
  const { fieldError, handleError, clearError } = useApiError();
  const [name, setName] = useState('');
  const [wordmark, setWordmark] = useState('');

  // Org details aren't returned by /me directly; the owner edits and the PATCH is the source of
  // truth. Start blank and let the owner set/update.
  useEffect(() => {
    /* intentionally empty — fields are owner-entered */
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    update.mutate(
      { ...(name !== '' ? { name } : {}), wordmark: wordmark !== '' ? wordmark : null },
      { onSuccess: () => DrawerService.toast(ORG_COPY.save, { mark: ORG_COPY.savedMark }), onError: handleError },
    );
  }

  return (
    <AppSheet pad="lg">
      <SheetHead title={ORG_COPY.heading} />
      <form onSubmit={handleSubmit} className="flex max-w-[440px] flex-col gap-4" noValidate>
        <FieldRow label={ORG_COPY.nameLabel} htmlFor={FIELD.name} error={fieldError(FIELD.name)}>
          <AppInput id={FIELD.name} value={name} onChange={(e) => setName(e.target.value)} />
        </FieldRow>
        <FieldRow label={ORG_COPY.wordmarkLabel} htmlFor={FIELD.wordmark} help={ORG_COPY.wordmarkHelp} error={fieldError(FIELD.wordmark)}>
          <AppInput id={FIELD.wordmark} value={wordmark} onChange={(e) => setWordmark(e.target.value)} />
        </FieldRow>
        <div className="flex justify-end">
          <AppButton type="submit" loading={update.isPending}>
            {ORG_COPY.save}
          </AppButton>
        </div>
      </form>
    </AppSheet>
  );
}
