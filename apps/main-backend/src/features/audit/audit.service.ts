import type { Tx } from '@db/transaction.js';
import { newId } from '@lib/ids.js';
import type { AuditDoc } from '@shared/types/documents.js';

import { auditRepo, type AuditRepo } from './audit.repo.js';

export interface AuditEntry {
  orgId: string;
  branchId?: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  note?: string | null;
}

// Append-only audit writer. Every state-changing service calls record() — inside the same
// transaction as the change where one exists, so the audit row and the change commit
// together. Reused across features; not a per-request controller concern.
export class AuditService {
  private constructor(private readonly repo: AuditRepo = auditRepo) {}
  private static instance: AuditService;
  static getInstance(): AuditService {
    if (!AuditService.instance) AuditService.instance = new AuditService();
    return AuditService.instance;
  }

  async record(entry: AuditEntry, tx?: Tx): Promise<void> {
    const doc: AuditDoc = {
      _id: newId('audit'),
      orgId: entry.orgId,
      branchId: entry.branchId ?? null,
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before ?? null,
      after: entry.after ?? null,
      note: entry.note ?? null,
      at: new Date().toISOString(),
    };
    await this.repo.insert(doc, tx);
  }
}

export const auditService = AuditService.getInstance();
