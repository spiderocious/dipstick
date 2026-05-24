# Backend QA Handoff — Dipstick MVP (all modules)

**Date:** 2026-05-24
**Branch:** main
**Build:** Typecheck ✅ · Lint ✅ · Build ✅ (`pnpm nx run-many -t typecheck lint build -p main-backend core api`)
**Base URL:** `http://localhost:8081/api/v1`
**Auth header:** `Authorization: Bearer <access_token>`
**Full endpoint reference:** `docs/api-docs.md` · **Architecture/decisions:** `docs/backend-plan.md`

This document is the test surface. A QA engineer should be able to exercise the whole API from here.

---

## 0. Prerequisites & running

```bash
# A MongoDB must be reachable at MONGO_URL (default mongodb://127.0.0.1:27017).
# Multi-document transactions need a replica set; on a standalone Mongo the backend
# degrades to non-transactional writes (fine for QA, logged as a warning).
pnpm install
pnpm nx serve main-backend     # http://localhost:8081
```

There is **no seed script**. Bootstrap data through the API: register an owner → verify OTP →
create branch/tanks/pumps → add staff → set price → open/close/post shifts. The
register/resend responses include `dev_otp: "000000"` outside production, so phone verification
needs no SMS gateway.

> **Heads-up for testers:** in dev the OTP is always **`000000`**. Login is blocked until the
> phone is verified (`1003 phone_unverified`).

---

## 1. The error contract (test this on every endpoint)

Every error is **flat**: `{ errorCode, errorMessage, type, field? }`. Assert on the **numeric
`errorCode`**, never the message.

| errorCode | type | HTTP | When |
|-----------|------|------|------|
| 1001 | validation_error | 400 | bad/missing field — carries `field` |
| 1002 | auth_error | 401 | no/expired/invalid token, bad credentials |
| 1003 | forbidden_error | 403 | lacks permission / not a branch member |
| 1004 | not_found_error | 404 | resource absent / cross-tenant |
| 1005 | conflict_error | 409 | duplicate (email, phone, role name, tank product) |
| 1006 | state_error | 409 | bad state transition |
| 1007 | business_error | 422 | business rule (closing<opening, branch rule, last-owner, dips required) |
| 1008 | rate_limit_error | 429 | OTP attempts exhausted |
| 1009 | internal_error | 500 | unexpected |

### MUST VALIDATE — one field at a time
Submit a body with **two** bad fields and confirm only the **first (by body order)** is returned:
- POST `/auth/register` with invalid `email` AND short `password` → returns **only** the `email` error (`field: "email"`).
- Fix email, resubmit same bad password → now returns the `password` error.
- Repeat for `/auth/login`, `/branches` (bad `name` + bad `city`), `/shifts` close (bad `closing_meter`).

This ordering is intentional product behaviour — verify it holds.

---

## 2. Seed/bootstrap walk-through (happy path, do this first)

| # | Call | Expect |
|---|------|--------|
| 1 | POST `/auth/register` (owner) | 201, `phone_verification_required:true`, `dev_otp:"000000"` |
| 2 | POST `/auth/login` before verify | 403 `1003` `phone_unverified` |
| 3 | POST `/auth/verify-otp` `{phone, code:"000000"}` | 200 + `tokens` |
| 4 | GET `/me` | owner membership `branch_id:"*"`, role `Owner`, full `permissions[]` |
| 5 | GET `/permissions` | 30 permission keys + descriptions |
| 6 | GET `/roles` | 3 system roles (Owner/Manager/Attendant), `is_system:true` |
| 7 | POST `/branches` (with tanks+pumps) | 201, branch + tanks + pumps |
| 8 | POST `/branches/:id/prices` (effective now) | 201 |
| 9 | POST `/branches/:id/staff` (attendant + Attendant role) | 201, membership + user |
| 10 | POST `/branches/:id/dips` (opening) | 201 |
| 11 | POST `/branches/:id/shifts` (open) | 201, status `open`, price pinned |
| 12 | PATCH `/shifts/:id` (close) | 200, computed variance |
| 13 | POST `/branches/:id/dips` (closing) | 201 (needed before posting) |
| 14 | POST `/shifts/:id/post` | 200, status `posted` |
| 15 | GET `/rollup?date=<businessDate>` | branch totals, lead summary, todo list |

---

## 3. RBAC — per-branch dynamic roles (Module 1)

Roles are **editable**; custom roles can be created; access is **per-branch** via memberships.

### Matrix (seeded roles)
| Action | Owner | Manager | Attendant |
|--------|-------|---------|-----------|
| View branch / daybook | ✅ | ✅ | ✅ (own branch) |
| Create/edit/archive branch | ✅ | edit only | ❌ |
| Manage roles / permissions | ✅ | ❌ | ❌ |
| Manage staff / roster | ✅ | ✅ | ❌ |
| Open shift | ✅ | ✅ | ❌ |
| Close shift | ✅ (any) | ✅ (any) | ✅ (own pump only) |
| Post shift | ✅ | ✅ | ❌ |
| Void shift | ✅ | ✅ | ❌ |
| Set price | ✅ | branch-permitting | ❌ |
| Record expense | ✅ | ✅ | ✅ |
| View roll-up (cross-branch) | ✅ | ❌ (no `*` membership) | ❌ |
| View audit | ✅ | ✅ | ❌ |

### MUST VALIDATE
- **Custom role:** POST `/roles {name, permissions}` → assign to a staff member → confirm they gain exactly those permissions and nothing else.
- **Edit a system role:** PATCH `/roles/:ownerRoleId` removing `role.manage`+`staff.manage` from the **only** owner → expect **1007 `last_owner`** (org can't lock itself out). Removing from a role when another owner exists → 200.
- **Delete role:** DELETE a role assigned to staff → **1005 `role_in_use`**; DELETE a system role → **1005 `role_system_undeletable`**.
- **Cross-branch isolation:** a Manager at Branch A calling Branch B endpoints → **1003 forbidden** (NOT 404). An Attendant calling `/rollup` → **1003**.
- **Cross-tenant:** Org-2 user requesting an Org-1 branch id → **1004** (or 403); never returns the other org's data.
- **Own-pump close:** Attendant closing a shift assigned to a different attendant → **1003**; closing their own → 200.

---

## 4. Shifts, reconciliation, posting & the VOID idiom (Module 2)

### Variance maths (verify the numbers exactly)
`litres = closing − opening` · `expected_gross_kobo = round(litres × price_per_litre_kobo)` ·
`variance_kobo = expected_gross_kobo − cash_declared_kobo`. `>0` short · `<0` over · `0` balanced.
Example: open 12450.0, close 13010.5, price 89000 kobo/L, cash 49,800,000 →
litres 560.5, expected 49,884,500, variance **84,500 short**.

### MUST VALIDATE
| Scenario | Expect |
|----------|--------|
| Close with `closing_meter < opening_meter` | 422 `1007` `closing_below_opening`, field `closing_meter` |
| Close a shift that isn't `open` | 409 `1006` `shift_not_open` |
| Post a shift that isn't `closed` | 409 `1006` `shift_not_closed` |
| Post when branch requires closing dip and none recorded | 422 `1007` `branch_rule_unmet` |
| Post-balanced | only balanced+closed shifts flip to `posted`; variance ones untouched; returns `{posted: n}` |
| Void with `confirm` ≠ `"VOID"` | 400 `1001` `void_word_mismatch`, field `confirm` |
| Void an unposted shift | 409 `1006` `shift_not_posted` |
| Void a posted shift | 200; shift `status:"voided"`, `is_voided:true`, **still returned** by daybook/get; audit row written with actor + reason |
| Price pinning | open a shift, then set a new price effective NOW, open a 2nd shift → 1st keeps old `price_per_litre_kobo`, 2nd uses new |

The void must NEVER hard-delete — confirm the shift remains visible everywhere after voiding.

---

## 5. Deliveries — the 4-stage offload (Module 3)

Stages: `arrived → dip_before → offloaded → signed`. Variance = `(dip_before + waybill_litres) − dip_after`.

### MUST VALIDATE
- Create delivery → stage `arrived`, `variance_litres:null`.
- PATCH dip_before then dip_after → `variance_litres` recomputes.
- POST `/sign` **without both dips** → 422 `1007` `delivery_dips_required`.
- POST `/sign` with witness + both dips → 200, stage `signed`; **the tank balance updates to `dip_after`** (GET the branch and check `current_litres`); audit row `delivery.signed`.
- PATCH or re-sign a signed delivery → 409 `1006` `delivery_already_signed`.

---

## 6. Pricing (Module 4)

- POST `/prices/preview` → returns `delta_per_litre_kobo`, `litres_in_tank`, `revaluation_kobo` (= litres × delta), `current_price_kobo`. No write.
- POST `/prices` with missing `reason` → 1001 field `reason`.
- GET `/prices/:product/history` → newest first, each row carries `previous_price_per_litre_kobo` (from→to) + `reason` + `set_by`.
- Money: `price_per_litre_kobo` must be an integer; sending a float/decimal → 1001.

---

## 7. Expenses (Module 5)

- POST without `witness` → `is_single_source:true` (owner reviews these); with witness → `false`.
- `amount_kobo` must be integer kobo (verify a decimal → 1001). Multiply naira by 100 on the FE.
- List is cursor-paginated; optional `?category=` filter. GET `/expenses/:id` cross-tenant → 1004.

---

## 8. Roll-up & trends (Module 7)

- GET `/rollup` (no date) defaults to **yesterday**. Aggregates only the caller's visible branches.
- Per-branch `status`: `reorder` if any tank ≤ threshold, else `short` if any short shift, else `clean`.
- `todo[]` lists shortages + tanks to reorder with human messages.
- `lead` is a plain-language sentence (litres, gross, net variance, item count).
- GET `/rollup/trends?days=7` → litres-per-day series per branch.
- An Attendant (no org-wide membership) → 1003.

---

## 9. Notes & audit (Module 9)

- POST `/:entityType/:entityId/notes` with `entityType` ∉ {shift,expense,delivery} → 1001 field `entityType`.
- Notes carry `mentions[]` (user ids) — stored, not yet fanned out to notifications.
- GET `/branches/:id/audit` → every state change appears (`*.created/updated/posted/voided/signed/...`) with `actor_id`, `before`/`after`, `at`. Filter by `entity_type` / `entity_id`.
- **Verify audit completeness:** after the §2 walk-through, the audit timeline should contain org.created, branch.created, price.set, staff.added, shift.opened/closed/posted, dip.* entries.

---

## 10. Notifications (Module 10)

- GET `/notifications` → caller's own only, newest first, with `unread_count`.
- POST `/notifications/:id/read` for another user's notification → 1004. Own → 200, `read:true`.
- (No producer wired yet — the `notify()` fan-out primitive exists but isn't called; feed may be empty. Not a bug.)

---

## 11. Money fields (all integer kobo — verify storage is integer)

| Field | Endpoint(s) |
|-------|-------------|
| `price_per_litre_kobo` | prices, shift open, shift response |
| `expected_gross_kobo`, `cash_declared_kobo`, `variance_kobo` | shift close/get |
| `cost_per_litre_kobo` | deliveries |
| `amount_kobo` | expenses |
| `variance_flag_kobo` | branch settings |
| `gross_kobo`, `variance_kobo` | rollup |

Sending a decimal to any `_kobo` field must 1001. No float should ever appear in a response.

---

## 12. Pagination (cursor only — never offset)

Lists: deliveries, expenses, notes, notifications, audit. Verify:
- First page: no `cursor` param; response `meta.nextCursor` + `meta.hasMore`.
- Next page: pass `?cursor=<nextCursor>`; no duplicate or skipped rows across the boundary.
- No `?page=` / offset support (by design).

---

## 13. Out of scope (deferred — do not file as bugs)

- [ ] PDF export endpoint (`report.export` permission exists; endpoint deferred).
- [ ] SMS/WhatsApp/email OTP + notifications (v1 is in-app only; dev OTP is `000000`).
- [ ] Notification producers (fan-out primitive present, not yet called from features).
- [ ] Posted-entry editing endpoint (`posted.edit` permission reserved; edit flow deferred).
- [ ] Automated test suite (contract tests not yet written — manual QA for now).
