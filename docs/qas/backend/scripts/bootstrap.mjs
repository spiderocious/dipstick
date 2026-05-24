// §2 Bootstrap walk-through. Registers the org + personas, creates Branch A (tanks+pumps),
// sets a price, adds staff, and runs one shift through open→close→post. Captures all ids +
// tokens to .state.json for the dependent test files. Also asserts the §2 happy-path table.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { get, post, patch, uniqEmail, uniqPhone } from './api.mjs';
import { section, pass, fail, check, summary, counts } from './runner.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE = join(HERE, '.state.json');

const PW = 'Password1';
const state = { pw: PW };

async function registerVerifyLogin(label, businessName) {
  const email = uniqEmail(label);
  const phone = uniqPhone();
  const reg = await post('/auth/register', {
    name: `${label} Owner`,
    business_name: businessName,
    email,
    phone,
    password: PW,
  });
  if (reg.status !== 201) throw new Error(`register ${label} failed: ${reg.status} ${JSON.stringify(reg.data)}`);
  const otp = reg.data.data.dev_otp;
  const ver = await post('/auth/verify-otp', { phone, code: otp });
  if (ver.status !== 200) throw new Error(`verify ${label} failed: ${ver.status} ${JSON.stringify(ver.data)}`);
  return {
    email,
    phone,
    devOtp: otp,
    userId: ver.data.data.user.id,
    token: ver.data.data.tokens.access_token,
    refresh: ver.data.data.tokens.refresh_token,
    org: reg.data.data.org,
    regBody: reg.data.data,
  };
}

async function run() {
  section('§2 Bootstrap — owner sign-up');

  // BS-01: register
  const email = uniqEmail('owner');
  const phone = uniqPhone();
  const reg = await post('/auth/register', {
    name: 'Bisi Owner',
    business_name: 'Bisi Oil',
    email,
    phone,
    password: PW,
  });
  check(
    'BS-01',
    'register owner → 201 + dev_otp + unverified',
    reg.status === 201 &&
      reg.data?.data?.user?.id?.startsWith('usr_') &&
      reg.data.data.org?.id?.startsWith('org_') &&
      reg.data.data.phone_verification_required === true &&
      reg.data.data.dev_otp === '000000' &&
      reg.data.data.user.phone_verified === false &&
      reg.data.data.org.wordmark === null &&
      reg.data.data.org.owner_id === reg.data.data.user.id,
    `status=${reg.status} body=${JSON.stringify(reg.data)}`,
  );

  // BS-02: login before verify
  const earlyLogin = await post('/auth/login', { email, password: PW });
  check(
    'BS-02',
    'login before verify → 403 phone_unverified field=phone',
    earlyLogin.status === 403 &&
      earlyLogin.data?.errorCode === 1003 &&
      earlyLogin.data?.field === 'phone',
    `status=${earlyLogin.status} body=${JSON.stringify(earlyLogin.data)}`,
  );

  // BS-03: verify
  const ver = await post('/auth/verify-otp', { phone, code: '000000' });
  check(
    'BS-03',
    'verify-otp → 200 + verified + tokens',
    ver.status === 200 &&
      ver.data?.data?.user?.phone_verified === true &&
      typeof ver.data.data.tokens?.access_token === 'string' &&
      typeof ver.data.data.tokens?.refresh_token === 'string',
    `status=${ver.status} body=${JSON.stringify(ver.data)}`,
  );
  const ownerToken = ver.data.data.tokens.access_token;
  state.owner = {
    email,
    phone,
    userId: ver.data.data.user.id,
    token: ownerToken,
    refresh: ver.data.data.tokens.refresh_token,
    orgId: reg.data.data.org.id,
  };

  // BS-04: /me
  const me = await get('/me', ownerToken);
  const ownerMb = me.data?.data?.memberships?.[0];
  check(
    'BS-04',
    '/me → owner membership branch_id=* role Owner with permissions',
    me.status === 200 &&
      ownerMb?.branch_id === '*' &&
      ownerMb?.role_name === 'Owner' &&
      Array.isArray(ownerMb?.permissions) &&
      ownerMb.permissions.length === 30,
    `status=${me.status} mb=${JSON.stringify(ownerMb)}`,
  );

  // BS-05: permissions
  const perms = await get('/permissions', ownerToken);
  check(
    'BS-05',
    'GET /permissions → 30 keys with descriptions',
    perms.status === 200 &&
      Array.isArray(perms.data?.data?.permissions) &&
      perms.data.data.permissions.length === 30 &&
      perms.data.data.permissions.every((p) => typeof p.key === 'string' && typeof p.description === 'string'),
    `status=${perms.status} len=${perms.data?.data?.permissions?.length}`,
  );

  // BS-06: roles
  const roles = await get('/roles', ownerToken);
  const names = (roles.data?.data?.items ?? []).map((r) => r.name).sort();
  check(
    'BS-06',
    'GET /roles → Owner/Manager/Attendant all is_system',
    roles.status === 200 &&
      JSON.stringify(names) === JSON.stringify(['Attendant', 'Manager', 'Owner']) &&
      roles.data.data.items.every((r) => r.is_system === true),
    `status=${roles.status} names=${JSON.stringify(names)}`,
  );
  const byName = Object.fromEntries((roles.data?.data?.items ?? []).map((r) => [r.name, r]));
  state.roles = {
    owner: byName.Owner?.id,
    manager: byName.Manager?.id,
    attendant: byName.Attendant?.id,
  };

  // BS-07: branch A
  const branch = await post(
    '/branches',
    {
      name: 'Ikeja',
      city: 'Ikeja',
      state: 'Lagos',
      tanks: [
        { product: 'PMS', capacity_litres: 33000, reorder_threshold_litres: 5000 },
        { product: 'AGO', capacity_litres: 20000, reorder_threshold_litres: 3000 },
      ],
      pumps: [
        { product: 'PMS', label: 'P1' },
        { product: 'AGO', label: 'P2' },
      ],
    },
    ownerToken,
  );
  check(
    'BS-07',
    'create branch w/ tanks+pumps → 201, pumps idle/null fault',
    branch.status === 201 &&
      branch.data?.data?.id?.startsWith('brn_') &&
      branch.data.data.tanks?.length === 2 &&
      branch.data.data.pumps?.length === 2 &&
      branch.data.data.pumps.every((p) => p.state === 'idle' && p.fault_note === null),
    `status=${branch.status} body=${JSON.stringify(branch.data)}`,
  );
  const b = branch.data?.data ?? {};
  state.branchA = b.id;
  state.tanks = Object.fromEntries((b.tanks ?? []).map((t) => [t.product, t.id]));
  state.pumps = Object.fromEntries((b.pumps ?? []).map((p) => [p.label, { id: p.id, product: p.product }]));

  // BS-08: price PMS effective now
  const price = await post(
    `/branches/${state.branchA}/prices`,
    {
      product: 'PMS',
      price_per_litre_kobo: 89000,
      effective_at: new Date(Date.now() - 60000).toISOString(),
      reason: 'initial price',
    },
    ownerToken,
  );
  check(
    'BS-08',
    'set PMS price → 201, previous null',
    price.status === 201 && price.data?.data?.previous_price_per_litre_kobo === null,
    `status=${price.status} body=${JSON.stringify(price.data)}`,
  );

  // BS-09: staff attendant
  const att = await post(
    `/branches/${state.branchA}/staff`,
    {
      name: 'Tunde Attendant',
      email: uniqEmail('att'),
      phone: uniqPhone(),
      role_id: state.roles.attendant,
      default_pump_id: state.pumps.P1.id,
      password: PW,
    },
    ownerToken,
  );
  check(
    'BS-09',
    'add attendant staff → 201 membership + user',
    att.status === 201 && att.data?.data?.id?.startsWith('mbr_') && att.data.data.user?.id?.startsWith('usr_'),
    `status=${att.status} body=${JSON.stringify(att.data)}`,
  );
  state.attendant = {
    membershipId: att.data?.data?.id,
    userId: att.data?.data?.user?.id,
    email: att.data?.data?.user?.email,
  };

  const today = new Date().toISOString().slice(0, 10);
  state.businessDate = today;

  // BS-10: opening dip
  const odip = await post(
    `/branches/${state.branchA}/dips`,
    { tank_id: state.tanks.PMS, kind: 'opening', litres: 28500, business_date: today },
    ownerToken,
  );
  check('BS-10', 'opening dip → 201', odip.status === 201 && odip.data?.data?.kind === 'opening',
    `status=${odip.status} body=${JSON.stringify(odip.data)}`);

  // BS-11: open shift
  const shift = await post(
    `/branches/${state.branchA}/shifts`,
    {
      pump_id: state.pumps.P1.id,
      attendant_id: state.attendant.userId,
      window: 'morning',
      business_date: today,
      opening_meter: 12450.0,
    },
    ownerToken,
  );
  check(
    'BS-11',
    'open shift → 201 status=open price pinned',
    shift.status === 201 && shift.data?.data?.status === 'open' && shift.data.data.price_per_litre_kobo === 89000,
    `status=${shift.status} body=${JSON.stringify(shift.data)}`,
  );
  state.shiftId = shift.data?.data?.id;

  // BS-12: close
  const close = await patch(
    `/shifts/${state.shiftId}`,
    { closing_meter: 13010.5, cash_declared_kobo: 49800000 },
    ownerToken,
  );
  check(
    'BS-12',
    'close shift → 200 variance 84500 short',
    close.status === 200 &&
      close.data?.data?.litres === 560.5 &&
      close.data.data.expected_gross_kobo === 49884500 &&
      close.data.data.variance_kobo === 84500 &&
      close.data.data.variance_status === 'short',
    `status=${close.status} body=${JSON.stringify(close.data)}`,
  );

  // BS-13: closing dip
  const cdip = await post(
    `/branches/${state.branchA}/dips`,
    { tank_id: state.tanks.PMS, kind: 'closing', litres: 27900, business_date: today },
    ownerToken,
  );
  check('BS-13', 'closing dip → 201', cdip.status === 201 && cdip.data?.data?.kind === 'closing',
    `status=${cdip.status} body=${JSON.stringify(cdip.data)}`);

  // BS-14: post
  const posted = await post(`/shifts/${state.shiftId}/post`, undefined, ownerToken);
  check(
    'BS-14',
    'post shift → 200 status=posted',
    posted.status === 200 && posted.data?.data?.status === 'posted' && posted.data.data.is_posted === true,
    `status=${posted.status} body=${JSON.stringify(posted.data)}`,
  );

  // BS-15: rollup
  const rollup = await get(`/rollup?date=${today}`, ownerToken);
  check(
    'BS-15',
    'rollup → totals + lead + todo',
    rollup.status === 200 &&
      rollup.data?.data?.totals &&
      typeof rollup.data.data.lead === 'string' &&
      Array.isArray(rollup.data.data.todo),
    `status=${rollup.status} body=${JSON.stringify(rollup.data).slice(0, 300)}`,
  );

  // --- Personas for RBAC (manager, attendant2, owner2 org-2) ---
  section('§2b Personas for RBAC');

  // Manager at Branch A
  const mgr = await post(
    `/branches/${state.branchA}/staff`,
    {
      name: 'Mojeed Manager',
      email: uniqEmail('mgr'),
      phone: uniqPhone(),
      role_id: state.roles.manager,
      password: PW,
    },
    ownerToken,
  );
  if (mgr.status === 201) {
    const ml = await post('/auth/login', { email: mgr.data.data.user.email, password: PW });
    state.manager = {
      membershipId: mgr.data.data.id,
      userId: mgr.data.data.user.id,
      email: mgr.data.data.user.email,
      token: ml.data?.data?.tokens?.access_token,
    };
    pass('BS-P1', 'manager persona created + logged in');
  } else fail('BS-P1', 'manager persona', `status=${mgr.status} ${JSON.stringify(mgr.data)}`);

  // Attendant login token
  const al = await post('/auth/login', { email: state.attendant.email, password: PW });
  state.attendant.token = al.data?.data?.tokens?.access_token;
  check('BS-P2', 'attendant login token', typeof state.attendant.token === 'string',
    `status=${al.status} ${JSON.stringify(al.data)}`);

  // Attendant 2
  const att2 = await post(
    `/branches/${state.branchA}/staff`,
    { name: 'Tina Two', email: uniqEmail('att2'), phone: uniqPhone(), role_id: state.roles.attendant, password: PW },
    ownerToken,
  );
  if (att2.status === 201) {
    const a2l = await post('/auth/login', { email: att2.data.data.user.email, password: PW });
    state.attendant2 = {
      membershipId: att2.data.data.id,
      userId: att2.data.data.user.id,
      email: att2.data.data.user.email,
      token: a2l.data?.data?.tokens?.access_token,
    };
    pass('BS-P3', 'attendant2 persona created');
  } else fail('BS-P3', 'attendant2 persona', `status=${att2.status} ${JSON.stringify(att2.data)}`);

  // Owner 2 (separate org)
  const o2 = await registerVerifyLogin('owner2', 'Tenant Two Oil');
  state.owner2 = { token: o2.token, userId: o2.userId, orgId: o2.org.id, email: o2.email };
  // owner2's own branch for cross-tenant tests
  const o2branch = await post(
    '/branches',
    { name: 'Yaba', city: 'Yaba', state: 'Lagos', tanks: [{ product: 'PMS', capacity_litres: 30000, reorder_threshold_litres: 4000 }], pumps: [{ product: 'PMS', label: 'Y1' }] },
    o2.token,
  );
  state.owner2.branchId = o2branch.data?.data?.id;
  check('BS-P4', 'owner2 (org-2) + branch created', o2branch.status === 201 && !!state.owner2.branchId,
    `status=${o2branch.status} ${JSON.stringify(o2branch.data)}`);

  writeFileSync(STATE, JSON.stringify(state, null, 2));
  console.log(`\nstate → ${STATE}`);
  const s = summary('Bootstrap');
  process.exit(counts().failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('\nFATAL bootstrap error:', e.message);
  process.exit(2);
});
