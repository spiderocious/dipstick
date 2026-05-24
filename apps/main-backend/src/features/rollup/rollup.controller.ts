import type { Request, Response } from 'express';

import { getAuth } from '@lib/http/authedRequest.js';
import { sendResult } from '@lib/http/respond.js';
import { ResponseUtil } from '@lib/response.js';
import { serializeBranch, serializeTank } from '@shared/serializers.js';

import { rollupService } from './rollup.service.js';

export const rollupController = {
  morning: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const date = typeof req.query['date'] === 'string' ? req.query['date'] : undefined;
    const result = await rollupService.morning(auth.orgId, auth.userId, date);
    return sendResult(res, result, (r, data) =>
      ResponseUtil.ok(r, {
        business_date: data.businessDate,
        lead: data.lead,
        totals: {
          litres: data.totals.litres,
          gross_kobo: data.totals.grossKobo,
          variance_kobo: data.totals.varianceKobo,
        },
        branches: data.branches.map((b) => ({
          ...serializeBranch(b.branch),
          status: b.status,
          litres: b.totals.litres,
          gross_kobo: b.totals.grossKobo,
          variance_kobo: b.totals.varianceKobo,
          short_count: b.totals.shortCount,
          tanks_below_reorder: b.tanksBelowReorder.map(serializeTank),
        })),
        todo: data.todo,
      }),
    );
  },

  trends: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const raw = req.query['days'];
    const days = typeof raw === 'string' && Number.parseInt(raw, 10) > 0 ? Math.min(Number.parseInt(raw, 10), 90) : 7;
    const result = await rollupService.trends(auth.orgId, auth.userId, days);
    return sendResult(res, result, (r, data) =>
      ResponseUtil.ok(r, {
        from: data.from,
        to: data.to,
        series: data.series.map((s) => ({
          branch_id: s.branchId,
          branch_name: s.branchName,
          points: s.points,
        })),
      }),
    );
  },
};
