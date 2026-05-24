// §11 Roll-up & trends.
import { get } from './api.mjs';
import { section, check, expectError, summary, counts } from './runner.mjs';
import { state, TODAY } from './_shared.mjs';

const OWN = state.owner.token;
const MGR = state.manager.token;
const ATT = state.attendant.token;

async function run() {
  section('§11 Rollup & trends');
  // RU-01 default (no date) → yesterday
  {
    const r = await get('/rollup', OWN);
    check('RU-01', 'rollup no date → 200 defaults to yesterday',
      r.status === 200 && typeof r.data?.data?.business_date === 'string' && r.data.data.business_date < TODAY,
      `status=${r.status} date=${r.data?.data?.business_date}`);
  }
  // RU-02 with date (bootstrap posted a short shift today)
  {
    const r = await get(`/rollup?date=${TODAY}`, OWN);
    const d = r.data?.data;
    check('RU-02', 'rollup with date → totals/lead/todo/branches',
      r.status === 200 && d?.totals && typeof d.lead === 'string' && Array.isArray(d.todo) && Array.isArray(d.branches),
      `status=${r.status} ${JSON.stringify(d).slice(0, 250)}`);
    // RU-05 totals add up across branches
    const sumLitres = d.branches.reduce((s, b) => s + (b.litres ?? 0), 0);
    check('RU-05', '[VAR] totals.litres == sum(branch litres)', d.totals.litres === sumLitres, `totals=${d.totals.litres} sum=${sumLitres}`);
    // branch status enum valid
    check('RU-02b', 'branch status ∈ clean|short|reorder', d.branches.every((b) => ['clean', 'short', 'reorder'].includes(b.status)), `statuses=${d.branches.map((b) => b.status)}`);
  }
  // RU-06/07 RBAC
  expectError('RU-06', 'attendant /rollup → 1003', await get('/rollup', ATT), 1003);
  expectError('RU-07', 'manager /rollup → 1003 (no rollup.view)', await get('/rollup', MGR), 1003);
  // RU-08 trends
  {
    const r = await get('/rollup/trends?days=7', OWN);
    const d = r.data?.data;
    check('RU-08', 'trends?days=7 → from/to/series', r.status === 200 && d?.from && d?.to && Array.isArray(d.series) && (d.series.length === 0 || Array.isArray(d.series[0].points)),
      `status=${r.status} ${JSON.stringify(d).slice(0, 200)}`);
  }
  // RU-09 clamp days
  {
    const r = await get('/rollup/trends?days=200', OWN);
    const d = r.data?.data;
    // from..to inclusive should span 90 days (max), i.e. 89 days back
    const span = d ? (new Date(d.to) - new Date(d.from)) / 86400000 + 1 : 0;
    check('RU-09', 'days=200 clamped to 90', r.status === 200 && span === 90, `span=${span} from=${d?.from} to=${d?.to}`);
  }
  // RU-10 default 7 on garbage
  {
    const r = await get('/rollup/trends?days=abc', OWN);
    const d = r.data?.data;
    const span = d ? (new Date(d.to) - new Date(d.from)) / 86400000 + 1 : 0;
    check('RU-10', 'days=abc → default 7', r.status === 200 && span === 7, `span=${span}`);
  }

  summary('§11 Rollup');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
