# Dipstick Backend — QA Bug Report

> **QA:** Claude
> **Date:** 2026-05-24 (updated after full run on the BUG-01 fix)
> **Test suite:** `docs/qas/backend/scripts/` (bootstrap + 12 feature suites, shared `api.mjs`/`runner.mjs`)
> **Plan:** `docs/qas/backend/plans/test-plan.md`
> **Server:** `apps/main-backend` @ `localhost:8091`, MongoDB standalone @ `mongodb://127.0.0.1:27017` (`dipstick` db)
> **Run status:** Full suite executed — **267 PASS / 3 FAIL / 1 SKIP** (271 run). The 3 FAILs are the bugs below.

---

## Summary

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| BUG-01 | P0 | Standalone-Mongo transaction fallback 500s every write | ✅ Fixed & verified |
| BUG-02 | P1 | Manager cannot `PATCH /staff/:membershipId` (org-scope on unparametrized route) | ✅ Fixed & verified |
| BUG-03 | P3 | `variance_flag_kobo` accepts a non-integer (no `.int()`) | ✅ Fixed & verified |
| BUG-04 | P2 | `Retry-After` header missing on `1008` returned via `ServiceResult` (OTP) | ✅ Fixed & verified |

| Severity | Open | Fixed |
|----------|------|-------|
| P0 | 0 | 1 |
| P1 | 0 | 1 |
| P2 | 0 | 1 |
| P3 | 0 | 1 |

> **All four bugs fixed & verified (2026-05-24).** BUG-02/03/04 resolutions verified live on a
> standalone Mongo (7/7 assertions): Manager edits same-branch staff → 200, cross-tenant → 404,
> Owner unaffected; float `variance_flag_kobo` → 1001 (field `settings.variance_flag_kobo`),
> integer → 200; OTP lockout → 1008 **with `Retry-After: 600`**. typecheck · lint · build green.
>
> **QA independent re-verification (2026-05-24).** I re-ran the full automated suite against the
> fixed build — updating the 3 fix assertions to expect the corrected behavior and adding
> `div08.test.mjs` — and reproduced the `Retry-After: 600` header at the raw level (`curl -i`).
> **277 PASS / 0 FAIL / 1 SKIP, no regressions** (the SKIP is the not-yet-wired notifications
> feed). All four resolutions + DIV-08 enforcement (toggle off → manager 403 / owner 201;
> toggle on → manager 201) independently confirmed. Verdict: **cleared for functional sign-off.**

With BUG-01 fixed, the full ~297-case plan was executed. 267 passed; 3 failed (BUG-02/03/04 below); 1 skipped (notifications feed — no producers wired, expected per handoff §13). All FAILs were reproduced and traced to source.

---

## BUG-01 — Standalone-Mongo transaction fallback is broken; every transactional write 500s 🔴 P0

**Status:** ✅ FIXED & VERIFIED (2026-05-24) — see "Resolution" at the end of this entry.
**Found by:** Dynamic test BS-01 (`POST /auth/register`) + source review.
**HTTP:** `500` `{ "errorCode": 1009, "errorMessage": "An unexpected error occurred", "type": "internal_error" }`
**Files:**
- `apps/main-backend/src/db/transaction.ts:20-41` — `withTransaction` (the broken fallback)
- `apps/main-backend/src/features/auth/auth.repo.mongo.ts:41-43` — `userRepo.insert` (always passes the session)
- `apps/main-backend/src/features/auth/auth.service.ts:142-151` — `register()` (first caller hit)

### What happens

On a **standalone** MongoDB (no replica set), the first multi-document write — owner registration — fails with a 500 instead of degrading to a non-transactional write.

Underlying Mongo error (from server log):

```
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
  code: 20, codeName: "IllegalOperation"
  at Object.insert (apps/main-backend/src/features/auth/auth.repo.mongo.ts:42:5)
  at register (apps/main-backend/src/features/auth/auth.service.ts:143:7)
  at withTransaction (apps/main-backend/src/db/transaction.ts:27:18)
```

### Why the fallback does not save it

`withTransaction` (transaction.ts:20-41) is meant to detect "transactions unsupported" and re-run the body without one:

```ts
try {
  await session.withTransaction(async () => { result = await fn({ session }); });
  return result!;
} catch (err) {
  if (isTransactionsUnsupported(err)) {
    logger.warn('mongo transactions unsupported (standalone) — running without a session');
    return fn({ session });          // ← re-runs with the SAME session
  }
  throw err;
}
```

The detection is fine (`code === 20` is matched). The **fallback is not**: it calls `fn({ session })` again, passing **the same `ClientSession`**. The repos unconditionally attach that session to the driver call:

```ts
// auth.repo.mongo.ts
insert: async (doc, tx) => { await users().insertOne(doc, sess(tx)); }
```

So the "non-transactional" retry still carries a session on a standalone server → Mongo throws `IllegalOperation` (code 20) **again**. That second throw is **not** caught (the fallback has no try/catch around it), so it propagates to the global error handler → `1009` 500.

The fallback would only work if it ran the body with **no session** (e.g. `fn({ session: undefined })` and `sess(tx)` yielding `{}`), or if the repos omitted the session when transactions are unavailable. As written, the `return fn({ session })` line re-introduces the exact condition it is trying to escape.

### Evidence (live run, BS-01 → BS-03)

```
POST /api/v1/auth/register  → 500 {"errorCode":1009,"errorMessage":"An unexpected error occurred","type":"internal_error"}
POST /api/v1/auth/login     → 401 1002 invalid_credentials   (no user was created → can't log in)
POST /api/v1/auth/verify-otp→ 404 1004 otp_expired           (no OTP issued → no record)
```

Server log for the register call: `ERROR: POST /api/v1/auth/register 500 187ms`, preceded by the `code: 20` MongoServerError stack above.

### Impact

- **Blocks the entire API.** `register` is the only way to create the first org/owner (there is no seed script — handoff §0). Every test depends on it. Deliveries-sign and shift-post (the other `withTransaction` callers) would 500 the same way.
- **Contradicts the documented contract.** QA handoff §0 states: *"on a standalone Mongo the backend degrades to non-transactional writes (fine for QA, logged as a warning)."* It does not — it 500s. `api-docs.md` makes the same implicit promise.
- A `1009` here is also a **leaked-failure-as-internal** smell: an expected, known-unsupported environment produces the catch-all 500 rather than a graceful path.

### Fix (suggested — not applied)

Make the fallback actually drop the session. Two equivalent options:

**Option A — fallback runs with no session:**
```ts
// transaction.ts — make Tx.session optional, and on fallback pass undefined
export interface Tx { session?: ClientSession }
...
if (isTransactionsUnsupported(err)) {
  logger.warn('mongo transactions unsupported (standalone) — running without a session');
  return fn({});            // no session → repos must treat sess(undefined) as {}
}
```
…and ensure the repo `sess()` helper returns `{}` when `tx?.session` is undefined (verify `auth.repo.mongo.ts`'s `sess`).

**Option B — detect standalone once at boot** and skip `session.withTransaction` entirely (call `fn({})` directly) when the topology is not a replica set, so the unsupported path is never exercised per-request.

After the fix, re-run `bootstrap.mjs`; BS-01 must return `201` and BS-03 must return tokens.

### Verification status

Not yet verified-fixed. Re-run blocked pending a code fix **or** a replica-set Mongo. (Per the handoff, production uses a replica set, where this path is never hit — so the bug is specific to the documented standalone/dev/CI path.)

### Resolution (2026-05-24)

Root cause was **two** standalone-incompatible defaults, not one:
1. `withTransaction` fallback re-ran with the **same session** (the originally reported issue), and
2. the detection only checked the **top-level** `err.code`, but `mongodb@7` nests the IllegalOperation under `originalError`/`errorResponse`, so `isTransactionsUnsupported` returned false and the retry never happened, and
3. once the session was dropped, the driver's default **`retryWrites=true`** *also* fails on a standalone with the same `IllegalOperation (code 20)` class — a second, independent blocker the original report couldn't see (it was masked behind the first throw).

**Fix applied** (`apps/main-backend/src/db/`):
- `transaction.ts` — `Tx.session` is now **optional**; `withTransaction` detects unsupported transactions **once** (recursively scanning the wrapped error tree for code 20/263 / `IllegalOperation`), caches it (`transactionsSupported = false`), and on the standalone path runs the unit of work with **no session** (`fn({})`) — future calls skip the transaction attempt entirely. Added shared `sessionOpts(tx)` helper.
- All repos (`*.repo.mongo.ts`, `audit.repo.ts`) now build their per-call options via `sessionOpts(tx)`, which yields `{}` (no session) when none is present — so a session is never attached to a standalone write.
- `client.ts` — `MongoClient` now sets **`retryWrites: false`** (no-op on a replica set; required for a standalone). An explicit `retryWrites` in `MONGO_URL` still wins.

**Verified live** against a fresh **standalone** `mongod` (no replica set):
```
POST /auth/register        → 201  (user+org+roles+membership created; dev_otp:"000000" in body)
POST /auth/login (pre-verify) → 403 1003 phone_unverified
POST /auth/verify-otp      → 200  + access/refresh tokens
GET  /me (Bearer)          → 200  owner membership, branch_id "*", role Owner
POST /branches (+tanks+pumps+audit, a multi-doc withTransaction write) → 201
GET  /branches/:id/audit   → 200  branch.created audit row present (written in the same unit of work)
```
Server logged the degrade exactly once: `mongo transactions unsupported (standalone) — running … without a session`. typecheck · lint · build all green. Test server + temp Mongo torn down; user's environment untouched.

> The other `withTransaction` callers (shift post + audit, delivery sign + tank balance) use the identical path now proven by the branch-create write, so they degrade the same way.

---

## BUG-02 — Manager cannot `PATCH /staff/:membershipId`; org-scope resolution blocks branch-scoped roles 🔴 P1

**Status:** ✅ FIXED & VERIFIED (2026-05-24) — see "Resolution" at the end of this entry.
**Found by:** Dynamic test S-ST-12, confirmed with curl + source review.
**HTTP:** `403` `{ "errorCode": 1003, "errorMessage": "You are not a member of this branch", "type": "forbidden_error" }`
**Files:**
- `apps/main-backend/src/features/staff/index.ts:44-54` — `memberRouter` mounted at `/api/v1/staff` (no `:branchId`)
- `apps/main-backend/src/middlewares/authorize.middleware.ts:19-27` — `loadScope` (the `*`-only fallback)

### What happens

`PATCH /staff/:membershipId` is the endpoint for editing a staff member (role, default pump, active flag). The handoff RBAC matrix (§3) lists **"Manage staff / roster — Manager ✅"**, and the route file's own comment says *"managers update staff in their branch."* But a **Manager cannot call it** — they get `1003 not_a_member`.

### Root cause

The route is mounted with **no `:branchId`** param:
```ts
// staff/index.ts
const memberRouter: IRouter = Router();
memberRouter.patch('/:membershipId', requirePermission(P.CAN_MANAGE_STAFF, P.CAN_ASSIGN_ROLES), …);
app.use('/api/v1/staff', memberRouter);
```
`requirePermission` first runs `loadScope`, which resolves the caller's membership like this:
```ts
// authorize.middleware.ts
const membership = branchId
  ? await membershipRepo.findForBranch(orgId, userId, branchId)
  : (await membershipRepo.findByUser(userId)).find((m) => m.branchId === '*') ?? null;  // ← no branchId → '*' only
if (!membership) throw new ForbiddenError(messages.get('not_a_member'));
```
With no `:branchId`, scope resolves **only** to the caller's org-wide (`*`) membership. A **Manager's membership is branch-scoped** (`branchId === brn_…`), never `*`, so `membership` is `null` → `1003 not_a_member` — thrown **before** the permission check even runs. Only an **Owner** (who has the `*` membership) can pass.

### Evidence (live curl, identical call)

```
# Manager (holds staff.manage, branch-A membership):
PATCH /api/v1/staff/mbr_…  → 403 {"errorCode":1003,"errorMessage":"You are not a member of this branch","type":"forbidden_error"}
# Owner (holds the '*' membership) — control:
PATCH /api/v1/staff/mbr_…  → 200 {"data":{"id":"mbr_…","is_active":true,…}}
```

### Impact

- **Core RBAC flow broken.** Managers — the role designed to run a branch day-to-day, including staff — **cannot edit any staff member** (can't reassign roles, set default pumps, or deactivate). Only Owners can. Contradicts the handoff matrix and the route's stated intent.
- The `CAN_ASSIGN_ROLES` permission (which Manager holds) is **unreachable** on this endpoint for any non-`*` member, making it effectively dead for its intended audience.

### Fix (suggested — not applied)

Make the membership endpoint branch-aware so scope resolves against the staff member's branch. Options:
- **A:** Mount staff update under the branch path: `PATCH /api/v1/branches/:branchId/staff/:membershipId`, so `loadScope` resolves the caller's membership for that branch (and the service still checks org match). Aligns with how every other staff route is scoped.
- **B:** In `loadScope`, when there's no `:branchId` but the route targets a `:membershipId`, look up the target membership's `branchId` first and resolve the caller's membership for *that* branch.

After the fix, S-ST-12 must return `200` for a Manager editing a same-branch staffer, and still `1003` cross-branch / cross-tenant.

### Resolution (2026-05-24) — Option B

`authorize.middleware.ts` gained a `requirePermissionForBranch(resolver, ...perms)` variant. The
resolver computes the *target* branch for routes that carry no `:branchId`. `loadScope` now
takes an optional resolver; scoping precedence is **resolver branchId → `:branchId` param →
org-wide ('*')**. `staff/index.ts` mounts the membership PATCH with a resolver that looks up the
target membership's `branchId` (an org-wide `*` target falls back to org-wide scope; a missing
membership resolves to the caller's `*` and the service's orgId re-check yields 404 for a
stranger). The URL contract `PATCH /api/v1/staff/:membershipId` is unchanged.

**Files:** `apps/main-backend/src/middlewares/authorize.middleware.ts` (new `requirePermissionForBranch`, `BranchResolver`, resolver-aware `loadScope`); `apps/main-backend/src/features/staff/index.ts` (resolver wired).

**Verified live** (standalone Mongo): Manager (branch-scoped, holds `staff.manage`) edits a
same-branch staffer → **200**; cross-tenant Owner-2 editing an Org-1 staffer → **404**; Owner
editing staff → **200** (no regression).

---

## BUG-03 — `variance_flag_kobo` accepts a non-integer kobo value 🟡 P3

**Status:** ✅ FIXED & VERIFIED (2026-05-24) — see "Resolution" at the end of this entry.
**Found by:** Dynamic test X-MON-05 (DIV-06 probe) + source review.
**File:** `apps/main-backend/src/features/branches/branches.schema.ts:29`

### What happens

`PATCH /branches/:branchId` with `{ settings: { variance_flag_kobo: 123.45 } }` returns **200** and stores `123.45`. Every other `_kobo` field (`price_per_litre_kobo`, `cash_declared_kobo`, `cost_per_litre_kobo`, `amount_kobo`) is validated `.int()` and rejects a float with `1001`. The handoff §11 states **"all `_kobo` fields … integer kobo … sending a decimal to any `_kobo` field must 1001."**

### Root cause

```ts
// branches.schema.ts
variance_flag_kobo: z.number().nonnegative('Variance flag cannot be negative').optional(),
```
Missing `.int(...)`. The sibling money fields all chain `.int('… whole kobo')`.

### Evidence (live)

```
PATCH /api/v1/branches/:id  {"settings":{"variance_flag_kobo":123.45}}  → 200, settings.variance_flag_kobo == 123.45
```

### Impact

Low. `variance_flag_kobo` is a per-branch threshold used to flag large variances; a fractional kobo won't crash anything but violates the money-is-integer invariant and could surprise downstream comparisons/formatting. Inconsistent with every other money field.

### Fix (suggested — not applied)

```ts
variance_flag_kobo: z.number().int('Variance flag must be in whole kobo').nonnegative('Variance flag cannot be negative').optional(),
```

### Resolution (2026-05-24)

Applied exactly as suggested — added `.int('Variance flag must be in whole kobo')` to the field in
`apps/main-backend/src/features/branches/branches.schema.ts`. **Verified live:** `PATCH /branches/:id`
with `{ settings: { variance_flag_kobo: 123.45 } }` → **400 `1001`**, field `settings.variance_flag_kobo`;
integer `500000` → **200**.

---

## BUG-04 — `Retry-After` header missing on `1008` rate-limit responses (OTP) 🟡 P2

**Status:** ✅ FIXED & VERIFIED (2026-05-24) — see "Resolution" at the end of this entry.
**Found by:** Dynamic test A-OTP-08, confirmed with `curl -i`.
**HTTP:** `429` `{ "errorCode": 1008, "errorMessage": "Too many attempts. Request a new code", "type": "rate_limit_error", "field": "code" }` — **no `Retry-After` header**.
**Files:**
- `apps/main-backend/src/middlewares/errorHandler.middleware.ts:29` — only place `Retry-After` is set
- `apps/main-backend/src/lib/response.ts:25-39` — `ResponseUtil.error` (has no `retryAfter` concept)
- `apps/main-backend/src/features/auth/auth.service.ts:191-193` — OTP returns `fail(RATE_LIMITED, …)` (a `ServiceResult`, not a thrown `AppError`)

### What happens

After 5 failed OTP attempts, the 6th `POST /auth/verify-otp` correctly returns `429 1008` — but with **no `Retry-After` header**. Both `api-docs.md §1` ("1008 … `Retry-After` header set") and the QA handoff §1 promise it.

### Root cause

`Retry-After` is set in exactly one place — the error handler's **`AppError`** branch:
```ts
if (err instanceof AppError) {
  if (err.retryAfter !== undefined) res.setHeader('Retry-After', err.retryAfter);
  …
}
```
But the OTP rate-limit doesn't *throw* a `RateLimitError`; the service **returns** `fail(ERROR_CODE.RATE_LIMITED, 'otp_too_many', …)`. That `ServiceResult` flows controller → `sendResult` → `ResponseUtil.error`, which builds the flat body and sets the status but **has no `retryAfter` parameter** and never sets the header. So any `1008` produced via the (normal) `ServiceResult` path is missing the documented header.

### Evidence (live `curl -i`, 6th attempt)

```
HTTP/1.1 429 Too Many Requests
X-Content-Type-Options: nosniff
Content-Type: application/json; charset=utf-8
   ← no Retry-After line
{"errorCode":1008,"errorMessage":"Too many attempts. Request a new code","type":"rate_limit_error","field":"code"}
```

### Impact

Moderate. Clients (and the FE) are told by the docs to read `Retry-After` to back off; its absence means they can't tell when to retry, and automated clients may hammer the endpoint. The status/code are correct, so it degrades politeness/contract rather than blocking the flow.

### Fix (suggested — not applied)

Teach the `ServiceResult` → response path to carry `retryAfter`. Either:
- add an optional `retryAfter` to `fail(...)` / `ServiceResult` and have `sendResult` → `ResponseUtil.error` set the header when present; or
- in `ResponseUtil.error`, default a `Retry-After` whenever `code === RATE_LIMITED`.

After the fix, A-OTP-08 must see a numeric `Retry-After` on the 429.

### Resolution (2026-05-24)

Threaded `retryAfter` through the `ServiceResult` path (the first option): `fail(...)` and
`ServiceResult` carry an optional `retryAfter`; `sendResult` forwards it; `ResponseUtil.error`
sets the `Retry-After` header when present. The OTP service now returns
`fail(RATE_LIMITED, 'otp_too_many', { field: 'code', retryAfter })`, where `retryAfter` is the
seconds until the current OTP expires (≥1) — i.e. when a fresh code can be requested.

**Files:** `lib/service-result.ts` (optional `retryAfter`), `lib/response.ts` (`ResponseUtil.error` sets header), `lib/http/respond.ts` (forwards it), `features/auth/auth.service.ts` (OTP lockout supplies it).

**Verified live:** 6th OTP attempt → **429 `1008`** with **`Retry-After: 600`**.

---

## Note on environment

The user's Mongo (brew `mongodb-community`, standalone, :27017) was left **untouched** throughout. The backend dev server started for the run was stopped afterward. No app code or environment was modified by QA — BUG-01's fix was applied by the backend engineer, not by this QA pass.
