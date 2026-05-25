# Plan — Clickable ID refs, Staff detail, Multi-branch assignment

> Scope: make audit/log IDs human + clickable, add a staff-detail surface (activity, metrics,
> management), and expose the multi-branch capability the data model already supports.
> Pairs with `docs/api-docs.md` + `docs/backend-plan.md`. Decisions confirmed with the owner
> 2026-05-24 (see §0).

## 0. Decisions (locked)

1. **ID → label resolution: backend enriches.** List endpoints that carry raw IDs also return a
   `refs` map `{ "<id>": { type, label, href_kind } }`. The FE renders a label + link from it.
   Covers every `entity_type` (user, role, shift, delivery, expense, pump, tank, branch,
   membership, roster, org). One server-side resolve; paginates cleanly.
2. **Multi-branch = add a 2nd membership.** "Assign to another branch" creates/activates a
   membership in the target branch with a role **from that branch's roles**. Existing
   memberships stay unless explicitly deactivated. No schema change — the model already allows
   one membership per `(orgId, userId, branchId)` (unique index on the triple).
3. **Staff detail page does it all:** change role / deactivate / move-assign, trigger password
   reset, edit account (name/contact), and show activity + shifts + schedule + metrics.

---

## 1. What already exists (no change needed)

- `Membership { orgId, userId, branchId, roleId, … }`, unique on `(orgId,userId,branchId)`,
  index `{userId}` — **multi-branch is already storable.** `membershipRepo.findByUser(userId)`
  returns all of a user's memberships.
- `staff.service` has `add`, `update` (role/defaultPump/isActive), `directory`, `roster`,
  `leaderboard`. `update` is branch-aware via `requirePermissionForBranch` (BUG-02 fix).
- `auditRepo.list({ orgId, branchId?, entityType?, entityId? })` — cursor-paginated; the audit
  writer already records `actorId`, `entityType`, `entityId` on every state change.
- `AppTooltip` (hover+focus, `compact={false}` = w-80 hovercard, arbitrary JSX), `AppAvatar`
  (role tints), `AppPill`, `AppText as="a"`. No copy-to-clipboard, no id-render helper yet.

## 2. The core problem

Audit screen (`audit-screen.tsx:55,61`), variance leaderboard (`staff-screen.tsx`), daybook
(`daybook-screen.tsx:146`), and shift detail (`shift-detail-screen.tsx:75`) all print raw
`usr_…`/`rol_…`/`shf_…`/`aud_…` strings. Users don't understand them. Root cause: those
endpoints return IDs without labels.

---

## 3. Backend changes

### 3.1 A reusable reference resolver (new) — `features/refs/`

`refs.service.ts` — `resolveRefs(orgId, ids: string[]): Promise<Record<string, Ref>>` where:

```ts
type RefType = 'user' | 'role' | 'shift' | 'delivery' | 'expense' | 'pump' | 'tank'
             | 'branch' | 'membership' | 'roster' | 'org';
interface Ref { type: RefType; label: string; hrefKind: 'user' | 'shift' | 'delivery' | 'branch' | null; }
```

- Infers each id's type from its **ULID prefix** (`usr_`→user, `rol_`→role, `shf_`→shift,
  `dlv_`→delivery, `exp_`→expense, `pmp_`→pump, `tnk_`→tank, `brn_`→branch, `mbr_`→membership,
  `rst_`→roster, `org_`→org; see `lib/ids.ts ID_PREFIX`). Unknown prefix → omitted.
- Batches one query per collection (`$in`), all scoped by `orgId` (tenant-safe). Maps to a
  friendly `label`: user→name, role→name, shift→`"Shift · <pump label>"` (or date), pump→label,
  branch→name, membership→the member's name, etc.
- `hrefKind` tells the FE whether/where the id is navigable (user/shift/delivery/branch get
  detail pages; role/pump/tank/roster are label-only for now).
- Lives in its own feature so audit, daybook, and future screens all reuse it. No writes.

### 3.2 Audit endpoint returns `refs`

`audit.controller.list` — after building the page, collect every id appearing in items
(`actor_id`, `entity_id`, plus ids found in `before`/`after` values), call
`refsService.resolveRefs`, and add `refs` to the response:

```jsonc
{ "data": { "items": [ … ] }, "meta": { … }, "refs": { "usr_…": {"type":"user","label":"Tunde A.","href_kind":"user"}, … } }
```

(Envelope already supports `meta`; `refs` rides alongside `data`. Add `refs?` to the success
envelope type, or nest under `meta.refs` — **decision: top-level `refs`**, it's not pagination.)

### 3.3 Staff detail endpoint (new) — `GET /staff/:userId`

Branch-scoped authorization via `requirePermissionForBranch` (resolve against any branch the
target shares with the caller; owner `*` always). Returns the person across the org:

```jsonc
{ "data": {
  "user": { id, name, email, phone, email_verified, phone_verified, is_active, created_at },
  "memberships": [ { id, branch_id, branch_name, role_id, role_name, default_pump_id, is_active, permissions } ],
  "metrics": { "shift_count_total": n, "shift_count_30d": n, "variance_kobo_30d": n },
  "recent_shifts": [ { id, branch_id, business_date, pump_id, litres, variance_kobo, status } ],
  "schedule": { "week_start": "…", "assignments_by_branch": { "<branchId>": ["morning",…] } }
} }
```

Reads: `userRepo.findById`, `membershipRepo.findByUser` (+ role + branch names),
`staffStatsRepo` (extend with a total + cross-branch variant), shifts by `attendantId`, roster
for the user. New repo methods: `shiftRepo.findByAttendant(userId, limit)`,
`staffStatsRepo.userTotals(userId)`.

### 3.4 Staff "activity" = audit filtered by actor (reuse)

`GET /staff/:userId/activity` → `auditRepo.list({ orgId, entityId?: …, actorId: userId })`.
**New filter:** add `actorId` to `AuditQuery` + the mongo `list` filter + an index
`{ orgId, actorId, at: -1 }`. Returns the same `refs`-enriched shape as §3.2.

### 3.5 Assign to another branch (new) — `POST /branches/:branchId/staff/:userId/assign`

Body `{ role_id }` (role must belong to `:branchId`). Creates a membership for the user in
`:branchId` (or reactivates a deactivated one). Guard: not a duplicate active membership
(`409 already_member`). Audited `staff.assigned`. `:branchId` drives permission scope
(`CAN_MANAGE_STAFF` / `CAN_ASSIGN_ROLES`). This is the multi-branch primitive.

### 3.6 Trigger password reset (new) — `POST /staff/:userId/reset-password`

Sets a fresh temp password (dev: returns it; prod: forces reset on next login) OR issues a
reset OTP on the user's verified channel — reuses the channel/OTP machinery from the auth-
verification work. Audited `staff.password_reset`. Permission `CAN_MANAGE_STAFF`.

### 3.7 Edit account (new) — `PATCH /staff/:userId`

Body `{ name?, email?, phone? }` → patches the **user** doc (distinct from membership update).
Email/phone uniqueness re-checked; changing a contact clears its `*_verified` flag (re-verify).
New `userRepo.update`. Audited `staff.account_updated`. Permission `CAN_MANAGE_STAFF`.

### 3.8 Files touched / added (backend)

- **new** `features/refs/refs.service.ts` (+ `refs.repo.ts`/`.mongo.ts` if a dedicated multi-get
  is cleaner than reusing each feature's repo).
- `features/audit/audit.controller.ts` — attach `refs`; `audit.repo.ts`/`.mongo.ts` — `actorId`
  filter; `db/indexes.ts` — `{orgId,actorId,at:-1}`.
- `features/staff/staff.service.ts` — `getDetail`, `activity`, `assignToBranch`, `resetPassword`,
  `editAccount`; `staff.controller.ts` + `index.ts` — new routes; `staff.schema.ts` — new bodies.
- `features/staff/staff-stats.repo.ts` — `userTotals`; `features/shifts/shifts.repo.*` —
  `findByAttendant`.
- `features/auth/auth.repo.ts`/`.mongo.ts` — `userRepo.update`.
- `lib/messages.ts` — `already_member`, `account_updated`, etc.
- `shared/serializers.ts` — `serializeRef`, staff-detail serializer.
- `shared/types/envelope.types.ts` — optional top-level `refs` on success envelope.

---

## 4. Seam changes (`packages/api`)

- `endpoints.ts` (`EP`): `STAFF_DETAIL(userId)`, `STAFF_ACTIVITY(userId)`,
  `STAFF_ASSIGN(branchId, userId)`, `STAFF_RESET_PASSWORD(userId)`, `STAFF_ACCOUNT(userId)`.
- `types/wire.ts`: `RefWire`, `RefMap = Record<string, RefWire>`; add `refs?: RefMap` to the
  audit response type; `StaffDetailWire`, `StaffMembershipWire`, `StaffMetricsWire`.
- `types/payloads.ts`: `AssignBranchPayload {role_id}`, `EditAccountPayload {name?,email?,phone?}`.
- `hooks/use-staff.ts`: `useStaffDetail(userId)`, `useStaffActivity(userId)`,
  `useAssignBranch(branchId,userId)`, `useResetPassword(userId)`, `useEditAccount(userId)`.
- `hooks/use-notes-audit.ts`: `useAudit` returns `{ items, refs }` (not just items).
- `QK` (core query-keys): `staffDetail(userId)`, `staffActivity(userId)`.

---

## 5. Web UI changes

### 5.1 `<IdRef id refs />` — the shared building block (new, in web `shared/`)

Given an id + the `refs` map: renders the **label** (not the id). If `href_kind` is set, wraps
it in an `AppText as="a"` link to the right route; wraps everything in an `AppTooltip`
(`compact={false}`) hovercard showing **"Go to <label>"** + type. Unknown id → muted mono
fallback (graceful). One component, used by audit, leaderboard, daybook, shift detail.

- (i) clickable ✔ (ii) hover tooltip "Go to …" ✔ (iii) user ids → staff detail ✔

### 5.2 Audit screen

Replace raw `{entry.actor_id}` / `{entry.entity_id}` with `<IdRef id refs />`. Pull `refs`
from the enriched `useAudit`. Also resolve any ids inside `before`/`after` when rendered.

### 5.3 Variance leaderboard + daybook + shift detail

Swap raw `attendant_id` / `pump_id` for `<IdRef>` (leaderboard needs the staff name; daybook
shows attendant name + pump label). These already have nearby data but `<IdRef>` unifies it.

### 5.4 Staff detail screen (new) — route `BRANCH_STAFF_MEMBER(branchId, userId)`

- **core `ROUTES`**: `BRANCH_STAFF_MEMBER(branchId,userId) => /branches/:branchId/staff/:userId`;
  `BRANCH_SEGMENT.STAFF_MEMBER = 'staff/:userId'`. New `<Route>` after STAFF in `app.routes.tsx`.
- **Header**: avatar, name, role pill(s) per branch, active toggle, verification chips.
- **Tabs/sections**: Activity (their audit, `<IdRef>` throughout) · Shifts (recent + totals) ·
  Schedule (roster) · Metrics (30-day shifts, variance track-record).
- **Actions** (gated on `CAN_MANAGE_STAFF`/`CAN_ASSIGN_ROLES`, via DrawerService modals):
  Change role (this branch) · Deactivate/Reactivate · **Assign to another branch** (pick branch
  → pick role *from that branch's roles* → confirm) · Trigger password reset (confirm) · Edit
  account (name/email/phone form).
- Staff list rows + leaderboard rows link to this page.

### 5.5 Copy + primitives

- New `IdRef` lives in `apps/web/src/shared/` (it needs `ROUTES`, not a pure UI primitive).
- `staff.copy.ts` — detail page + action copy (channel-neutral).
- Optional tiny `useCopyToClipboard` for "copy id" in the hovercard (nice-to-have).

---

## 6. Build order

1. Backend `refs.service` + audit `refs` + `actorId` filter/index. (Unblocks `<IdRef>`.)
2. Seam: `RefWire`/`RefMap`, `useAudit` returns refs, EP + payloads + staff hooks.
3. Web `<IdRef>` + wire into audit/leaderboard/daybook/shift. **(delivers i/ii/iii for existing screens)**
4. Backend staff detail (`getDetail`/`activity`) + repo methods + `userRepo.update`.
5. Backend staff actions: `assignToBranch`, `resetPassword`, `editAccount`.
6. Web staff-detail screen + route + action modals; link rows to it.
7. `docs/api-docs.md` + `docs/qas/backend/plans/test-plan.md` updates; live-verify; typecheck/lint/build.

## 7. Open questions / notes

- **Cross-branch visibility on staff detail:** a branch-scoped Manager opening `/staff/:userId`
  sees the person's *other* branches in `memberships[]`. Decision: show all memberships but only
  allow **actions** on branches the caller has `CAN_MANAGE_STAFF` for. (Owner sees/does all.)
- **`refs` size:** bounded by page size (≤100 items × a few ids) — one batched resolve, fine.
- **Label for shift/delivery:** keep short + meaningful (`"Shift · P1 · 23 May"`); avoid leaking
  another raw id inside the label.
- Real email/SMS send for reset OTP is still stubbed (dev `000000`) — same as auth-verification.
