// §6 Staff & roster.
import { get, post, patch, put, uniqEmail, uniqPhone } from './api.mjs';
import { section, check, expectError, summary, counts } from './runner.mjs';
import { state, TODAY } from './_shared.mjs';

const T = state.owner.token;
const A = state.branchA;
const PW = 'Welcome1';

async function run() {
  section('§6.1 Staff');
  // S-ST-01 add new
  {
    const r = await post(`/branches/${A}/staff`, {
      name: 'New Hire', email: uniqEmail('nh'), phone: uniqPhone(), role_id: state.roles.attendant, password: PW,
    }, T);
    check('S-ST-01', 'add new staff → 201 membership+user(pre-verified)',
      r.status === 201 && r.data?.data?.id?.startsWith('mbr_') && r.data.data.user?.phone_verified === true,
      `status=${r.status} ${JSON.stringify(r.data)}`);
  }
  expectError('S-ST-03', 'staff name<2 → 1001', await post(`/branches/${A}/staff`, { name: 'A', email: uniqEmail('x'), phone: uniqPhone(), role_id: state.roles.attendant }, T), 1001, { field: 'name' });
  expectError('S-ST-04', 'staff password<8 → 1001 field=password',
    await post(`/branches/${A}/staff`, { name: 'Short Pw', email: uniqEmail('sp'), phone: uniqPhone(), role_id: state.roles.attendant, password: 'short' }, T), 1001, { field: 'password' });
  expectError('S-ST-05', 'unknown role_id → 1004 field=role_id',
    await post(`/branches/${A}/staff`, { name: 'Bad Role', email: uniqEmail('br'), phone: uniqPhone(), role_id: 'rol_nope' }, T), 1004, { field: 'role_id' });
  // S-ST-06 reuse email, phone taken by different user
  {
    const phone = uniqPhone();
    await post(`/branches/${A}/staff`, { name: 'PhoneOwner', email: uniqEmail('po'), phone, role_id: state.roles.attendant, password: PW }, T);
    const email2 = uniqEmail('reuse');
    await post(`/branches/${A}/staff`, { name: 'Reuser', email: email2, phone: uniqPhone(), role_id: state.roles.attendant, password: PW }, T);
    const r = await post(`/branches/${A}/staff`, { name: 'Reuser', email: email2, phone, role_id: state.roles.attendant, password: PW }, T);
    expectError('S-ST-06', 'reuse email w/ another user phone → 1005 field=phone', r, 1005, { field: 'phone' });
  }
  // S-ST-07/08 patch
  {
    const add = await post(`/branches/${A}/staff`, { name: 'Patchee', email: uniqEmail('pt'), phone: uniqPhone(), role_id: state.roles.attendant, password: PW }, T);
    const mid = add.data?.data?.id;
    const upd = await patch(`/staff/${mid}`, { is_active: false }, T);
    check('S-ST-07', 'PATCH staff → 200', upd.status === 200, `status=${upd.status} ${JSON.stringify(upd.data)}`);
    check('S-ST-08', 'deactivate staff is_active:false', upd.data?.data?.is_active === false, `${JSON.stringify(upd.data?.data)}`);
  }
  expectError('S-ST-09', 'PATCH unknown membership → 1004', await patch('/staff/mbr_nope', { is_active: false }, T), 1004);
  expectError('S-ST-10', 'PATCH staff unknown role_id → 1004 field=role_id', await patch(`/staff/${state.attendant.membershipId}`, { role_id: 'rol_nope' }, T), 1004, { field: 'role_id' });
  // S-ST-11 directory
  {
    const r = await get(`/branches/${A}/staff`, T);
    const it = r.data?.data?.items?.[0];
    check('S-ST-11', 'staff directory items have user/role_name/stats',
      r.status === 200 && it && 'role_name' in it && 'shift_count_30d' in it && 'variance_kobo_30d' in it,
      `status=${r.status} item=${JSON.stringify(it).slice(0, 200)}`);
  }
  // S-ST-12 [BUG] Manager (branch-scoped membership) cannot PATCH /staff/:membershipId.
  // The route is mounted at /api/v1/staff with NO :branchId, so loadScope resolves ONLY the
  // caller's org-wide ('*') membership. A Manager has a branch-scoped membership, never '*',
  // so they hit not_a_member (1003) BEFORE the permission check — despite holding staff.manage.
  // Expected (per handoff matrix "Manage staff — Manager ✅" + the route's own comment): 200.
  // Confirmed actual: 1003. Filed as BUG-02 (P1). This case asserts the INTENDED behavior, so
  // it stays RED until the scope resolution is fixed.
  {
    const r = await patch(`/staff/${state.attendant.membershipId}`, { default_pump_id: state.pumps.P1.id }, state.manager.token);
    check('S-ST-12', '[BUG-02 P1] manager PATCH /staff/:id → expected 200, got ' + r.status,
      r.status === 200, `BUG: manager w/ staff.manage blocked by org-scope resolution → ${r.status} ${JSON.stringify(r.data)}`);
  }

  section('§6.2 Roster & leaderboard');
  {
    const r = await put(`/branches/${A}/roster`, {
      week_start: '2026-05-18',
      assignments: { [state.attendant.userId]: ['morning', 'morning', 'off', 'evening', 'evening', 'off', 'off'] },
    }, T);
    check('S-RO-01', 'PUT roster 7 windows → 200', r.status === 200, `status=${r.status} ${JSON.stringify(r.data)}`);
  }
  expectError('S-RO-02', 'roster 6 windows → 1001',
    await put(`/branches/${A}/roster`, { week_start: '2026-05-18', assignments: { [state.attendant.userId]: ['morning', 'off', 'off', 'off', 'off', 'off'] } }, T), 1001);
  expectError('S-RO-03', 'roster bad window → 1001',
    await put(`/branches/${A}/roster`, { week_start: '2026-05-18', assignments: { [state.attendant.userId]: ['noon', 'off', 'off', 'off', 'off', 'off', 'off'] } }, T), 1001);
  expectError('S-RO-04', 'week_start<10 → 1001 field=week_start',
    await put(`/branches/${A}/roster`, { week_start: 'short', assignments: {} }, T), 1001, { field: 'week_start' });
  {
    const r = await get(`/branches/${A}/roster?week_start=2099-01-01`, T);
    check('S-RO-05', 'GET roster (none set) → 200 empty assignments', r.status === 200 && typeof r.data?.data?.assignments === 'object', `status=${r.status} ${JSON.stringify(r.data)}`);
    const lb = await get(`/branches/${A}/variance-leaderboard`, T);
    const sorted = (lb.data?.data?.items ?? []).every((v, i, arr) => i === 0 || arr[i - 1].variance_kobo <= v.variance_kobo);
    check('S-RO-06', 'leaderboard 200 sorted ascending (worst first)', lb.status === 200 && sorted, `status=${lb.status} ${JSON.stringify(lb.data?.data?.items)}`);
  }

  summary('§6 Staff/Roster');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
