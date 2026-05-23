import { useSyncExternalStore } from 'react';

import { AppButton, AppModal, AppVoidConfirmModal } from '@dipstick/ui';

import { drawerStore } from './drawer-store.ts';

/**
 * ModalHost — mounted once at the app root. Renders the single active modal
 * from the drawer store (a confirm modal or the critical void modal). The
 * primitives portal themselves to <body>.
 */
export function ModalHost() {
  const state = useSyncExternalStore(drawerStore.subscribe, drawerStore.getSnapshot);
  const modal = state.modal;

  if (modal === null) return null;

  const close = () => drawerStore.closeModal();

  if (modal.kind === 'launch') {
    const cancel = modal.cancelButton;
    const confirm = modal.confirmButton;
    const showCancel = cancel?.show ?? false;
    const showConfirm = confirm?.show ?? false;
    const hasFooter = showCancel || showConfirm;
    const handleClose = () => {
      modal.onClose?.();
      close();
    };
    return (
      <AppModal
        open
        eyebrow={modal.eyebrow}
        title={modal.title ?? ''}
        subtitle={modal.subtitle}
        maxWidth={modal.maxWidth}
        dismissible={modal.clickOutsideToClose}
        showCloseButton={modal.showCloseButton}
        onClose={handleClose}
        footer={
          hasFooter ? (
            <>
              {showCancel && (
                <AppButton
                  variant="secondary"
                  onClick={() => (cancel?.onClick ? cancel.onClick(close) : handleClose())}
                >
                  {cancel?.text ?? 'Cancel'}
                </AppButton>
              )}
              {showConfirm && (
                <AppButton onClick={() => (confirm?.onClick ? confirm.onClick(close) : close())}>
                  {confirm?.text ?? 'Confirm'}
                </AppButton>
              )}
            </>
          ) : undefined
        }
      >
        {modal.render(close)}
      </AppModal>
    );
  }

  if (modal.kind === 'void') {
    return (
      <AppVoidConfirmModal
        open
        title={modal.title}
        confirmWord={modal.confirmWord}
        confirmLabel={modal.confirmLabel}
        onClose={() => drawerStore.closeModal()}
        onConfirm={(reason) => {
          modal.onConfirm(reason);
          drawerStore.closeModal();
        }}
      >
        {modal.body}
      </AppVoidConfirmModal>
    );
  }

  return (
    <AppModal
      open
      eyebrow={modal.eyebrow}
      title={modal.title}
      onClose={() => drawerStore.closeModal()}
      footer={
        <>
          <AppButton variant="quiet" onClick={() => drawerStore.closeModal()}>
            {modal.cancelLabel}
          </AppButton>
          <AppButton
            onClick={() => {
              modal.onConfirm?.();
              drawerStore.closeModal();
            }}
          >
            {modal.confirmLabel}
          </AppButton>
        </>
      }
    >
      {modal.body}
    </AppModal>
  );
}
