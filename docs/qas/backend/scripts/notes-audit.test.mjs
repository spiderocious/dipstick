// §12 Notes & audit.
import { get, post } from './api.mjs';
import { section, check, expectError, summary, counts } from './runner.mjs';
import { state } from './_shared.mjs';

const T = state.owner.token;
const ATT = state.attendant.token;
const A = state.branchA;

async function run() {
  section('§12 Notes & audit');
  // Need a shift entity to attach notes to — use bootstrap shift.
  const shiftId = state.shiftId;
  // N-NT-01 add note on shift
  {
    const r = await post(`/shift/${shiftId}/notes`, { body: 'Customer left without paying', mentions: [state.owner.userId] }, T);
    check('N-NT-01', 'POST /shift/:id/notes → 201 w/ mentions',
      r.status === 201 && r.data?.data?.id?.startsWith('not_') && Array.isArray(r.data.data.mentions) && r.data.data.mentions.length === 1,
      `status=${r.status} ${JSON.stringify(r.data)}`);
  }
  expectError('N-NT-02', 'bad entityType (/branch/) → 1001 field=entityType', await post(`/branch/${A}/notes`, { body: 'x' }, T), 1001, { field: 'entityType' });
  expectError('N-NT-03', 'empty body → 1001 field=body', await post(`/shift/${shiftId}/notes`, { body: '' }, T), 1001, { field: 'body' });
  // N-NT-04 list notes
  {
    const r = await get(`/shift/${shiftId}/notes`, T);
    check('N-NT-04', 'GET notes → items + meta', r.status === 200 && Array.isArray(r.data?.data?.items) && r.data?.meta, `status=${r.status} ${JSON.stringify(r.data).slice(0,150)}`);
  }
  expectError('N-NT-05', 'GET notes bad entityType → 1001 field=entityType', await get(`/branch/${A}/notes`, T), 1001, { field: 'entityType' });

  // Audit
  {
    // Page through the whole audit timeline (lots of fixtures push branch.created past page 1).
    const allActions = new Set();
    let cursor = null, pages = 0, firstPage;
    do {
      const url = `/branches/${A}/audit?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const r = await get(url, T);
      if (!firstPage) firstPage = r;
      (r.data?.data?.items ?? []).forEach((a) => allActions.add(a.action));
      cursor = r.data?.meta?.nextCursor;
      pages++;
    } while (cursor && pages < 20);
    check('N-AU-01', 'audit timeline has branch.* and shift.* actions (across pages)',
      firstPage.status === 200 && [...allActions].some((a) => a.startsWith('branch.')) && [...allActions].some((a) => a.startsWith('shift.')),
      `actions=${JSON.stringify([...allActions])}`);
    const r = firstPage;
    // N-AU-03 row shape
    const row = r.data?.data?.items?.[0];
    check('N-AU-03', 'audit row has actor_id/action/at', row && 'actor_id' in row && 'action' in row && 'at' in row, `row=${JSON.stringify(row)}`);
    // newest-first
    const items = r.data?.data?.items ?? [];
    const newestFirst = items.length < 2 || new Date(items[0].at) >= new Date(items[1].at);
    check('N-AU-01b', 'audit newest-first', newestFirst, `at0=${items[0]?.at} at1=${items[1]?.at}`);
  }
  // N-AU-02 filter
  {
    const r = await get(`/branches/${A}/audit?entity_type=shift&entity_id=${shiftId}`, T);
    check('N-AU-02', 'audit filter entity_type+entity_id', r.status === 200 && (r.data?.data?.items ?? []).every((a) => a.entity_type === 'shift' && a.entity_id === shiftId),
      `status=${r.status} count=${r.data?.data?.items?.length}`);
  }
  // N-AU-05 attendant audit → 1003
  expectError('N-AU-05', 'attendant GET audit → 1003', await get(`/branches/${A}/audit`, ATT), 1003);

  summary('§12 Notes & audit');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
