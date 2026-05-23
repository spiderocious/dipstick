# Dipstick — Workspace & Code Conventions

Conventions distilled from how this codebase is organised. Follow them by default;
deviations need a comment explaining why. When in doubt, read the source — docs drift, source does not lie.

---

## Tooling & dependencies

1. **pnpm only.** Root `preinstall` runs `npx only-allow pnpm`. `packageManager` and `engines` pin pnpm ≥ 9.15.
2. **Workspace deps use `workspace:*`** in every app/package — never a fixed version.
3. **Lockfile is committed** (`pnpm-lock.yaml`). Never edit it by hand.
4. **Node ≥ 20** everywhere.
5. **Run tasks through Nx**, prefixed with pnpm: `pnpm nx build web`, `pnpm nx run-many -t typecheck`. Don't call the underlying tool globally.

## Workspace shape

```
apps/
  main-backend/     Express, public HTTP API (port 8081)
  web/              Vite/React operator app (port 5173)
  website/          Next.js marketing site (port 3000)
packages/
  core/             Pure TS — routes, domain types, money/time helpers. Depends on nothing.
  api/              ky client, EP endpoints, react-query hooks. Depends on core.
  ui/               React + Tailwind primitives, design system. Depends on core.
docs/               Markdown only. No code.
```

- New deployable thing → `apps/<name>/`. New shared code → `packages/<name>/`.
- Apps **never** import from another app. Cross-app sharing goes through `packages/`.
- `core` depends on nothing · `api` depends only on `core` · `ui` depends on `core`. No `ui → api` edge — UI primitives are presentational; data fetching lives in app features.

## Naming

- Package name `@dipstick/<dir>`; Nx project name `<dir>` (no scope). **Keep both in sync with the directory** — a stale `project.json` `cwd` silently breaks every Nx target for that app.
- TS path aliases: `@dipstick/core`, `@dipstick/api`, `@dipstick/ui`, `@icons`; per-app `@app/*`, `@features/*`, `@shared/*`; backend also `@lib/*`, `@middlewares/*`.
- React components: `PascalCase.tsx`, named export. Screens/helpers: hyphenated (`home-screen.tsx`, `format-naira.ts`).
- Backend feature files: `feature.routes.ts`, `feature.service.ts`, `feature.repo.ts`, `feature.schema.ts`, `feature.types.ts` — each feature has a folder + `index.ts` exposing a single `register(app)`.

## TypeScript

1. **Strict everywhere** (`tsconfig.base.json`): `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`. React apps set `exactOptionalPropertyTypes: false` only where library types fight it.
2. **`any` is banned** (`@typescript-eslint/no-explicit-any: error`). Use `unknown` + narrow.
3. **`import type`** for type-only imports (`consistent-type-imports`).
4. **NodeNext** in the backend → import specifiers spell out `.js` even for `.ts` source. Frontends use `Bundler` resolution; the Next webpack config bridges the two via `extensionAlias`.
5. **No barrels in feature code.** Each package exports one `src/index.ts`; inside apps, import the leaf module directly.

## Frontend (web) — Feature-Sliced Design

```
src/features/<feature>/
  screen/  parts/  api/  providers/  guards/  helpers/  utils/  widgets/
  <feature>.routes.tsx
src/shared/   src/ui/   app.tsx  app.routes.tsx  app.provider.tsx  main.tsx
```

1. **Server state is React Query only.** No bare `useEffect + fetch` (double-fetch under StrictMode, broken loading states).
2. **Routes** come from `ROUTES` in `@dipstick/core`; never inline a path string in `<Link>`/`navigate`. Parametric routes are functions: `ROUTES.BRANCH(id)`.
3. **Endpoints** come from `EP` in `@dipstick/api`; never hand-write a backend URL in a `queryFn`.
4. **Icons** come from `@icons` (the proxy in `packages/ui/src/icons/index.ts`); never import `lucide-react` in feature code.
5. **UI primitives** come from `@dipstick/ui` (`AppButton`, `AppText`, …). Need a new one? Add it to `packages/ui/src/primitives/<name>/` and export it from the package index.
6. **Conditional classes** flow through `cn()` (clsx + tailwind-merge) so the last conflicting class wins.
7. **Conditional rendering** uses `<Show>`, lists use `<Repeat>` (meemaw) — never `&&` (renders `0`) or bare `.map()`.
8. **Props interfaces** are externalized and `Readonly<…>`; one screen per feature; screens read like a table of contents.

## Backend (main-backend)

1. **One `buildApp()` factory** in `app.ts`; `server.ts` boots it. Tests mount `buildApp()` directly, never the listening server.
2. **Feature module shape:** `register(app)` mounts a single `Router`. `app.ts` calls each `register` in a defined order — **specific paths before parameterized ones** (`/me` before `/:id`).
3. **Validation in `feature.schema.ts`** as zod; routes call `Schema.parse(req.body)` and let the error handler turn `ZodError` → `400 validation_error`.
4. **Response envelope.** Success `{ data, meta? }`; error `{ error: { code, message, field_errors? } }`. Use `ResponseUtil.ok / created / accepted / noContent / error` — **never `res.json()` directly**.
5. **Never throw raw from services; never pass `req` into a service.** HTTP stays in the controller; services take typed data and read request context via `requestContext`.
6. **Async handlers** are wrapped with `asyncHandler(...)` so rejections reach the error middleware.
7. **Env parsed once at boot** (`env.ts`, zod). Secrets live in `.env` (gitignored); `.env.example` is committed.
8. **Money is kobo** (`bigint`/integer), never float. Every money field is suffixed `_kobo`. Format with `formatNaira()` from `@dipstick/core`.
9. **Pagination is cursor-based** (`nextCursor`, `hasMore`) — never offset.

## Design tokens

Warm cream + warm ink, **one** deep-emerald accent (see `mvp.md`). Tokens live in
`packages/ui/src/theme/index.ts` and `packages/ui/src/styles.css`; Tailwind mirrors them in each app's config.

- Emerald `#0E5C3A` (`hover #0A4A2E`) — posted / balanced / confirmed / brand. Oxblood `#9A1F18` — shortage & the **void idiom only**. Amber `#8E5A0E` — watch / over / out-of-spec. Ink-blue `#1F4D7A` — system notes.
- Fonts: Source Serif 4 (display & names), Inter (body & chrome), **IBM Plex Mono** for every figure and record id, always `tabular-nums`.
- Browse the live system at **`/preview`** in the web app (`apps/web/src/features/preview`). It renders the real `@dipstick/ui` primitives — keep it current as primitives are added.

## ESLint / Prettier

- One root flat config (`eslint.config.mjs`). `no-console: error` (warn/error allowed) — use the backend `logger`. `unused-imports/no-unused-imports: error`. `import/order` enforced.
- Prettier: single quotes, semicolons, trailing commas, 100-col, 2-space.

## Git hygiene

- `.env` gitignored; `.env.example` committed. `dist/`, `.next/`, `node_modules/`, `.nx/cache`, `*.tsbuildinfo`, `.DS_Store` are ignored — commit none of them.
- Commit messages: one short imperative line; detail in the body; no emojis.
