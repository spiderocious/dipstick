# Dipstick

A **digital station logbook** for Nigerian filling-station owners with one to ten branches.
The manager records the day — opening dip, attendant pump readings, deliveries received,
expenses paid, staff on shift, closing dip — and the owner sees the roll-up across every
branch from one screen, every morning.

No hardware integrations, no POS/payment-rail linking. The system trusts the manager's
entries; discipline comes from posting, signing, and audit mechanics. In spirit, it is the
cashier's worn exercise book — made shared, signed, and impossible to tamper with after the
fact.

> Full feature spec: `../dockito/projects/dipstick/mvp.md`

---

## Workspace shape

Nx + pnpm monorepo. One process per `apps/` directory; shared, never-deployed code in `packages/`.

```
apps/
  main-backend/     Express, public HTTP API
  web/              Vite/React, the operator app (owner / manager / attendant)
  website/          Next.js, marketing site
packages/
  core/             Pure TS — routes, domain types, money/time helpers. Depends on nothing.
  api/              Network client (ky), endpoints, react-query hooks. Depends on core.
  ui/               React + Tailwind primitives, design system. Depends on core.
docs/               Markdown only — conventions and QA handoffs.
```

- Apps **never** import from another app. Cross-app sharing goes through `packages/`.
- `core` depends on nothing · `api` depends only on `core` · `ui` depends on `core`. No `ui → api` edge.
- Package name: `@dipstick/<dir>`. Nx project name: `<dir>` (no scope).
- TS path aliases: `@dipstick/core`, `@dipstick/api`, `@dipstick/ui`, `@icons`; per-app `@app/*`, `@features/*`, `@shared/*` (backend also `@lib/*`, `@middlewares/*`).

## Quick start

```bash
pnpm install

# Run a single project
pnpm nx serve main-backend     # API on http://localhost:8081
pnpm nx serve web              # operator app on http://localhost:5173
pnpm nx serve website          # marketing site on http://localhost:3000

# Across the workspace
pnpm nx run-many -t build
pnpm nx run-many -t typecheck
pnpm nx run-many -t lint
```

## Design system preview

The operator app ships a living storybook for `@dipstick/ui` at **`/preview`** — palette,
type scale, primitives and domain patterns rendered from the real package, not copies.

```bash
pnpm nx serve web    # then open http://localhost:5173/preview
```

## Conventions

- **TypeScript strict everywhere**; `any` is banned (use `unknown` + narrow).
- **Frontend**: Feature-Sliced Design. React Query for all server state — no bare `useEffect + fetch`.
  Routes via `ROUTES`, endpoints via `EP`, icons via `@icons`, classes via `cn()`.
- **Backend**: feature modules export `register(app)`. Services return results; controllers
  unwrap and respond through `ResponseUtil` — never `res.json()` directly. Money is stored in
  **kobo** (`bigint`), never float.

See `docs/conventions.md` for the full set.
