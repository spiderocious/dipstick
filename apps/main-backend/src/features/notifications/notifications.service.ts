import type { Tx } from '@db/transaction.js';
import { newId } from '@lib/ids.js';
import type { Page, PageParams } from '@lib/pagination.js';
import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type { NotificationDoc } from '@shared/types/documents.js';

import type { NotificationRepo } from './notifications.repo.js';
import { notificationRepo } from './notifications.repo.mongo.js';

const now = (): string => new Date().toISOString();

// Input for the fan-out primitive. Other features call notify() to enqueue an in-app
// notification for a user; branchId is optional (a notification may be org-wide).
export interface NotifyInput {
  orgId: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  branchId?: string | null;
}

export class NotificationsService {
  private constructor(private readonly repo: NotificationRepo = notificationRepo) {}
  private static instance: NotificationsService;
  static getInstance(): NotificationsService {
    if (!NotificationsService.instance) {
      NotificationsService.instance = new NotificationsService();
    }
    return NotificationsService.instance;
  }

  // The caller's own notifications, newest first, cursor-paginated.
  list(userId: string, params: PageParams): Promise<Page<NotificationDoc>> {
    return this.repo.listForUser({ ...params, userId });
  }

  // Count of the caller's unread notifications.
  countUnread(userId: string): Promise<number> {
    return this.repo.countUnread(userId);
  }

  // Mark one notification read. Fails NOT_FOUND when it does not exist or belongs to another
  // user — we do not leak the existence of another user's notification.
  async markRead(id: string, userId: string): Promise<ServiceResult<NotificationDoc>> {
    const matched = await this.repo.markRead(id, userId, now());
    if (!matched) return fail(ERROR_CODE.NOT_FOUND, 'entity_not_found');
    const updated = await this.repo.findById(id);
    if (!updated) return fail(ERROR_CODE.NOT_FOUND, 'entity_not_found');
    return ok(updated);
  }

  // Fan-out primitive: insert an unread notification for a user. Other features call this to
  // enqueue in-app notifications; it may join an existing transaction via `tx`.
  async notify(input: NotifyInput, tx?: Tx): Promise<void> {
    const doc: NotificationDoc = {
      _id: newId('notification'),
      orgId: input.orgId,
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      branchId: input.branchId ?? null,
      readAt: null,
      createdAt: now(),
      updatedAt: now(),
    };
    await this.repo.insert(doc, tx);
  }
}

export const notificationsService = NotificationsService.getInstance();
