# Dipstick API — Reference

`main-backend` HTTP API. Base URL: `http://localhost:8091`. All paths below are under
`/api/v1`. Source of truth is the code (`apps/main-backend/src/features/*`); this doc tracks it.

- **Content type:** `application/json` for every request with a body.
- **Auth:** `Authorization: Bearer <access_token>` on protected routes.
- **Money:** integer **kobo** (₦1 = 100 kobo). Every money field ends `_kobo`. Never float.
- **IDs:** opaque prefixed-ULID strings (`usr_…`, `org_…`, `brn_…`, `shf_…`, …). Never parse them.
- **Dates:** ISO 8601 strings. `business_date` is a `YYYY-MM-DD` day key.
- **Pagination:** cursor-based. Query `?cursor=&limit=` (limit default 20, max 100). Response carries
  `meta: { nextCursor: string|null, hasMore: boolean }`. First page omits `cursor`.

---

## 1. Response envelopes

### Success
```jsonc
// 200 / 201 / 202
{ "data": { /* payload */ }, "meta": { "nextCursor": "…", "hasMore": true } }  // meta only on lists
// 204 → empty body
```

### Error — FLAT shape (always exactly these fields; `field` only on validation)
```jsonc
{ "errorCode": 1001, "errorMessage": "Enter a valid email address", "type": "validation_error", "field": "email" }
```
Clients **switch on the numeric `errorCode`**, never on `errorMessage` (copy may change).

| errorCode | type | HTTP | Meaning |
|-----------|------|------|---------|
| **1001** | `validation_error` | 400 | Payload validation. Carries `field` — the **single** offending field (see §2). |
| **1002** | `auth_error` | 401 | Missing/invalid/expired token, or bad credentials. |
| **1003** | `forbidden_error` | 403 | Authenticated but lacks the permission / not a member of the branch. |
| **1004** | `not_found_error` | 404 | Resource does not exist (or cross-tenant — returned as 404/403 deliberately). |
| **1005** | `conflict_error` | 409 | Duplicate / already exists (email, phone, role name, tank product). |
| **1006** | `state_error` | 409 | Invalid state transition (close a non-open shift, void an unposted shift, sign a signed delivery). |
| **1007** | `business_error` | 422 | Business-rule violation (closing < opening, branch rule unmet, last-owner, dips required). |
| **1008** | `rate_limit_error` | 429 | Too many attempts (OTP). `Retry-After` header set. |
| **1009** | `internal_error` | 500 | Unexpected / irreconcilable server error. Internals never leaked. |

---

## 2. Validation — one field at a time

A request body may have several invalid fields, but the API reports **only one** — the field that
appears earliest in the request body (form order). Fix it, resubmit, and the next offending field
is reported. Example: POST `/auth/register` with a bad email **and** short password returns only:
```jsonc
{ "errorCode": 1001, "errorMessage": "Enter a valid email address", "type": "validation_error", "field": "email" }
```
After email is corrected, the next submit returns the password error. The `field` value matches the
request key (snake_case), e.g. `email`, `phone`, `price_per_litre_kobo`, `confirm`.

---

## 3. Auth & account (Module 1)

### POST `/auth/register` — Owner sign-up
Creates user + org + seeded roles (Owner/Manager/Attendant) + an org-wide Owner membership. Phone
OTP must be verified before tokens are issued.

Request:
```jsonc
{ "name": "Bisi Owner", "business_name": "Bisi Oil", "email": "bisi@oil.test", "phone": "+2348030000000", "password": "Password1" }
```
`201`:
```jsonc
{ "data": {
  "user": { "id": "usr_…", "name": "Bisi Owner", "email": "bisi@oil.test", "phone": "+2348030000000", "phone_verified": false, "is_active": true, "created_at": "…" },
  "org": { "id": "org_…", "name": "Bisi Oil", "wordmark": null, "owner_id": "usr_…", "created_at": "…" },
  "phone_verification_required": true,
  "dev_otp": "000000"   // present only when NODE_ENV != production — convenience for QA
} }
```
Errors: `1001` validation · `1005` `email`/`phone` taken.

### POST `/auth/verify-otp` — verify phone, receive tokens
Request: `{ "phone": "+2348030000000", "code": "000000" }`
`200`:
```jsonc
{ "data": { "user": { … , "phone_verified": true }, "tokens": { "access_token": "…", "refresh_token": "…" } } }
```
Errors: `1001` `code` wrong (`otp_invalid`) · `1006` expired (`otp_expired`) · `1008` too many attempts · `1004` no OTP on record.

### POST `/auth/resend-otp`
Request: `{ "phone": "…" }` → `200 { "data": { "sent": true, "dev_otp": "000000" } }`.
Errors: `1004` unknown phone · `1005` already verified.

### POST `/auth/login`
Request: `{ "email": "bisi@oil.test", "password": "Password1" }`
`200`: `{ "data": { "user": {…}, "tokens": { "access_token": "…", "refresh_token": "…" } } }`
Errors: `1002` `invalid_credentials` (field `email`; same for unknown email or wrong password — never reveals which) · `1003` `account_inactive` · `1003` `phone_unverified` (field `phone`).

### POST `/auth/refresh`
Request: `{ "refresh_token": "…" }` → `200 { "data": { "access_token": "…", "refresh_token": "…" } }`.
Rotates the session (old refresh revoked). Errors: `1002` invalid/expired/revoked.

### POST `/auth/logout`
Request: `{ "refresh_token": "…" }` → `204`. Revokes the session. Idempotent.

### GET `/me` — auth required
```jsonc
{ "data": {
  "user": { "id": "usr_…", … },
  "memberships": [
    { "id": "mbr_…", "org_id": "org_…", "user_id": "usr_…", "branch_id": "*", "role_id": "rol_…", "default_pump_id": null, "is_active": true, "created_at": "…",
      "role_name": "Owner", "permissions": ["org.manage", "branch.create", …] }
  ]
} }
```
`branch_id: "*"` = org-wide (owner). `permissions` is the effective set per membership — the FE gates UI off these.

### PATCH `/org` — auth + `org.manage`
Request: `{ "name": "Bisi Oil Ltd", "wordmark": "BISI OIL" }` (both optional). `200` → serialized org.

---

## 4. Roles & permissions (Module 1, dynamic RBAC)

### GET `/permissions` — auth required
The full catalogue for the role builder.
```jsonc
{ "data": { "permissions": [ { "key": "shift.void", "description": "Void a posted shift through the critical VOID confirmation." }, … ] } }
```

### GET `/roles` — `role.manage` | `staff.view`
`{ "data": { "items": [ { "id": "rol_…", "org_id": "org_…", "name": "Owner", "is_system": true, "permissions": [...], "created_at": "…" }, … ] } }`

### POST `/roles` — `role.manage`
Request: `{ "name": "Supervisor", "permissions": ["branch.view", "shift.post", "reconciliation.view"] }`
`201` → serialized role. Errors: `1001` (unknown permission → field `permissions`; name too short → `name`) · `1005` `role_name_taken` (field `name`).

### PATCH `/roles/:roleId` — `role.manage`
Request: `{ "name": "…", "permissions": [...] }` (either optional). Editable even for system roles.
`200` → role. Errors: `1004` not found · `1005` name taken · `1007` `last_owner` (would strip the org's last full-ownership membership).

### DELETE `/roles/:roleId` — `role.manage`
`204`. Errors: `1004` not found · `1005` `role_system_undeletable` · `1005` `role_in_use` (assigned to staff).

---

## 5. Branches, tanks, pumps (Module 1)

### GET `/branches` — `branch.view`
The login landing list. Returns branches the caller can see (owner: all; others: their member branches).
`{ "data": { "items": [ { "id":"brn_…","org_id":"org_…","name":"Ikeja","city":"Ikeja","state":"Lagos","is_archived":false,"settings":{…} } ] } }`

### POST `/branches` — `branch.create`
```jsonc
{ "name":"Ikeja","city":"Ikeja","state":"Lagos",
  "tanks":[ { "product":"PMS","capacity_litres":33000,"reorder_threshold_litres":5000 } ],
  "pumps":[ { "product":"PMS","label":"P1" } ] }
```
`201` → branch with `tanks[]` + `pumps[]`. `tanks`/`pumps` optional. One tank per product → else `1005` `tank_product_exists` (field `tanks`).

### GET `/branches/:branchId` — `branch.view`
`200` → branch + `tanks[]` + `pumps[]` (+ each tank's `current_litres`). `1004` if not found / not your org.

### PATCH `/branches/:branchId` — `branch.edit`
```jsonc
{ "name":"…","city":"…","state":"…",
  "settings": { "require_closing_dip": true, "variance_flag_kobo": 500000, "manager_may_set_price": false, "delivery_tolerance_litres": 200 } }
```
All fields optional; `settings` merges. `200` → branch.

### POST `/branches/:branchId/archive` — `branch.archive`
`204`. History remains readable; new entries blocked (`1006 branch_archived`).

### POST `/branches/:branchId/tanks` — `tank.manage`
`{ "product":"AGO","capacity_litres":20000,"reorder_threshold_litres":3000 }` → `201` tank.
Errors: `1005` `tank_product_exists` · `1006` `branch_archived` · `1004` branch.

### PATCH `/branches/:branchId/tanks/:tankId` — `tank.manage`
`{ "capacity_litres":…, "reorder_threshold_litres":… }` → `200` tank.

### POST `/branches/:branchId/pumps` — `pump.manage`
`{ "product":"PMS","label":"P2" }` → `201` pump.

### PATCH `/branches/:branchId/pumps/:pumpId` — `pump.manage`
`{ "label":"P2", "state":"offline", "fault_note":"Nozzle stuck" }`. State ∈ idle|live|offline.
A `fault_note` is kept only when `state=offline`; cleared otherwise. `200` → pump.

---

## 6. Staff & roster (Module 1)

### GET `/branches/:branchId/staff` — `staff.view`
```jsonc
{ "data": { "items": [
  { "id":"mbr_…","user_id":"usr_…","branch_id":"brn_…","role_id":"rol_…","default_pump_id":null,"is_active":true,"created_at":"…",
    "user": { "id":"usr_…","name":"Tunde","email":"tunde@…","phone":"…","phone_verified":true,"is_active":true,"created_at":"…" },
    "role_name":"Attendant","shift_count_30d":18,"variance_kobo_30d":-45000 } ] } }
```

### POST `/branches/:branchId/staff` — `staff.manage`
```jsonc
{ "name":"Tunde","email":"tunde@oil.test","phone":"+2348031111111","role_id":"rol_…","default_pump_id":null,"password":"Welcome1" }
```
Creates the user if new (pre-verified, since added by a manager) and a branch membership.
`201` → membership + `user`. Errors: `1004` `role_not_found` (field `role_id`) · `1005` `phone_taken`.

### PATCH `/staff/:membershipId` — `staff.manage` | `role.assign`
`{ "role_id":"rol_…", "default_pump_id":"pmp_…", "is_active": false }` (all optional). Deactivating keeps history attributed. `200` → membership.

### GET `/branches/:branchId/roster?week_start=YYYY-MM-DD` — `staff.view`
`{ "data": { "week_start":"2026-05-18", "assignments": { "usr_…": ["morning","morning","off","evening","evening","off","off"] } } }`

### PUT `/branches/:branchId/roster` — `roster.manage`
`{ "week_start":"2026-05-18", "assignments": { "usr_…": ["morning",…7 items] } }`. Each attendant array is exactly 7 windows (Mon..Sun), window ∈ morning|evening|off. `200` → roster.

### GET `/branches/:branchId/variance-leaderboard` — `staff.view`
30-day per-head net variance, worst shortage first.
`{ "data": { "items": [ { "attendant_id":"usr_…","variance_kobo":-120000,"shift_count":21 } ] } }`

---

## 7. The day, shifts & dips (Module 2)

### GET `/branches/:branchId/daybook?date=YYYY-MM-DD` — `branch.view`
Everything that happened on a day, in order.
```jsonc
{ "data": { "business_date":"2026-05-23",
  "shifts": [ /* serialized shifts */ ],
  "dips":   [ /* serialized dips */ ],
  "tanks":  [ /* tank readouts: current_litres etc. */ ] } }
```

### POST `/branches/:branchId/dips` — `dip.record`
`{ "tank_id":"tnk_…","kind":"opening","litres":28500,"business_date":"2026-05-23" }`. `kind` ∈ opening|closing.
A `closing` dip computes wet-stock variance vs (opening + delivered − sold) and sets the tank balance to the measured litres.
`201`:
```jsonc
{ "data": { "id":"dip_…","tank_id":"tnk_…","product":"PMS","business_date":"2026-05-23","kind":"closing","litres":12000,"wet_stock_variance_litres":-35.0,"recorded_by":"usr_…","recorded_at":"…" } }
```

### POST `/branches/:branchId/shifts` — `shift.open`
```jsonc
{ "pump_id":"pmp_…","attendant_id":"usr_…","window":"morning","business_date":"2026-05-23","opening_meter":12450.0,
  "price_per_litre_kobo":89000, "price_override_reason":"manual override" }   // price fields optional
```
Pins the price: an explicit `price_per_litre_kobo` **requires** `price_override_reason` (else `1001` field `price_override_reason`); otherwise the price effective at open time is pinned. Sets the pump `live`.
`201` → shift (status `open`). Errors: `1004` branch/pump · `1006` `branch_archived` · `1007` `price_not_found` (no price set yet).

### GET `/shifts/:shiftId` — member of the shift's branch
`200` → full shift (meter trail + cash trail + variance). `1004` if not your org.
```jsonc
{ "data": {
  "id":"shf_…","branch_id":"brn_…","pump_id":"pmp_…","attendant_id":"usr_…","window":"morning","business_date":"2026-05-23",
  "opening_meter":12450.0,"closing_meter":13010.5,"litres":560.5,
  "price_per_litre_kobo":89000,"expected_gross_kobo":49884500,"cash_declared_kobo":49800000,
  "variance_kobo":84500,"variance_status":"short","status":"posted","is_posted":true,"is_voided":false,
  "opened_by":"usr_…","opened_at":"…","closed_by":"usr_…","closed_at":"…","posted_by":"usr_…","posted_at":"…",
  "voided_by":null,"voided_at":null,"void_reason":null } }
```

### PATCH `/shifts/:shiftId` — close the pump (`shift.close.own` own pump, or `shift.close.any`)
`{ "closing_meter":13010.5, "cash_declared_kobo":49800000 }`. Computes `litres`, `expected_gross_kobo`, `variance_kobo`, `variance_status` (balanced/short/over) and sets pump `idle`.
`200` → shift (status `closed`). Errors: `1006` `shift_not_open` · `1007` `closing_below_opening` (field `closing_meter`) · `1003` if attendant tries to close another's pump.

**Variance maths:** `litres = closing − opening`; `expected_gross_kobo = round(litres × price_per_litre_kobo)`; `variance_kobo = expected_gross_kobo − cash_declared_kobo`. `>0` short, `<0` over, `0` balanced. All integer kobo.

### POST `/shifts/:shiftId/post` — `shift.post`
`200` → shift (status `posted`, timestamped). Errors: `1006` `shift_not_closed` / `shift_already_posted` · `1007` `branch_rule_unmet` (branch requires a closing dip and none recorded).

### POST `/branches/:branchId/shifts/post-balanced` — `shift.post`
`{ "business_date":"2026-05-23" }` → `200 { "data": { "posted": 4 } }`. Posts every balanced, closed shift; leaves variance shifts for individual review.

### POST `/shifts/:shiftId/void` — `shift.void` — the VOID idiom
`{ "reason":"Pump meter misread", "confirm":"VOID" }`. Posted shift only. `confirm` **must equal the literal `VOID`**.
`200` → shift (status `voided`, stays visible/struck, fully audited). Errors: `1001` `void_word_mismatch` (field `confirm`) · `1006` `shift_not_posted` / `shift_already_voided`.

---

## 8. Deliveries (Module 3)

### GET `/branches/:branchId/deliveries` — `branch.view` — cursor-paginated
`{ "data": { "items": [ /* serialized deliveries */ ] }, "meta": { "nextCursor": null, "hasMore": false } }`

### POST `/branches/:branchId/deliveries` — `delivery.record`
```jsonc
{ "tank_id":"tnk_…","product":"PMS","waybill_number":"WB-1024","supplier":"NNPC","driver_name":"Musa","truck_plate":"LAG-123-XY","witness":"Gateman Ade","waybill_litres":33000,"cost_per_litre_kobo":75000 }
```
`201` → delivery (stage `arrived`). `witness` optional.

### GET `/deliveries/:deliveryId` — member of the delivery's branch
`200`:
```jsonc
{ "data": { "id":"dlv_…","branch_id":"brn_…","tank_id":"tnk_…","product":"PMS","waybill_number":"WB-1024","supplier":"NNPC","driver_name":"Musa","truck_plate":"LAG-123-XY","witness":"Gateman Ade","waybill_litres":33000,"cost_per_litre_kobo":75000,"dip_before_litres":4000,"dip_after_litres":36800,"variance_litres":200,"stage":"signed","arrived_at":"…","signed_by":"usr_…","signed_at":"…" } }
```

### PATCH `/deliveries/:deliveryId` — `delivery.record` — step the offload
`{ "stage":"dip_before", "dip_before_litres":4000, "dip_after_litres":36800, "witness":"…" }` (all optional). Recomputes `variance_litres` = `(dip_before + waybill_litres) − dip_after`.
`200` → delivery. Errors: `1006` `delivery_already_signed`.

### POST `/deliveries/:deliveryId/sign` — `delivery.sign`
`{ "witness":"Gateman Ade" }`. Requires both dips recorded. Files the waybill and sets the tank balance to the measured `dip_after`, atomically.
`200` → delivery (stage `signed`). Errors: `1006` `delivery_already_signed` · `1007` `delivery_dips_required`.

---

## 9. Pricing (Module 4)

### GET `/branches/:branchId/prices` — `branch.view`
Current price per product.
`{ "data": { "items": [ { "product":"PMS","price": { "id":"prc_…","price_per_litre_kobo":89000,"effective_at":"…","reason":"…","set_by":"usr_…", … } }, { "product":"AGO","price":null }, { "product":"DPK","price":null } ] } }`

### POST `/branches/:branchId/prices/preview` — `price.set`
`{ "product":"PMS","price_per_litre_kobo":91000 }` → impact preview:
`{ "data": { "delta_per_litre_kobo":2000, "litres_in_tank":12000, "revaluation_kobo":24000000, "current_price_kobo":89000 } }`

### POST `/branches/:branchId/prices` — `price.set`
`{ "product":"PMS","price_per_litre_kobo":91000,"effective_at":"2026-05-24T06:00:00.000Z","reason":"depot increase" }`
`201` → price. **Pinning:** a shift opened before `effective_at` keeps the old price to close; shifts opened at/after use the new one.
Errors: `1001` (reason/price) · `1004`/`1006` branch · **`1003`** when the branch's `manager_may_set_price` is `false` and the caller is a branch-scoped member — only the owner (org-wide membership) may set price then; an owner is always allowed.

### GET `/branches/:branchId/prices/:product/history` — `price.history.view`
Every change, newest first (from→to via `previous_price_per_litre_kobo`, who, when, why).
`{ "data": { "items": [ { "id":"prc_…","product":"PMS","price_per_litre_kobo":91000,"previous_price_per_litre_kobo":89000,"effective_at":"…","reason":"depot increase","set_by":"usr_…","created_at":"…" } ] } }`

---

## 10. Expenses (Module 5)

### GET `/branches/:branchId/expenses?category=&cursor=&limit=` — `expense.view` — cursor-paginated
`{ "data": { "items": [ /* serialized expenses */ ] }, "meta": { "nextCursor": …, "hasMore": … } }`

### POST `/branches/:branchId/expenses` — `expense.record`
`{ "business_date":"2026-05-23","category":"generator_diesel","description":"20L diesel","amount_kobo":1500000,"witness":"Ade" }`
`witness` optional; when absent the expense is flagged `is_single_source: true`.
`201`:
```jsonc
{ "data": { "id":"exp_…","branch_id":"brn_…","business_date":"2026-05-23","category":"generator_diesel","description":"20L diesel","amount_kobo":1500000,"recorded_by":"usr_…","witness":"Ade","is_single_source":false,"created_at":"…" } }
```

### GET `/expenses/:expenseId` — `expense.view`
`200` → single expense. `1004` if not your org.

---

## 11. Owner roll-up & trends (Module 7)

### GET `/rollup?date=YYYY-MM-DD` — `rollup.view` (cross-branch)
Defaults to yesterday. Aggregates the caller's visible branches.
```jsonc
{ "data": {
  "business_date":"2026-05-23",
  "lead":"Across 2 branch(es): 8420 L sold, ₦748,300.00 gross, ₦12,500.00 short. 2 item(s) to review.",
  "totals": { "litres":8420, "gross_kobo":74830000, "variance_kobo":1250000 },
  "branches": [
    { "id":"brn_…","name":"Ikeja", …, "status":"short", "litres":5200,"gross_kobo":46280000,"variance_kobo":1250000,"short_count":1,"tanks_below_reorder":[] }
  ],
  "todo": [ { "kind":"shortage","branch_id":"brn_…","message":"Ikeja: 1 short shift(s) to review (₦12,500.00)." } ] } }
```
`status` per branch ∈ clean | short | reorder.

### GET `/rollup/trends?days=7` — `rollup.view`
Litres per day per branch (default 7 days, max 90).
`{ "data": { "from":"2026-05-17","to":"2026-05-23","series":[ { "branch_id":"brn_…","branch_name":"Ikeja","points":[ { "date":"2026-05-17","litres":5100 }, … ] } ] } }`

---

## 12. Notes & audit (Module 9)

### GET `/:entityType/:entityId/notes` — `branch.view` — cursor-paginated
`entityType` ∈ shift | expense | delivery (else `1001` field `entityType`).
`{ "data": { "items": [ { "id":"not_…","entity_type":"shift","entity_id":"shf_…","author_id":"usr_…","body":"Customer left without paying","mentions":["usr_owner"],"created_at":"…" } ] }, "meta": {…} }`

### POST `/:entityType/:entityId/notes` — `note.add`
`{ "body":"Customer left without paying", "mentions":["usr_owner"] }` → `201` → note.

### GET `/branches/:branchId/audit?entity_type=&entity_id=&cursor=&limit=` — `audit.view` — cursor-paginated
Timeline of every state-changing action, newest first.
```jsonc
{ "data": { "items": [
  { "id":"aud_…","branch_id":"brn_…","actor_id":"usr_…","action":"shift.voided","entity_type":"shift","entity_id":"shf_…","before":{…},"after":{…},"note":"Pump meter misread","at":"…" } ] }, "meta": {…} }
```

---

## 13. Notifications (Module 10, in-app only)

### GET `/notifications?cursor=&limit=` — auth required
The caller's own feed, newest first.
`{ "data": { "items": [ { "id":"ntf_…","kind":"shift.posted","title":"…","body":"…","branch_id":"brn_…","read":false,"created_at":"…" } ], "unread_count": 3 }, "meta": {…} }`

### POST `/notifications/:id/read` — auth required
`200` → the updated notification (`read: true`). `1004` if not the caller's notification.

---

## 14. Health

### GET `/health` → `200 { "data": { "status":"ok","service":"main-backend","env":"development","time":"…" } }`

---

## 15. Permission keys (for `role.permissions` and the role builder)

`org.manage` · `branch.create` · `branch.edit` · `branch.archive` · `branch.view` · `tank.manage` ·
`pump.manage` · `staff.view` · `staff.manage` · `roster.manage` · `role.manage` · `role.assign` ·
`dip.record` · `shift.open` · `shift.close.own` · `shift.close.any` · `shift.post` · `shift.void` ·
`posted.edit` · `reconciliation.view` · `delivery.record` · `delivery.sign` · `price.set` ·
`price.history.view` · `expense.record` · `expense.view` · `rollup.view` · `report.export` ·
`note.add` · `audit.view`. Descriptions: GET `/permissions`.
