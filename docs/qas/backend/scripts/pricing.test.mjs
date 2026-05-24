// §9 Pricing.
import { get, post } from './api.mjs';
import { section, check, expectError, summary, counts } from './runner.mjs';
import { state, isoMinutesAgo } from './_shared.mjs';

const T = state.owner.token;
const A = state.branchA;

async function run() {
  section('§9 Pricing');
  // P-PR-01 current prices
  {
    const r = await get(`/branches/${A}/prices`, T);
    const products = (r.data?.data?.items ?? []).map((i) => i.product);
    check('P-PR-01', 'GET prices → row per product, null where unset',
      r.status === 200 && r.data.data.items.some((i) => i.product === 'PMS'), `status=${r.status} products=${products}`);
  }
  // P-PR-02/03 preview (PMS current 89000 from bootstrap)
  {
    const r = await post(`/branches/${A}/prices/preview`, { product: 'PMS', price_per_litre_kobo: 91000 }, T);
    const d = r.data?.data;
    check('P-PR-02', 'preview returns delta/litres/revaluation/current (no write)',
      r.status === 200 && typeof d?.delta_per_litre_kobo === 'number' && 'litres_in_tank' in d && 'revaluation_kobo' in d && 'current_price_kobo' in d,
      `status=${r.status} ${JSON.stringify(d)}`);
    check('P-PR-03', 'preview delta = proposed - current (2000)',
      d?.current_price_kobo === 89000 && d?.delta_per_litre_kobo === 2000 && d?.revaluation_kobo === Math.round(d.litres_in_tank * 2000),
      `${JSON.stringify(d)}`);
  }
  // P-PR-04 preview no current price (DPK has none initially — but branches.test added DPK tank to A; price still unset)
  {
    const r = await post(`/branches/${A}/prices/preview`, { product: 'DPK', price_per_litre_kobo: 50000 }, T);
    const d = r.data?.data;
    check('P-PR-04', 'preview no current price → current null, delta=proposed',
      r.status === 200 && d?.current_price_kobo === null && d?.delta_per_litre_kobo === 50000,
      `${JSON.stringify(d)}`);
  }
  // P-PR-06 set price
  {
    const r = await post(`/branches/${A}/prices`, { product: 'PMS', price_per_litre_kobo: 91000, effective_at: isoMinutesAgo(1), reason: 'depot increase' }, T);
    check('P-PR-06', 'set price → 201, previous = prior current (89000)',
      r.status === 201 && r.data?.data?.previous_price_per_litre_kobo === 89000 && r.data.data.price_per_litre_kobo === 91000,
      `status=${r.status} ${JSON.stringify(r.data)}`);
  }
  expectError('P-PR-07', 'missing reason → 1001 field=reason', await post(`/branches/${A}/prices`, { product: 'PMS', price_per_litre_kobo: 92000, effective_at: isoMinutesAgo(1) }, T), 1001, { field: 'reason' });
  expectError('P-PR-08', 'reason<3 → 1001 field=reason', await post(`/branches/${A}/prices`, { product: 'PMS', price_per_litre_kobo: 92000, effective_at: isoMinutesAgo(1), reason: 'x' }, T), 1001, { field: 'reason' });
  expectError('P-PR-09', 'price float → 1001 field=price_per_litre_kobo', await post(`/branches/${A}/prices`, { product: 'PMS', price_per_litre_kobo: 92000.5, effective_at: isoMinutesAgo(1), reason: 'float test' }, T), 1001, { field: 'price_per_litre_kobo' });
  expectError('P-PR-10', 'price<=0 → 1001', await post(`/branches/${A}/prices`, { product: 'PMS', price_per_litre_kobo: 0, effective_at: isoMinutesAgo(1), reason: 'zero test' }, T), 1001, { field: 'price_per_litre_kobo' });
  expectError('P-PR-11', 'effective_at not ISO → 1001 field=effective_at', await post(`/branches/${A}/prices`, { product: 'PMS', price_per_litre_kobo: 92000, effective_at: 'not-a-date', reason: 'date test' }, T), 1001, { field: 'effective_at' });
  expectError('P-PR-12', 'bad product → 1001', await post(`/branches/${A}/prices`, { product: 'XYZ', price_per_litre_kobo: 92000, effective_at: isoMinutesAgo(1), reason: 'prod test' }, T), 1001);
  // DIV-05: effective_at required (omit it)
  expectError('P-PR-DIV05', '[DIV] omit effective_at → 1001 (required, no default)', await post(`/branches/${A}/prices`, { product: 'PMS', price_per_litre_kobo: 92000, reason: 'no eff' }, T), 1001, { field: 'effective_at' });
  // P-PR-13 history
  {
    const r = await get(`/branches/${A}/prices/PMS/history`, T);
    const items = r.data?.data?.items ?? [];
    const newestFirst = items.length < 2 || new Date(items[0].created_at) >= new Date(items[1].created_at);
    check('P-PR-13', 'history newest-first w/ previous_price/reason/set_by',
      r.status === 200 && items.length >= 1 && 'previous_price_per_litre_kobo' in items[0] && 'reason' in items[0] && 'set_by' in items[0] && newestFirst,
      `status=${r.status} count=${items.length}`);
  }

  summary('§9 Pricing');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
