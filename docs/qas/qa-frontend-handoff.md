# QA Handoff — Operator App (Frontend)

The Dipstick operator web app (`apps/web`) — every screen built against the live `main-backend`
API. A QA frontend engineer should be able to run browser tests from this document alone.

**Date:** 2026-05-24
**Build:** Typecheck ✅ · Lint ✅ · Build ✅ (`pnpm nx run-many -t typecheck lint build` → 6/6)
**Frontend URL:** `http://localhost:5173` (Vite picks the next free port if taken — watch the boot log)
**Backend URL:** `http://localhost:8091` · API base `http://localhost:8091/api/v1`
**Seed account:** register a fresh owner in-app (dev returns `dev_otp: "000000"`).

```bash
pnpm nx serve main-backend     # API on :8091 (needs Mongo on 127.0.0.1:27017)
pnpm nx serve web              # operator app on :5173
```

---

## Cross-cutting behaviour (verify once, applies everywhere)

### Design tokens — the app is NOT white/black
- Background is **warm cream** (`#F2EDE2`), cards are lighter cream **sheets** with hairline edges,
  text is **warm ink** (never pure black), the single accent is **deep emerald** (`#0E5C3A`).
- Figures (litres, naira, meters, ids) are **IBM Plex Mono, tabular** at every size.
- If any screen renders pure white background / pure black text / blue inputs, the token stylesheet
  failed to load — that is a **bug** (regression of the `@dipstick/ui/styles.css` global import).
- Browser autofill stays on the cream sheet (not pale blue).

### Errors surface BOTH ways (every form, every mutation)
On any API error the app shows **both**:
1. **Inline** — the offending field gets a red message under it (via `FieldRow`), and the input border turns oxblood.
2. **Toast** — a dark toast slides in bottom-right with mark `✕ ERROR` and the summary message.

The API reports **one field at a time** (earliest invalid field in form order). Fix it, resubmit, the next
field's error appears. Field-level errors map by the API `field` key (snake_case): `email`, `phone`,
`password`, `closing_meter`, `cash_declared_kobo`, `price_per_litre_kobo`, `confirm`, etc.

### Success toasts
Every successful mutation fires a toast with a mono mark, e.g. `✓ SIGNED IN`, `✓ ACCOUNT CREATED`,
`✓ PHONE VERIFIED`, `✓ BRANCH ADDED`, `✓ PUMP CLOSED`, `✓ SHIFT POSTED`, `✓ SHIFT VOIDED`,
`✓ OFFLOAD SIGNED`, `✓ PRICE SET`, `✓ EXPENSE ADDED`, `✓ STAFF ADDED`, `✓ ROSTER SAVED`, `✓ ROLE SAVED`.

### Permission gating
UI actions are gated off the effective permission set from `GET /me` (`memberships[].permissions`).
An owner (org-wide membership, `branch_id: "*"`) sees everything; a branch-scoped member sees only
their branch and only the actions their role grants. Buttons the role can't perform are **absent**, not disabled.

### Loading / error / empty
Every data screen shows: a **skeleton** while loading; a hairline **alert** ("Couldn't load this…")
on fetch failure; a serif **empty state** with an icon + guidance when there are no records.

### Navigation model (READ FIRST — changed)
There are **two layouts**:
- **Bare (no sidebar)** — the **Branches list** (the home), the **Overview**, and **Settings**. A slim
  top header carries the wordmark (links to `/branches`) + the account menu. Full-width pages.
- **Branch shell (sidebar)** — appears **only after you enter a branch** (`/branches/:branchId/*`). The
  sidebar shows a **"← All branches"** link, the branch name, and branch-scoped nav (Day-book, Deliveries,
  Expenses, Pricing, Staff, Roster, Audit log).

Flow: **owner logs in → lands on `/branches`** → taps a branch → enters the branch shell. From the branches
list, the **"Overview"** button opens the roll-up; the roll-up has a **"← Branches"** button back. There is
**no Roll-up / Branches item in the sidebar** — those live outside the shell now.

---

## Auth flow (public — no app shell)

### Register — `/register`
**File:** `src/features/auth/screen/register-screen.tsx`
- Heading **"Open your logbook."**, overline `CREATE ACCOUNT`, subtitle "You're the owner. Add managers and attendants once you're in."
- Fields: Your name, Business name, Email, Phone number, Password (helper "At least 8 characters.").
- **"Create account"** → `POST /auth/register`. On success: a toast `✓ ACCOUNT CREATED`, the phone (+ dev OTP) is stashed, redirect to `/verify`.
- Footer link **"Already have an account? Sign in"** → `/login`.
- Verify errors: duplicate email/phone → toast + inline on that field.

### Verify phone — `/verify`
**File:** `src/features/auth/screen/verify-screen.tsx`
- Heading **"Enter the code."**, subtitle shows the phone the code was sent to.
- 6-digit **Verification code** field (mono, numeric, maxlength 6). In dev the helper shows `Dev code: 000000`.
- **"Verify & enter"** → `POST /auth/verify-otp` → stores tokens, toast `✓ PHONE VERIFIED`, redirect to **`/branches`**.
- **"Resend code"** → `POST /auth/resend-otp`, toast `✓ CODE SENT`.
- Visiting `/verify` with no pending registration redirects to `/register`.

### Login — `/login`
**File:** `src/features/auth/screen/login-screen.tsx`
- Heading **"Welcome back."**, subtitle "The day-book is waiting." Email + Password.
- **"Sign in"** → `POST /auth/login` → tokens stored, toast `✓ SIGNED IN`, redirect to **`/branches`** (the home).
- Footer **"New here? Create an owner account"** → `/register`.
- Bad credentials → `1002`: inline on **email** field ("Email or password is incorrect") + toast. Never reveals whether email or password was wrong.
- `phone_unverified` (1003) bounces to verification; `account_inactive` (1003) shows the message.

> **Forgot password** is intentionally **not built** (no backend endpoint). There is no link to it.

---

## Layouts

### Bare layout (no sidebar) — branches list, overview, settings
**File:** `src/features/shell/screen/bare-layout.tsx`
- Slim top header: wordmark **`Dipstick.`** (links to `/branches`) + the **account menu** (right).
- Full-width content below. Used for `/branches`, `/dashboard`, `/settings*`.

### Branch shell (sidebar) — only inside a branch
**File:** `src/features/shell/screen/shell-screen.tsx` — mounts only under `/branches/:branchId/*`.
- **Sidebar** (left, 240px): a **"← All branches"** link (→ `/branches`), the **branch name**, then
  branch-scoped nav grouped as The day (Day-book, Deliveries, Expenses) and Branch (Pricing, Staff, Roster,
  Audit log). Items appear only if the role has the permission. Active item is emerald-dotted.
- **Topbar**: branch switcher (`<select>` of visible branches; changing it navigates to that branch's day-book) + the account menu.

### Account menu (shared by both layouts)
**File:** `src/features/shell/parts/account-menu.tsx`
- **Notifications bell**: emerald unread-count badge; opens a dropdown of the caller's feed
  (`GET /notifications`); clicking an unread item marks it read (`POST /notifications/:id/read`). Empty → "Nothing yet."
- Signed-in user's name, **"Sign out"** → `POST /auth/logout`, clears the query cache, toast `✓ SIGNED OUT`, redirect to `/login`.

### Auth guard (both authed layouts)
No token → `/login`; token present but `/me` loading → quiet "Loading…"; `/me` fails → `/login`.

---

## Branches list — `/branches`  (the home / landing)

**File:** `src/features/branches/screen/branches-screen.tsx` · gate: `branch.view` · **bare layout (no sidebar)**
- Title "Your stations." Rows: name, `city · state`, an **Archived** pill if archived; **tapping a row enters the branch** (`/branches/:id`, sidebar shell).
- Header actions: **"Overview"** (secondary, only with `rollup.view`) → `/dashboard`; **"New branch"** (only with `branch.create`) → modal form (name, city, state) → `POST /branches`, toast `✓ BRANCH ADDED`.
- Empty state with a branch glyph + "Add your first station…".

---

## Overview (roll-up) — `/dashboard`  ★ signature scene

**File:** `src/features/rollup/screen/rollup-screen.tsx` · gate: `rollup.view` · **bare layout (no sidebar)**
- Overline `MORNING ROLL-UP`, title "Yesterday, across every branch.", a serif italic **lead** sentence from the API.
- Header action: **"← Branches"** button → back to `/branches`.
- Three total cards: **Litres sold** (L), **Gross** (₦), **Net variance** (₦, oxblood when short).
- **Per branch** list: each row → branch name, status pill (**Posted clean** / **Short** / **Reorder**), litres, gross, variance. Whole row links to that branch's day-book.
- **"Things to do this morning"**: oxblood-edged rows from `todo[]` (each links to the branch day-book). When empty: "Nothing flagged. A clean morning."
- Data: `GET /rollup` (defaults to yesterday) + `GET /rollup/trends`.

---

## Branch detail & in-branch screens (Module 1)

### Branch detail — `/branches/:branchId`  (entry to the branch shell)
**File:** `src/features/branches/screen/branch-detail-screen.tsx` · gate: `branch.view` · **sidebar shell**
- **Tanks** card: per tank a product mark, current/capacity litres, a fill **progress bar** with the reorder line as the ink target marker; tone goes amber→oxblood as it nears reorder.
- **Pumps** card: label, product chip, state pill (Idle / Live / Offline).
- **Settings** card: require closing dip, manager may set price, variance flag (₦), delivery tolerance (L).
- **"Archive branch"** (only with `branch.archive`, non-archived) → a confirm modal → `POST /branches/:id/archive`, toast `✓ BRANCH ARCHIVED`.

---

## The day & shifts (Module 2)  ★ signature scenes

### Day-book — `/branches/:branchId/daybook`
**File:** `src/features/daybook/screen/daybook-screen.tsx` · gate: `branch.view`
- Overline shows the date; **"Previous" / "Next"** day nav (drives `?date=`).
- **Reconciliation table**: columns Attendant · pump / Litres / Expected / Declared / Variance. Each variance cell
  carries a **flag** chip — Balanced (emerald) / Short (oxblood) / Over (amber). A **double-ruled day-total** foot row sums all columns.
- Rows are clickable → shift detail. **Voided** shifts render struck-through but visible (never hidden).
- **"Post all balanced"** (with `shift.post`) → `POST /shifts/post-balanced`, toast `✓ POSTED` ("N balanced shift(s) posted.").
- Empty → "Nothing recorded yet."

### Shift detail / close — `/branches/:branchId/shifts/:shiftId`
**File:** `src/features/daybook/screen/shift-detail-screen.tsx`
- Status pill (Open / Closed / Posted / Voided). **Meter trail** (opening / closing / dispensed) + **Cash trail** (expected / declared / variance as a tinted figure).
- If **Open**: a **"Close pump"** form — closing meter (L affix) + cash declared (₦ affix) → `PATCH /shifts/:id`, toast `✓ PUMP CLOSED`.
  - `closing_meter` below opening → `1007`: inline on the closing-meter field + toast.
- If **Closed** and `shift.post`: **"Post shift"** → `POST /shifts/:id/post`, toast `✓ SHIFT POSTED`. Branch-rule unmet (closing dip required) → `1007` toast.
- If **Posted** and `shift.void`: **"Void shift"** (oxblood/danger) → opens the **CRITICAL void modal**:
  - Hazard stripe, oxblood header, a required **reason** textarea, and a field that must equal the literal word **VOID**.
  - Confirm disabled until both are valid → `POST /shifts/:id/void`, toast `✓ SHIFT VOIDED`. This is the only hazard treatment in the app.

---

## Deliveries (Module 3)  ★ signature scene

### Deliveries list — `/branches/:branchId/deliveries`
**File:** `src/features/deliveries/screen/deliveries-screen.tsx` · gate: `branch.view`
- Rows: product mark, waybill number (mono), supplier · driver, waybill litres, cost/litre, a stage pill. Row → detail.
- **"Record offload"** (with `delivery.record`) → modal (product, tank, waybill #, supplier, driver, truck plate, witness, waybill litres, cost/litre) → `POST /deliveries`, toast `✓ OFFLOAD STARTED`.

### Tanker offload — `/branches/:branchId/deliveries/:deliveryId`
**File:** `src/features/deliveries/screen/delivery-detail-screen.tsx`
- A **4-step stepper**: Tanker arrived → Dip before → Offload → Dip after & sign (done steps emerald-checked, active step ink-ringed).
- Waybill card + a variance card showing dip-before, dip-after, and computed **variance litres** (oxblood when off-zero).
- Offload form (until signed): dip-before, dip-after, witness. **"Save step"** → `PATCH /deliveries/:id` (toast `✓ STEP SAVED`).
  **"Sign offload"** → `POST /deliveries/:id/sign` (requires both dips; updates tank balance), toast `✓ OFFLOAD SIGNED`. Dips missing → `1007` toast.

---

## Pricing (Module 4)

### Pricing — `/branches/:branchId/pricing`
**File:** `src/features/pricing/screen/pricing-screen.tsx` · gate: `branch.view`
- Three product cards (PMS / AGO / DPK): current price `₦/L` (mono) + effective time, or "No price set".
- **"Set price"** (with `price.set`) → modal: product, new price (₦), effective-at (datetime), reason.
  - **"Preview impact"** → `POST /prices/preview` → a ledger block (Δ per litre, litres in tank, stock re-valuation).
  - **"Confirm new price"** → `POST /prices`, toast `✓ PRICE SET`.
  - Manager blocked when `manager_may_set_price` is false → `1003` toast (owner always allowed).

---

## Expenses (Module 5)

### Expenses — `/branches/:branchId/expenses`
**File:** `src/features/expenses/screen/expenses-screen.tsx` · gate: `expense.view`
- Rows: description (serif), `category · date` (mono), an amber **Single-source** pill when no witness, amount (₦).
- **"Add expense"** (with `expense.record`) → modal: category select (Generator diesel / Maintenance / Union·NUPENG dues / Forecourt sundry / Cash advance / Other), description, amount (₦), witness (optional) → `POST /expenses`, toast `✓ EXPENSE ADDED`.

---

## Staff & roster & roles (Module 1)

### Staff — `/branches/:branchId/staff`
**File:** `src/features/staff/screen/staff-screen.tsx` · gate: `staff.view`
- Rows: role-tinted **avatar** (owner ink / manager emerald / attendant cream), name, phone, role pill, 30-day shift count, 30-day variance.
- **Variance leaderboard** card (worst shortage first) when data exists.
- **"Add staff"** (with `staff.manage`) → modal: name, email, phone, role select (from `GET /roles`), temporary password → `POST /staff`, toast `✓ STAFF ADDED`.

### Roster — `/branches/:branchId/roster`
**File:** `src/features/staff/screen/roster-screen.tsx` · gate: `staff.view`
- A week grid (Mon–Sun × attendant). Each cell shows the window and tints by it (Morning emerald-tint / Evening ink / Off cream).
- With `roster.manage`, clicking a cell cycles Morning → Evening → Off. **"Save roster"** → `PUT /roster`, toast `✓ ROSTER SAVED`.

### Roles & permissions — `/settings/roles`
**File:** `src/features/roles/screen/roles-screen.tsx` · gate: `role.manage`
- Rows: role name, a **System** pill for seeded roles, permission count, Edit / Delete.
- **"New role"** / **Edit** → modal with name + a scrollable permission checklist (from `GET /permissions`) → `POST` / `PATCH /roles`, toast `✓ ROLE SAVED`.
- **Delete** (custom roles only) → a typed-confirm modal (type `DELETE`) → `DELETE /roles/:id`, toast `✓ ROLE DELETED`. `role_in_use` / `last_owner` → toast.

---

## Audit & settings (Modules 9 / account)

### Audit log — `/branches/:branchId/audit`
**File:** `src/features/audit/screen/audit-screen.tsx` · gate: `audit.view`
- A newest-first timeline: relative time, action (mono), `entity_type · entity_id`, an italic note, "by <actor>".

### Settings — `/settings`, `/settings/org`
**Files:** `src/features/settings/screen/settings-screen.tsx`, `org-settings-screen.tsx`
- Settings landing: cards link to **Business profile** (`org.manage`) and **Roles & permissions** (`role.manage`).
- Business profile: edit display name + report wordmark → `PATCH /org`, toast `✓ SAVED`.
  - **Known gap:** `GET /me` doesn't return the org name/wordmark, so the form starts blank (owner-entered) rather than pre-filled.

---

## Route Registration

| Route | Screen | Layout | Notes |
|-------|--------|--------|-------|
| `/login` `/register` `/verify` | auth | none | public |
| `/preview` | design-system storybook | none | public (dev-facing) |
| `/branches` | BranchesScreen | **bare (no sidebar)** | **the home** — `/` and unknown paths redirect here |
| `/dashboard` | RollupScreen (Overview) | **bare (no sidebar)** | reached via the "Overview" button on `/branches` |
| `/settings` `/settings/org` `/settings/roles` | settings | **bare (no sidebar)** | |
| `/branches/:branchId` | BranchDetailScreen | **sidebar shell** | entering a branch |
| `/branches/:branchId/daybook` | DaybookScreen | sidebar shell | `?date=YYYY-MM-DD` |
| `/branches/:branchId/shifts/:shiftId` | ShiftDetailScreen | sidebar shell | |
| `/branches/:branchId/deliveries` · `/deliveries/:deliveryId` | Deliveries | sidebar shell | |
| `/branches/:branchId/pricing` `/expenses` `/staff` `/roster` `/audit` | branch-scoped | sidebar shell | |

Two layout routes, both behind `AuthGuard`: a **bare** layout (no sidebar) for the branches list / overview /
settings, and the **sidebar shell** for everything under `/branches/:branchId/*`. All screens are lazy-loaded.

---

## Test accounts / data setup

1. Register an owner in-app → verify with `000000` → lands on **`/branches`** (empty until a branch is added).
2. Create a branch (with tanks/pumps via the API or add them on branch detail) to exercise day-book, pricing, deliveries.
3. Add staff and a custom role to exercise RBAC gating (sign in as a manager/attendant to confirm hidden actions).

---

## Out of Scope (this phase)

- [ ] Forgot-password / password reset (no backend endpoint).
- [ ] Org profile pre-fill (needs org object on `GET /me`).
- [ ] Charts on the roll-up (trend data is fetched; the 7-day chart visual is not yet drawn).
- [ ] Cursor pagination UI ("load more") on deliveries / expenses / audit (first page only is rendered).
- [ ] Inline notes threads on shift/expense/delivery detail (notes API exists; UI deferred).
- [ ] Offline capture / 2G resilience (cross-cutting MVP requirement, not yet implemented).
- [ ] PDF export / print.
