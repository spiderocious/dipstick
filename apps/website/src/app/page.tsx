import Link from 'next/link';

import { AppText } from '@dipstick/ui';

export default function HomePage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173';

  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <AppText variant="caption">dipstick</AppText>
      <AppText variant="display-1" className="mt-2 text-emerald">
        The cashier&apos;s book, made shared, signed and tamper-proof.
      </AppText>
      <AppText variant="body" className="mt-6 max-w-2xl text-ink-secondary">
        Dipstick is a digital station logbook for Nigerian filling-station owners with one to ten branches.
        The manager records the day; the owner sees the roll-up across every branch from one screen, every
        morning. No hardware, no POS — a trusted manual logbook by design.
      </AppText>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={appUrl}
          className="inline-flex items-center justify-center rounded-md bg-emerald px-5 py-2.5 text-sm font-medium text-sheet hover:bg-emerald-hover"
        >
          Open the app
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-md border border-hairline px-5 py-2.5 text-sm font-medium text-emerald hover:bg-emerald/5"
        >
          Pricing
        </Link>
      </div>

      <section className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card title="The day-book" body="Opening dip, shifts, deliveries, expenses, closing dip — in the order they happened." />
        <Card title="Reconciliation" body="Litres dispensed vs cash declared, flagged balanced, short or over per pump per shift." />
        <Card title="Deliveries" body="A guided four-stage tanker offload: arrive, dip-before, offload, dip-after & sign." />
        <Card title="Pricing" body="Price changes pinned to the effective shift, with a full per-product history." />
        <Card title="Owner roll-up" body="Yesterday's totals across every branch, with the shortages to review this morning." />
        <Card title="Audit & voids" body="Posted entries are final. Reversal is the void idiom — visible, signed, permanent." />
      </section>
    </main>
  );
}

interface CardProps {
  readonly title: string;
  readonly body: string;
}

function Card({ title, body }: CardProps) {
  return (
    <div className="rounded-lg border border-hairline bg-sheet p-5 shadow-sm">
      <AppText variant="heading-3" className="text-emerald">
        {title}
      </AppText>
      <AppText variant="body-sm" className="mt-2 text-ink-secondary">
        {body}
      </AppText>
    </div>
  );
}
