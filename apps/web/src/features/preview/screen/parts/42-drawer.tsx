import { AppButton, AppInput, FieldRow, ModalLedger } from '@dipstick/ui';

import { DrawerService } from '@shared/drawer';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

export function DrawerPart() {
  return (
    <div>
      <PageHead index="42 / FEEDBACK" title="DrawerService" subtitle="Imperative toasts & modals from @shared/drawer" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Call toasts and modals from anywhere — no props, no context. The store lives in <code>@shared/drawer</code>;{' '}
        <code>ModalHost</code> and <code>ToastHost</code> are mounted once in <code>app.provider.tsx</code>.
        These buttons fire the real service.
      </p>

      <RefBlock title="Toasts">
        <RefRow label="success">
          <AppButton
            onClick={() =>
              DrawerService.toast('Evening shift signed off — Mokola.', {
                mark: '✓ POSTED',
                onUndo: () => DrawerService.toast('Undone.', { mark: '↩ UNDO' }),
                undoLabel: 'UNDO · 6s',
              })
            }
          >
            Post (with undo)
          </AppButton>
        </RefRow>
        <RefRow label="error">
          <AppButton
            variant="secondary"
            onClick={() =>
              DrawerService.toast("Couldn't reach server — saved locally, will sync.", {
                tone: 'error',
                mark: '! FAILED',
              })
            }
          >
            Trigger error toast
          </AppButton>
        </RefRow>
        <RefRow label="delivered">
          <AppButton
            variant="secondary"
            onClick={() =>
              DrawerService.toast('Tanker A-44218 confirmed — 33,000 L PMS at Mokola.', {
                tone: 'delivered',
                mark: '✓ DELIVERED',
              })
            }
          >
            Trigger delivery toast
          </AppButton>
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Modals">
        <RefRow label="confirm">
          <AppButton
            onClick={() =>
              DrawerService.confirm(
                'Post evening shift — Mokola?',
                <div>
                  <p className="m-0 mb-3 font-serif text-[15px] leading-[1.55]" style={{ color: 'var(--ink-2)' }}>
                    Four pumps active. Once posted, edits leave an audit trail.
                  </p>
                  <ModalLedger
                    rows={[
                      { k: 'Litres', v: '2,340.0 L' },
                      { k: 'Variance', v: '− ₦1,960', tone: 'short' },
                    ]}
                  />
                </div>,
                {
                  confirmLabel: 'Post shift →',
                  onConfirm: () => DrawerService.toast('Evening shift posted.', { mark: '✓ POSTED' }),
                },
              )
            }
          >
            Confirm modal
          </AppButton>
        </RefRow>
        <RefRow label="critical · void">
          <AppButton
            variant="danger"
            onClick={() =>
              DrawerService.voidConfirm(
                "Void Chidera's posted shift?",
                <p className="m-0">
                  You are about to void a <strong style={{ color: 'var(--oxblood)' }}>signed and posted</strong>{' '}
                  shift. This is <strong style={{ color: 'var(--oxblood)' }}>irreversible</strong> and stays in
                  the audit log forever.
                </p>,
                {
                  onConfirm: (reason) =>
                    DrawerService.toast(`Shift voided — ${reason}`, { tone: 'error', mark: '✓ VOIDED' }),
                },
              )
            }
          >
            Void modal
          </AppButton>
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Custom modal — DrawerService.launch(component, options)">
        <RefRow label="full options">
          <AppButton
            onClick={() =>
              DrawerService.launch(
                (close) => (
                  <div>
                    <p className="m-0 mb-3 font-serif text-[15px] leading-[1.55]" style={{ color: 'var(--ink-2)' }}>
                      Any custom content goes here — the body is entirely yours. The render fn receives a{' '}
                      <code>close</code> callback.
                    </p>
                    <FieldRow label="Branch nickname" htmlFor="launch-nick">
                      <AppInput id="launch-nick" defaultValue="Mokola" />
                    </FieldRow>
                    <button
                      type="button"
                      onClick={close}
                      className="mt-3 font-mono text-[11px] underline"
                      style={{ color: 'var(--ink-3)' }}
                    >
                      close from inside the body
                    </button>
                  </div>
                ),
                {
                  eyebrow: 'Custom',
                  title: 'Rename this branch',
                  subtitle: 'Shown only to your team — not on exports.',
                  showCloseButton: true,
                  clickOutsideToClose: true,
                  cancelButtonProps: { show: true, text: 'Discard' },
                  confirmButtonProps: {
                    show: true,
                    text: 'Save name',
                    onClick: (close) => {
                      DrawerService.toast('Branch renamed.', { mark: '✓ SAVED' });
                      close();
                    },
                  },
                },
              )
            }
          >
            Launch custom modal
          </AppButton>
        </RefRow>
        <RefRow label="locked (no outside-close, no ×)">
          <AppButton
            variant="secondary"
            onClick={() =>
              DrawerService.launch(
                (close) => (
                  <div>
                    <p className="m-0 font-serif text-[15px] leading-[1.55]" style={{ color: 'var(--ink-2)' }}>
                      This one can't be dismissed by clicking outside or Escape, and has no × — the only way out
                      is a footer button.
                    </p>
                    <AppButton className="mt-4" onClick={close}>
                      Acknowledge
                    </AppButton>
                  </div>
                ),
                {
                  eyebrow: 'Notice',
                  title: 'Read this first',
                  showCloseButton: false,
                  clickOutsideToClose: false,
                },
              )
            }
          >
            Launch locked modal
          </AppButton>
        </RefRow>
      </RefBlock>
    </div>
  );
}
