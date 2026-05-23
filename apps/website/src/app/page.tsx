import Link from 'next/link';

import { AppText } from '@solon/ui';

export default function HomePage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173';

  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <AppText variant="caption">solon</AppText>
      <AppText variant="display-1" className="mt-2 text-forest-900">
        Wisdom, reform, neutrality — at the speed of a campaign.
      </AppText>
      <AppText variant="body" className="mt-6 max-w-2xl text-charcoal-700">
        Named after Solon of Athens, who laid the groundwork for democracy and refused to make himself
        king when given the chance. We build the campaign stack that respects that lineage —
        probabilistic, transparent, and resistant to manipulation.
      </AppText>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={appUrl}
          className="inline-flex items-center justify-center rounded-md bg-forest-900 px-5 py-2.5 text-sm font-medium text-cream-50 hover:bg-forest-700"
        >
          Open the app
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-md border border-forest-900/20 px-5 py-2.5 text-sm font-medium text-forest-900 hover:bg-forest-900/5"
        >
          Pricing
        </Link>
      </div>

      <section className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card title="Module 0 — Simulator" body="Race-level scenario modelling for aspirants and strategists." />
        <Card title="Module 1 — Voter Data" body="Polling-unit-level segmentation and message generation." />
        <Card title="Module 2 — Agents" body="Recruit, train, dispatch and verify field agents on election day." />
        <Card title="Module 3 — Finance" body="INEC-compliant expense tracking with anomaly detection." />
        <Card title="Module 4 — War Room" body="Live results, incidents and reconciliation with citizen reports." />
      </section>
    </main>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-forest-900/10 bg-white p-5 shadow-sm">
      <AppText variant="heading-3" className="text-forest-900">
        {title}
      </AppText>
      <AppText variant="body-sm" className="mt-2 text-charcoal-700">
        {body}
      </AppText>
    </div>
  );
}
