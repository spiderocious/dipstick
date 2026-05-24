import { newId } from '@lib/ids.js';
import type { Page, PageParams } from '@lib/pagination.js';
import { fail, ok, type ServiceResult } from '@lib/service-result.js';
import { ERROR_CODE } from '@shared/constants/error-codes.js';
import type { NoteDoc, NoteEntityType } from '@shared/types/documents.js';

import { auditService, type AuditService } from '../audit/audit.service.js';
import type { NoteRepo } from './notes.repo.js';
import { noteRepo } from './notes.repo.mongo.js';

const now = (): string => new Date().toISOString();

const ENTITY_TYPES: readonly NoteEntityType[] = ['shift', 'expense', 'delivery'];

const isEntityType = (value: string): value is NoteEntityType =>
  (ENTITY_TYPES as readonly string[]).includes(value);

export class NotesService {
  private constructor(
    private readonly notes: NoteRepo = noteRepo,
    private readonly audit: AuditService = auditService,
  ) {}
  private static instance: NotesService;
  static getInstance(): NotesService {
    if (!NotesService.instance) NotesService.instance = new NotesService();
    return NotesService.instance;
  }

  async list(
    entityType: string,
    entityId: string,
    page: PageParams,
  ): Promise<ServiceResult<Page<NoteDoc>>> {
    if (!isEntityType(entityType))
      return fail(ERROR_CODE.VALIDATION, 'note_target_invalid', { field: 'entityType' });
    const result = await this.notes.listByEntity({ ...page, entityType, entityId });
    return ok(result);
  }

  async add(
    orgId: string,
    entityType: string,
    entityId: string,
    input: { body: string; mentions?: string[] },
    actorId: string,
  ): Promise<ServiceResult<NoteDoc>> {
    if (!isEntityType(entityType))
      return fail(ERROR_CODE.VALIDATION, 'note_target_invalid', { field: 'entityType' });

    const doc: NoteDoc = {
      _id: newId('note'),
      orgId,
      // The note is keyed by its entity; no branch is resolved on this route.
      branchId: null,
      entityType,
      entityId,
      authorId: actorId,
      body: input.body,
      mentions: input.mentions ?? [],
      createdAt: now(),
      updatedAt: now(),
    };
    await this.notes.insert(doc);
    await this.audit.record({
      orgId,
      branchId: null,
      actorId,
      action: 'note.added',
      entityType: doc.entityType,
      entityId: doc.entityId,
      after: { note_id: doc._id, mentions: doc.mentions },
      note: doc.body,
    });
    return ok(doc);
  }
}

export const notesService = NotesService.getInstance();
