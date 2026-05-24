// §7 Shifts, dips, reconciliation, post, VOID. Creates its own pump/shift state so it's
// independent of the bootstrap shift (which is already posted).
import { get, post, patch } from './api.mjs';
import { section, pass, fail, check, expectError, summary, counts } from './runner.mjs';
import { state, TODAY, isoMinutesAgo } from './_shared.mjs';

const T = state.owner.token;
const A = state.branchA;

// Open a fresh shift on a dedicated pump and return its id.
async function openShift(pumpId, attendantId, openingMeter = 1000, extra = {}) {
  return post(`/branches/${A}/shifts`, {
    pump_id: pumpId, attendant_id: attendantId, window: 'morning', business_date: TODAY, opening_meter: openingMeter, ...extra,
  }, T);
}

async function run() {
  // ensure PMS price exists (set by bootstrap/pricing); add a dedicated pump for clean state
  const pumpRes = await post(`/branches/${A}/pumps`, { product: 'PMS', label: `SH-${Date.now()}` }, T);
  const pumpId = pumpRes.data?.data?.id;
  const att = state.attendant.userId;

  // ── 7.1 Dips ───────────────────────────────────────────────────
  section('§7.1 Dips');
  {
    const o = await post(`/branches/${A}/dips`, { tank_id: state.tanks.PMS, kind: 'opening', litres: 25000, business_date: TODAY }, T);
    check('SH-DP-01', 'opening dip → 201', o.status === 201 && o.data?.data?.kind === 'opening', `status=${o.status} ${JSON.stringify(o.data)}`);
    expectError('SH-DP-03', 'bad kind → 1001', await post(`/branches/${A}/dips`, { tank_id: state.tanks.PMS, kind: 'middle', litres: 1, business_date: TODAY }, T), 1001);
    expectError('SH-DP-04', 'negative litres → 1001', await post(`/branches/${A}/dips`, { tank_id: state.tanks.PMS, kind: 'opening', litres: -5, business_date: TODAY }, T), 1001);
    expectError('SH-DP-05', 'business_date<10 → 1001', await post(`/branches/${A}/dips`, { tank_id: state.tanks.PMS, kind: 'opening', litres: 1, business_date: 'x' }, T), 1001);
    expectError('SH-DP-06', 'unknown tank → 1004 field=tank_id', await post(`/branches/${A}/dips`, { tank_id: 'tnk_nope', kind: 'opening', litres: 1, business_date: TODAY }, T), 1004, { field: 'tank_id' });
  }

  // ── 7.2 Open — price pinning ───────────────────────────────────
  section('§7.2 Open shift / price pinning');
  expectError('SH-OP-02', 'explicit price w/o reason → 1001 field=price_override_reason',
    await openShift(pumpId, att, 1000, { price_per_litre_kobo: 90000 }), 1001, { field: 'price_override_reason' });
  expectError('SH-OP-04', 'override reason<3 → 1001', await openShift(pumpId, att, 1000, { price_per_litre_kobo: 90000, price_override_reason: 'x' }), 1001, { field: 'price_override_reason' });
  expectError('SH-OP-06', 'bad window → 1001', await post(`/branches/${A}/shifts`, { pump_id: pumpId, attendant_id: att, window: 'noon', business_date: TODAY, opening_meter: 1 }, T), 1001);
  expectError('SH-OP-07', 'negative opening_meter → 1001', await openShift(pumpId, att, -1), 1001);
  expectError('SH-OP-08', 'price float w/ reason → 1001', await openShift(pumpId, att, 1000, { price_per_litre_kobo: 90000.5, price_override_reason: 'float override' }), 1001);
  expectError('SH-OP-09', 'unknown pump → 1004 field=pump_id', await openShift('pmp_nope', att, 1000), 1004, { field: 'pump_id' });
  // SH-OP-05 price_not_found: open on a product with no price (DPK pump on a fresh branch w/ no DPK price)
  {
    const fresh = await post('/branches', { name: `NoPrice-${Date.now()}`, city: 'Cty', state: 'Lagos',
      tanks: [{ product: 'DPK', capacity_litres: 5000, reorder_threshold_litres: 0 }], pumps: [{ product: 'DPK', label: 'D1' }] }, T);
    const fb = fresh.data.data.id;
    const fpump = fresh.data.data.pumps[0].id;
    const r = await post(`/branches/${fb}/shifts`, { pump_id: fpump, attendant_id: state.owner.userId, window: 'morning', business_date: TODAY, opening_meter: 0 }, T);
    expectError('SH-OP-05', 'open w/ no price set → 1007 price_not_found field=pump_id', r, 1007, { field: 'pump_id' });
  }
  // SH-OP-01 happy open (PMS has a price)
  let shiftId;
  {
    const r = await openShift(pumpId, att, 1000);
    check('SH-OP-01', 'open shift → 201 status=open price pinned',
      r.status === 201 && r.data?.data?.status === 'open' && typeof r.data.data.price_per_litre_kobo === 'number',
      `status=${r.status} ${JSON.stringify(r.data)}`);
    shiftId = r.data?.data?.id;
    state._shPrice = r.data?.data?.price_per_litre_kobo;
    // pump should be live
    const branch = await get(`/branches/${A}`, T);
    const pump = branch.data.data.pumps.find((p) => p.id === pumpId);
    check('SH-OP-01b', 'open sets pump live', pump?.state === 'live', `pump=${JSON.stringify(pump)}`);
  }

  // ── 7.3 Close — reconciliation maths ───────────────────────────
  section('§7.3 Close / reconciliation');
  {
    // Use a controlled override-priced shift so the maths is exact regardless of current PMS price.
    const p2 = await post(`/branches/${A}/pumps`, { product: 'PMS', label: `RC-${Date.now()}` }, T);
    const open = await openShift(p2.data.data.id, att, 12450.0, { price_per_litre_kobo: 89000, price_override_reason: 'reconciliation test fixture' });
    const sid = open.data.data.id;
    const close = await patch(`/shifts/${sid}`, { closing_meter: 13010.5, cash_declared_kobo: 49800000 }, T);
    const d = close.data?.data;
    check('SH-CL-01', '[VAR] litres 560.5, expected 49884500, variance 84500 short',
      close.status === 200 && d?.litres === 560.5 && d?.expected_gross_kobo === 49884500 && d?.variance_kobo === 84500 && d?.variance_status === 'short',
      `${JSON.stringify(d)}`);
    check('SH-CL-09', 'close sets pump idle', (await get(`/branches/${A}`, T)).data.data.pumps.find((p) => p.id === p2.data.data.id)?.state === 'idle', 'pump not idle');
    // SH-CL-02 balanced
    const pB = await post(`/branches/${A}/pumps`, { product: 'PMS', label: `BAL-${Date.now()}` }, T);
    const oB = await openShift(pB.data.data.id, att, 100, { price_per_litre_kobo: 100000, price_override_reason: 'balanced fixture' });
    const cB = await patch(`/shifts/${oB.data.data.id}`, { closing_meter: 110, cash_declared_kobo: 1000000 }, T); // 10L*100000=1,000,000
    check('SH-CL-02', '[VAR] cash==expected → balanced 0', cB.data?.data?.variance_kobo === 0 && cB.data.data.variance_status === 'balanced', `${JSON.stringify(cB.data?.data)}`);
    // SH-CL-03 over
    const pO = await post(`/branches/${A}/pumps`, { product: 'PMS', label: `OVR-${Date.now()}` }, T);
    const oO = await openShift(pO.data.data.id, att, 100, { price_per_litre_kobo: 100000, price_override_reason: 'over fixture' });
    const cO = await patch(`/shifts/${oO.data.data.id}`, { closing_meter: 110, cash_declared_kobo: 1100000 }, T); // expected 1,000,000 cash 1,100,000
    check('SH-CL-03', '[VAR] cash>expected → over (negative)', cO.data?.data?.variance_kobo === -100000 && cO.data.data.variance_status === 'over', `${JSON.stringify(cO.data?.data)}`);
    // SH-CL-05 closing<opening
    const pX = await post(`/branches/${A}/pumps`, { product: 'PMS', label: `LOW-${Date.now()}` }, T);
    const oX = await openShift(pX.data.data.id, att, 500, { price_per_litre_kobo: 90000, price_override_reason: 'below fixture' });
    expectError('SH-CL-05', 'closing<opening → 1007 field=closing_meter', await patch(`/shifts/${oX.data.data.id}`, { closing_meter: 400, cash_declared_kobo: 0 }, T), 1007, { field: 'closing_meter' });
    expectError('SH-CL-06', 'cash float → 1001', await patch(`/shifts/${oX.data.data.id}`, { closing_meter: 600, cash_declared_kobo: 100.5 }, T), 1001);
    expectError('SH-CL-07', 'cash negative → 1001', await patch(`/shifts/${oX.data.data.id}`, { closing_meter: 600, cash_declared_kobo: -1 }, T), 1001);
    // SH-CL-08 close twice → shift_not_open
    await patch(`/shifts/${oX.data.data.id}`, { closing_meter: 600, cash_declared_kobo: 9000000 }, T);
    expectError('SH-CL-08', 'close a non-open shift → 1006 shift_not_open', await patch(`/shifts/${oX.data.data.id}`, { closing_meter: 700, cash_declared_kobo: 1 }, T), 1006);
    state._closedShiftForPost = oX.data.data.id; // closed, branch requires dip
  }

  // ── 7.4 Post / post-balanced ───────────────────────────────────
  section('§7.4 Post / post-balanced');
  {
    // branch A requires closing dip (default true). Post w/o closing dip recorded for that date+product → branch_rule_unmet.
    // Our many fixtures already recorded a closing dip? Not necessarily. Test SH-PO-04 on a fresh branch w/ require_closing_dip.
    const fb = await post('/branches', { name: `PostTest-${Date.now()}`, city: 'Cty', state: 'Lagos',
      tanks: [{ product: 'PMS', capacity_litres: 9000, reorder_threshold_litres: 0 }], pumps: [{ product: 'PMS', label: 'PP1' }] }, T);
    const bid = fb.data.data.id;
    await post(`/branches/${bid}/prices`, { product: 'PMS', price_per_litre_kobo: 80000, effective_at: isoMinutesAgo(5), reason: 'post test price' }, T);
    const op = await post(`/branches/${bid}/shifts`, { pump_id: fb.data.data.pumps[0].id, attendant_id: state.owner.userId, window: 'morning', business_date: TODAY, opening_meter: 0 }, T);
    const sid = op.data.data.id;
    // SH-PO-02 post not-closed
    expectError('SH-PO-02', 'post open (not closed) → 1006 shift_not_closed', await post(`/shifts/${sid}/post`, undefined, T), 1006);
    await patch(`/shifts/${sid}`, { closing_meter: 100, cash_declared_kobo: 8000000 }, T); // 100L*80000=8,000,000 balanced
    // SH-PO-04 post w/o closing dip (branch requires it)
    expectError('SH-PO-04', 'post w/o closing dip (required) → 1007 branch_rule_unmet', await post(`/shifts/${sid}/post`, undefined, T), 1007);
    // record closing dip then post
    await post(`/branches/${bid}/dips`, { tank_id: fb.data.data.tanks[0].id, kind: 'closing', litres: 8900, business_date: TODAY }, T);
    const posted = await post(`/shifts/${sid}/post`, undefined, T);
    check('SH-PO-01', 'post closed (dip present) → 200 posted', posted.status === 200 && posted.data?.data?.status === 'posted', `status=${posted.status} ${JSON.stringify(posted.data)}`);
    // SH-PO-03 already posted
    expectError('SH-PO-03', 'post already-posted → 1006 shift_already_posted', await post(`/shifts/${sid}/post`, undefined, T), 1006);
    state._postedShift = sid;
    state._postBranch = bid;
    // SH-PO-05 require_closing_dip:false → post w/o dip
    const fb2 = await post('/branches', { name: `NoDip-${Date.now()}`, city: 'Cty', state: 'Lagos',
      tanks: [{ product: 'PMS', capacity_litres: 9000, reorder_threshold_litres: 0 }], pumps: [{ product: 'PMS', label: 'ND1' }] }, T);
    await patch(`/branches/${fb2.data.data.id}`, { settings: { require_closing_dip: false } }, T);
    await post(`/branches/${fb2.data.data.id}/prices`, { product: 'PMS', price_per_litre_kobo: 80000, effective_at: isoMinutesAgo(5), reason: 'nodip price' }, T);
    const op2 = await post(`/branches/${fb2.data.data.id}/shifts`, { pump_id: fb2.data.data.pumps[0].id, attendant_id: state.owner.userId, window: 'morning', business_date: TODAY, opening_meter: 0 }, T);
    await patch(`/shifts/${op2.data.data.id}`, { closing_meter: 100, cash_declared_kobo: 8000000 }, T);
    const posted2 = await post(`/shifts/${op2.data.data.id}/post`, undefined, T);
    check('SH-PO-05', 'post w/o dip when not required → 200', posted2.status === 200, `status=${posted2.status} ${JSON.stringify(posted2.data)}`);
    // SH-PO-06 post-balanced: open 2 balanced + 1 short, all closed, then post-balanced posts only balanced
    const pbBranch = await post('/branches', { name: `PB-${Date.now()}`, city: 'Cty', state: 'Lagos',
      tanks: [{ product: 'PMS', capacity_litres: 9000, reorder_threshold_litres: 0 }],
      pumps: [{ product: 'PMS', label: 'B1' }, { product: 'PMS', label: 'B2' }, { product: 'PMS', label: 'B3' }] }, T);
    const pbid = pbBranch.data.data.id;
    await patch(`/branches/${pbid}`, { settings: { require_closing_dip: false } }, T);
    await post(`/branches/${pbid}/prices`, { product: 'PMS', price_per_litre_kobo: 100000, effective_at: isoMinutesAgo(5), reason: 'pb price' }, T);
    const pumps = pbBranch.data.data.pumps;
    const mk = async (pid, cash) => {
      const o = await post(`/branches/${pbid}/shifts`, { pump_id: pid, attendant_id: state.owner.userId, window: 'morning', business_date: TODAY, opening_meter: 0 }, T);
      await patch(`/shifts/${o.data.data.id}`, { closing_meter: 10, cash_declared_kobo: cash }, T); // 10L*100000 = 1,000,000 expected
      return o.data.data.id;
    };
    await mk(pumps[0].id, 1000000); // balanced
    await mk(pumps[1].id, 1000000); // balanced
    await mk(pumps[2].id, 900000);  // short
    const pb = await post(`/branches/${pbid}/shifts/post-balanced`, { business_date: TODAY }, T);
    check('SH-PO-06', 'post-balanced posts only balanced ({posted:2})', pb.status === 200 && pb.data?.data?.posted === 2, `status=${pb.status} ${JSON.stringify(pb.data)}`);
    expectError('SH-PO-07', 'post-balanced business_date<10 → 1001', await post(`/branches/${pbid}/shifts/post-balanced`, { business_date: 'x' }, T), 1001);
  }

  // ── 7.5 VOID ───────────────────────────────────────────────────
  section('§7.5 VOID idiom');
  {
    const sid = state._postedShift;
    expectError('SH-VD-02', 'confirm lowercase → 1001 field=confirm', await post(`/shifts/${sid}/void`, { reason: 'meter misread', confirm: 'void' }, T), 1001, { field: 'confirm' });
    expectError('SH-VD-03', 'confirm VOIDED → 1001', await post(`/shifts/${sid}/void`, { reason: 'meter misread', confirm: 'VOIDED' }, T), 1001, { field: 'confirm' });
    expectError('SH-VD-04', 'reason<3 → 1001 field=reason', await post(`/shifts/${sid}/void`, { reason: 'x', confirm: 'VOID' }, T), 1001, { field: 'reason' });
    // SH-VD-05 void unposted (closed) shift
    expectError('SH-VD-05', 'void closed (unposted) shift → 1006 shift_not_posted', await post(`/shifts/${state._closedShiftForPost}/void`, { reason: 'try void closed', confirm: 'VOID' }, T), 1006);
    // SH-VD-01 happy void
    const v = await post(`/shifts/${sid}/void`, { reason: 'Pump meter misread', confirm: 'VOID' }, T);
    check('SH-VD-01', 'void posted → 200 voided + is_voided + voided_by/at/reason',
      v.status === 200 && v.data?.data?.status === 'voided' && v.data.data.is_voided === true && !!v.data.data.voided_by && !!v.data.data.void_reason,
      `status=${v.status} ${JSON.stringify(v.data)}`);
    // SH-VD-06 already voided
    expectError('SH-VD-06', 'void already-voided → 1006 shift_already_voided', await post(`/shifts/${sid}/void`, { reason: 'again void', confirm: 'VOID' }, T), 1006);
    // SH-VD-07 still visible
    const g = await get(`/shifts/${sid}`, T);
    check('SH-VD-07', 'voided shift still visible (not deleted)', g.status === 200 && g.data?.data?.status === 'voided', `status=${g.status}`);
    // SH-VD-08 audit row
    const audit = await get(`/branches/${state._postBranch}/audit?entity_type=shift&entity_id=${sid}`, T);
    const hasVoid = (audit.data?.data?.items ?? []).some((a) => a.action === 'shift.voided');
    check('SH-VD-08', 'audit has shift.voided w/ actor', hasVoid && audit.data.data.items.find((a) => a.action === 'shift.voided')?.actor_id, `items=${JSON.stringify((audit.data?.data?.items||[]).map(a=>a.action))}`);
  }

  // ── 7.6 Get shift / daybook ────────────────────────────────────
  section('§7.6 Get / daybook');
  {
    const g = await get(`/shifts/${shiftId}`, T);
    check('SH-GT-01', 'GET shift → 200 full trail', g.status === 200 && g.data?.data?.id === shiftId, `status=${g.status}`);
    const x = await get(`/shifts/${shiftId}`, state.owner2.token);
    check('SH-GT-02', '[DIV] cross-tenant GET shift → 1004 or 1003', x.status === 404 || x.status === 403, `status=${x.status}`);
    const db = await get(`/branches/${A}/daybook?date=${TODAY}`, T);
    check('SH-DB-01', 'daybook → shifts+dips+tanks', db.status === 200 && Array.isArray(db.data?.data?.shifts) && Array.isArray(db.data.data.dips) && Array.isArray(db.data.data.tanks), `status=${db.status}`);
  }

  summary('§7 Shifts');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
