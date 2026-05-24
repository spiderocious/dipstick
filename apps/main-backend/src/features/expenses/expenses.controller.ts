import type { Request, Response } from 'express';

import { getAuth } from '@lib/http/authedRequest.js';
import { sendResult } from '@lib/http/respond.js';
import { pageMeta, parsePageParams } from '@lib/pagination.js';
import { ResponseUtil } from '@lib/response.js';
import { validate } from '@lib/validate.js';
import { serializeExpense } from '@shared/serializers.js';

import type { ExpenseListQuery } from './expenses.repo.js';
import { CreateExpenseBody } from './expenses.schema.js';
import { expensesService } from './expenses.service.js';

export const expensesController = {
  list: async (req: Request, res: Response): Promise<Response> => {
    const params = parsePageParams(req.query as Record<string, unknown>);
    const rawCategory = req.query['category'];
    const query: ExpenseListQuery = {
      branchId: req.params['branchId'] as string,
      cursor: params.cursor,
      limit: params.limit,
      ...(typeof rawCategory === 'string' && rawCategory.length > 0
        ? { category: rawCategory }
        : {}),
    };
    const page = await expensesService.list(query);
    return ResponseUtil.ok(res, { items: page.items.map(serializeExpense) }, pageMeta(page));
  },

  record: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const body = validate(CreateExpenseBody, req.body);
    const result = await expensesService.record(
      auth.orgId,
      req.params['branchId'] as string,
      {
        businessDate: body.business_date,
        category: body.category,
        description: body.description,
        amountKobo: body.amount_kobo,
        ...(body.witness !== undefined ? { witness: body.witness } : {}),
      },
      auth.userId,
    );
    return sendResult(res, result, (r, data) => ResponseUtil.created(r, serializeExpense(data)));
  },

  getOne: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const result = await expensesService.getById(auth.orgId, req.params['expenseId'] as string);
    return sendResult(res, result, (r, data) => ResponseUtil.ok(r, serializeExpense(data)));
  },
};
