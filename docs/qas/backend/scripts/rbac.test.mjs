// §4 RBAC — role CRUD, last-owner guard, permission matrix, own-pump close, cross-tenant.
import { get, post, patch, del, uniqEmail, uniqPhone } from './api.mjs';
import { section, pass, fail, check, expectError, summary, counts } from './runner.mjs';
import { state, TODAY } from './_shared.mjs';

const OWN = state.owner.token;
const MGR = state.manager.token;
const ATT = state.attendant.token;
const A = state.branchA;
const PW = 'Welcome1';

async function run() {
  // ── 4.1 Role CRUD ──────────────────────────────────────────────
  section('§4.1 Role CRUD');
  {
    const list = await get('/roles', OWN);
    check('R-RL-01', 'owner GET /roles → 3 system roles', list.status === 200 && list.data?.data?.items?.length >= 3, `status=${list.status}`);
    const create = await post('/roles', { name: `Supervisor-${Date.now()}`, permissions: ['branch.view', 'shift.post', 'reconciliation.view'] }, OWN);
    check('R-RL-02', 'create custom role → 201 is_system:false', create.status === 201 && create.data?.data?.is_system === false, `status=${create.status} ${JSON.stringify(create.data)}`);
    const customId = create.data?.data?.id;
    expectError('R-RL-03', 'role name<2 → 1001 field=name', await post('/roles', { name: 'A', permissions: ['branch.view'] }, OWN), 1001, { field: 'name' });
    expectError('R-RL-04', 'role name>40 → 1001 field=name', await post('/roles', { name: 'x'.repeat(41), permissions: ['branch.view'] }, OWN), 1001, { field: 'name' });
    expectError('R-RL-05', 'empty permissions → 1001 field=permissions', await post('/roles', { name: `Empty-${Date.now()}`, permissions: [] }, OWN), 1001, { field: 'permissions' });
    expectError('R-RL-06', 'unknown permission → 1001 field=permissions', await post('/roles', { name: `Bad-${Date.now()}`, permissions: ['branch.view', 'not.a.perm'] }, OWN), 1001, { field: 'permissions' });
    // R-RL-07 dup name
    const dupName = `Dup-${Date.now()}`;
    await post('/roles', { name: dupName, permissions: ['branch.view'] }, OWN);
    expectError('R-RL-07', 'dup role name → 1005 field=name', await post('/roles', { name: dupName, permissions: ['branch.view'] }, OWN), 1005, { field: 'name' });
    // R-RL-08 patch
    const upd = await patch(`/roles/${customId}`, { name: `Super2-${Date.now()}`, permissions: ['branch.view', 'audit.view'] }, OWN);
    check('R-RL-08', 'PATCH role rename+perms → 200', upd.status === 200, `status=${upd.status} ${JSON.stringify(upd.data)}`);
    expectError('R-RL-09', 'PATCH unknown role → 1004', await patch('/roles/rol_nope', { name: 'X Role' }, OWN), 1004);
    // R-RL-10 rename to existing other name
    expectError('R-RL-10', 'rename to existing role name → 1005 field=name', await patch(`/roles/${customId}`, { name: 'Owner' }, OWN), 1005, { field: 'name' });
    // R-RL-11 rename to own current name
    const cur = (await get('/roles', OWN)).data.data.items.find((r) => r.id === customId);
    const sameName = await patch(`/roles/${customId}`, { name: cur.name }, OWN);
    check('R-RL-11', 'rename role to its own name → 200', sameName.status === 200, `status=${sameName.status} ${JSON.stringify(sameName.data)}`);
    // R-RL-12 edit system role perms (add then remove a harmless perm to Attendant)
    const att = (await get('/roles', OWN)).data.data.items.find((r) => r.name === 'Attendant');
    const editSys = await patch(`/roles/${att.id}`, { permissions: [...att.permissions, 'audit.view'] }, OWN);
    check('R-RL-12', 'edit system role perms → 200', editSys.status === 200, `status=${editSys.status} ${JSON.stringify(editSys.data)}`);
    await patch(`/roles/${att.id}`, { permissions: att.permissions }, OWN); // restore
    // R-RL-13 delete system role
    const owner = (await get('/roles', OWN)).data.data.items.find((r) => r.name === 'Owner');
    expectError('R-RL-13', 'DELETE system role → 1005', await del(`/roles/${owner.id}`, OWN), 1005);
    // R-RL-14 delete role in use
    const inUse = await post('/roles', { name: `InUse-${Date.now()}`, permissions: ['branch.view'] }, OWN);
    await post(`/branches/${A}/staff`, { name: 'InUseStaff', email: uniqEmail('iu'), phone: uniqPhone(), role_id: inUse.data.data.id, password: PW }, OWN);
    expectError('R-RL-14', 'DELETE role in use → 1005', await del(`/roles/${inUse.data.data.id}`, OWN), 1005);
    // R-RL-15 delete unused custom role
    const unused = await post('/roles', { name: `Unused-${Date.now()}`, permissions: ['branch.view'] }, OWN);
    const d = await del(`/roles/${unused.data.data.id}`, OWN);
    check('R-RL-15', 'DELETE unused custom role → 204', d.status === 204, `status=${d.status}`);
    expectError('R-RL-16', 'DELETE unknown role → 1004', await del('/roles/rol_nope', OWN), 1004);
  }

  // ── 4.2 Last-owner guard ───────────────────────────────────────
  // ISOLATION: this section mutates an org's Owner role, so it runs against a DEDICATED
  // throwaway org (not the shared bootstrap org) — stripping role.manage from the shared
  // owner would lock the rest of the suite out.
  section('§4.2 Last-owner guard (isolated org)');
  {
    const email = uniqEmail('logd'); const phone = uniqPhone();
    const reg = await post('/auth/register', { name: 'LO Owner', business_name: 'LO Biz', email, phone, password: PW });
    await post('/auth/verify-otp', { phone, code: reg.data.data.dev_otp });
    const lo = await post('/auth/login', { email, password: PW });
    const loTok = lo.data.data.tokens.access_token;
    // dedicated branch for staff adds
    const br = await post('/branches', { name: 'LO Branch', city: 'Cty', state: 'Lagos' }, loTok);
    const loBranch = br.data.data.id;

    const owner = (await get('/roles', loTok)).data.data.items.find((r) => r.name === 'Owner');
    const stripped = owner.permissions.filter((p) => p !== 'role.manage' && p !== 'staff.manage');
    expectError('R-LO-01', 'strip ownership from sole owner → 1007 last_owner', await patch(`/roles/${owner.id}`, { permissions: stripped }, loTok), 1007);
    const dropOne = owner.permissions.filter((p) => p !== 'role.manage');
    expectError('R-LO-03', 'drop only role.manage on sole owner → 1007', await patch(`/roles/${owner.id}`, { permissions: dropOne }, loTok), 1007);
    // R-LO-02: add a 2nd membership holding ownership perms, then the strip on Owner succeeds.
    const ownerLike = await post('/roles', { name: `Co-Owner-${Date.now()}`, permissions: ['role.manage', 'staff.manage', 'branch.view'] }, loTok);
    await post(`/branches/${loBranch}/staff`, { name: 'CoOwner', email: uniqEmail('co'), phone: uniqPhone(), role_id: ownerLike.data.data.id, password: PW }, loTok);
    const nowOk = await patch(`/roles/${owner.id}`, { permissions: stripped }, loTok);
    check('R-LO-02', 'strip ownership when another owner exists → 200', nowOk.status === 200, `status=${nowOk.status} ${JSON.stringify(nowOk.data)}`);
    // no restore needed — throwaway org
  }

  // ── 4.3 Permission matrix ──────────────────────────────────────
  section('§4.3 Permission matrix (manager vs attendant)');
  const expect = async (id, label, res, code) => {
    if (code === 'ok') check(id, label, res.status >= 200 && res.status < 300, `got ${res.status} ${JSON.stringify(res.data)}`);
    else expectError(id, label, res, code);
  };
  // create-branch
  await expect('R-MX-01m', 'manager POST /branches → 1003', await post('/branches', { name: 'MgrBranch', city: 'Cty', state: 'Lagos' }, MGR), 1003);
  await expect('R-MX-01a', 'attendant POST /branches → 1003', await post('/branches', { name: 'AttBranch', city: 'Cty', state: 'Lagos' }, ATT), 1003);
  // edit branch
  await expect('R-MX-02m', 'manager PATCH branch → 200', await patch(`/branches/${A}`, { city: 'Ikeja' }, MGR), 'ok');
  await expect('R-MX-02a', 'attendant PATCH branch → 1003', await patch(`/branches/${A}`, { city: 'Ikeja' }, ATT), 1003);
  // archive
  await expect('R-MX-03m', 'manager archive → 1003', await post(`/branches/${A}/archive`, undefined, MGR), 1003);
  // roles manage
  await expect('R-MX-04m', 'manager POST /roles → 1003', await post('/roles', { name: `MgrRole-${Date.now()}`, permissions: ['branch.view'] }, MGR), 1003);
  // staff manage (create) — manager CAN create staff (resolves via :branchId)
  await expect('R-MX-05m', 'manager POST staff → 201', await post(`/branches/${A}/staff`, { name: 'MgrHire', email: uniqEmail('mh'), phone: uniqPhone(), role_id: state.roles.attendant, password: PW }, MGR), 'ok');
  await expect('R-MX-05a', 'attendant POST staff → 1003', await post(`/branches/${A}/staff`, { name: 'AttHire', email: uniqEmail('ah'), phone: uniqPhone(), role_id: state.roles.attendant, password: PW }, ATT), 1003);
  // rollup
  await expect('R-MX-12m', 'manager GET /rollup → 1003 (no rollup.view)', await get('/rollup', MGR), 1003);
  await expect('R-MX-12a', 'attendant GET /rollup → 1003', await get('/rollup', ATT), 1003);
  // audit
  await expect('R-MX-13m', 'manager GET /audit → 200', await get(`/branches/${A}/audit`, MGR), 'ok');
  await expect('R-MX-13a', 'attendant GET /audit → 1003', await get(`/branches/${A}/audit`, ATT), 1003);
  // view branch (all)
  await expect('R-MX-14a', 'attendant GET branch → 200', await get(`/branches/${A}`, ATT), 'ok');
  // staff.view (attendant lacks)
  await expect('R-MX-15a', 'attendant GET staff → 1003', await get(`/branches/${A}/staff`, ATT), 1003);
  // expense.record (attendant has)
  await expect('R-MX-11a', 'attendant POST expense → 201', await post(`/branches/${A}/expenses`, { business_date: TODAY, category: 'misc', description: 'att expense', amount_kobo: 5000 }, ATT), 'ok');

  // ── 4.4 Cross-tenant & rollup guard ────────────────────────────
  section('§4.4 Cross-tenant / own-pump');
  // R-XT-01 manager at A hitting owner2's branch (no membership there) → 1003
  await expect('R-XT-01', 'manager → other-org branch → 1003', await get(`/branches/${state.owner2.branchId}/staff`, MGR), 1003);
  // R-XT-02 owner2 requests org-1 branch
  {
    const r = await get(`/branches/${A}`, state.owner2.token);
    check('R-XT-02', '[DIV] owner2 → org-1 branch → 1003 or 1004', r.status === 403 || r.status === 404, `status=${r.status}`);
  }
  // R-XT-04 attendant → rollup
  await expect('R-XT-04', 'attendant → /rollup → 1003', await get('/rollup', ATT), 1003);

  // ── 4.5 Custom role grants exactly its perms ───────────────────
  section('§4.5 Custom role assignment');
  {
    const role = await post('/roles', { name: `ExpenseViewer-${Date.now()}`, permissions: ['branch.view', 'expense.view'] }, OWN);
    const u = await post(`/branches/${A}/staff`, { name: 'EV', email: uniqEmail('ev'), phone: uniqPhone(), role_id: role.data.data.id, password: PW }, OWN);
    const login = await post('/auth/login', { email: u.data.data.user.email, password: PW });
    const tok = login.data?.data?.tokens?.access_token;
    const allowed = await get(`/branches/${A}/expenses`, tok);
    const denied = await post(`/branches/${A}/shifts`, { pump_id: state.pumps.P1.id, attendant_id: u.data.data.user.id, window: 'morning', business_date: TODAY, opening_meter: 0 }, tok);
    check('R-CR-01', 'custom role grants exactly its perms (expense.view yes, shift.open no)',
      allowed.status === 200 && denied.status === 403, `expenses=${allowed.status} shiftOpen=${denied.status}`);
  }

  summary('§4 RBAC');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
