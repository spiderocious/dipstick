// §8 Deliveries — 4-stage offload.
import { get, post, patch } from './api.mjs';
import { section, check, expectError, summary, counts } from './runner.mjs';
import { state } from './_shared.mjs';

const T = state.owner.token;
const A = state.branchA;

const newDelivery = (over = {}) => ({
  tank_id: state.tanks.PMS, product: 'PMS', waybill_number: `WB-${Date.now()}`, supplier: 'NNPC',
  driver_name: 'Musa', truck_plate: 'LAG-123-XY', waybill_litres: 33000, cost_per_litre_kobo: 75000, ...over,
});

async function run() {
  section('§8 Deliveries');
  // D-DL-01 create
  let id;
  {
    const r = await post(`/branches/${A}/deliveries`, newDelivery(), T);
    check('D-DL-01', 'create → 201 stage arrived, variance null',
      r.status === 201 && r.data?.data?.stage === 'arrived' && r.data.data.variance_litres === null, `status=${r.status} ${JSON.stringify(r.data)}`);
    id = r.data?.data?.id;
  }
  expectError('D-DL-02', 'waybill_litres<=0 → 1001', await post(`/branches/${A}/deliveries`, newDelivery({ waybill_litres: 0 }), T), 1001);
  expectError('D-DL-03', 'cost float → 1001', await post(`/branches/${A}/deliveries`, newDelivery({ cost_per_litre_kobo: 75000.5 }), T), 1001);
  expectError('D-DL-04', 'missing waybill_number → 1001', await post(`/branches/${A}/deliveries`, { ...newDelivery(), waybill_number: undefined }, T), 1001);
  {
    const r = await post(`/branches/${A}/deliveries`, newDelivery({ witness: undefined }), T);
    check('D-DL-05', 'witness omitted → 201', r.status === 201, `status=${r.status}`);
  }
  expectError('D-DL-06', 'bad product → 1001', await post(`/branches/${A}/deliveries`, newDelivery({ product: 'XYZ' }), T), 1001);
  expectError('D-DL-07', 'unknown tank → 1004 field=tank_id', await post(`/branches/${A}/deliveries`, newDelivery({ tank_id: 'tnk_nope' }), T), 1004, { field: 'tank_id' });
  // D-DL-09/10 PATCH dips → variance recompute
  {
    const before = await patch(`/deliveries/${id}`, { stage: 'dip_before', dip_before_litres: 4000 }, T);
    const after = await patch(`/deliveries/${id}`, { stage: 'offloaded', dip_after_litres: 36800 }, T);
    check('D-DL-09', 'PATCH dips recompute variance', after.status === 200 && typeof after.data?.data?.variance_litres === 'number', `${JSON.stringify(after.data?.data)}`);
    check('D-DL-10', '[VAR] variance = (4000+33000)-36800 = 200', after.data?.data?.variance_litres === 200, `variance=${after.data?.data?.variance_litres}`);
  }
  // D-DL-11 sign without both dips (fresh delivery)
  {
    const fresh = await post(`/branches/${A}/deliveries`, newDelivery(), T);
    expectError('D-DL-11', 'sign w/o both dips → 1007 delivery_dips_required', await post(`/deliveries/${fresh.data.data.id}/sign`, { witness: 'Ade' }, T), 1007);
    expectError('D-DL-15', 'sign empty witness → 1001 field=witness', await post(`/deliveries/${fresh.data.data.id}/sign`, { witness: '' }, T), 1001, { field: 'witness' });
  }
  // D-DL-12 sign happy → tank balance set to dip_after
  {
    const before = await get(`/branches/${A}`, T);
    const sign = await post(`/deliveries/${id}/sign`, { witness: 'Gateman Ade' }, T);
    check('D-DL-12a', 'sign w/ both dips → 200 stage signed', sign.status === 200 && sign.data?.data?.stage === 'signed', `status=${sign.status} ${JSON.stringify(sign.data)}`);
    const after = await get(`/branches/${A}`, T);
    const tankAfter = after.data.data.tanks.find((t) => t.id === state.tanks.PMS);
    check('D-DL-12b', 'tank current_litres set to dip_after (36800)', tankAfter?.current_litres === 36800, `current_litres=${tankAfter?.current_litres}`);
    // audit
    const audit = await get(`/branches/${A}/audit?entity_type=delivery&entity_id=${id}`, T);
    check('D-DL-12c', 'audit has delivery.signed', (audit.data?.data?.items ?? []).some((a) => a.action === 'delivery.signed'), `actions=${JSON.stringify((audit.data?.data?.items||[]).map(a=>a.action))}`);
    // D-DL-13/14 mutate signed
    expectError('D-DL-13', 'PATCH signed → 1006 delivery_already_signed', await patch(`/deliveries/${id}`, { dip_after_litres: 1 }, T), 1006);
    expectError('D-DL-14', 're-sign signed → 1006', await post(`/deliveries/${id}/sign`, { witness: 'Ade' }, T), 1006);
  }
  // D-DL-16 cross-tenant get
  {
    const r = await get(`/deliveries/${id}`, state.owner2.token);
    check('D-DL-16', '[DIV] cross-tenant GET delivery → 1004 or 1003', r.status === 404 || r.status === 403, `status=${r.status}`);
  }
  // D-DL-17 pagination shape
  {
    const r = await get(`/branches/${A}/deliveries`, T);
    check('D-DL-17', 'list has meta {nextCursor,hasMore}', r.status === 200 && r.data?.meta && 'nextCursor' in r.data.meta && 'hasMore' in r.data.meta, `meta=${JSON.stringify(r.data?.meta)}`);
  }

  summary('§8 Deliveries');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
