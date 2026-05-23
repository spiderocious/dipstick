import type { ReactNode } from 'react';

import type { AppToastTone } from '@dipstick/ui';

/**
 * DrawerStore — a framework-free pub-sub backing store for imperative toasts
 * and modals. See design-system/docs/translation-ui-guide.md §6.3.
 *
 * The store holds a toast queue and at most one active modal. Host components
 * subscribe via useSyncExternalStore and render through portals.
 */
export interface ToastItem {
  readonly id: number;
  readonly mark: string;
  readonly tone: AppToastTone;
  readonly message: ReactNode;
  readonly durationMs: number;
  readonly onUndo?: () => void;
  readonly undoLabel?: string;
}

export interface ConfirmModalState {
  readonly kind: 'confirm';
  readonly eyebrow?: string;
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm?: () => void;
}

export interface VoidModalState {
  readonly kind: 'void';
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly confirmWord: string;
  readonly confirmLabel?: string;
  readonly onConfirm: (reason: string) => void;
}

/** A footer action button on a launched modal. */
export interface LaunchModalButton {
  readonly show?: boolean;
  readonly text?: string;
  /** Called with a `close` fn; if it returns false the modal stays open. */
  readonly onClick?: (close: () => void) => void;
}

export interface LaunchModalState {
  readonly kind: 'launch';
  /** Custom content; receives a `close` fn so it can dismiss itself. */
  readonly render: (close: () => void) => ReactNode;
  readonly eyebrow?: string;
  readonly title?: ReactNode;
  readonly subtitle?: ReactNode;
  readonly maxWidth?: number;
  readonly showCloseButton: boolean;
  readonly clickOutsideToClose: boolean;
  readonly cancelButton?: LaunchModalButton;
  readonly confirmButton?: LaunchModalButton;
  readonly onClose?: () => void;
}

export type ModalState = ConfirmModalState | VoidModalState | LaunchModalState;

export interface DrawerState {
  readonly toasts: readonly ToastItem[];
  readonly modal: ModalState | null;
}

type Listener = () => void;

class DrawerStore {
  private state: DrawerState = { toasts: [], modal: null };
  private listeners = new Set<Listener>();
  private nextId = 1;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): DrawerState => this.state;

  private emit(next: DrawerState): void {
    this.state = next;
    this.listeners.forEach((l) => l());
  }

  pushToast(toast: Omit<ToastItem, 'id'>): number {
    const id = this.nextId++;
    const item: ToastItem = { ...toast, id };
    this.emit({ ...this.state, toasts: [...this.state.toasts, item] });
    if (item.durationMs > 0) {
      setTimeout(() => this.dismissToast(id), item.durationMs);
    }
    return id;
  }

  dismissToast(id: number): void {
    this.emit({ ...this.state, toasts: this.state.toasts.filter((t) => t.id !== id) });
  }

  openModal(modal: ModalState): void {
    this.emit({ ...this.state, modal });
  }

  closeModal(): void {
    this.emit({ ...this.state, modal: null });
  }
}

export const drawerStore = new DrawerStore();
