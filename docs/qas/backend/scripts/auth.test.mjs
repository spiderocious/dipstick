// §3 Auth & account. Uses throwaway owners for negative cases; reuses bootstrapped owner.
import { get, post, patch, uniqEmail, uniqPhone } from './api.mjs';
import { section, pass, fail, check, expectError, summary, counts } from './runner.mjs';
import { state } from './_shared.mjs';

const PW = 'Password1';

// Register + verify a throwaway owner, return tokens/ids.
async function freshOwner(label = 'a') {
  const email = uniqEmail(label);
  const phone = uniqPhone();
  const reg = await post('/auth/register', {
    name: `${label} Owner`,
    business_name: `${label} Biz`,
    email,
    phone,
    password: PW,
  });
  const otp = reg.data?.data?.dev_otp;
  const ver = await post('/auth/verify-otp', { phone, code: otp });
  return {
    email,
    phone,
    token: ver.data?.data?.tokens?.access_token,
    refresh: ver.data?.data?.tokens?.refresh_token,
    userId: ver.data?.data?.user?.id,
    orgId: reg.data?.data?.org?.id,
  };
}

async function run() {
  // ── 3.1 Register ───────────────────────────────────────────────
  section('§3.1 Register');
  {
    const r = await post('/auth/register', {
      name: 'Valid Owner',
      business_name: 'Valid Biz',
      email: uniqEmail('rg'),
      phone: uniqPhone(),
      password: PW,
    });
    check('A-RG-01', 'valid register → 201',
      r.status === 201 && r.data?.data?.dev_otp === '000000', `status=${r.status} ${JSON.stringify(r.data)}`);
    // A-RG-10 secrets
    const blob = JSON.stringify(r.data);
    check('A-RG-10', 'no secrets in register response',
      !/passwordHash|"password"|codeHash/.test(blob), `body had secret-looking key`);
  }
  // A-RG-02..06 validation
  const base = { name: 'Nm', business_name: 'Bn', email: uniqEmail('v'), phone: uniqPhone(), password: PW };
  expectError('A-RG-02', 'name<2 → 1001 field=name',
    await post('/auth/register', { ...base, name: 'A' }), 1001, { field: 'name' });
  expectError('A-RG-03', 'business_name<2 → 1001 field=business_name',
    await post('/auth/register', { ...base, business_name: 'A' }), 1001, { field: 'business_name' });
  expectError('A-RG-04', 'bad email → 1001 field=email',
    await post('/auth/register', { ...base, email: 'notanemail' }), 1001, { field: 'email' });
  expectError('A-RG-05', 'phone<10 → 1001 field=phone',
    await post('/auth/register', { ...base, phone: '+234' }), 1001, { field: 'phone' });
  expectError('A-RG-06', 'password<8 → 1001 field=password',
    await post('/auth/register', { ...base, password: 'short' }), 1001, { field: 'password' });
  expectError('A-RG-07', 'empty body → 1001', await post('/auth/register', {}), 1001);
  // A-RG-08/09 conflicts (case-insensitive email)
  {
    const email = uniqEmail('dup');
    const phone = uniqPhone();
    await post('/auth/register', { name: 'Dup1', business_name: 'Dup Biz', email, phone, password: PW });
    const dupEmail = await post('/auth/register', {
      name: 'Dup2', business_name: 'Dup Biz', email: email.toUpperCase(), phone: uniqPhone(), password: PW,
    });
    expectError('A-RG-08', 'dup email (case-insensitive) → 1005 field=email', dupEmail, 1005, { field: 'email' });
    const dupPhone = await post('/auth/register', {
      name: 'Dup3', business_name: 'Dup Biz', email: uniqEmail('dup3'), phone, password: PW,
    });
    expectError('A-RG-09', 'dup phone → 1005 field=phone', dupPhone, 1005, { field: 'phone' });
  }
  // A-RG-11 DIV: password only min(8), 8 lowercase accepted
  {
    const r = await post('/auth/register', {
      name: 'Weak Pw', business_name: 'Weak Biz', email: uniqEmail('wp'), phone: uniqPhone(), password: 'aaaaaaaa',
    });
    check('A-RG-11', '[DIV] 8-lowercase password accepted (no complexity rule)',
      r.status === 201, `status=${r.status} ${JSON.stringify(r.data)}`);
  }

  // ── 3.2 OTP ────────────────────────────────────────────────────
  section('§3.2 Verify / Resend OTP');
  {
    // wrong-length code
    const email = uniqEmail('otp'); const phone = uniqPhone();
    await post('/auth/register', { name: 'Otp', business_name: 'Otp Biz', email, phone, password: PW });
    expectError('A-OTP-02', 'code not length 6 → 1001 field=code',
      await post('/auth/verify-otp', { phone, code: '123' }), 1001, { field: 'code' });
    // wrong 6-digit code → 1001 otp_invalid (increments attempts)
    expectError('A-OTP-03', 'wrong code → 1001 field=code',
      await post('/auth/verify-otp', { phone, code: '999999' }), 1001, { field: 'code' });
    // A-OTP-01 happy
    const ok = await post('/auth/verify-otp', { phone, code: '000000' });
    check('A-OTP-01', 'verify 000000 → 200 + tokens + verified',
      ok.status === 200 && ok.data?.data?.user?.phone_verified === true && !!ok.data.data.tokens?.access_token,
      `status=${ok.status} ${JSON.stringify(ok.data)}`);
  }
  // A-OTP-04 no OTP on record → 1004
  expectError('A-OTP-04', 'verify unknown phone (no OTP) → 1004 field=code',
    await post('/auth/verify-otp', { phone: '+2349999999999', code: '000000' }), 1004, { field: 'code' });
  // A-OTP-07 resend happy + A-OTP-08 rate limit (5 attempts → 6th is 1008)
  {
    const email = uniqEmail('rl'); const phone = uniqPhone();
    await post('/auth/register', { name: 'Rl', business_name: 'Rl Biz', email, phone, password: PW });
    const resend = await post('/auth/resend-otp', { phone });
    check('A-OTP-07', 'resend unverified → 200 sent + dev_otp',
      resend.status === 200 && resend.data?.data?.sent === true && resend.data.data.dev_otp === '000000',
      `status=${resend.status} ${JSON.stringify(resend.data)}`);
    // burn attempts: 5 wrong → 1001 each; 6th → 1008
    let last;
    for (let i = 0; i < 5; i++) last = await post('/auth/verify-otp', { phone, code: '111111' });
    const sixth = await post('/auth/verify-otp', { phone, code: '111111' });
    const ok = sixth.status === 429 && sixth.data?.errorCode === 1008;
    check('A-OTP-08', '[SM] 6th attempt → 1008 + Retry-After',
      ok && sixth.headers.get('retry-after') !== null,
      `6th status=${sixth.status} body=${JSON.stringify(sixth.data)} retry-after=${sixth.headers.get('retry-after')}`);
  }
  expectError('A-OTP-09', 'resend unknown phone → 1004 field=phone',
    await post('/auth/resend-otp', { phone: '+2349888888888' }), 1004, { field: 'phone' });
  // A-OTP-10 resend already-verified
  {
    const o = await freshOwner('rav');
    expectError('A-OTP-10', 'resend already-verified phone → 1005',
      await post('/auth/resend-otp', { phone: o.phone }), 1005);
  }

  // ── 3.3 Login ──────────────────────────────────────────────────
  section('§3.3 Login');
  {
    const o = await freshOwner('lg');
    const ok = await post('/auth/login', { email: o.email, password: PW });
    check('A-LG-01', 'valid login → 200 tokens', ok.status === 200 && !!ok.data?.data?.tokens?.access_token,
      `status=${ok.status}`);
    expectError('A-LG-02', 'unknown email → 1002 field=email',
      await post('/auth/login', { email: uniqEmail('nope'), password: PW }), 1002, { field: 'email' });
    expectError('A-LG-03', 'wrong password → 1002 field=email (identical to A-LG-02)',
      await post('/auth/login', { email: o.email, password: 'WrongPass9' }), 1002, { field: 'email' });
    // A-LG-04 unverified
    const email = uniqEmail('uv'); const phone = uniqPhone();
    await post('/auth/register', { name: 'Uv', business_name: 'Uv Biz', email, phone, password: PW });
    expectError('A-LG-04', 'unverified phone → 1003 field=phone',
      await post('/auth/login', { email, password: PW }), 1003, { field: 'phone' });
  }

  // ── 3.4 Refresh / Logout / Me / Org ────────────────────────────
  section('§3.4 Refresh / Logout / Me / Org');
  {
    const o = await freshOwner('rf');
    const r1 = await post('/auth/refresh', { refresh_token: o.refresh });
    check('A-RF-01', 'refresh → 200 new tokens', r1.status === 200 && !!r1.data?.data?.refresh_token,
      `status=${r1.status} ${JSON.stringify(r1.data)}`);
    // A-RF-02 reuse OLD refresh after rotation → 1002
    const reuse = await post('/auth/refresh', { refresh_token: o.refresh });
    expectError('A-RF-02', '[SM] reuse old refresh after rotation → 1002', reuse, 1002);
    expectError('A-RF-03', 'malformed refresh → 1002', await post('/auth/refresh', { refresh_token: 'not.a.jwt.token' }), 1002);
    expectError('A-RF-04', 'refresh<10 chars → 1001 field=refresh_token',
      await post('/auth/refresh', { refresh_token: 'short' }), 1001, { field: 'refresh_token' });
  }
  {
    // A-LO-01 logout then refresh the revoked token → 1002
    const o = await freshOwner('lo');
    const lo = await post('/auth/logout', { refresh_token: o.refresh });
    const afterRefresh = await post('/auth/refresh', { refresh_token: o.refresh });
    check('A-LO-01', 'logout 204 then refresh revoked → 1002',
      lo.status === 204 && afterRefresh.status === 401 && afterRefresh.data?.errorCode === 1002,
      `logout=${lo.status} refresh=${afterRefresh.status} ${JSON.stringify(afterRefresh.data)}`);
    // A-LO-02 logout with garbage → 204 idempotent
    const garbage = await post('/auth/logout', { refresh_token: 'garbage.token.value' });
    check('A-LO-02', 'logout garbage token → 204 idempotent', garbage.status === 204,
      `status=${garbage.status} ${JSON.stringify(garbage.data)}`);
  }
  // /me
  {
    const me = await get('/me', state.owner.token);
    check('A-ME-01', '/me valid → 200 + memberships',
      me.status === 200 && Array.isArray(me.data?.data?.memberships), `status=${me.status}`);
    check('A-ME-05', '/me excludes passwordHash', !/passwordHash/.test(JSON.stringify(me.data)), 'leaked');
  }
  expectError('A-ME-02', '/me no token → 1002', await get('/me'), 1002);
  expectError('A-ME-03', '/me no Bearer prefix → 1002',
    await get('/me', undefined, { headers: { Authorization: state.owner.token } }), 1002);
  expectError('A-ME-04', '/me garbage bearer → 1002', await get('/me', 'garbage.jwt.value'), 1002);
  // Org
  {
    const ok = await patch('/org', { name: 'Bisi Oil Ltd', wordmark: 'BISI OIL' }, state.owner.token);
    check('A-ORG-01', 'owner PATCH /org → 200', ok.status === 200, `status=${ok.status} ${JSON.stringify(ok.data)}`);
    expectError('A-ORG-02', 'org name<2 → 1001 field=name', await patch('/org', { name: 'A' }, state.owner.token), 1001, { field: 'name' });
    expectError('A-ORG-03', 'wordmark>120 → 1001 field=wordmark',
      await patch('/org', { wordmark: 'x'.repeat(121) }, state.owner.token), 1001, { field: 'wordmark' });
    const nullWm = await patch('/org', { wordmark: null }, state.owner.token);
    check('A-ORG-04', 'wordmark:null → 200', nullWm.status === 200, `status=${nullWm.status}`);
    expectError('A-ORG-05', 'manager PATCH /org (no org.manage) → 1003', await patch('/org', { name: 'Nope Inc' }, state.manager.token), 1003);
  }

  const c = summary('§3 Auth');
  process.exit(counts().failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error('FATAL', e); process.exit(2); });
