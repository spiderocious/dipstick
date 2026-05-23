import type { ReactNode } from 'react';

import type { AppToastTone } from '@dipstick/ui';

import { drawerStore } from './drawer-store.ts';

/**
 * DrawerService — imperative toasts and modals callable from anywhere, with no
 * props and no context. See design-system/docs/translation-ui-guide.md §6.3.
 *
 *   DrawerService.toast('Posted', { mark: '✓ POSTED' });
 *   DrawerService.confirm('Post shift?', 'Edits leave an audit trail.', { onConfirm });
 *   DrawerService.voidConfirm('Void shift?', body, { onConfirm: (reason) => … });
 */
export interface ToastOptions {
  tone?: AppToastTone;
  mark?: string;
  durationMs?: number;
  onUndo?: () => void;
  undoLabel?: string;
}

export interface ConfirmOptions {
  eyebrow?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
}

export interface VoidConfirmOptions {
  confirmWord?: string;
  confirmLabel?: string;
  onConfirm: (reason: string) => void;
}

export interface LaunchButtonOptions {
  show?: boolean;
  text?: string;
  /** Receives a `close` fn — call it to dismiss. Omit to use the default (cancel closes, confirm closes). */
  onClick?: (close: () => void) => void;
}

export interface LaunchOptions {
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  maxWidth?: number;
  /** Header × button. Default true. */
  showCloseButton?: boolean;
  /** Scrim-click and Escape close. Default true. */
  clickOutsideToClose?: boolean;
  cancelButtonProps?: LaunchButtonOptions;
  confirmButtonProps?: LaunchButtonOptions;
  /** Called whenever the modal closes (× / scrim / Escape / cancel default). */
  onClose?: () => void;
}

/** Custom modal content — either static, or a render fn that receives a `close` fn. */
export type LaunchContent = ReactNode | ((close: () => void) => ReactNode);

export const DrawerService = {
  toast(message: ReactNode, options: ToastOptions = {}): number {
    return drawerStore.pushToast({
      message,
      tone: options.tone ?? 'ok',
      mark: options.mark ?? '✓',
      durationMs: options.durationMs ?? 5000,
      onUndo: options.onUndo,
      undoLabel: options.undoLabel,
    });
  },

  dismissToast(id: number): void {
    drawerStore.dismissToast(id);
  },

  confirm(title: ReactNode, body: ReactNode, options: ConfirmOptions = {}): void {
    drawerStore.openModal({
      kind: 'confirm',
      title,
      body,
      eyebrow: options.eyebrow ?? 'Confirm',
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      onConfirm: options.onConfirm,
    });
  },

  voidConfirm(title: ReactNode, body: ReactNode, options: VoidConfirmOptions): void {
    drawerStore.openModal({
      kind: 'void',
      title,
      body,
      confirmWord: options.confirmWord ?? 'VOID',
      confirmLabel: options.confirmLabel,
      onConfirm: options.onConfirm,
    });
  },

  /**
   * Launch a fully custom modal. `content` is your component (or a render fn
   * receiving a `close` callback). Header + footer buttons are configured via
   * `options`; the body is entirely yours.
   */
  launch(content: LaunchContent, options: LaunchOptions = {}): void {
    drawerStore.openModal({
      kind: 'launch',
      render: typeof content === 'function' ? (content as (close: () => void) => ReactNode) : () => content,
      eyebrow: options.eyebrow,
      title: options.title,
      subtitle: options.subtitle,
      maxWidth: options.maxWidth,
      showCloseButton: options.showCloseButton ?? true,
      clickOutsideToClose: options.clickOutsideToClose ?? true,
      cancelButton: options.cancelButtonProps,
      confirmButton: options.confirmButtonProps,
      onClose: options.onClose,
    });
  },

  closeModal(): void {
    drawerStore.closeModal();
  },
} as const;
