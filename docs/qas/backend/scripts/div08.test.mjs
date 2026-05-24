// DIV-08 enforcement — manager_may_set_price now gates non-owner price-setting.
// Product owner chose ENFORCE: with the toggle OFF a branch-scoped member is blocked (403 1003
// price_manager_not_permitted) even with price.set; the owner ('*' membership) is always allowed.
// With the toggle ON, a manager may set price.
import { get, post, patch, uniqEmail, uniqPhone } from './api.mjs';
import { section, check, expectError, summary, counts } from './runner.mjs';
import { state, isoMinutesAgo } from './_shared.mjs';

const OWN = state.owner.token;
const MGR = state.manager.token; // Manager at branch A, holds price.set, branch-scoped

async function run() {
  section('DIV-08 — manager_may_set_price enforcement');
  const A = state.branchA;

  const setPrice = (tok, kobo) =>
    post(`/branches/${A}/prices`, { product: 'PMS', price_per_litre_kobo: kobo, effective_at: isoMinutesAgo(1), reason: 'div08 enforcement test' }, tok);

  // Ensure toggle OFF (default false, but set explicitly for determinism)
  await patch(`/branches/${A}`, { settings: { manager_may_set_price: false } }, OWN);

  // D08-01 manager blocked when toggle off
  {
    const r = await setPrice(MGR, 88000);
    check('D08-01', 'toggle OFF → manager POST /prices → 403 1003',
      r.status === 403 && r.data?.errorCode === 1003, `status=${r.status} ${JSON.stringify(r.data)}`);
  }
  // D08-02 owner always allowed when toggle off
  {
    const r = await setPrice(OWN, 88500);
    check('D08-02', 'toggle OFF → owner POST /prices → 201', r.status === 201, `status=${r.status} ${JSON.stringify(r.data)}`);
  }
  // Flip toggle ON
  await patch(`/branches/${A}`, { settings: { manager_may_set_price: true } }, OWN);
  // D08-03 manager allowed when toggle on
  {
    const r = await setPrice(MGR, 89500);
    check('D08-03', 'toggle ON → manager POST /prices → 201', r.status === 201, `status=${r.status} ${JSON.stringify(r.data)}`);
  }
  // D08-04 owner still allowed when toggle on
  {
    const r = await setPrice(OWN, 90000);
    check('D08-04', 'toggle ON → owner POST /prices → 201', r.status === 201, `status=${r.status} ${JSON.stringify(r.data)}`);
  }
  // restore default
  await patch(`/branches/${A}`, { settings: { manager_may_set_price: false } }, OWN);

  summary('DIV-08 enforcement');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
