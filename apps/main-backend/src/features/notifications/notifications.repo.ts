import type { Tx } from '@db/transaction.js';
import type { Page, PageParams } from '@lib/pagination.js';
import type { NotificationDoc } from '@shared/types/documents.js';

// Notifications are always scoped to a single user (the caller). The list query carries the
// userId so the repo never returns another user's notifications.
export interface NotificationQuery extends PageParams {
  userId: string;
}

export interface NotificationRepo {
  insert(doc: NotificationDoc, tx?: Tx): Promise<void>;
  // The caller's notifications, newest first, cursor-paginated on createdAt.
  listForUser(query: NotificationQuery): Promise<Page<NotificationDoc>>;
  // How many of the user's notifications are still unread (readAt == null).
  countUnread(userId: string): Promise<number>;
  // Mark one notification read, but only if it belongs to userId. Returns whether a doc was
  // matched (matchedCount > 0) so the service can distinguish not-found from no-op.
  markRead(id: string, userId: string, at: string): Promise<boolean>;
  findById(id: string): Promise<NotificationDoc | null>;
}
