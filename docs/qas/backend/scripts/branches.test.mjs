// §5 Branches, tanks, pumps.
import { get, post, patch } from './api.mjs';
import { section, check, expectError, summary, counts } from './runner.mjs';
import { state } from './_shared.mjs';

const T = state.owner.token;
const A = state.branchA;

async function run() {
  section('§5.1 Branch create/read/update');
  // B-BR-01 create with tanks+pumps (fresh branch)
  let made;
  {
    const r = await post('/branches', {
      name: 'Lekki', city: 'Lekki', state: 'Lagos',
      tanks: [{ product: 'PMS', capacity_litres: 30000, reorder_threshold_litres: 4000 }],
      pumps: [{ product: 'PMS', label: 'L1' }],
    }, T);
    check('B-BR-01', 'create w/ tanks+pumps → 201',
      r.status === 201 && r.data?.data?.tanks?.length === 1 && r.data.data.pumps?.length === 1,
      `status=${r.status} ${JSON.stringify(r.data)}`);
    made = r.data?.data;
  }
  // B-BR-02 create without tanks/pumps
  {
    const r = await post('/branches', { name: 'Surulere', city: 'Surulere', state: 'Lagos' }, T);
    check('B-BR-02', 'create w/o tanks/pumps → 201',
      r.status === 201 && Array.isArray(r.data?.data?.tanks) && r.data.data.tanks.length === 0,
      `status=${r.status} ${JSON.stringify(r.data)}`);
  }
  expectError('B-BR-03', 'name<2 → 1001', await post('/branches', { name: 'A', city: 'Cty', state: 'St' }, T), 1001, { field: 'name' });
  expectError('B-BR-04', '4 tanks → 1001 field=tanks',
    await post('/branches', {
      name: 'Many', city: 'Cty', state: 'Lagos',
      tanks: [
        { product: 'PMS', capacity_litres: 1, reorder_threshold_litres: 0 },
        { product: 'AGO', capacity_litres: 1, reorder_threshold_litres: 0 },
        { product: 'DPK', capacity_litres: 1, reorder_threshold_litres: 0 },
        { product: 'PMS', capacity_litres: 1, reorder_threshold_litres: 0 },
      ],
    }, T), 1001, { field: 'tanks' });
  expectError('B-BR-05', 'tank bad product → 1001',
    await post('/branches', { name: 'BadP', city: 'C', state: 'S', tanks: [{ product: 'XYZ', capacity_litres: 1, reorder_threshold_litres: 0 }] }, T), 1001);
  expectError('B-BR-06', 'tank capacity<=0 → 1001',
    await post('/branches', { name: 'Cap', city: 'C', state: 'S', tanks: [{ product: 'PMS', capacity_litres: 0, reorder_threshold_litres: 0 }] }, T), 1001);
  expectError('B-BR-07', 'tank threshold<0 → 1001',
    await post('/branches', { name: 'Thr', city: 'C', state: 'S', tanks: [{ product: 'PMS', capacity_litres: 100, reorder_threshold_litres: -1 }] }, T), 1001);
  expectError('B-BR-08', 'two tanks same product → 1005 field=tanks',
    await post('/branches', { name: 'DupTank', city: 'Cty', state: 'Lagos', tanks: [
      { product: 'PMS', capacity_litres: 100, reorder_threshold_litres: 0 },
      { product: 'PMS', capacity_litres: 200, reorder_threshold_litres: 0 },
    ] }, T), 1005, { field: 'tanks' });
  // B-BR-09 get
  {
    const r = await get(`/branches/${A}`, T);
    check('B-BR-09', 'GET branch → 200 tanks(current_litres)+pumps',
      r.status === 200 && r.data?.data?.tanks?.every((t) => 'current_litres' in t),
      `status=${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  }
  // B-BR-10 cross-tenant GET (owner2 reads org-1 branch)
  {
    const r = await get(`/branches/${A}`, state.owner2.token);
    check('B-BR-10', '[DIV] cross-tenant GET branch → 1003 or 1004',
      r.status === 403 || r.status === 404, `status=${r.status} ${JSON.stringify(r.data)}`);
    if (r.status === 403) console.log('      [note] cross-tenant branch GET = 403 (middleware loadScope)');
    else console.log('      [note] cross-tenant branch GET = 404 (service)');
  }
  // B-BR-11 settings merge
  {
    const before = await get(`/branches/${A}`, T);
    const r = await patch(`/branches/${A}`, { settings: { require_closing_dip: false } }, T);
    check('B-BR-11', 'PATCH settings merge → 200',
      r.status === 200 && r.data?.data?.settings?.require_closing_dip === false &&
      r.data.data.settings.variance_flag_kobo === before.data.data.settings.variance_flag_kobo,
      `status=${r.status} ${JSON.stringify(r.data?.data?.settings)}`);
    // restore for later shift tests
    await patch(`/branches/${A}`, { settings: { require_closing_dip: true } }, T);
  }
  expectError('B-BR-12', 'variance_flag_kobo<0 → 1001', await patch(`/branches/${A}`, { settings: { variance_flag_kobo: -1 } }, T), 1001);
  expectError('B-BR-13', 'delivery_tolerance_litres<0 → 1001', await patch(`/branches/${A}`, { settings: { delivery_tolerance_litres: -5 } }, T), 1001);
  // B-BR-14 defaults
  check('B-BR-14', 'fresh branch settings defaults',
    made?.settings?.require_closing_dip === true && made?.settings?.variance_flag_kobo === 500000 &&
    made?.settings?.manager_may_set_price === false && made?.settings?.delivery_tolerance_litres === 200,
    `settings=${JSON.stringify(made?.settings)}`);
  // DIV-06 probe: variance_flag_kobo float (schema is .nonnegative() only, no .int())
  {
    const r = await patch(`/branches/${A}`, { settings: { variance_flag_kobo: 123.45 } }, T);
    if (r.status === 200 && r.data?.data?.settings?.variance_flag_kobo === 123.45) {
      check('X-MON-05', '[BUG] variance_flag_kobo accepts a FLOAT (no .int())', false,
        `accepted 123.45 → ${r.data.data.settings.variance_flag_kobo} (contradicts "_kobo integer")`);
    } else {
      check('X-MON-05', 'variance_flag_kobo rejects/handles float', r.status === 400,
        `status=${r.status} value=${r.data?.data?.settings?.variance_flag_kobo}`);
    }
    await patch(`/branches/${A}`, { settings: { variance_flag_kobo: 500000 } }, T);
  }

  // ── 5.2 Archive ────────────────────────────────────────────────
  section('§5.2 Archive');
  {
    // make a dedicated branch to archive (don't archive branch A — later tests need it live)
    const made2 = await post('/branches', { name: 'ToArchive', city: 'Cty', state: 'Lagos',
      tanks: [{ product: 'PMS', capacity_litres: 1000, reorder_threshold_litres: 0 }], pumps: [{ product: 'PMS', label: 'X1' }] }, T);
    const bid = made2.data?.data?.id;
    const arch = await post(`/branches/${bid}/archive`, undefined, T);
    check('B-AR-01', 'archive → 204', arch.status === 204, `status=${arch.status}`);
    expectError('B-AR-02', 'add tank to archived → 1006 (409)',
      await post(`/branches/${bid}/tanks`, { product: 'AGO', capacity_litres: 100, reorder_threshold_litres: 0 }, T), 1006);
    expectError('B-AR-03', 'add pump to archived → 1006',
      await post(`/branches/${bid}/pumps`, { product: 'PMS', label: 'X2' }, T), 1006);
    expectError('B-AR-04a', 'set price on archived → 1006',
      await post(`/branches/${bid}/prices`, { product: 'PMS', price_per_litre_kobo: 90000, effective_at: new Date().toISOString(), reason: 'x test' }, T), 1006);
    expectError('B-AR-04b', 'record expense on archived → 1006',
      await post(`/branches/${bid}/expenses`, { business_date: '2026-05-24', category: 'misc', description: 'x', amount_kobo: 1000 }, T), 1006);
    const stillReadable = await get(`/branches/${bid}`, T);
    check('B-AR-05', 'archived branch still readable', stillReadable.status === 200 && stillReadable.data?.data?.is_archived === true,
      `status=${stillReadable.status}`);
  }

  // ── 5.3 Tanks ──────────────────────────────────────────────────
  section('§5.3 Tanks');
  {
    // Use a fresh branch (idempotent across re-runs) with only PMS, then add AGO.
    const fresh = await post('/branches', { name: 'TankTest', city: 'Cty', state: 'Lagos',
      tanks: [{ product: 'PMS', capacity_litres: 10000, reorder_threshold_litres: 1000 }] }, T);
    const fb = fresh.data?.data?.id;
    const r = await post(`/branches/${fb}/tanks`, { product: 'AGO', capacity_litres: 15000, reorder_threshold_litres: 2000 }, T);
    check('B-TK-01', 'add new-product tank → 201', r.status === 201 && r.data?.data?.product === 'AGO', `status=${r.status} ${JSON.stringify(r.data)}`);
    expectError('B-TK-02', 'add duplicate-product tank → 1005 field=product',
      await post(`/branches/${fb}/tanks`, { product: 'PMS', capacity_litres: 100, reorder_threshold_litres: 0 }, T), 1005, { field: 'product' });
    const upd = await patch(`/branches/${A}/tanks/${state.tanks.PMS}`, { capacity_litres: 34000 }, T);
    check('B-TK-03', 'PATCH tank → 200', upd.status === 200 && upd.data?.data?.capacity_litres === 34000, `status=${upd.status}`);
    expectError('B-TK-04', 'PATCH unknown tank → 1004', await patch(`/branches/${A}/tanks/tnk_unknown`, { capacity_litres: 1 }, T), 1004);
    expectError('B-TK-05', 'PATCH tank capacity<=0 → 1001', await patch(`/branches/${A}/tanks/${state.tanks.PMS}`, { capacity_litres: 0 }, T), 1001);
  }

  // ── 5.4 Pumps ──────────────────────────────────────────────────
  section('§5.4 Pumps — fault-note clearing');
  {
    const add = await post(`/branches/${A}/pumps`, { product: 'DPK', label: 'P3' }, T);
    const pid = add.data?.data?.id;
    check('B-PU-01', 'add pump → 201 idle/null fault',
      add.status === 201 && add.data?.data?.state === 'idle' && add.data.data.fault_note === null, `status=${add.status}`);
    const off = await patch(`/branches/${A}/pumps/${pid}`, { state: 'offline', fault_note: 'Nozzle stuck' }, T);
    check('B-PU-02', 'offline keeps fault_note', off.status === 200 && off.data?.data?.fault_note === 'Nozzle stuck', `${JSON.stringify(off.data?.data)}`);
    const idle = await patch(`/branches/${A}/pumps/${pid}`, { state: 'idle' }, T);
    check('B-PU-03', 'idle clears fault_note', idle.status === 200 && idle.data?.data?.fault_note === null, `${JSON.stringify(idle.data?.data)}`);
    await patch(`/branches/${A}/pumps/${pid}`, { state: 'offline', fault_note: 'again' }, T);
    const live = await patch(`/branches/${A}/pumps/${pid}`, { state: 'live' }, T);
    check('B-PU-04', 'live clears fault_note', live.status === 200 && live.data?.data?.fault_note === null, `${JSON.stringify(live.data?.data)}`);
    const noteOnly = await patch(`/branches/${A}/pumps/${pid}`, { fault_note: 'note only' }, T);
    check('B-PU-05', 'fault_note-only update kept', noteOnly.status === 200 && noteOnly.data?.data?.fault_note === 'note only', `${JSON.stringify(noteOnly.data?.data)}`);
    expectError('B-PU-06', 'bad state enum → 1001', await patch(`/branches/${A}/pumps/${pid}`, { state: 'broken' }, T), 1001);
    expectError('B-PU-07', 'fault_note>280 → 1001', await patch(`/branches/${A}/pumps/${pid}`, { state: 'offline', fault_note: 'x'.repeat(281) }, T), 1001);
    expectError('B-PU-08', 'PATCH unknown pump → 1004', await patch(`/branches/${A}/pumps/pmp_unknown`, { label: 'Z' }, T), 1004);
  }

  summary('§5 Branches/Tanks/Pumps');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
