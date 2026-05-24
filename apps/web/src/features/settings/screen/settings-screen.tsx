import { P, ROUTES } from '@dipstick/core';
import { AppSheet } from '@dipstick/ui';
import { Link } from 'react-router-dom';

import { IconForward, IconRole, IconSettings } from '@icons';

import { useAuth } from '@shared/auth';
import { PageBody, PageHead } from '@shared/screen';

const SETTINGS_COPY = {
  overline: 'Settings',
  title: 'Account & administration.',
  org: 'Business profile',
  orgBody: 'Display name and the wordmark printed on exported reports.',
  roles: 'Roles & permissions',
  rolesBody: 'Define who can do what across your branches.',
} as const;

export function SettingsScreen() {
  const { can } = useAuth();

  return (
    <PageBody>
      <PageHead overline={SETTINGS_COPY.overline} title={SETTINGS_COPY.title} />
      <div className="flex flex-col gap-3">
        {can(P.CAN_MANAGE_ORG) && (
          <SettingsLink to={ROUTES.SETTINGS_ORG} icon={<IconSettings size={18} />} title={SETTINGS_COPY.org} body={SETTINGS_COPY.orgBody} />
        )}
        {can(P.CAN_MANAGE_ROLES) && (
          <SettingsLink to={ROUTES.SETTINGS_ROLES} icon={<IconRole size={18} />} title={SETTINGS_COPY.roles} body={SETTINGS_COPY.rolesBody} />
        )}
      </div>
    </PageBody>
  );
}

function SettingsLink({ to, icon, title, body }: { readonly to: string; readonly icon: React.ReactNode; readonly title: string; readonly body: string }) {
  return (
    <Link to={to}>
      <AppSheet pad="md" className="flex items-center gap-4 hover:bg-recessed/40">
        <span className="text-ink-tertiary">{icon}</span>
        <div className="min-w-0">
          <div className="font-serif text-[16px] font-medium text-ink">{title}</div>
          <div className="mt-0.5 font-sans text-[13px] text-ink-secondary">{body}</div>
        </div>
        <IconForward size={16} className="ml-auto text-ink-tertiary" aria-hidden="true" />
      </AppSheet>
    </Link>
  );
}
