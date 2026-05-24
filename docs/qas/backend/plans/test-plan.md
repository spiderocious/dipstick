# Dipstick Backend — QA Test Plan (all modules)

> **QA:** Claude
> **Date:** 2026-05-24
> **Scope:** Every `/api/v1` endpoint of `apps/main-backend` — auth, RBAC/roles, branches (tanks/pumps), staff (roster/leaderboard), shifts (dips/reconcile/post/void/post-balanced), deliveries (4-stage), pricing (preview/pin/history), expenses, rollup/trends, notes, audit, notifications, health. Simple (happy-path) cases AND extreme cases (boundaries, bad types, state machines, concurrency-sensitive invariants, cross-tenant, RBAC).
> **Status:** READY — written from source review; not yet executed (no server run).
> **Base URL:** `http://localhost:8081/api/v1`
> **Auth header:** `Authorization: Bearer <access_token>`
> **Refs:** `docs/api-docs.md` · `docs/qas/qa-handoff.md` · source `apps/main-backend/src/features/*` (ground truth)
> **Legend:** `[HP]` happy path · `[EG]` edge/boundary · `[SEC]` auth/security · `[RBAC]` role enforcement · `[SM]` state machine · `[VAR]` arithmetic/variance · `[PAG]` pagination · `[ENV]` error-contract/envelope · `[BUG]` suspected defect · `[DIV]` doc/code divergence to confirm

This is the test surface. A QA engineer should be able to exercise the whole API from here. **Assert on the numeric `errorCode`, never the `errorMessage`.** The error body is flat: `{ errorCode, errorMessage, type, field? }` — there is **no** nested `error` object.

---

## 0. Pre-test setup

### 0.1 Environment

```bash
# A MongoDB must be reachable at MONGO_URL (default mongodb://127.0.0.1:27017).
# Standalone Mongo is fine: the backend degrades to non-transactional writes and logs a warning.
# Multi-doc atomicity (register, delivery sign) is only guaranteed on a replica set.
pnpm install
pnpm nx serve main-backend        # http://localhost:8081
curl -s http://localhost:8081/api/v1/health   # must return 200 { data: { status: "ok", ... } }
```

If `/health` does not return 200, **stop** — do not mark anything PASS. There is **no seed script**; all data is bootstrapped through the API (§2). Dev OTP is always **`000000`** (env `NODE_ENV != production`), surfaced in register/resend responses as `dev_otp`.

| Env var | Default | Affects |
|---------|---------|---------|
| `OTP_TTL_SECONDS` | 600 (10 min) | OTP expiry (`A-OTP-*`) |
| `OTP_MAX_ATTEMPTS` | 5 | OTP rate-limit threshold (`A-OTP-08`) |
| `JWT_ACCESS_EXPIRES_IN` | 15m | access-token expiry (`X-SEC-04`) |
| `JWT_REFRESH_EXPIRES_IN` | 30d | refresh/session expiry |
| `NODE_ENV` | development | `dev_otp` presence; `1009` never leaks internals |

### 0.2 Test personas (bootstrapped via API, §2)

| Handle | Role (membership) | Branch scope | Purpose |
|--------|-------------------|--------------|---------|
| **owner** | Owner (system) | `*` (org-wide) | full permissions; the only org-wide membership |
| **manager** | Manager (system) | Branch A | day-to-day; **no** `role.manage`, `org.manage`, `branch.create`, `branch.archive`, `rollup.view`, `report.export`, `price.history.view`?→has it, `close.any` (yes) |
| **attendant** | Attendant (system) | Branch A | only `branch.view`, `shift.close.own`, `expense.record`, `note.add` |
| **attendant2** | Attendant (system) | Branch A | second attendant — to test own-pump close enforcement |
| **owner2** | Owner (system) | `*` of **Org-2** | a separate org/tenant — to test cross-tenant isolation |

> Manager's exact permission set (from `packages/core/src/auth/system-roles.ts`): `branch.view, branch.edit, tank.manage, pump.manage, staff.view, staff.manage, roster.manage, role.assign, dip.record, shift.open, shift.close.any, shift.post, shift.void, posted.edit, reconciliation.view, delivery.record, delivery.sign, price.set, price.history.view, expense.record, expense.view, note.add, audit.view`. **23 keys.** Note it has `role.assign` but **not** `role.manage`; has `shift.close.any` but **not** `shift.close.own`; has **no** `org.manage`, `branch.create`, `branch.archive`, `rollup.view`, `report.export`.
> Attendant's exact set: `branch.view, shift.close.own, expense.record, note.add`. **4 keys.**

### 0.3 Script structure (Node 18+ `fetch`, no test framework)

```
docs/qas/backend/scripts/
  api.mjs            # fetch wrapper → { status, data, headers }; get/post/patch/put/del; BASE
  runner.mjs         # pass/fail/block/skip counters + section() + summary(); exit code
  bootstrap.mjs      # §2 walk-through: register owner → verify → branch/tanks/pumps → price → staff → captures all ids/tokens to .state.json
  auth.test.mjs      # §3
  rbac.test.mjs      # §4
  branches.test.mjs  # §5
  staff.test.mjs     # §6
  shifts.test.mjs    # §7
  deliveries.test.mjs# §8
  pricing.test.mjs   # §9
  expenses.test.mjs  # §10
  rollup.test.mjs    # §11
  notes-audit.test.mjs # §12
  notifications.test.mjs # §13
  crosscutting.test.mjs # §14 (error contract, money-integer, pagination, one-field-at-a-time)
```

**Rules (non-negotiable):** fresh tokens at bootstrap (never hardcode); unique values via `Date.now()` (emails/phones/subdomains) to keep re-runs idempotent; guard 204 — never `.json()` an empty body; propagate ids, `block()` dependents when a precursor fails; quote the actual `{status, body}` in every failure.

---

## 1. The error contract — assert on every endpoint `[ENV]`

Flat shape always: `{ errorCode, errorMessage, type, field? }`. `field` present **only** on `1001`. `type` is the coarse category. **There is no nested `error` envelope and no `success` boolean.**

| errorCode | type | HTTP | Trigger |
|-----------|------|------|---------|
| 1001 | `validation_error` | 400 | bad/missing field — carries `field` (the single earliest-in-body offender) |
| 1002 | `auth_error` | 401 | no/expired/invalid token, bad credentials |
| 1003 | `forbidden_error` | 403 | authenticated but lacks permission / not a branch member / cross-tenant |
| 1004 | `not_found_error` | 404 | resource absent / unmatched route |
| 1005 | `conflict_error` | 409 | duplicate (email, phone, role name, tank product) |
| 1006 | `state_error` | 409 | bad state transition (incl. **`branch_archived`** — verified 409, not 422) |
| 1007 | `business_error` | 422 | business rule (closing<opening, branch rule, last-owner, dips required, price_not_found) |
| 1008 | `rate_limit_error` | 429 | OTP attempts exhausted; `Retry-After` header set |
| 1009 | `internal_error` | 500 | unexpected; internals never leaked |

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| ENV-01 | [ENV] | Any 1001 body shape | exactly `errorCode:1001`, `type:"validation_error"`, `field:<string>`; **no** nested `error`, no `success` |
| ENV-02 | [ENV] | Any 1003 body shape | `errorCode:1003`, `type:"forbidden_error"`, **no** `field` |
| ENV-03 | [ENV] | Unmatched route `GET /api/v1/nope` | 404, `errorCode:1004`, `type:"not_found_error"`, `errorMessage:"Route not found"` |
| ENV-04 | [ENV] | 1008 (OTP exhausted) carries header | response has `Retry-After` header |
| ENV-05 | [ENV] | 1009 never leaks internals | (if triggerable) message is generic "An unexpected error occurred"; no stack/SQL/driver text |
| ENV-06 | [ENV] | `type` matches code on each class | spot-check 1005→`conflict_error`, 1006→`state_error`, 1007→`business_error` |

### 1a. One field at a time — MUST VALIDATE `[EG]`
Body with **two** bad fields returns only the **first by body order**; fix it, the next offender surfaces.

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| ENV-OF-01 | [EG] | `POST /auth/register` bad `email` + short `password` (email first in body) | 1001, `field:"email"` only |
| ENV-OF-02 | [EG] | fix email, resubmit same short password | 1001, `field:"password"` |
| ENV-OF-03 | [EG] | `POST /auth/login` bad `email` + short `password` | 1001, `field:"email"` |
| ENV-OF-04 | [EG] | `POST /branches` bad `name` + bad `city` | 1001, `field:"name"` |
| ENV-OF-05 | [EG] | `PATCH /shifts/:id` close with negative `closing_meter` + non-int `cash_declared_kobo` | 1001, `field:"closing_meter"` |
| ENV-OF-06 | [EG] | missing-required keys sort after present-but-invalid keys | present invalid field reported before an absent required one |

---

## 2. Bootstrap walk-through (happy path — run first) `[HP]`

State each step produces feeds later sections. Capture ids/tokens to `.state.json`.

| ID | Call | Expected |
|----|------|----------|
| BS-01 | `POST /auth/register` (owner) | 201, `data.user`, `data.org`, `phone_verification_required:true`, `dev_otp:"000000"`, `user.phone_verified:false`, `org.wordmark:null`, `org.owner_id===user.id` |
| BS-02 | `POST /auth/login` before verify | 403, `1003` `phone_unverified`, `field:"phone"` |
| BS-03 | `POST /auth/verify-otp` `{phone, code:"000000"}` | 200, `data.user.phone_verified:true`, `data.tokens.access_token` + `refresh_token` |
| BS-04 | `GET /me` (owner) | owner membership `branch_id:"*"`, `role_name:"Owner"`, `permissions[]` has all 30 keys |
| BS-05 | `GET /permissions` | 200, `data.permissions` length **30**, each `{key, description}`; keys are dotted strings (e.g. `shift.void`) |
| BS-06 | `GET /roles` | 3 system roles named exactly **Owner / Manager / Attendant**, all `is_system:true` |
| BS-07 | `POST /branches` (Branch A, tanks PMS+AGO, pumps P1 PMS + P2 AGO) | 201, branch + `tanks[]` + `pumps[]`; pumps start `state:"idle"`, `fault_note:null` |
| BS-08 | `POST /branches/:id/prices` PMS effective now | 201, price; `previous_price_per_litre_kobo:null` (first price) |
| BS-09 | `POST /branches/:id/staff` (attendant, Attendant role) | 201, `data` membership + `data.user`; user pre-verified |
| BS-10 | `POST /branches/:id/dips` opening (PMS tank) | 201, `kind:"opening"` |
| BS-11 | `POST /branches/:id/shifts` open (P1, attendant, morning) | 201, `status:"open"`, price pinned to BS-08 |
| BS-12 | `PATCH /shifts/:id` close | 200, computed `litres`/`expected_gross_kobo`/`variance_kobo`/`variance_status` |
| BS-13 | `POST /branches/:id/dips` closing (PMS tank) | 201, `kind:"closing"`, `wet_stock_variance_litres` present |
| BS-14 | `POST /shifts/:id/post` | 200, `status:"posted"`, `is_posted:true` |
| BS-15 | `GET /rollup?date=<businessDate>` (owner) | branch totals, `lead` sentence, `todo[]` |

---

## 3. Auth & account (Module 1) `[HP][EG][SEC]`

Routes: `POST /auth/{register,verify-otp,resend-otp,login,refresh,logout}`, `GET /me`, `PATCH /org`. Register/verify/resend/login/refresh/logout are **public**; `/me` needs `requireAuth`; `/org` needs `requireAuth` + `org.manage`.

### 3.1 Register
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| A-RG-01 | [HP] | valid register | 201; user+org+seeded roles+`*` Owner membership created; `dev_otp:"000000"` |
| A-RG-02 | [EG] | `name` < 2 chars | 1001 `field:"name"` |
| A-RG-03 | [EG] | `business_name` < 2 | 1001 `field:"business_name"` |
| A-RG-04 | [EG] | malformed `email` | 1001 `field:"email"` ("Enter a valid email address") |
| A-RG-05 | [EG] | `phone` < 10 or > 20 chars | 1001 `field:"phone"` |
| A-RG-06 | [EG] | `password` < 8 | 1001 `field:"password"` |
| A-RG-07 | [EG] | empty body `{}` | 1001 (first required field by schema order) |
| A-RG-08 | [SEC] | duplicate email (case-insensitive — register `Bisi@x` then `bisi@x`) | 1005 `email_taken` `field:"email"` |
| A-RG-09 | [SEC] | duplicate phone | 1005 `phone_taken` `field:"phone"` |
| A-RG-10 | [SEC] | response excludes secrets | no `passwordHash`/`password`/`codeHash` anywhere in body |
| A-RG-11 | [DIV] | password complexity | only `min(8)` enforced — `"aaaaaaaa"` (8 lowercase) is accepted. Doc never claims complexity; confirm. |

### 3.2 Verify OTP / Resend
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| A-OTP-01 | [HP] | verify with `000000` | 200, tokens; `phone_verified:true` |
| A-OTP-02 | [EG] | `code` not length 6 | 1001 `field:"code"` ("The code is 6 digits") |
| A-OTP-03 | [EG] | wrong 6-digit code | 1001 `otp_invalid` `field:"code"`; increments attempts |
| A-OTP-04 | [EG] | verify for a phone with no OTP on record | **1004** `otp_expired` `field:"code"` (NOT 1006 — code path: `findLatestByPhone` null) |
| A-OTP-05 | [SM] | expired OTP (wait past TTL, or force `expiresAt` in past) | **1006** `otp_expired` `field:"code"` |
| A-OTP-06 | [EG] | verify already-verified phone (re-issue then verify) | depends — no OTP record after success → 1004; document actual |
| A-OTP-07 | [HP] | resend for unverified phone | 200 `{sent:true, dev_otp:"000000"}`; resets attempts to 0 |
| A-OTP-08 | [SM][EG] | 5 wrong attempts then a 6th | attempts 1–5 → 1001 `otp_invalid`; 6th (attempts≥5) → **1008** `otp_too_many`, `Retry-After` header |
| A-OTP-09 | [EG] | resend for unknown phone | 1004 `staff_not_found` `field:"phone"` |
| A-OTP-10 | [SM] | resend for already-verified phone | 1005 `phone_already_verified` (no field) |

### 3.3 Login
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| A-LG-01 | [HP] | valid creds, verified | 200, user + tokens |
| A-LG-02 | [SEC] | unknown email | 1002 `invalid_credentials` `field:"email"` |
| A-LG-03 | [SEC] | wrong password | 1002 `invalid_credentials` `field:"email"` — **identical** to A-LG-02 (no email/password distinction leaked) |
| A-LG-04 | [SM] | unverified phone, correct password | 1003 `phone_unverified` `field:"phone"` |
| A-LG-05 | [SM] | deactivated account (`is_active:false`) | 1003 `account_inactive` (no field); checked **before** password, so a wrong password on an inactive account still → `account_inactive` |
| A-LG-06 | [EG] | malformed email / short password | 1001 `field:"email"` then `password` |

### 3.4 Refresh / Logout / Me / Org
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| A-RF-01 | [HP] | refresh valid token | 200 new `{access_token, refresh_token}` |
| A-RF-02 | [SEC][SM] | reuse the **old** refresh token after a successful refresh | **1002** `token_expired` (rotation revoked the old session) |
| A-RF-03 | [SEC] | malformed refresh token | 1002 `token_invalid` |
| A-RF-04 | [EG] | `refresh_token` < 10 chars | 1001 `field:"refresh_token"` |
| A-LO-01 | [HP] | logout valid token → then refresh that token | logout 204; subsequent refresh of the revoked session → 1002 |
| A-LO-02 | [EG] | logout with invalid/garbage token | **204** (idempotent — never fails) |
| A-ME-01 | [HP] | `GET /me` with valid access token | 200, user + memberships w/ `role_name` + `permissions[]` |
| A-ME-02 | [SEC] | `GET /me` no token | 1002 (`token_invalid`) |
| A-ME-03 | [SEC] | `GET /me` header without `Bearer ` prefix (`Authorization: <token>`) | 1002 |
| A-ME-04 | [SEC] | `GET /me` `Bearer garbage.jwt` | 1002 (`token_expired`) |
| A-ME-05 | [SEC] | response excludes `passwordHash` | absent |
| A-ORG-01 | [HP] | owner `PATCH /org {name, wordmark}` | 200, serialized org |
| A-ORG-02 | [EG] | `name` < 2 | 1001 `field:"name"` |
| A-ORG-03 | [EG] | `wordmark` > 120 chars | 1001 `field:"wordmark"` |
| A-ORG-04 | [EG] | `wordmark:null` | 200 (nullable allowed) |
| A-ORG-05 | [RBAC] | manager `PATCH /org` (lacks `org.manage`) | 1003 |

---

## 4. RBAC — per-branch dynamic roles (Module 1) `[RBAC][SEC]`

Roles editable; custom roles creatable; access per-branch via memberships. Permission keys are dotted strings (§0.2). `requirePermission(...anyOf)` = OR semantics.

### 4.1 Role CRUD
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| R-RL-01 | [HP] | owner `GET /roles` | 3 system roles |
| R-RL-02 | [RBAC] | owner `POST /roles {name:"Supervisor", permissions:["branch.view","shift.post","reconciliation.view"]}` | 201, role; `is_system:false` |
| R-RL-03 | [EG] | create role `name` < 2 | 1001 `field:"name"` |
| R-RL-04 | [EG] | create role `name` > 40 | 1001 `field:"name"` |
| R-RL-05 | [EG] | create role empty `permissions:[]` | 1001 `field:"permissions"` ("Select at least one permission") |
| R-RL-06 | [EG] | create role with unknown permission `["branch.view","not.a.perm"]` | 1001 `field:"permissions"` ("One or more permissions are not recognised") |
| R-RL-07 | [SEC] | duplicate role name | 1005 `role_name_taken` `field:"name"` |
| R-RL-08 | [HP] | `PATCH /roles/:id` rename + permissions | 200 |
| R-RL-09 | [EG] | PATCH unknown roleId | 1004 `role_not_found` |
| R-RL-10 | [EG] | PATCH rename to existing other role's name | 1005 `role_name_taken` `field:"name"` |
| R-RL-11 | [EG] | PATCH rename a role to **its own** current name | 200 (allowed — only a *different* role with the name conflicts) |
| R-RL-12 | [HP] | edit a **system** role's permissions (e.g. add a perm to Manager) | 200 (system roles are editable) |
| R-RL-13 | [SM] | `DELETE /roles/:id` a system role (Owner) | 1005 `role_system_undeletable` |
| R-RL-14 | [SM] | DELETE a custom role assigned to staff | 1005 `role_in_use` |
| R-RL-15 | [HP] | DELETE an unused custom role | 204 |
| R-RL-16 | [EG] | DELETE unknown roleId | 1004 `role_not_found` |

### 4.2 Last-owner guard — MUST VALIDATE `[BUG-prone]`
Ownership = holding **both** `role.manage` AND `staff.manage` (`OWNERSHIP_PERMISSIONS`).
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| R-LO-01 | [SM] | PATCH the **only** Owner role to drop `role.manage`+`staff.manage`, when owner is the sole owner-capable membership | **1007** `last_owner` |
| R-LO-02 | [SM] | same drop, but a second membership also holds ownership perms | 200 (someone else retains ownership) |
| R-LO-03 | [EG] | drop only `role.manage` (keep `staff.manage`) on sole owner | confirm: `dropsOwnership` requires losing the *full* pair — keeping one means `keepsOwnership` is false → also guarded → 1007. **Document exact behavior.** |

### 4.3 Permission matrix (seeded roles) — verify each cell `[RBAC]`
Run each action as manager and as attendant; owner is the positive control.
| ID | Action (endpoint) | owner | manager | attendant |
|----|-------------------|:-----:|:-------:|:---------:|
| R-MX-01 | `POST /branches` (`branch.create`) | 201 | **1003** | 1003 |
| R-MX-02 | `PATCH /branches/:id` (`branch.edit`) | 200 | 200 | 1003 |
| R-MX-03 | `POST /branches/:id/archive` (`branch.archive`) | 204 | **1003** | 1003 |
| R-MX-04 | `POST /roles` (`role.manage`) | 201 | **1003** | 1003 |
| R-MX-05 | `POST /branches/:id/staff` (`staff.manage`) | 201 | 201 | 1003 |
| R-MX-06 | `PUT /branches/:id/roster` (`roster.manage`) | 200 | 200 | 1003 |
| R-MX-07 | `POST /branches/:id/shifts` (`shift.open`) | 201 | 201 | **1003** |
| R-MX-08 | `POST /shifts/:id/post` (`shift.post`) | 200 | 200 | 1003 |
| R-MX-09 | `POST /shifts/:id/void` (`shift.void`) | 200 | 200 | 1003 |
| R-MX-10 | `POST /branches/:id/prices` (`price.set`) | 201 | 201 | 1003 |
| R-MX-11 | `POST /branches/:id/expenses` (`expense.record`) | 201 | 201 | **201** (attendant has it) |
| R-MX-12 | `GET /rollup` (`rollup.view`) | 200 | **1003** (Manager lacks `rollup.view`) | 1003 |
| R-MX-13 | `GET /branches/:id/audit` (`audit.view`) | 200 | 200 | 1003 |
| R-MX-14 | `GET /branches/:id` (`branch.view`) | 200 | 200 | 200 |
| R-MX-15 | `GET /branches/:id/staff` (`staff.view`) | 200 | 200 | **1003** (attendant lacks `staff.view`) |

### 4.4 Own-pump close & cross-tenant — MUST VALIDATE `[SEC]`
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| R-CL-01 | [RBAC] | attendant closes **their own** pump's shift (`shift.close.own` + `attendantId===userId`) | 200 |
| R-CL-02 | [RBAC] | attendant closes **another attendant's** shift | **1003** `forbidden` (enforced in service, not middleware) |
| R-CL-03 | [RBAC] | manager closes any shift (`shift.close.any`) | 200 |
| R-XT-01 | [SEC] | manager at Branch A calls Branch B endpoints (`/branches/B/...`) where they have no membership | **1003** `not_a_member` (NOT 404) |
| R-XT-02 | [SEC] | owner2 (Org-2) requests Org-1's branch id `GET /branches/:org1BranchId` | **1003** (loadScope finds no Org-2 membership for that branch) — confirm it is 403, **not** 404 [DIV: doc hedges "404 (or 403)"] |
| R-XT-03 | [SEC] | owner2 `GET /shifts/:org1ShiftId` (resolveScope, org-wide) | 1003 or 1004 — document which; must never return Org-1 data |
| R-XT-04 | [SEC] | attendant `GET /rollup` (no `*` membership) | 1003 `forbidden` |

### 4.5 Custom role assignment end-to-end
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| R-CR-01 | [RBAC] | create custom role `["expense.view"]`, add staff with it, login as them, hit `GET /branches/:id/expenses` (allowed) and `POST /branches/:id/shifts` (denied) | expenses 200; shift-open 1003 — gains **exactly** the granted perms |

---

## 5. Branches, tanks, pumps (Module 1) `[HP][EG][SM]`

Product enum everywhere: **`PMS | AGO | DPK`**. Branch create allows ≤ 3 tanks.

### 5.1 Branch create / read / update
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| B-BR-01 | [HP] | create with tanks+pumps | 201, branch + tanks + pumps; settings defaults applied |
| B-BR-02 | [HP] | create without tanks/pumps (both optional) | 201, empty `tanks[]`/`pumps[]` |
| B-BR-03 | [EG] | `name`/`city`/`state` < 2 | 1001 on the first offender |
| B-BR-04 | [EG] | 4 tanks (`tanks.length > 3`) | 1001 `field:"tanks"` ("A branch has at most three tanks") |
| B-BR-05 | [EG] | tank `product` not in enum | 1001 ("Product must be PMS, AGO or DPK") |
| B-BR-06 | [EG] | tank `capacity_litres` ≤ 0 | 1001 ("Capacity must be greater than zero") |
| B-BR-07 | [EG] | tank `reorder_threshold_litres` < 0 | 1001 |
| B-BR-08 | [SM] | two tanks same product in create | 1005 `tank_product_exists` `field:"tanks"` |
| B-BR-09 | [HP] | `GET /branches/:id` | 200, branch + tanks (each w/ `current_litres`) + pumps |
| B-BR-10 | [SEC] | `GET /branches/:id` cross-tenant (Org-2 caller) | 1003 (cross-tenant via loadScope) — confirm vs service `branch_not_found` 1004 [DIV] |
| B-BR-11 | [HP] | `PATCH /branches/:id` settings merge (set `require_closing_dip:false`) | 200; other settings untouched |
| B-BR-12 | [EG] | `variance_flag_kobo` negative | 1001 |
| B-BR-13 | [EG] | `delivery_tolerance_litres` negative | 1001 |
| B-BR-14 | [HP] | settings defaults on a fresh branch | `require_closing_dip:true`, `variance_flag_kobo:500000`, `manager_may_set_price:false`, `delivery_tolerance_litres:200` |

### 5.2 Archive
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| B-AR-01 | [HP] | owner archive | 204; branch `is_archived:true` |
| B-AR-02 | [SM] | add tank to archived branch | **1006** `branch_archived` (HTTP **409**) |
| B-AR-03 | [SM] | add pump to archived branch | 1006 `branch_archived` |
| B-AR-04 | [SM] | open shift / record delivery / set price / record expense on archived branch | each → 1006 `branch_archived` (409) |
| B-AR-05 | [HP] | archived branch still readable (`GET /branches/:id`, daybook) | 200 (history preserved) |

### 5.3 Tanks
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| B-TK-01 | [HP] | add tank (new product) | 201 |
| B-TK-02 | [SM] | add tank, product already present | 1005 `tank_product_exists` `field:"product"` |
| B-TK-03 | [HP] | PATCH tank capacity/threshold | 200 |
| B-TK-04 | [EG] | PATCH unknown tankId | 1004 `tank_not_found` |
| B-TK-05 | [EG] | PATCH tank `capacity_litres` ≤ 0 | 1001 |

### 5.4 Pumps — fault-note clearing rule `[SM]`
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| B-PU-01 | [HP] | add pump | 201, `state:"idle"`, `fault_note:null` |
| B-PU-02 | [HP] | PATCH `state:"offline", fault_note:"Nozzle stuck"` | 200, fault_note kept |
| B-PU-03 | [SM] | PATCH `state:"idle"` (was offline w/ note) | 200, **fault_note cleared to null** |
| B-PU-04 | [SM] | PATCH `state:"live"` (was offline w/ note) | 200, fault_note cleared |
| B-PU-05 | [EG] | PATCH `fault_note` only (no state change) | 200, fault_note updated as-is |
| B-PU-06 | [EG] | PATCH `state` not in enum (`"broken"`) | 1001 |
| B-PU-07 | [EG] | `fault_note` > 280 chars | 1001 |
| B-PU-08 | [EG] | PATCH unknown pumpId | 1004 `pump_not_found` |

---

## 6. Staff & roster (Module 1) `[HP][EG]`

### 6.1 Staff
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| S-ST-01 | [HP] | add new staff (new email) | 201, membership + `user` (pre-verified, `is_active:true`) |
| S-ST-02 | [HP] | add staff reusing an existing email (same person, same phone) | 201, reuses user |
| S-ST-03 | [EG] | `name` < 2 / bad `email` / `phone` < 10 / `role_id` empty | 1001 on first offender |
| S-ST-04 | [EG] | `password` < 8 (when provided) | 1001 `field:"password"` |
| S-ST-05 | [EG] | unknown `role_id` | 1004 `role_not_found` `field:"role_id"` |
| S-ST-06 | [SEC] | reuse email but with a phone already taken by a **different** user | 1005 `phone_taken` `field:"phone"` |
| S-ST-07 | [HP] | `PATCH /staff/:membershipId` `{role_id, default_pump_id, is_active}` | 200 |
| S-ST-08 | [SM] | deactivate staff (`is_active:false`) | 200; history stays attributed |
| S-ST-09 | [EG] | PATCH unknown membershipId | 1004 `membership_not_found` |
| S-ST-10 | [EG] | PATCH with unknown `role_id` | 1004 `role_not_found` `field:"role_id"` |
| S-ST-11 | [HP] | `GET /branches/:id/staff` | items w/ `user`, `role_name`, `shift_count_30d`, `variance_kobo_30d` |
| S-ST-12 | [RBAC] | PATCH staff as a user holding only `role.assign` (not `staff.manage`) | 200 (OR semantics) |

### 6.2 Roster & leaderboard
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| S-RO-01 | [HP] | `PUT /roster` each attendant exactly 7 windows | 200 |
| S-RO-02 | [EG] | an attendant array of 6 or 8 windows | 1001 ("Each attendant needs 7 days") |
| S-RO-03 | [EG] | window not in `morning|evening|off` | 1001 |
| S-RO-04 | [EG] | `week_start` < 10 chars | 1001 `field:"week_start"` |
| S-RO-05 | [HP] | `GET /roster?week_start=...` (none set) | 200, `assignments:{}` |
| S-RO-06 | [HP] | `GET /variance-leaderboard` | items sorted ascending by `variance_kobo` (worst shortage first), 30-day window |

---

## 7. Shifts, dips, reconciliation, post & VOID (Module 2) `[HP][EG][SM][VAR]`

> **Schema note `[DIV]`:** shift `window` enum is **`morning | evening`** (no `off`); roster windows include `off`. Also `OpenShiftBody` has an **undocumented optional `product`** field (api-docs omits it). Confirm both.

### 7.1 Dips
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| SH-DP-01 | [HP] | opening dip | 201, `kind:"opening"` |
| SH-DP-02 | [HP] | closing dip | 201, `kind:"closing"`, `wet_stock_variance_litres` = opening + delivered − sold vs measured |
| SH-DP-03 | [EG] | `kind` not opening/closing | 1001 |
| SH-DP-04 | [EG] | `litres` negative | 1001 |
| SH-DP-05 | [EG] | `business_date` < 10 chars | 1001 |
| SH-DP-06 | [EG] | unknown `tank_id` | 1004 `tank_not_found` `field:"tank_id"` |

### 7.2 Open shift — price pinning
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| SH-OP-01 | [HP] | open with no price (price already set) | 201, `status:"open"`, price pinned to effective; pump → `live` |
| SH-OP-02 | [EG] | explicit `price_per_litre_kobo` **without** `price_override_reason` | 1001 `price_reason_required` `field:"price_override_reason"` |
| SH-OP-03 | [HP] | explicit price **with** reason (≥3 chars) | 201, price uses the override |
| SH-OP-04 | [EG] | `price_override_reason` < 3 chars | 1001 `field:"price_override_reason"` |
| SH-OP-05 | [SM] | open when **no price set** for the product | **1007** `price_not_found` `field:"pump_id"` |
| SH-OP-06 | [EG] | `window` not morning/evening | 1001 |
| SH-OP-07 | [EG] | `opening_meter` negative | 1001 |
| SH-OP-08 | [EG] | `price_per_litre_kobo` a float (e.g. 89000.5) with reason | 1001 (`.int()`) |
| SH-OP-09 | [EG] | unknown `pump_id` | 1004 `pump_not_found` `field:"pump_id"` |
| SH-OP-10 | [VAR] | price-pinning sequence: open shift1, set new price effective NOW, open shift2 | shift1 keeps old `price_per_litre_kobo`; shift2 uses new |

### 7.3 Close — reconciliation maths `[VAR]`
`litres = closing − opening` · `expected_gross_kobo = Math.round(litres × price)` · `variance_kobo = expected − cash` · `>0 short`, `<0 over`, `0 balanced`.
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| SH-CL-01 | [VAR] | open 12450.0, close 13010.5, price 89000, cash 49,800,000 | litres 560.5, expected 49,884,500, variance **84,500**, `variance_status:"short"` |
| SH-CL-02 | [VAR] | cash exactly equals expected | variance 0, `balanced` |
| SH-CL-03 | [VAR] | cash > expected | variance negative, `over` |
| SH-CL-04 | [VAR] | rounding: pick litres×price with a .5 product | matches `Math.round` (half-up) exactly |
| SH-CL-05 | [EG] | `closing_meter` < `opening_meter` | **1007** `closing_below_opening` `field:"closing_meter"` |
| SH-CL-06 | [EG] | `cash_declared_kobo` a float | 1001 ("Cash must be in whole kobo") |
| SH-CL-07 | [EG] | `cash_declared_kobo` negative | 1001 |
| SH-CL-08 | [SM] | close a shift not `open` (close twice) | **1006** `shift_not_open` |
| SH-CL-09 | [HP] | close sets pump → `idle` | GET branch: pump `state:"idle"` |

### 7.4 Post / post-balanced
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| SH-PO-01 | [HP] | post a closed shift (branch requires closing dip; dip recorded) | 200 `status:"posted"` |
| SH-PO-02 | [SM] | post a shift that isn't closed (still open) | 1006 `shift_not_closed` |
| SH-PO-03 | [SM] | post an already-posted shift | 1006 `shift_already_posted` |
| SH-PO-04 | [SM] | post when branch `require_closing_dip:true` and **no** closing dip | **1007** `branch_rule_unmet` |
| SH-PO-05 | [HP] | post when branch `require_closing_dip:false`, no dip | 200 (rule not enforced) |
| SH-PO-06 | [HP] | `POST /shifts/post-balanced` with 2 balanced + 1 short closed shift | `{posted:2}`; the short one stays `closed` |
| SH-PO-07 | [EG] | post-balanced `business_date` < 10 | 1001 |

### 7.5 VOID idiom — MUST VALIDATE `[SM][SEC]`
`confirm` must equal the literal `"VOID"` (case-sensitive). Posted shift only. Never hard-deletes.
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| SH-VD-01 | [HP] | void posted shift, `confirm:"VOID"`, reason ≥3 | 200, `status:"voided"`, `is_voided:true`, `voided_by`/`voided_at`/`void_reason` set |
| SH-VD-02 | [EG] | `confirm:"void"` (lowercase) | **1001** `void_word_mismatch` `field:"confirm"` |
| SH-VD-03 | [EG] | `confirm:"VOIDED"` | 1001 `void_word_mismatch` |
| SH-VD-04 | [EG] | `reason` < 3 chars | 1001 `field:"reason"` |
| SH-VD-05 | [SM] | void an unposted (closed) shift | 1006 `shift_not_posted` |
| SH-VD-06 | [SM] | void an already-voided shift | 1006 `shift_already_voided` |
| SH-VD-07 | [SM] | voided shift still visible | appears in `GET /shifts/:id` and daybook with `status:"voided"` (NOT deleted) |
| SH-VD-08 | [HP] | audit row written | `GET /branches/:id/audit` has `shift.voided` with actor + reason |

### 7.6 Get shift
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| SH-GT-01 | [HP] | `GET /shifts/:id` member of branch | 200, full meter+cash+variance trail |
| SH-GT-02 | [SEC] | `GET /shifts/:id` cross-tenant | 1004 `shift_not_found` (or 1003) — document |
| SH-DB-01 | [HP] | `GET /branches/:id/daybook?date=` | shifts + dips + tank readouts for the day |

---

## 8. Deliveries — 4-stage offload (Module 3) `[HP][EG][SM][VAR]`

Stages `arrived → dip_before → offloaded → signed`. `variance_litres = round2((dip_before + waybill_litres) − dip_after)`.
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| D-DL-01 | [HP] | create delivery | 201, `stage:"arrived"`, `variance_litres:null` (dips null) |
| D-DL-02 | [EG] | `waybill_litres` ≤ 0 | 1001 |
| D-DL-03 | [EG] | `cost_per_litre_kobo` float | 1001 ("Cost must be in whole kobo") |
| D-DL-04 | [EG] | missing `waybill_number`/`supplier`/`driver_name`/`truck_plate` | 1001 on first offender |
| D-DL-05 | [HP] | `witness` omitted (optional) | 201 |
| D-DL-06 | [EG] | `product` not in enum | 1001 |
| D-DL-07 | [EG] | unknown `tank_id` | 1004 `tank_not_found` `field:"tank_id"` |
| D-DL-08 | [SM] | create on archived branch | 1006 `branch_archived` |
| D-DL-09 | [HP] | PATCH `dip_before_litres` then `dip_after_litres` | `variance_litres` recomputes = round2(dip_before + waybill − dip_after) |
| D-DL-10 | [VAR] | dip_before 4000, waybill 33000, dip_after 36800 | `variance_litres = 200` |
| D-DL-11 | [SM] | sign **without both dips** | **1007** `delivery_dips_required` |
| D-DL-12 | [HP] | sign with witness + both dips | 200, `stage:"signed"`; **tank `current_litres` set to `dip_after`** (verify via GET branch); audit `delivery.signed` |
| D-DL-13 | [SM] | PATCH a signed delivery | 1006 `delivery_already_signed` |
| D-DL-14 | [SM] | re-sign a signed delivery | 1006 `delivery_already_signed` |
| D-DL-15 | [EG] | sign with empty `witness` | 1001 `field:"witness"` |
| D-DL-16 | [SEC] | `GET /deliveries/:id` cross-tenant | 1004 `delivery_not_found` (or 1003) — document |
| D-DL-17 | [PAG] | `GET /branches/:id/deliveries` cursor paging | see §14 pagination |

---

## 9. Pricing (Module 4) `[HP][EG][VAR]`

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| P-PR-01 | [HP] | `GET /prices` | one row per product; products with no price → `price:null` |
| P-PR-02 | [HP] | `POST /prices/preview {product, price_per_litre_kobo}` | `delta_per_litre_kobo`, `litres_in_tank`, `revaluation_kobo = round(litres×delta)`, `current_price_kobo`; **no write** (GET history unchanged after) |
| P-PR-03 | [VAR] | preview: current 89000, proposed 91000, tank 12000 L | delta 2000, revaluation 24,000,000 |
| P-PR-04 | [VAR] | preview when no current price | `delta = proposed − 0`, `current_price_kobo:null` |
| P-PR-05 | [VAR] | preview when no tank for product | `litres_in_tank:0`, `revaluation_kobo:0` |
| P-PR-06 | [HP] | `POST /prices {product, price_per_litre_kobo, effective_at, reason}` | 201, `previous_price_per_litre_kobo` = prior current |
| P-PR-07 | [EG] | POST missing `reason` | 1001 `field:"reason"` ("A reason is required") |
| P-PR-08 | [EG] | `reason` < 3 chars | 1001 `field:"reason"` ("Give a reason for the change") |
| P-PR-09 | [EG] | `price_per_litre_kobo` float | 1001 ("Price must be in whole kobo") |
| P-PR-10 | [EG] | `price_per_litre_kobo` ≤ 0 | 1001 ("Price must be greater than zero") |
| P-PR-11 | [EG] | `effective_at` not ISO datetime | 1001 `field:"effective_at"` |
| P-PR-12 | [EG] | `product` not in enum | 1001 |
| P-PR-13 | [HP] | `GET /prices/:product/history` | newest first; each row `previous_price_per_litre_kobo` (from→to), `reason`, `set_by` |
| P-PR-14 | [SM] | set price on archived branch | 1006 `branch_archived` |
| P-PR-15 | [RBAC] | `price.history.view` required for history | manager (has it) 200; a role lacking it → 1003 |

---

## 10. Expenses (Module 5) `[HP][EG][PAG]`

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| E-EX-01 | [HP] | record with `witness` | 201, `is_single_source:false` |
| E-EX-02 | [HP] | record **without** `witness` | 201, `is_single_source:true` |
| E-EX-03 | [EG] | `amount_kobo` float | 1001 ("Amount must be in whole kobo") |
| E-EX-04 | [EG] | `amount_kobo` ≤ 0 | 1001 ("Amount must be greater than zero") |
| E-EX-05 | [EG] | missing `business_date`/`category`/`description` | 1001 on first offender |
| E-EX-06 | [EG] | `witness` provided but empty string | 1001 `field:"witness"` |
| E-EX-07 | [HP] | `GET /expenses?category=generator_diesel` filter | only matching category returned |
| E-EX-08 | [HP] | `GET /expenses/:id` | 200, single expense |
| E-EX-09 | [SEC] | `GET /expenses/:id` cross-tenant | 1004 `expense_not_found` |
| E-EX-10 | [PAG] | list cursor paging | see §14 |

---

## 11. Roll-up & trends (Module 7) `[HP][EG][RBAC]`

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| RU-01 | [HP] | `GET /rollup` (no date) | defaults to **yesterday**; aggregates visible branches |
| RU-02 | [HP] | `GET /rollup?date=<businessDate>` after a posted short shift | branch `status:"short"`, `short_count≥1`, `todo[]` shortage entry, `lead` sentence with litres/gross/variance/item count |
| RU-03 | [HP] | branch with a tank ≤ reorder threshold | `status:"reorder"`, `tanks_below_reorder[]` non-empty, todo `reorder` entry |
| RU-04 | [HP] | clean branch (no shortage, tanks above threshold) | `status:"clean"` |
| RU-05 | [VAR] | `totals` = sum across branches | litres/gross_kobo/variance_kobo add up |
| RU-06 | [RBAC] | attendant (no `*` membership) `GET /rollup` | **1003** `forbidden` |
| RU-07 | [RBAC] | manager (no `rollup.view`) `GET /rollup` | **1003** |
| RU-08 | [HP] | `GET /rollup/trends?days=7` | `from`/`to` 7-day inclusive; litres-per-day series per branch |
| RU-09 | [EG] | `days=200` | clamped to 90 |
| RU-10 | [EG] | `days` non-numeric / missing | defaults to 7 |

---

## 12. Notes & audit (Module 9) `[HP][EG][PAG]`

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| N-NT-01 | [HP] | `POST /shift/:id/notes {body, mentions}` | 201, note w/ `mentions[]` stored |
| N-NT-02 | [EG] | `entityType` ∉ {shift,expense,delivery} (e.g. `/branch/:id/notes`) | 1001 `field:"entityType"` (`note_target_invalid`) |
| N-NT-03 | [EG] | empty `body` | 1001 `field:"body"` ("Write a note") |
| N-NT-04 | [HP] | `GET /expense/:id/notes` paginated | items + meta; entityType validated |
| N-NT-05 | [EG] | GET notes with bad `entityType` | 1001 `field:"entityType"` |
| N-AU-01 | [HP] | `GET /branches/:id/audit` after §2 walk-through | timeline newest-first incl. `org.created`, `branch.created`, `price.set`, `staff.added`/`staff` action, `shift.opened/closed/posted`, `dip.*`, `delivery.signed` |
| N-AU-02 | [HP] | audit filter `?entity_type=shift&entity_id=:shiftId` | only that shift's rows |
| N-AU-03 | [HP] | each audit row | `actor_id`, `action`, `before`/`after`, `at` present |
| N-AU-04 | [PAG] | audit cursor paging | see §14 |
| N-AU-05 | [RBAC] | attendant `GET /audit` (no `audit.view`) | 1003 |

---

## 13. Notifications (Module 10) `[HP][EG][SEC]`

(No producer wired yet — feed may be empty; that is **not** a bug per handoff §13.)
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| NF-01 | [HP] | `GET /notifications` | 200, own feed newest-first, `unread_count` integer, meta paging |
| NF-02 | [SEC] | `POST /notifications/:id/read` for another user's notification | **1004** `entity_not_found` (existence not leaked — NOT 1003) |
| NF-03 | [HP] | mark own notification read (if any exist) | 200, `read:true` |
| NF-04 | [SEC] | `GET /notifications` no token | 1002 |

---

## 14. Cross-cutting `[ENV][PAG][SEC]`

### 14.1 Auth guard sweep — every protected endpoint without a token
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| X-AUTH-01 | [SEC] | call each protected route with **no** `Authorization` | 1002 (401) — sweep the full route list |
| X-AUTH-02 | [SEC] | call with `Bearer <malformed>` | 1002 |
| X-AUTH-03 | [SEC] | call with `Authorization` missing `Bearer ` prefix | 1002 |
| X-SEC-04 | [SEC] | call with an **expired** access token (set `JWT_ACCESS_EXPIRES_IN=1s`, wait) | 1002 `token_expired` |

### 14.2 Money is integer kobo everywhere
A decimal sent to **any** `_kobo` field → 1001; no float ever appears in a response.
| ID | Type | Field/endpoint | Expected |
|----|------|----------------|----------|
| X-MON-01 | [EG] | `price_per_litre_kobo` (prices, shift open) float | 1001 |
| X-MON-02 | [EG] | `cash_declared_kobo` (shift close) float | 1001 |
| X-MON-03 | [EG] | `cost_per_litre_kobo` (delivery) float | 1001 |
| X-MON-04 | [EG] | `amount_kobo` (expense) float | 1001 |
| X-MON-05 | [EG] | `variance_flag_kobo` (branch settings) — note: only `.nonnegative()`, **not `.int()`** | confirm whether a float is accepted here [DIV/BUG candidate] |
| X-MON-06 | [ENV] | scan all success responses | every `_kobo` value is an integer (no `.5`) |

### 14.3 Pagination (cursor only, never offset)
Lists: deliveries, expenses, notes, notifications, audit.
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| X-PAG-01 | [PAG] | first page (no `cursor`) | `meta:{nextCursor, hasMore}`; `nextCursor` string|null |
| X-PAG-02 | [PAG] | seed > 20 rows, default limit | exactly 20 items, `hasMore:true`, `nextCursor` non-null |
| X-PAG-03 | [PAG] | follow `?cursor=<nextCursor>` | next page; **no duplicate or skipped row** across boundary |
| X-PAG-04 | [EG] | `?limit=1000` | clamped to 100 (`MAX_LIMIT`) |
| X-PAG-05 | [EG] | `?limit=0` or `?limit=-5` or `?limit=abc` | falls back to default 20 |
| X-PAG-06 | [EG] | `?page=2` (offset attempt) | ignored — no offset support, page 1 returned |
| X-PAG-07 | [EG] | garbage `?cursor=!!!` (un-decodable) | treated as no cursor (decodeCursor returns null) — first page, no 500 |

### 14.4 Headers / hygiene
| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| X-HYG-01 | [ENV] | helmet headers present | `X-Content-Type-Options`, etc. on responses |
| X-HYG-02 | [ENV] | every id in responses is a prefixed ULID | `usr_`,`org_`,`brn_`,`tnk_`,`pmp_`,`shf_`,`dip_`,`dlv_`,`prc_`,`exp_`,`not_`,`ntf_`,`aud_`,`mbr_`,`rol_` |
| X-HYG-03 | [ENV] | timestamps are ISO 8601 | `created_at`/`*_at` parse as ISO |

---

## 15. Suspected defects / divergences to confirm at runtime `[BUG][DIV]`

Filed from source review **before** execution; confirm or clear each during the run.

| ID | Type | Source | Finding |
|----|------|--------|---------|
| DIV-01 | [DIV] | `api-docs.md §3` vs `auth.service.ts:187` | verify-otp "no OTP on record" returns **1004** (key `otp_expired`), while **expired** OTP returns **1006** (key `otp_expired`) — same message key, two different codes. Doc lists `1006 expired · 1004 no OTP` but doesn't note they share the key. Confirm exact code per branch. |
| DIV-02 | [DIV] | `api-docs.md §4` vs `auth.service.ts:128` + `system-roles.ts` | Doc says seeded roles "Owner/Manager/Attendant" — code agrees. (One earlier read mislabeled "Staff"; cleared — **not** a bug.) Confirm `GET /roles` returns exactly these three names. |
| DIV-03 | [DIV] | `api-docs.md §3 login` vs `authorize.middleware.ts:27` | Cross-tenant/cross-branch returns **1003** (`not_a_member`), not 1004. Doc hedges "1004 (or 403)". Pin down per endpoint (branch GET via service may 1004; param-scoped routes via middleware 1003). |
| DIV-04 | [DIV] | `api-docs.md §7 shift open` vs `shifts.schema.ts` | `window` enum is `morning|evening` only (no `off`); `OpenShiftBody` has an **undocumented optional `product`** field. Doc omits `product` and doesn't constrain `window`. |
| DIV-05 | [DIV] | `api-docs.md §6 prices` vs `pricing.schema.ts` | `effective_at` is **required** (`.datetime()`); doc example always includes it but §9 narrative implies "effective now" default. Confirm there's no server-side default — omitting `effective_at` → 1001. |
| DIV-06 | [BUG?] | `branches.schema.ts` settings | `variance_flag_kobo` validated `.nonnegative()` only — **no `.int()`**. A decimal kobo may be accepted into branch settings, contradicting handoff §11 "all `_kobo` integer". Same to check for `delivery_tolerance_litres` (litres, not kobo — likely fine). |
| DIV-07 | [DIV] | `api-docs.md §3 verify-otp` field | resend/verify "unknown phone" sets `field:"phone"` / `field:"code"` and key `staff_not_found` (a user-facing "staff" wording on the owner self-signup path) — confirm message copy is acceptable for an owner registering. |
| DIV-08 | [DIV] | `qa-handoff.md §3 RBAC` vs `system-roles.ts` | Handoff matrix: "Set price — Manager: branch-permitting". Manager role **statically** holds `price.set`; the `manager_may_set_price` branch setting is **not** consulted in `requirePermission`. Confirm whether the branch setting actually gates price-setting or is currently unenforced. |

> Severity assigned at execution: a static finding is only a P-level bug once a live call confirms wrong client-visible behavior. DIV-06 and DIV-08 are the highest-value probes.

---

## 16. Test execution order

State builds across files — run in this order:

1. `bootstrap.mjs` — §2 (produces tokens + ids in `.state.json`)
2. `auth.test.mjs` — §3 (re-registers throwaway owners for negative cases)
3. `branches.test.mjs` — §5
4. `staff.test.mjs` — §6 (needs Branch A + roles)
5. `rbac.test.mjs` — §4 (needs manager/attendant/attendant2/owner2 personas)
6. `pricing.test.mjs` — §9 (before shifts — shift-open needs a price)
7. `shifts.test.mjs` — §7 (needs price + dips)
8. `deliveries.test.mjs` — §8
9. `expenses.test.mjs` — §10
10. `rollup.test.mjs` — §11 (needs posted shifts)
11. `notes-audit.test.mjs` — §12 (audit assertions depend on prior state changes)
12. `notifications.test.mjs` — §13
13. `crosscutting.test.mjs` — §14 (error contract, money, pagination, auth sweep)

---

## 17. Out of scope (deferred — do not file as bugs)

- PDF export endpoint (`report.export` permission exists; endpoint deferred).
- SMS/WhatsApp/email OTP + notification delivery (v1 in-app only; dev OTP `000000`).
- Notification **producers** — `notify()` primitive exists but no feature calls it; feed may be empty.
- Posted-entry editing endpoint (`posted.edit` reserved; flow deferred).
- The shipped automated suite (contract/integration) — this is manual/script QA.
- Load/concurrency tests (e.g. two simultaneous shift posts) — note as a **risk** but not executed here unless requested.

---

## 18. Total test count

| Section | HP | EG/SM/VAR/SEC | RBAC | ENV/PAG | Total |
|---------|----|----|----|----|----|
| §1 Error contract + one-field | — | 6 | — | 6 | 12 |
| §2 Bootstrap | 15 | — | — | — | 15 |
| §3 Auth | 9 | 27 | — | — | 36 |
| §4 RBAC | 6 | 6 | 22 | — | 34 |
| §5 Branches/tanks/pumps | 11 | 24 | — | — | 35 |
| §6 Staff/roster | 9 | 9 | 1 | — | 19 |
| §7 Shifts/dips/void | 12 | 33 | — | — | 45 |
| §8 Deliveries | 5 | 11 | — | 1 | 17 |
| §9 Pricing | 5 | 9 | 1 | — | 15 |
| §10 Expenses | 4 | 5 | — | 1 | 10 |
| §11 Rollup | 6 | 2 | 2 | — | 10 |
| §12 Notes/audit | 5 | 4 | 1 | 1 | 11 |
| §13 Notifications | 2 | — | 2 | — | 4 |
| §14 Cross-cutting | — | 9 | 4 | 10 | 23 |
| §15 Divergence probes | — | — | — | — | 8 |
| **Total** | **89** | **145** | **33** | **30** | **~297** |

(Counts approximate — matrix cells in §4.3 count once per cell.)
