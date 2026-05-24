# Dipstick Backend — Build Plan

> Single source of truth for the `main-backend` build. If context is lost, reading this
> doc end-to-end restores it. Pairs with `docs/conventions.md` (rules) and
> `../dockito/projects/dipstick/mvp.md` (product spec). **Spec wins on product behaviour;
> this doc wins on backend shape.** Where they differ, the divergence is called out below.

**Status:** planning. The backend today is scaffolding only — no DB, no service/repo layer,
features return stub JSON. See `docs/conventions.md §Backend` for the target shape.

---

## 0. Divergences from `mvp.md` (read first)

mvp.md was written for fixed roles. The owner has since asked for **dynamic RBAC** and
**per-branch staff/permissions**. The following supersede the spec:

| mvp.md says | We build instead |
|---|---|
| "Roles are **fixed in v1** (Owner / Manager / Attendant), no custom permission matrix" | Roles are **editable** and **custom roles can be created**. Owner/Manager/Attendant ship as seeded *system* roles (still editable). Gated by `CAN_MANAGE_ROLES`. |
| "owner sees all, manager sees their branch, attendant sees their shift" (implicit fixed scoping) | Scoping is **per-branch membership**: a user has one membership per branch, each carrying a role. Owner gets an org-wide (`*`) membership. The spec's defaults become the *seeded* permission sets. |
| Single owner implied | An **org** (business) owns many branches; org has many users; access is always resolved per branch. |

Everything else in mvp.md (the day-book mechanics, variance maths, void idiom, audit,
roll-up, kobo money, PMS/AGO/DPK) is built as written.

---

## 1. Architecture

Three layers, already half-scaffolded. Build order per feature: **model → repo → service → controller → route → contract test → wire into `packages/api`**.

```
Controller (feature.routes.ts) — parse req (zod), call service, map ServiceResult → ResponseUtil. No business logic.
   ↓ typed input (never `req`)
Service (feature.service.ts)   — all business logic. Returns ServiceResult<T>. Never throws for expected failures. Never sees HTTP.
   ↓ repo interface
Repository (feature.repo.ts)   — persistence only. An INTERFACE + a Mongo impl. No business logic, no HTTP.
```

### 1.1 DB-agnostic persistence (the important bit)

We use **MongoDB** now but must be able to swap to MySQL/Postgres later **without touching
services**. Achieved by: services depend on **repository interfaces**, never on the driver.

```
src/db/
  client.ts                 # Mongo connection (single MongoClient, lazy, from env.MONGO_URL)
  index.ts                  # exports getDb(), withTransaction()
src/features/<f>/
  <f>.repo.ts               # interface  e.g. BranchRepo  (pure types, no Mongo import)
  <f>.repo.mongo.ts         # Mongo implementation of BranchRepo
  <f>.service.ts            # imports the INTERFACE type; gets impl injected
```

Rules that keep it swappable:

- **No Mongo types leak past `*.repo.mongo.ts`.** Services and controllers never import `mongodb`. `ObjectId` never escapes the repo — repos map to/from our own string ULIDs.
- **IDs are app-generated ULIDs with resource prefixes** (`brn_...`, `shf_...`), stored as the document `_id` (string). We do **not** use Mongo `ObjectId` as the identity. This is the single biggest portability lever — IDs work identically on any DB.
- **No Mongo-specific query operators in services.** Filtering/sorting/pagination is expressed as plain option objects (`{ branchId, cursor, limit }`) that the repo translates.
- **Transactions** go through a `withTransaction(fn)` helper (Mongo sessions now; maps to SQL `BEGIN/COMMIT` later). Services call the helper, not the driver. Multi-document writes that must be atomic (post shift + write audit; sign delivery + update tank balance) use it.
- **Money is integer kobo** in a `bigint`-safe field. Mongo stores as `Long`/number-safe; we keep amounts well within `Number.MAX_SAFE_INTEGER` and the repo is the only place that knows the wire type. Field names suffixed `_kobo`.
- **Timestamps** stored as ISO strings or Date; repo normalises to ISO 8601 strings on the way out (the seam contract is always a string).
- **Soft-delete / archive, never hard delete** (matches the audit ethos) — `archivedAt`/`isVoided`, not `deleteOne`.

`ServiceResult<T>` (new file `src/lib/service-result.ts`):

```ts
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; errorCode: ErrorCode; messageKey: MessageKey; httpStatus: number; fieldErrors?: Record<string,string[]> };
```

Controllers unwrap: `if (!r.success) return ResponseUtil.error(res, r.httpStatus, { code: r.errorCode, message: messages.get(r.messageKey), field_errors: r.fieldErrors })`.

### 1.2 What already exists (reuse, don't rebuild)

`buildApp()`, `register(app)` feature shape, `ResponseUtil`, `AppError`, `asyncHandler`,
`requestContext` (AsyncLocalStorage — put `userId`/`orgId`/`role` here after auth),
pino `logger`, zod `env.ts`, error/requestId/log middlewares, `{ data }`/`{ error }`
envelope, `error-codes.ts`, `http-status.ts`. The seam (`packages/api/EP`) already declares
most endpoint paths — extend it, keep names in sync.

### 1.3 New cross-cutting pieces to add

- `src/db/` (client + tx helper).
- `src/lib/service-result.ts`.
- `src/lib/messages.ts` — message-key registry (no hardcoded response strings).
- `src/lib/ids.ts` — extend with ULID + prefix map (`newId('brn')`).
- `src/lib/pagination.ts` — cursor encode/decode (`{ nextCursor, hasMore }`, never offset).
- `src/features/auth` — real JWT issue/verify + OTP.
- `src/middlewares/auth.middleware.ts` — `requireAuth` (verify access token → sets ctx).
- `src/middlewares/authorize.middleware.ts` — `requirePermission(P.X)` + branch-scope resolution.
- `src/features/audit` — append-only audit writer used by every state change.

---

## 2. Permission model (RBAC)

### 2.1 The permission POJO (frozen, central)

`packages/core/src/auth/permissions.ts` (in `core` so FE can gate UI off the same keys).

```ts
export const P = {
  // Org & branches (Module 1)
  CAN_MANAGE_ORG:            'org.manage',            // business name, wordmark
  CAN_CREATE_BRANCH:         'branch.create',
  CAN_EDIT_BRANCH:           'branch.edit',           // incl. per-branch settings
  CAN_ARCHIVE_BRANCH:        'branch.archive',
  CAN_VIEW_BRANCH:           'branch.view',
  CAN_MANAGE_TANKS:          'tank.manage',
  CAN_MANAGE_PUMPS:          'pump.manage',           // incl. idle/live/offline + fault note

  // Staff & roles (Module 1)
  CAN_VIEW_STAFF:            'staff.view',
  CAN_MANAGE_STAFF:          'staff.manage',          // add/assign/deactivate
  CAN_MANAGE_ROSTER:         'roster.manage',
  CAN_MANAGE_ROLES:          'role.manage',           // create/edit roles + permissions
  CAN_ASSIGN_ROLES:          'role.assign',           // grant a role to a membership

  // Day & shifts (Module 2)
  CAN_RECORD_DIP:            'dip.record',
  CAN_OPEN_SHIFT:            'shift.open',
  CAN_CLOSE_OWN_SHIFT:       'shift.close.own',       // attendant closes their pump
  CAN_CLOSE_ANY_SHIFT:       'shift.close.any',
  CAN_POST_SHIFT:            'shift.post',            // sign off
  CAN_VOID_SHIFT:            'shift.void',            // the VOID idiom
  CAN_EDIT_POSTED:           'posted.edit',           // edit posted entry (audited)
  CAN_VIEW_RECONCILIATION:   'reconciliation.view',

  // Deliveries (Module 3)
  CAN_RECORD_DELIVERY:       'delivery.record',
  CAN_SIGN_DELIVERY:         'delivery.sign',

  // Pricing (Module 4)
  CAN_SET_PRICE:             'price.set',
  CAN_VIEW_PRICE_HISTORY:    'price.history.view',

  // Expenses (Module 5)
  CAN_RECORD_EXPENSE:        'expense.record',
  CAN_VIEW_EXPENSES:         'expense.view',          // rolled-up review

  // Roll-up & reports (Module 7)
  CAN_VIEW_ROLLUP:           'rollup.view',           // cross-branch owner view
  CAN_EXPORT_REPORTS:        'report.export',

  // Notes & audit (Module 9)
  CAN_ADD_NOTE:              'note.add',
  CAN_VIEW_AUDIT:            'audit.view',
} as const;

export type Permission = (typeof P)[keyof typeof P];
```

### 2.2 Permission descriptions POJO

`packages/core/src/auth/permission-descriptions.ts` — keyed by the permission *value*, for
the role-builder UI.

```ts
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [P.CAN_VOID_SHIFT]: 'Void a posted shift through the critical VOID confirmation.',
  [P.CAN_SET_PRICE]:  'Set a new pump price per product, with effective time and reason.',
  // ...one line per key
};
```

### 2.3 Seeded system roles (per org, editable)

On org creation we seed three `Role` docs. Permission sets are the spec defaults:

| Role | Seeded permissions |
|---|---|
| **Owner** | all of `P` (the "owner wins ties" role) |
| **Manager** | everything except `CAN_MANAGE_ORG`, `CAN_MANAGE_ROLES`; branch-scoped. Includes shift open/close/post/void, dips, deliveries, expenses, roster, staff, price (if branch permits), audit view of own branch |
| **Attendant** | `CAN_CLOSE_OWN_SHIFT`, `CAN_RECORD_EXPENSE`, `CAN_ADD_NOTE`, `CAN_VIEW_BRANCH` (own), `CAN_RECORD_DIP` (no), — i.e. close own pump, file notes, record own expenses only |

`isSystem: true` marks them; they remain editable (per owner's instruction). **Guardrail:**
the service refuses any edit/role-change that would leave the org with **zero memberships
holding `CAN_MANAGE_ROLES` + `CAN_MANAGE_STAFF`** (last-owner lockout protection) →
`409 last_owner`.

### 2.4 Scoping — per-branch membership

```
Org    { id, name, wordmark, ... }
User   { id, name, email, phone, phoneVerifiedAt, passwordHash, isActive }   // global identity
Membership { id, orgId, userId, branchId | '*', roleId, defaultPumpId?, isActive }
Role   { id, orgId, name, isSystem, permissions: Permission[] }
```

- A user has **one membership per branch** they work at. `branchId: '*'` = org-wide (owner).
- **Effective permissions for a request** = the permission set of the role on the membership
  that matches the *target branch* (or the `'*'` membership). Resolved in
  `authorize.middleware` and cached on `requestContext`.
- **Cross-branch reads** (roll-up) require a `'*'` membership OR aggregate only the branches
  the user has membership in.

### 2.5 Authorization flow

```
requireAuth            → verify JWT, load user, set ctx.userId/orgId
resolveBranchScope     → from :branchId param or body, find caller's membership for that branch
requirePermission(P.X) → assert P.X ∈ effective permissions for the resolved branch → else 403 forbidden
```

Cross-tenant / cross-branch access returns **403 forbidden, not 404** (don't leak existence).

---

## 3. Auth & onboarding (Module 1)

- **Sign-up (Owner)** creates `User` + `Org` + seeded roles + an org-wide (`*`) `Membership`
  with the Owner role, in one transaction. Phone **OTP required** before workspace unlocks.
- **JWT**: short access (15m) + refresh (30d), secrets from `env.ts` (already declared).
  Refresh endpoint already expected by the FE client (`afterResponse` 401 handler).
- **Onboarding wizard** (business name, #branches, products, staff) is a sequence of the
  normal create endpoints; backend exposes no special wizard endpoint.

---

## 4. Endpoints (the full FE-facing surface)

Base `/(api/v1)`. Envelope `{ data, meta? }` / `{ error }`. `Auth` = needs access token.
`Perm` = required permission (branch-scoped where a `:branchId` is present). Lists are
**cursor-paginated** (`?cursor=&limit=`, response `meta: { nextCursor, hasMore }`).

### Auth & account — Module 1
| Method | Path | Auth | Perm | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | — | — | owner sign-up → creates org+roles+membership; `phone_verification_required: true` |
| POST | `/auth/verify-otp` | — | — | verify phone → returns tokens |
| POST | `/auth/resend-otp` | — | — | rate-limited |
| POST | `/auth/login` | — | — | → tokens + user |
| POST | `/auth/refresh` | — | — | rotate tokens |
| POST | `/auth/logout` | ✅ | — | revoke refresh |
| GET | `/me` | ✅ | — | user + memberships (branches + role per branch) + effective perms |
| PATCH | `/org` | ✅ | `MANAGE_ORG` | business display name, wordmark |

### Roles & permissions — Module 1 (new)
| Method | Path | Auth | Perm | Notes |
|---|---|---|---|---|
| GET | `/permissions` | ✅ | — | the `P` catalogue + descriptions (for role builder) |
| GET | `/roles` | ✅ | `MANAGE_ROLES`\|`VIEW_STAFF` | org roles (system + custom) |
| POST | `/roles` | ✅ | `MANAGE_ROLES` | create custom role `{ name, permissions[] }` |
| PATCH | `/roles/:id` | ✅ | `MANAGE_ROLES` | edit name/permissions (incl. system roles); last-owner guard |
| DELETE | `/roles/:id` | ✅ | `MANAGE_ROLES` | custom only; 409 if assigned or `isSystem` |

### Branches, tanks, pumps — Module 1
| Method | Path | Auth | Perm | Notes |
|---|---|---|---|---|
| GET | `/branches` | ✅ | `VIEW_BRANCH` | branches the caller has membership in (owner: all). The login landing list |
| POST | `/branches` | ✅ | `CREATE_BRANCH` | name, city, state, tanks[], pumps[] |
| GET | `/branches/:branchId` | ✅ | `VIEW_BRANCH` | branch + tanks + pumps + settings |
| PATCH | `/branches/:branchId` | ✅ | `EDIT_BRANCH` | name/location/**settings** (require-closing-dip, variance-flag-₦, manager-may-set-price) |
| POST | `/branches/:branchId/archive` | ✅ | `ARCHIVE_BRANCH` | archive (history stays readable) |
| POST | `/branches/:branchId/tanks` | ✅ | `MANAGE_TANKS` | one per product; capacity + reorder threshold (L) |
| PATCH | `/branches/:branchId/tanks/:tankId` | ✅ | `MANAGE_TANKS` | |
| POST | `/branches/:branchId/pumps` | ✅ | `MANAGE_PUMPS` | tied to product |
| PATCH | `/branches/:branchId/pumps/:pumpId` | ✅ | `MANAGE_PUMPS` | state idle/live/offline + fault note |

### Staff & roster — Module 1
| Method | Path | Auth | Perm | Notes |
|---|---|---|---|---|
| GET | `/branches/:branchId/staff` | ✅ | `VIEW_STAFF` | directory: role, join date, 30-day shift count, variance track-record |
| POST | `/branches/:branchId/staff` | ✅ | `MANAGE_STAFF` | add user + membership(role) [+ default pump for attendant] |
| PATCH | `/staff/:membershipId` | ✅ | `MANAGE_STAFF`\|`ASSIGN_ROLES` | change role/default pump/deactivate (entries stay attributed) |
| GET | `/branches/:branchId/roster` | ✅ | `VIEW_STAFF` | weekly grid (morning/evening/off), current day marked |
| PUT | `/branches/:branchId/roster` | ✅ | `MANAGE_ROSTER` | set week assignments |
| GET | `/branches/:branchId/variance-leaderboard` | ✅ | `VIEW_STAFF` | per-head 30-day shortage/overage (private review) |

### Day, shifts, dips — Module 2
| Method | Path | Auth | Perm | Notes |
|---|---|---|---|---|
| GET | `/branches/:branchId/daybook?date=` | ✅ | `VIEW_BRANCH` | ordered day entries (dips, shifts, expenses, prices, deliveries) + day-total strip |
| POST | `/branches/:branchId/dips` | ✅ | `RECORD_DIP` | opening or closing dip per tank; opening carries prev close fwd |
| POST | `/branches/:branchId/shifts` | ✅ | `OPEN_SHIFT` | open shift: pump(s), attendant, opening meter (carries prev close), pinned price |
| GET | `/shifts/:shiftId` | ✅ | `VIEW_RECONCILIATION` | meter trail + cash trail + variance |
| PATCH | `/shifts/:shiftId` | ✅ | `CLOSE_OWN_SHIFT`\|`CLOSE_ANY_SHIFT` | closing meter + cash declared → computes litres + variance; closing<opening ⇒ 422 |
| POST | `/shifts/:shiftId/post` | ✅ | `POST_SHIFT` | sign off (name+timestamp); blocked if branch rule unmet (e.g. closing dip) |
| POST | `/branches/:branchId/shifts/post-balanced` | ✅ | `POST_SHIFT` | post all balanced shifts at once |
| POST | `/shifts/:shiftId/void` | ✅ | `VOID_SHIFT` | **VOID idiom**: reason required, typed-VOID confirm, stays visible struck-through, audited |
| GET | `/branches/:branchId/tanks/readout?date=` | ✅ | `VIEW_BRANCH` | fill %, running balance, reorder flag, days-remaining, 7-day trail |

### Deliveries — Module 3
| Method | Path | Auth | Perm | Notes |
|---|---|---|---|---|
| GET | `/branches/:branchId/deliveries` | ✅ | `VIEW_BRANCH` | list; pending/expected surfaced |
| POST | `/branches/:branchId/deliveries` | ✅ | `RECORD_DELIVERY` | product, waybill, supplier, driver, plate, witness, litres, cost/L |
| PATCH | `/deliveries/:deliveryId` | ✅ | `RECORD_DELIVERY` | step the 4-stage flow + dip-before/after; computes variance vs tolerance |
| POST | `/deliveries/:deliveryId/sign` | ✅ | `SIGN_DELIVERY` | witness present → files waybill, updates tank balance (tx) |

### Pricing — Module 4
| Method | Path | Auth | Perm | Notes |
|---|---|---|---|---|
| GET | `/branches/:branchId/prices` | ✅ | `VIEW_BRANCH` | current price per product |
| POST | `/branches/:branchId/prices` | ✅ | `SET_PRICE` | new price/L, effective time, **reason**; pins to first shift after effective moment |
| GET | `/branches/:branchId/prices/:product/history` | ✅ | `VIEW_PRICE_HISTORY` | from→to, who, when, why (incl. held-steady) |
| POST | `/branches/:branchId/prices/preview` | ✅ | `SET_PRICE` | impact: delta/L, branches affected, litres in tanks, stock re-valuation |

### Expenses — Module 5
| Method | Path | Auth | Perm | Notes |
|---|---|---|---|---|
| GET | `/branches/:branchId/expenses` | ✅ | `VIEW_EXPENSES` | rolled by day/week/month vs prior period; single-source flag |
| POST | `/branches/:branchId/expenses` | ✅ | `RECORD_EXPENSE` | time, category, description, amount_kobo, recorder, witness? |
| GET | `/expenses/:expenseId` | ✅ | `VIEW_EXPENSES` | drill-in: recorder, witness, note |

### Roll-up & reports — Module 7
| Method | Path | Auth | Perm | Notes |
|---|---|---|---|---|
| GET | `/rollup?date=` | ✅ | `VIEW_ROLLUP` | **cross-branch morning roll-up**: per-branch litres/gross/variance/status pill + lead summary + "things to do" list |
| GET | `/rollup/trends?days=` | ✅ | `VIEW_ROLLUP` | 7-day litres per branch + 30-day variance vs budget |
| GET | `/reports/export` | ✅ | `EXPORT_REPORTS` | daybook/branch-summary/delivery/expense → PDF (async ⇒ 202) |

### Notes & audit — Module 9
| Method | Path | Auth | Perm | Notes |
|---|---|---|---|---|
| GET | `/:entityType/:entityId/notes` | ✅ | `VIEW_BRANCH` | thread on a shift/expense/delivery |
| POST | `/:entityType/:entityId/notes` | ✅ | `ADD_NOTE` | body + @mentions (notify) |
| GET | `/branches/:branchId/audit` | ✅ | `VIEW_AUDIT` | timeline of every state change; filterable; exportable |

### Notifications — Module 10 (in-app only, v1)
| Method | Path | Auth | Perm | Notes |
|---|---|---|---|---|
| GET | `/notifications` | ✅ | — | caller's in-app banners/toasts feed |
| POST | `/notifications/:id/read` | ✅ | — | mark read |

> Route order in `app.ts`: specific before parameterized (`/me` before `/:id`,
> `/shifts/post-balanced` before `/shifts/:id`). Already a convention.

---

## 5. Response shapes (the seam contract)

Canonical conventions (verify at the seam, both sides):

- **IDs**: prefixed ULID strings (`brn_…`, `shf_…`, `dlv_…`, `exp_…`, `rol_…`, `mbr_…`, `usr_…`, `org_…`).
- **Money**: integer **kobo**, field suffix `_kobo` (e.g. `cash_declared_kobo`, `variance_kobo`, `price_per_litre_kobo`). FE formats with `formatNaira()`.
- **Litres/meters**: numbers (litres), key as-is. **Variance status**: `'balanced' | 'short' | 'over'`.
- **Dates**: ISO 8601 strings, always. Never a number.
- **Arrays**: `[]` when empty, never `null`.
- **Pagination**: `meta: { nextCursor: string | null, hasMore: boolean }`.
- **Errors**: switch on `error.code` (stable), not `message`.

Example — reconciliation row (`GET /shifts/:id`):

```jsonc
{ "data": {
  "id": "shf_01HV…", "branch_id": "brn_…", "pump_id": "pmp_…",
  "attendant": { "id": "usr_…", "name": "…" },
  "product": "PMS", "window": "morning",
  "opening_meter": 12450.0, "closing_meter": 13010.5, "litres": 560.5,
  "price_per_litre_kobo": 89000,
  "expected_gross_kobo": 49884500, "cash_declared_kobo": 49800000,
  "variance_kobo": -84500, "status": "short",
  "is_posted": true, "is_voided": false,
  "posted_by": "usr_…", "posted_at": "2026-05-24T13:02:00.000Z",
  "notes": []
} }
```

New error codes to add to `error-codes.ts`: `invalid_credentials`, `otp_invalid`,
`otp_expired`, `phone_unverified`, `closing_below_opening` (422), `invalid_state_transition`,
`shift_not_closed`, `branch_rule_unmet`, `last_owner`, `role_in_use`, `delivery_unsigned`.

---

## 6. Core domain logic (the maths that must be right)

- **Shift variance** = `expected_gross_kobo − cash_declared_kobo`, where
  `expected_gross_kobo = round(litres × price_per_litre_kobo)`. `litres = closing − opening`
  (reject `closing < opening` → `422 closing_below_opening`). Status: `0` balanced,
  `<0` short, `>0` over. All integer kobo — no float drift.
- **Price pinning**: a shift opened **before** a price's effective moment keeps the old price
  to close; shifts opened **at/after** use the new price. Resolve price *at open time* and
  store `price_per_litre_kobo` on the shift — never recompute from current price.
- **Wet-stock variance** (closing dip): `opening_dip + delivered − sold` vs physical
  `closing_dip`. Flag beyond branch tolerance.
- **Delivery variance**: `(dip_before + waybill_litres) − dip_after`, flagged vs configurable
  tolerance (default ±200 L).
- **Posting guard**: cannot post if a branch rule is unmet (e.g. closing-dip-required and no
  closing dip recorded) → `400 branch_rule_unmet`.
- **Void**: posted shift only; requires reason; remains visible (`is_voided: true`, struck);
  writes an audit entry. Reverses its contribution to tank/cash roll-ups.
- **Audit**: every state-changing service writes an append-only audit doc
  `{ actor, action, entityType, entityId, before?, after?, note?, at }` inside the same
  transaction as the change.

---

## 7. Data model (collections / future tables)

`orgs`, `users`, `memberships`, `roles`, `branches`, `tanks`, `pumps`, `staff_roster`,
`shifts`, `dips`, `deliveries`, `prices` (append-only log), `expenses`, `notes`,
`notifications`, `audit_log` (append-only), `otps`, `refresh_tokens`.

Each doc: string `_id` (prefixed ULID), `createdAt`/`updatedAt` ISO, `orgId` for tenancy,
`branchId` where branch-scoped. Indexes the Mongo impl will need: `{orgId, branchId}` on
branch-scoped reads, `{branchId, date}` on daybook/shifts, `{userId}` on memberships,
`{entityType, entityId}` on notes/audit.

---

## 8. Build sequence (vertical slices, each fully done before the next)

1. **Foundation**: `db/client.ts` + `withTransaction`, `service-result.ts`, `messages.ts`,
   ULID `ids.ts`, `pagination.ts`. No feature yet.
2. **Auth + RBAC core**: users/orgs/roles/memberships, register+OTP+login+refresh, JWT,
   `requireAuth` / `requirePermission`, `/me`, `/permissions`, `/roles`. *Everything depends on this.*
3. **Branches + tanks + pumps** (Module 1) — the login landing list.
4. **Staff & roster** (Module 1).
5. **Pricing** (Module 4) — needed before shifts can pin a price.
6. **Shifts + dips + reconciliation + post + void** (Module 2) — the spine.
7. **Deliveries** (Module 3).
8. **Expenses** (Module 5).
9. **Audit + notes** (Module 9) — writer added incrementally from step 2; read API here.
10. **Roll-up + trends + reports** (Module 7) — reads across the above.
11. **Notifications** (Module 10).

Each slice: model → repo interface → mongo repo → service (`ServiceResult`) →
controller → route (registered in order) → **contract test** (parse response through a zod
schema, assert envelope shape) → extend `packages/api` `EP` + a react-query hook → tick the
contract-drift checklist. Then a Backend→QA handoff doc in `docs/qas/`.

---

## 9. Guardrails (non-negotiable, from the persona + conventions)

Never throw from services (return `ServiceResult`) · never pass `req` into a service · never
offset pagination · never store money as float · no hardcoded response strings (message keys)
· never `res.json()` directly (use `ResponseUtil`) · no `any` · `asyncHandler` on every route
· specific routes before parameterized in `app.ts` · stub external services in tests · soft-delete,
never hard-delete · **no Mongo type escapes a `*.repo.mongo.ts` file.**
