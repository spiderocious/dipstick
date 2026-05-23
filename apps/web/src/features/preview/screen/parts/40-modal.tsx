import { useState } from 'react';

import {
  AppButton,
  AppInput,
  AppModal,
  AppVoidConfirmModal,
  FieldRow,
  ModalLedger,
} from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

export function ModalPart() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [lastVoidReason, setLastVoidReason] = useState<string | null>(null);

  return (
    <div>
      <PageHead index="40 / FEEDBACK" title="Modal" subtitle="AppModal · AppVoidConfirmModal from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        The default for confirmations, the form for structured data, and the critical, irreversible modal —
        the only place we use a hazard stripe and a typed-word gate. The void button stays disabled until
        you give a reason <em>and</em> type the word VOID.
      </p>

      <RefBlock title="Open a modal">
        <RefRow label="confirm">
          <AppButton onClick={() => setConfirmOpen(true)}>Post evening shift</AppButton>
        </RefRow>
        <RefRow label="form">
          <AppButton variant="secondary" onClick={() => setFormOpen(true)}>
            Add an expense
          </AppButton>
        </RefRow>
        <RefRow label="critical · void">
          <AppButton variant="danger" onClick={() => setVoidOpen(true)}>
            Void posted shift
          </AppButton>
        </RefRow>
        {lastVoidReason !== null && (
          <RefRow label="last void">
            <span className="font-mono text-[12px]" style={{ color: 'var(--oxblood)' }}>
              voided · reason: {lastVoidReason}
            </span>
          </RefRow>
        )}
      </RefBlock>

      <AppModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        eyebrow="Confirm"
        title="Post evening shift — Mokola?"
        footer={
          <>
            <AppButton variant="quiet" onClick={() => setConfirmOpen(false)}>
              Cancel
            </AppButton>
            <AppButton onClick={() => setConfirmOpen(false)}>Post shift →</AppButton>
          </>
        }
      >
        <p className="m-0 mb-3 font-serif text-[15px] leading-[1.55]" style={{ color: 'var(--ink-2)' }}>
          Four pumps active. Two balanced, one short by ₦2,400 (Chidera, note filed), one over by ₦440
          (Yusuf). Once posted, edits leave an audit trail.
        </p>
        <ModalLedger
          rows={[
            { k: 'Litres', v: '2,340.0 L' },
            { k: 'Gross', v: '₦740,448' },
            { k: 'Declared', v: '₦738,488' },
            { k: 'Variance', v: '− ₦1,960', tone: 'short' },
          ]}
        />
        <p className="m-0 font-serif text-[13px] italic" style={{ color: 'var(--ink-3)' }}>
          — Signed as Adeola, branch manager · Tue 18:51 WAT.
        </p>
      </AppModal>

      <AppModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        eyebrow="New entry"
        title="Add an expense to today's book"
        maxWidth={540}
        footer={
          <>
            <AppButton variant="quiet" onClick={() => setFormOpen(false)}>
              Save draft
            </AppButton>
            <AppButton variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </AppButton>
            <AppButton onClick={() => setFormOpen(false)}>Add to day-book</AppButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="Category" htmlFor="exp-cat">
            <AppInput id="exp-cat" defaultValue="Diesel · generator" />
          </FieldRow>
          <FieldRow label="Time" htmlFor="exp-time">
            <AppInput id="exp-time" numeric defaultValue="19:42" />
          </FieldRow>
        </div>
        <FieldRow label="What was paid for" htmlFor="exp-what" className="mt-3">
          <AppInput id="exp-what" defaultValue="Generator diesel — 20L from Mama Risi" />
        </FieldRow>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <FieldRow label="Amount" htmlFor="exp-amt">
            <AppInput id="exp-amt" numeric defaultValue="18,000.00" leadingAffix="₦" />
          </FieldRow>
          <FieldRow label="Witness" htmlFor="exp-wit">
            <AppInput id="exp-wit" defaultValue="Adeola B." />
          </FieldRow>
        </div>
      </AppModal>

      <AppVoidConfirmModal
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        title="Void Chidera's posted shift?"
        onConfirm={(reason) => {
          setLastVoidReason(reason);
          setVoidOpen(false);
        }}
      >
        <p className="m-0 mb-3">
          You are about to void a <strong style={{ color: 'var(--oxblood)' }}>signed and posted</strong>{' '}
          shift. This action is <strong style={{ color: 'var(--oxblood)' }}>irreversible</strong>. The entry
          will remain visible in the audit log, struck through, with your name and reason attached forever.
        </p>
        <ModalLedger
          rows={[
            { k: 'Shift', v: 'SHIFT-MOK-2026-05-14-PM · P-02' },
            { k: 'Attendant', v: 'Chidera Okoye' },
            { k: 'Posted by', v: 'Adeola · Tue 18:51' },
            { k: 'Litres', v: '612.0 L · PMS' },
            { k: 'Variance', v: '− ₦2,400', tone: 'short' },
          ]}
        />
      </AppVoidConfirmModal>
    </div>
  );
}
