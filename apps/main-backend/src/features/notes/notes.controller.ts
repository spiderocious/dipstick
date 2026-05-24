import type { Request, Response } from 'express';

import { getAuth } from '@lib/http/authedRequest.js';
import { parsePageParams, pageMeta } from '@lib/pagination.js';
import { sendResult } from '@lib/http/respond.js';
import { ResponseUtil } from '@lib/response.js';
import { validate } from '@lib/validate.js';
import { serializeNote } from '@shared/serializers.js';

import { AddNoteBody } from './notes.schema.js';
import { notesService } from './notes.service.js';

export const notesController = {
  list: async (req: Request, res: Response): Promise<Response> => {
    const page = parsePageParams(req.query as Record<string, unknown>);
    const result = await notesService.list(
      req.params['entityType'] as string,
      req.params['entityId'] as string,
      page,
    );
    return sendResult(res, result, (r, data) =>
      ResponseUtil.ok(r, { items: data.items.map(serializeNote) }, pageMeta(data)),
    );
  },

  add: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(AddNoteBody, req.body);
    const result = await notesService.add(
      auth.orgId,
      req.params['entityType'] as string,
      req.params['entityId'] as string,
      {
        body: body.body,
        ...(body.mentions !== undefined ? { mentions: body.mentions } : {}),
      },
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.created(r, serializeNote(data)));
  },
};
