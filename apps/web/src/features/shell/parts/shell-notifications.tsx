import { formatRelative } from '@dipstick/core';
import { useMarkNotificationRead, useNotifications, type NotificationWire } from '@dipstick/api';
import { useState } from 'react';

import { IconBell } from '@icons';

export function ShellNotifications() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();

  const unread = data?.unread_count ?? 0;
  const items = data?.items ?? [];

  function handleOpen(item: NotificationWire) {
    if (!item.read) markRead.mutate(item.id);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-[3px] text-ink-tertiary hover:bg-recessed hover:text-ink"
      >
        <IconBell size={17} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald px-1 font-mono text-[9px] tabular-nums text-sheet">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-[3px] border border-sheet-edge bg-sheet shadow-[0_16px_48px_-24px_rgba(26,23,20,0.4)]">
            <div className="border-b border-hair px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-tertiary">
              Notifications
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center font-serif text-[13px] italic text-ink-tertiary">
                  Nothing yet.
                </p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpen(item)}
                    className="block w-full border-b border-hair-soft px-4 py-3 text-left last:border-b-0 hover:bg-recessed/50"
                  >
                    <div className="flex items-baseline gap-2">
                      {!item.read && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald" aria-hidden="true" />}
                      <span className="font-sans text-[13px] font-medium text-ink">{item.title}</span>
                      <span className="ml-auto font-mono text-[10px] text-ink-tertiary">
                        {formatRelative(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 font-serif text-[13px] leading-[1.45] text-ink-secondary">{item.body}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
