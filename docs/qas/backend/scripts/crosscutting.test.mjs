// §14 Cross-cutting: error contract, one-field-at-a-time, money-integer, pagination, auth sweep, hygiene.
import { get, post, patch, request } from './api.mjs';
import { section, pass, fail, check, expectError, summary, counts } from './runner.mjs';
import { state, TODAY, isoMinutesAgo } from './_shared.mjs';

const T = state.owner.token;
const A = state.branchA;

async function run() {
  // ── §1 error contract ──────────────────────────────────────────
  section('§1 Error contract');
  // ENV-03 unmatched route
  {
    const r = await get('/nope-not-a-route', T);
    check('ENV-03', 'unmatched route → 404 1004 Route not found',
      r.status === 404 && r.data?.errorCode === 1004 && r.data?.type === 'not_found_error', `status=${r.status} ${JSON.stringify(r.data)}`);
  }
  // ENV-01 1001 flat shape w/ field
  {
    const r = await post('/auth/register', { name: 'A', business_name: 'X', email: 'bad', phone: '1', password: 'x' }, undefined);
    check('ENV-01', '1001 flat: errorCode/type/field, no nested error/success',
      r.data?.errorCode === 1001 && r.data?.type === 'validation_error' && typeof r.data?.field === 'string' && r.data.error === undefined && r.data.success === undefined,
      `${JSON.stringify(r.data)}`);
  }
  // ENV-02 1003 no field
  {
    const r = await patch('/org', { name: 'Nope' }, state.manager.token);
    check('ENV-02', '1003 flat: no field', r.data?.errorCode === 1003 && r.data?.type === 'forbidden_error' && r.data?.field === undefined, `${JSON.stringify(r.data)}`);
  }
  // ENV-06 type per code spot-checks
  {
    const conflict = await post('/auth/register', { name: 'Dup', business_name: 'Dup Biz', email: state.owner.email, phone: '+2348000000001', password: 'Password1' }, undefined);
    check('ENV-06', '1005 → conflict_error type', conflict.data?.errorCode === 1005 && conflict.data?.type === 'conflict_error', `${JSON.stringify(conflict.data)}`);
  }

  // ── §1a one field at a time ─────────────────────────────────────
  section('§1a One field at a time');
  {
    const r = await post('/auth/register', { name: 'Valid Name', business_name: 'Valid Biz', email: 'bademail', phone: '+2348012345678', password: 'short' }, undefined);
    check('ENV-OF-01', 'bad email + short password → only email (body order)', r.data?.field === 'email', `field=${r.data?.field}`);
  }
  {
    // bad name + bad city in branch create → name first
    const r = await post('/branches', { name: 'A', city: 'B', state: 'Lagos' }, T);
    check('ENV-OF-04', 'bad name + bad city → field=name first', r.data?.field === 'name', `field=${r.data?.field}`);
  }

  // ── §14.1 auth sweep ────────────────────────────────────────────
  section('§14.1 Auth guard sweep');
  const protectedRoutes = [
    ['GET', '/me'], ['GET', '/permissions'], ['GET', '/roles'], ['GET', '/rollup'],
    ['GET', `/branches`], ['GET', `/branches/${A}`], ['GET', `/branches/${A}/staff`],
    ['GET', `/branches/${A}/deliveries`], ['GET', `/branches/${A}/expenses`], ['GET', `/branches/${A}/audit`],
    ['GET', '/notifications'], ['GET', `/branches/${A}/prices`],
  ];
  let sweepOk = 0;
  for (const [method, path] of protectedRoutes) {
    const r = await request(path, { method });
    if (r.status === 401 && r.data?.errorCode === 1002) sweepOk++;
    else fail(`X-AUTH-01:${path}`, `no token → 1002`, `got ${r.status} ${JSON.stringify(r.data)}`);
  }
  check('X-AUTH-01', `auth sweep: ${sweepOk}/${protectedRoutes.length} protected routes → 1002 w/o token`, sweepOk === protectedRoutes.length, `${sweepOk}/${protectedRoutes.length}`);
  expectError('X-AUTH-02', 'malformed bearer → 1002', await get('/me', 'malformed.token'), 1002);
  expectError('X-AUTH-03', 'no Bearer prefix → 1002', await get('/me', undefined, { headers: { Authorization: T } }), 1002);

  // ── §14.2 money integer ─────────────────────────────────────────
  section('§14.2 Money integer');
  expectError('X-MON-01', 'price float → 1001', await post(`/branches/${A}/prices`, { product: 'PMS', price_per_litre_kobo: 1.5, effective_at: isoMinutesAgo(1), reason: 'float price' }, T), 1001);
  expectError('X-MON-04', 'expense amount float → 1001', await post(`/branches/${A}/expenses`, { business_date: TODAY, category: 'misc', description: 'x', amount_kobo: 1.5 }, T), 1001);
  // X-MON-06 no float in success bodies (spot-check a shift + branch)
  {
    const branch = await get(`/branches/${A}`, T);
    const blob = JSON.stringify(branch.data);
    const koboFloats = [...blob.matchAll(/"[a-z_]*_kobo":\s*(-?\d+\.\d+)/g)].map((m) => m[0]);
    check('X-MON-06', 'no _kobo float in branch response', koboFloats.length === 0, `floats=${JSON.stringify(koboFloats)}`);
  }

  // ── §14.3 pagination ────────────────────────────────────────────
  section('§14.3 Pagination');
  // seed >20 expenses then page
  {
    for (let i = 0; i < 22; i++) {
      await post(`/branches/${A}/expenses`, { business_date: TODAY, category: 'pagination', description: `e${i}`, amount_kobo: 100 + i }, T);
    }
    const p1 = await get(`/branches/${A}/expenses?category=pagination&limit=20`, T);
    check('X-PAG-02', 'default-ish limit 20 → 20 items, hasMore true, cursor non-null',
      p1.status === 200 && p1.data?.data?.items?.length === 20 && p1.data.meta.hasMore === true && p1.data.meta.nextCursor,
      `len=${p1.data?.data?.items?.length} meta=${JSON.stringify(p1.data?.meta)}`);
    const cursor = p1.data.meta.nextCursor;
    const p2 = await get(`/branches/${A}/expenses?category=pagination&limit=20&cursor=${encodeURIComponent(cursor)}`, T);
    const ids1 = new Set((p1.data.data.items ?? []).map((e) => e.id));
    const overlap = (p2.data?.data?.items ?? []).some((e) => ids1.has(e.id));
    check('X-PAG-03', 'page 2 via cursor: no overlap with page 1', p2.status === 200 && !overlap, `overlap=${overlap} p2len=${p2.data?.data?.items?.length}`);
    const big = await get(`/branches/${A}/expenses?limit=1000`, T);
    check('X-PAG-04', 'limit=1000 clamped to <=100', big.status === 200 && big.data?.data?.items?.length <= 100, `len=${big.data?.data?.items?.length}`);
    const zero = await get(`/branches/${A}/expenses?limit=0`, T);
    check('X-PAG-05', 'limit=0 falls back to default (>0 items returned if data exists)', zero.status === 200 && zero.data?.data?.items?.length > 0, `len=${zero.data?.data?.items?.length}`);
    const bad = await get(`/branches/${A}/expenses?cursor=!!!notbase64!!!`, T);
    check('X-PAG-07', 'garbage cursor → no 500, treated as first page', bad.status === 200, `status=${bad.status}`);
  }

  // ── §14.4 hygiene ───────────────────────────────────────────────
  section('§14.4 Hygiene');
  {
    const r = await get('/health');
    check('X-HYG-01', 'helmet header present (X-Content-Type-Options)', r.headers.get('x-content-type-options') === 'nosniff', `header=${r.headers.get('x-content-type-options')}`);
  }
  {
    const me = await get('/me', T);
    const mb = me.data?.data?.memberships?.[0];
    check('X-HYG-02', 'ids are prefixed ULIDs', /^usr_/.test(me.data.data.user.id) && /^mbr_/.test(mb.id) && /^org_/.test(mb.org_id), `user=${me.data.data.user.id} mb=${mb.id}`);
    check('X-HYG-03', 'timestamps ISO8601', !Number.isNaN(Date.parse(me.data.data.user.created_at)), `created_at=${me.data.data.user.created_at}`);
  }

  summary('§14 Cross-cutting');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
