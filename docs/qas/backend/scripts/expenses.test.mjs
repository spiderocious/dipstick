// §10 Expenses.
import { get, post } from './api.mjs';
import { section, check, expectError, summary, counts } from './runner.mjs';
import { state, TODAY } from './_shared.mjs';

const T = state.owner.token;
const A = state.branchA;

async function run() {
  section('§10 Expenses');
  let id;
  {
    const r = await post(`/branches/${A}/expenses`, { business_date: TODAY, category: 'generator_diesel', description: '20L diesel', amount_kobo: 1500000, witness: 'Ade' }, T);
    check('E-EX-01', 'with witness → 201 is_single_source:false', r.status === 201 && r.data?.data?.is_single_source === false, `status=${r.status} ${JSON.stringify(r.data)}`);
    id = r.data?.data?.id;
  }
  {
    const r = await post(`/branches/${A}/expenses`, { business_date: TODAY, category: 'misc', description: 'no witness', amount_kobo: 200000 }, T);
    check('E-EX-02', 'without witness → 201 is_single_source:true', r.status === 201 && r.data?.data?.is_single_source === true, `${JSON.stringify(r.data?.data)}`);
  }
  expectError('E-EX-03', 'amount float → 1001', await post(`/branches/${A}/expenses`, { business_date: TODAY, category: 'misc', description: 'x', amount_kobo: 100.5 }, T), 1001, { field: 'amount_kobo' });
  expectError('E-EX-04', 'amount<=0 → 1001', await post(`/branches/${A}/expenses`, { business_date: TODAY, category: 'misc', description: 'x', amount_kobo: 0 }, T), 1001);
  expectError('E-EX-05', 'missing category → 1001', await post(`/branches/${A}/expenses`, { business_date: TODAY, description: 'x', amount_kobo: 100 }, T), 1001);
  expectError('E-EX-06', 'empty witness → 1001 field=witness', await post(`/branches/${A}/expenses`, { business_date: TODAY, category: 'misc', description: 'x', amount_kobo: 100, witness: '' }, T), 1001, { field: 'witness' });
  {
    const r = await get(`/branches/${A}/expenses?category=generator_diesel`, T);
    check('E-EX-07', 'category filter returns only matches', r.status === 200 && (r.data?.data?.items ?? []).every((e) => e.category === 'generator_diesel'), `count=${r.data?.data?.items?.length}`);
  }
  {
    const r = await get(`/expenses/${id}`, T);
    check('E-EX-08', 'GET expense → 200', r.status === 200 && r.data?.data?.id === id, `status=${r.status}`);
    const x = await get(`/expenses/${id}`, state.owner2.token);
    expectError('E-EX-09', 'cross-tenant GET expense → 1004', x, 1004);
  }
  {
    const r = await get(`/branches/${A}/expenses`, T);
    check('E-EX-10', 'list has cursor meta', r.status === 200 && r.data?.meta && 'nextCursor' in r.data.meta, `meta=${JSON.stringify(r.data?.meta)}`);
  }

  summary('§10 Expenses');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
