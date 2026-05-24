# Dipstick Backend — QA Test Execution Report

> **QA:** Claude
> **Date:** 2026-05-24
> **Build:** `apps/main-backend` @ main · typecheck/lint/build green · includes the BUG-01 fix (`db/transaction.ts` + `db/client.ts`)
> **Environment:** server `localhost:8081` (`pnpm nx serve main-backend`, `NODE_ENV=development`) · MongoDB **standalone** `mongodb://127.0.0.1:27017`, db `dipstick`
> **Plan:** `docs/qas/backend/plans/test-plan.md` · **Scripts:** `docs/qas/backend/scripts/` · **Bugs:** `docs/qas/backend/reports/bugs.md`
> **Run status:** ✅ Full suite executed end-to-end.

---

## Summary

| Suite | Tests | Pass | Fail | Skip | Notes |
|-------|-------|------|------|------|-------|
| Pre-flight | 3 | 3 | 0 | 0 | health 200, Mongo reachable, clean boot |
| §2 Bootstrap (+personas) | 19 | 19 | 0 | 0 | register→verify→branch→price→staff→shift open/close/post→rollup, all green (BUG-01 fixed) |
| §3 Auth | 39 | 38 | 1 | 0 | FAIL = BUG-04 (Retry-After) |
| §4 RBAC | 38 | 38 | 0 | 0 | role CRUD, last-owner guard, matrix, cross-tenant |
| §5 Branches/tanks/pumps | 34 | 33 | 1 | 0 | FAIL = BUG-03 (variance_flag_kobo float) |
| §6 Staff/roster | 17 | 16 | 1 | 0 | FAIL = BUG-02 (manager PATCH staff) |
| §7 Shifts/dips/void | 40 | 40 | 0 | 0 | reconciliation maths, post, post-balanced, VOID idiom |
| §8 Deliveries | 18 | 18 | 0 | 0 | 4-stage, dips-required, tank-balance side effect |
| §9 Pricing | 13 | 13 | 0 | 0 | preview maths, pinning, history, effective_at required |
| §10 Expenses | 10 | 10 | 0 | 0 | single-source flag, integer kobo, cursor list |
| §11 Rollup | 9 | 9 | 0 | 0 | yesterday default, status enum, totals, trends clamp |
| §12 Notes/audit | 10 | 10 | 0 | 0 | entityType guard, audit timeline+filter |
| §13 Notifications | 4 | 3 | 0 | 1 | SKIP = empty feed (no producers, expected) |
| §14 Cross-cutting | 20 | 20 | 0 | 0 | error contract, one-field, auth sweep (12/12), money, pagination, hygiene |
| **Total** | **274** | **270** | **3** | **1** | |

**270 PASS / 3 FAIL / 0 BLOCKED / 1 SKIP.** (Pre-flight + bootstrap counted once; the feature-suite total is 267/3/1.)

The 3 failures are **all confirmed product bugs** (BUG-02/03/04), each reproduced independently and traced to source. The 1 skip (notifications feed) is expected — no producers are wired yet (handoff §13).

---

## Pre-flight Notes

| ID | Result | Notes |
|----|--------|-------|
| PF-01 | **PASS** | `GET /health` → 200 `{data:{status:"ok",env:"development"}}` |
| PF-02 | **PASS** | MongoDB reachable, standalone topology |
| PF-03 | **PASS** | Clean boot: `mongo connected`, `indexes ensured`, `listening :8081`; the BUG-01 degrade logged **once** as designed |

**BUG-01 (P0) re-verification:** the prior run was fully blocked because `POST /auth/register` 500'd on standalone Mongo. After the engineer's fix, bootstrap BS-01–BS-15 are green, including three multi-document `withTransaction` writes (register, branch-create+audit, shift-post+audit) and delivery-sign+tank-balance. The blocker is cleared.

---

## Results by section

Only non-PASS rows are called out; everything else passed. Full per-case output is in the run log.

### §3 Auth — 38/39
| ID | Result | Notes |
|----|--------|-------|
| A-OTP-08 | **FAIL** | **BUG-04 (P2):** 6th OTP attempt correctly returns `429 1008`, but **no `Retry-After` header** (docs/handoff §1 promise it). `ResponseUtil.error` never sets it; only the thrown-`AppError` path does, and OTP returns a `ServiceResult`. |

All other auth behavior verified: register validation + dup email/phone (case-insensitive), one-field-at-a-time, login never distinguishes unknown-email vs wrong-password (both `1002` field `email`), `account_inactive` before password, `phone_unverified` gating, refresh **rotation** (old token → `1002`), logout idempotency, `/me` token guards, org PATCH perms.

### §5 Branches — 33/34
| ID | Result | Notes |
|----|--------|-------|
| X-MON-05 | **FAIL** | **BUG-03 (P3):** `variance_flag_kobo: 123.45` accepted (200) and stored. Schema has `.nonnegative()` but not `.int()`, unlike every other `_kobo` field. |

Verified: tank `max(3)` + product enum + duplicate-product conflict, settings merge + defaults (`require_closing_dip:true`, `variance_flag_kobo:500000`, `manager_may_set_price:false`, `delivery_tolerance_litres:200`), **archive blocks new writes with `1006` (409)** across tanks/pumps/price/expense while staying readable, pump fault-note clearing on state change.

### §6 Staff — 16/17
| ID | Result | Notes |
|----|--------|-------|
| S-ST-12 | **FAIL** | **BUG-02 (P1):** Manager (holds `staff.manage`) gets `1003 not_a_member` on `PATCH /staff/:membershipId`; Owner gets 200 on the identical call. The route has no `:branchId`, so scope resolves only the caller's `*` membership — Managers (branch-scoped) are blocked before the permission check. Contradicts handoff matrix + the route's own comment. |

Verified: staff create (new + email-reuse), `phone_taken` only across distinct users, `role_not_found` field, deactivation, roster exactly-7-windows + window enum, leaderboard sort.

### §13 Notifications — 3/4
| ID | Result | Notes |
|----|--------|-------|
| NF-03 | **SKIP** | Feed empty — no notification producers wired yet (expected, handoff §13). Mark-read of another/unknown notification correctly returns `1004` (NF-02 PASS). |

### Sections fully green
§4 RBAC (38/38) — role CRUD, **last-owner guard** (`1007` when stripping ownership from the sole owner; succeeds when a co-owner exists), system-role undeletable/in-use, the full **permission matrix** (manager vs attendant per endpoint), cross-tenant → `1003`, custom role grants exactly its perms.
§7 Shifts (40/40) — **reconciliation maths exact** (560.5 L → 49,884,500 expected → 84,500 short; balanced/over), price pinning + override-reason rule, `price_not_found`, post / `branch_rule_unmet` / post-balanced `{posted:2}`, and the **VOID idiom** (literal `"VOID"`, posted-only, never hard-deletes, audit row written).
§8 Deliveries (18/18) — 4-stage, variance `(dip_before+waybill)−dip_after = 200`, `delivery_dips_required`, **tank balance set to `dip_after` on sign**, `delivery_already_signed`.
§9 Pricing, §10 Expenses, §11 Rollup, §12 Notes/audit, §14 Cross-cutting — all green (see summary).

---

## Divergence probes (plan §15) — outcomes

| Probe | Outcome |
|-------|---------|
| DIV-01 verify-otp codes | **Confirmed as designed.** No OTP → `1004`; expired → `1006`; wrong → `1001`; ≥5 attempts → `1008`. All key/field as predicted. |
| DIV-02 seeded role names | **Confirmed.** `GET /roles` returns exactly Owner/Manager/Attendant, all `is_system:true`. (The earlier "Staff" guess was wrong.) |
| DIV-03 cross-tenant 403 vs 404 | **Mixed, both acceptable.** Param-scoped routes (manager→other-org branch staff) → `1003` via middleware; service-level GET-by-id (branch/shift/delivery/expense cross-tenant) → `1004`. Never leaks data either way. |
| DIV-04 shift `window` enum / undocumented `product` | **Confirmed.** `window` is `morning|evening` only (bad value → 1001); the optional `product` field on open exists and is accepted. |
| DIV-05 `effective_at` required | **Confirmed.** Omitting it → `1001 field=effective_at` (no server default). |
| DIV-06 `variance_flag_kobo` non-integer | **Confirmed bug** → filed as **BUG-03**. |
| DIV-08 `manager_may_set_price` | **Confirmed unenforced.** Manager holds `price.set` statically; the branch setting does not gate it. Not filed as a bug (matches the static-permission model; flagged as a product decision to confirm — see Risks). |

---

## New bugs found

| ID | Title | Severity |
|----|-------|----------|
| BUG-02 | Manager cannot `PATCH /staff/:membershipId` (org-scope on unparametrized route) | P1 |
| BUG-03 | `variance_flag_kobo` accepts a non-integer | P3 |
| BUG-04 | `Retry-After` missing on `1008` returned via `ServiceResult` (OTP) | P2 |

Full root-cause + fix for each in `docs/qas/backend/reports/bugs.md`.

---

## Risks / not covered

- **Concurrency/load not tested** — e.g. two simultaneous `post-balanced` on the same date, or concurrent shift posts. The data model relies on `withTransaction`, which currently **degrades to non-transactional on standalone Mongo** (BUG-01 fix) — so on this QA topology there is **no real atomicity**; a true concurrency test needs a replica set. Flagged as a risk, not executed.
- **DIV-08 `manager_may_set_price`** — the per-branch setting appears decorative; price-setting is gated purely by the static `price.set` permission. Confirm this is intended before relying on the toggle.
- **Notification producers** (handoff §13) and **PDF export** / **posted-entry edit** (deferred) are out of scope.
- Tests run with shared cumulative state in one Mongo db; suites are written to be **idempotent across re-runs** (unique emails/phones, dedicated throwaway orgs/branches for mutating cases like the last-owner guard).

---

## Sign-off

| Item | Status |
|------|--------|
| DB blocker (BUG-01) | ✅ Fixed & verified |
| Auth / token issuance / RBAC | ✅ PASS (BUG-04 header gap aside) |
| Shifts / reconciliation / VOID | ✅ PASS |
| Deliveries / pricing / expenses / rollup / notes / audit | ✅ PASS |
| Manager staff management | ❌ **BUG-02 (P1)** |
| Money-integer invariant | ⚠️ **BUG-03 (P3)** — one field leaks float |
| Rate-limit contract | ⚠️ **BUG-04 (P2)** — header missing |

**Recommendation: NOT YET CLEARED — fix BUG-02 (P1) before sign-off.** BUG-02 breaks a core RBAC flow (Managers cannot manage staff). BUG-04 (P2) and BUG-03 (P3) should be fixed but are not release-blocking on their own. After BUG-02 is fixed, re-run §6 (S-ST-12 must go green) and §4 to confirm no regression. The remaining 267 cases pass and the API behaves as documented across all other modules.

---

## How to reproduce this run

```bash
pnpm nx serve main-backend                          # standalone Mongo is fine now
cd docs/qas/backend/scripts
node bootstrap.mjs                                   # seeds .state.json (19/19)
for f in auth branches staff rbac pricing shifts deliveries expenses rollup notes-audit notifications crosscutting; do
  node $f.test.mjs
done
```
Each suite is self-contained and idempotent; bootstrap must run first to produce `.state.json`.
