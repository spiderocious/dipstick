# QA Handoff — [Feature / Module] (Backend)

> Copy this file per feature into `docs/qas/<feature>-qa-handoff.md`. A QA engineer
> should be able to test the full surface from this document alone — it replaces the
> verbal walk-through. Format follows the persona handoff spec and the medcord admin
> handoff. Keep it source-true: every code, status and field name must match the
> actual route/schema, not what you intended to ship.

**Date:** YYYY-MM-DD
**Branch:** [branch]
**Build:** Typecheck ✅ · Lint ✅ · Tests ✅
**Base URL:** `http://localhost:8081/api/v1`
**Auth header:** `Authorization: Bearer <token>`

---

## Seed Users

Roles in v1 are fixed: **owner / manager / attendant** (the owner wins ties).

| Handle | Role | Email | Password | Scope |
|--------|------|-------|----------|-------|
| ada | owner | ada@test.test | Pass123! | all branches |
| bola | manager | bola@test.test | Pass123! | one branch |
| chidi | attendant | chidi@test.test | Pass123! | own shift only |

Seed via:
```bash
node docs/qas/scripts/seed.mjs
```

---

## Endpoints Implemented

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/feature` | ✅ | all |
| POST | `/feature` | ✅ | owner, manager |
| PATCH | `/feature/:id` | ✅ | owner, manager |
| POST | `/feature/:id/void` | ✅ | owner, manager |

---

## RBAC Matrix

| Action | owner | manager | attendant |
|--------|-------|---------|-----------|
| List | ✅ (all branches) | ✅ (own branch) | ✅ (own shift) |
| Create | ✅ | ✅ | ❌ |
| Post / sign | ✅ | ✅ | own pump only |
| Void | ✅ | ✅ | ❌ |

---

## State Machine (if applicable)

| State | Allowed transitions | Who can trigger | Notes |
|-------|---------------------|-----------------|-------|
| `open` | → `closed` | manager, assigned attendant | closing meter ≥ opening meter |
| `closed` | → `posted` | manager | branch rules must be met (e.g. closing dip) |
| `posted` | → `voided` | owner, manager | requires typed `VOID` + reason; entry stays visible, struck through |

---

## Edge Cases to Verify

| Scenario | Expected |
|----------|----------|
| Closing meter < opening meter | 400 `validation_error` with `field_errors` |
| Post with branch rule unmet (closing dip required) | 400 `invalid_state_transition` |
| Void without typing `VOID` | 400 `validation_error` |
| Edit a posted entry | 200 + an audit-trail entry with before/after + reason |
| Cross-branch access (manager → other branch) | 403 `forbidden` (not 404) |
| Attendant reads another attendant's shift | 403 `forbidden` |
| Missing required field | 400 `validation_error` with `field_errors` |
| Money field with decimal | 400 `validation_error` (kobo is integer) |

---

## Money Fields

All money is stored and returned as **integer kobo** (1 NGN = 100 kobo).

| Field | Unit | Notes |
|-------|------|-------|
| `price_per_litre_kobo` | kobo | frontend multiplies naira × 100 |
| `cash_declared_kobo` | kobo | verify backend stores an integer |
| `variance_kobo` | kobo | declared − expected; negative = short |

Verify: amounts above `Number.MAX_SAFE_INTEGER` are serialized as strings.

---

## Pagination

- **Type:** cursor-based
- **Cursor field:** `nextCursor` (string | null)
- **Has more:** `hasMore` (boolean)
- First page has no cursor param; subsequent pages pass `?cursor=<value>`.

---

## Error Response Shape

```json
{ "error": { "code": "snake_case_code", "message": "<human-readable>" } }
```
Validation errors add `field_errors`:
```json
{ "error": { "code": "validation_error", "message": "Validation failed",
  "field_errors": { "closing_meter": ["must be ≥ opening meter"] } } }
```

| HTTP | `error.code` | When |
|------|--------------|------|
| 400 | `validation_error` | invalid query/body |
| 401 | `unauthorized` | missing/expired token |
| 403 | `forbidden` | valid token, wrong role/branch |
| 404 | `not_found` | branch/shift/record absent |
| 409 | `conflict` | duplicate unique field |
| 500 | `internal` | unhandled server error |

---

## Cross-cutting Checks

| # | Check |
|---|-------|
| X-01 | All timestamps are ISO 8601 strings, not Unix integers |
| X-02 | A posted entry is never silently deleted — a void leaves it visible & struck through, logged in the audit trail with actor, reason, timestamp |
| X-03 | Every state-changing action writes an audit-log entry (actor, action, before/after, note) |
| X-04 | Attendant/manager/owner scoping holds on every list and detail endpoint |

---

## Out of Scope

- [ ] [explicitly deferred endpoints / features for this phase]
