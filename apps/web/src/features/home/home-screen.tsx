import { Link } from 'react-router-dom';

import { useHealth } from '@dipstick/api';
import { ROUTES } from '@dipstick/core';
import { AppButton, AppText } from '@dipstick/ui';

export function HomeScreen() {
  const { data, isLoading, isError } = useHealth();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <AppText variant="caption">dipstick · station logbook</AppText>
      <AppText variant="display-1" className="mt-2 text-emerald">
        The day-book for your filling stations.
      </AppText>
      <AppText variant="body" className="mt-4 max-w-2xl text-ink-secondary">
        Opening dip, pump readings, deliveries, expenses and closing dip — recorded once, signed, and
        rolled up across every branch. Posted entries are final; integrity comes from the audit trail and
        the void idiom, never a silent delete.
      </AppText>

      <div className="mt-8 flex gap-3">
        <Link to={ROUTES.DASHBOARD}>
          <AppButton>Open the roll-up</AppButton>
        </Link>
        <Link to={ROUTES.PREVIEW}>
          <AppButton variant="secondary" type="button">
            Design system
          </AppButton>
        </Link>
      </div>

      <section className="mt-12 rounded-lg border border-hairline bg-sheet p-4 text-sm">
        <AppText variant="caption">backend health</AppText>
        <div className="mt-2 font-mono">
          {isLoading && 'Checking…'}
          {isError && <span className="text-amber">unreachable — is main-backend running?</span>}
          {data && (
            <span>
              status: <strong>{data.status}</strong>
            </span>
          )}
        </div>
      </section>
    </main>
  );
}
