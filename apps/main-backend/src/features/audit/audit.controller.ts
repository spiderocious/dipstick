import type { Request, Response } from 'express';

import { parsePageParams, pageMeta } from '@lib/pagination.js';
import { ResponseUtil } from '@lib/response.js';
import { getAuth } from '@lib/http/authedRequest.js';
import { serializeRefs } from '@shared/serializers.js';

import { refsService } from '../refs/refs.service.js';
import { auditRepo, type AuditQuery } from './audit.repo.js';

const serializeAudit = (d: Awaited<ReturnType<typeof auditRepo.list>>['items'][number]) => ({
  id: d._id,
  branch_id: d.branchId,
  actor_id: d.actorId,
  action: d.action,
  entity_type: d.entityType,
  entity_id: d.entityId,
  before: d.before,
  after: d.after,
  note: d.note,
  at: d.at,
});

export const auditController = {
  list: async (req: Request, res: Response): Promise<Response> => {
    const auth = getAuth(req);
    const { cursor, limit } = parsePageParams(req.query as Record<string, unknown>);
    const branchId = req.params['branchId'];
    const query: AuditQuery = {
      orgId: auth.orgId,
      cursor,
      limit,
      ...(typeof branchId === 'string' ? { branchId } : {}),
      ...(typeof req.query['entity_type'] === 'string'
        ? { entityType: req.query['entity_type'] }
        : {}),
      ...(typeof req.query['entity_id'] === 'string' ? { entityId: req.query['entity_id'] } : {}),
    };
    const page = await auditRepo.list(query);

    // Collect every id referenced by the page (actor, entity, branch, + ids nested in the
    // before/after diffs) and resolve them to labels so the UI never shows a raw id.
    const ids = new Set<string>();
    for (const d of page.items) {
      if (d.actorId) ids.add(d.actorId);
      if (d.entityId) ids.add(d.entityId);
      if (d.branchId) ids.add(d.branchId);
      refsService.collectIdsFromValue(d.before, ids);
      refsService.collectIdsFromValue(d.after, ids);
    }
    const refs = await refsService.resolveRefs(auth.orgId, [...ids]);

    return ResponseUtil.okWithRefs(
      res,
      { items: page.items.map(serializeAudit) },
      serializeRefs(refs),
      pageMeta(page),
    );
  },
};
