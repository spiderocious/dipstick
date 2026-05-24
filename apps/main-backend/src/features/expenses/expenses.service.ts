import { newId } from '@lib/ids.js';
import type { Page } from '@lib/pagination.js';
import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type { ExpenseDoc } from '@shared/types/documents.js';

import { auditService, type AuditService } from '../audit/audit.service.js';
import type { BranchRepo } from '../branches/branches.repo.js';
import { branchRepo } from '../branches/branches.repo.mongo.js';
import type { ExpenseListQuery, ExpenseRepo } from './expenses.repo.js';
import { expenseRepo } from './expenses.repo.mongo.js';

const now = (): string => new Date().toISOString();

interface RecordExpenseInput {
  businessDate: string;
  category: string;
  description: string;
  amountKobo: number;
  witness?: string;
}

export class ExpensesService {
  private constructor(
    private readonly expenses: ExpenseRepo = expenseRepo,
    private readonly branches: BranchRepo = branchRepo,
    private readonly audit: AuditService = auditService,
  ) {}
  private static instance: ExpensesService;
  static getInstance(): ExpensesService {
    if (!ExpensesService.instance) ExpensesService.instance = new ExpensesService();
    return ExpensesService.instance;
  }

  list(query: ExpenseListQuery): Promise<Page<ExpenseDoc>> {
    return this.expenses.list(query);
  }

  async getById(orgId: string, expenseId: string): Promise<ServiceResult<ExpenseDoc>> {
    const expense = await this.expenses.findById(expenseId);
    if (!expense || expense.orgId !== orgId) {
      return fail(ERROR_CODE.NOT_FOUND, 'expense_not_found');
    }
    return ok(expense);
  }

  async record(
    orgId: string,
    branchId: string,
    input: RecordExpenseInput,
    actorId: string,
  ): Promise<ServiceResult<ExpenseDoc>> {
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.orgId !== orgId) return fail(ERROR_CODE.NOT_FOUND, 'branch_not_found');
    if (branch.isArchived) return fail(ERROR_CODE.INVALID_STATE, 'branch_archived');

    const witness = input.witness ?? null;
    const doc: ExpenseDoc = {
      _id: newId('expense'),
      orgId,
      branchId,
      businessDate: input.businessDate,
      category: input.category,
      description: input.description,
      amountKobo: input.amountKobo,
      recordedBy: actorId,
      witness,
      // A single-source expense has no corroborating witness — flagged for review.
      isSingleSource: witness === null || witness === undefined,
      createdAt: now(),
      updatedAt: now(),
    };
    await this.expenses.insert(doc);
    await this.audit.record({
      orgId,
      branchId,
      actorId,
      action: 'expense.recorded',
      entityType: 'expense',
      entityId: doc._id,
      after: {
        category: doc.category,
        amount_kobo: doc.amountKobo,
        business_date: doc.businessDate,
        is_single_source: doc.isSingleSource,
      },
      note: doc.description,
    });
    return ok(doc);
  }
}

export const expensesService = ExpensesService.getInstance();
