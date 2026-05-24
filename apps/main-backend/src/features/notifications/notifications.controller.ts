import type { Request, Response } from 'express';

import { getAuth } from '@lib/http/authedRequest.js';
import { sendResult } from '@lib/http/respond.js';
import { pageMeta, parsePageParams } from '@lib/pagination.js';
import { ResponseUtil } from '@lib/response.js';
import { serializeNotification } from '@shared/serializers.js';

import { notificationsService } from './notifications.service.js';

export const notificationsController = {
  list: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const params = parsePageParams(req.query as Record<string, unknown>);
    const page = await notificationsService.list(auth.userId, params);
    const unreadCount = await notificationsService.countUnread(auth.userId);
    return ResponseUtil.ok(
      res,
      { items: page.items.map(serializeNotification), unread_count: unreadCount },
      pageMeta(page),
    );
  },

  markRead: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const result = await notificationsService.markRead(req.params['id'] as string, auth.userId);
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeNotification(data)));
  },
};
