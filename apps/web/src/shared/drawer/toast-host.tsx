import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { AppToast } from '@dipstick/ui';

import { drawerStore } from './drawer-store.ts';

/**
 * ToastHost — mounted once at the app root. Subscribes to the drawer store and
 * renders the toast stack in the bottom-right via a portal.
 */
export function ToastHost() {
  const state = useSyncExternalStore(drawerStore.subscribe, drawerStore.getSnapshot);

  if (state.toasts.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-6 right-6 z-[1100] flex flex-col items-end gap-3">
      {state.toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <AppToast
            tone={t.tone}
            mark={t.mark}
            onUndo={
              t.onUndo !== undefined
                ? () => {
                    t.onUndo?.();
                    drawerStore.dismissToast(t.id);
                  }
                : undefined
            }
            undoLabel={t.undoLabel}
          >
            {t.message}
          </AppToast>
        </div>
      ))}
    </div>,
    document.body,
  );
}
