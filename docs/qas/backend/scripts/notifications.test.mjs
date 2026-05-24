// §13 Notifications. (No producer wired — feed may be empty; not a bug.)
import { get, post } from './api.mjs';
import { section, check, expectError, summary, counts } from './runner.mjs';
import { state } from './_shared.mjs';

const T = state.owner.token;

async function run() {
  section('§13 Notifications');
  {
    const r = await get('/notifications', T);
    check('NF-01', 'GET /notifications → 200 feed + unread_count + meta',
      r.status === 200 && Array.isArray(r.data?.data?.items) && typeof r.data.data.unread_count === 'number' && r.data?.meta,
      `status=${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  }
  // NF-02 mark another user's / nonexistent notification → 1004
  expectError('NF-02', 'mark unknown/other notification read → 1004', await post('/notifications/ntf_nonexistent/read', undefined, T), 1004);
  expectError('NF-04', 'GET /notifications no token → 1002', await get('/notifications'), 1002);
  // NF-03 mark own — only if feed has one (likely empty since no producers)
  {
    const feed = await get('/notifications', T);
    const first = feed.data?.data?.items?.[0];
    if (first) {
      const r = await post(`/notifications/${first.id}/read`, undefined, T);
      check('NF-03', 'mark own notification read → 200 read:true', r.status === 200 && r.data?.data?.read === true, `${JSON.stringify(r.data)}`);
    } else {
      // SKIP — feed empty (no producer wired; expected per handoff §13)
      const { skip } = await import('./runner.mjs');
      skip('NF-03', 'mark own notification read', 'feed empty — no producers wired (expected)');
    }
  }

  summary('§13 Notifications');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
