# Dipstick design system — migration report

**Shipped:** 2026-05-23
**From (visual spec):** `/Users/feranmi/codebases/2026/dockito/design-system/projects/dipstick/`
**Into:** `@dipstick/ui` (`packages/ui/src/`) + viewer at `apps/web/src/features/preview`
**Stance:** Ledger broadsheet — warm cream paper, warm ink, single deep-emerald accent, Source Serif 4 / Inter / IBM Plex Mono, tabular numerals everywhere a figure lives, hairlines not shadows, oxblood reserved for shortage + the VOID idiom.

The HTML spec is the canonical visual reference and is **not** edited by this work. These React components are its production sibling.

---

## Conventions detected & followed

- **Monorepo:** Nx 22.7 + pnpm 9.15, React 19, TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- **Library package:** `@dipstick/ui` at `packages/ui/src`. Alias `@dipstick/ui` (tsconfig.base.json + vite).
- **File layout:** folder-per-component — `<group>/<kebab>/<kebab>.tsx` + `index.ts` barrel; everything re-exported from `packages/ui/src/index.ts`. Groups used: `primitives/`, `data/`, `feedback/`.
- **ESM:** package is `"type": "module"` → relative imports carry the `.js` extension (`'../../utils/cn.js'`).
- **Exports:** named only. Barrels re-export value + `type`.
- **Refs:** `forwardRef` on interactive primitives (Button, Field, Checkbox, Radio, Switch, Select); plain `function` for display-only.
- **Props:** `interface ...Props extends XHTMLAttributes`, no `readonly` on UI props (matches the existing AppButton). Preview-internal interfaces use `readonly` (matches the existing parts).
- **Class composition:** `cn` from `packages/ui/src/utils/cn.ts` (clsx + tailwind-merge).
- **Styling:** Tailwind reading **CSS-var tokens**. `apps/web/tailwind.config.ts` was switched from hardcoded hexes to `var(--*)` (single source of truth = `packages/ui/src/styles.css`) and extended with `sheet.edge`, `hair.soft`, state `-bg`, product marks (`pms`/`ago`/`dpk`), and `borderRadius.card`.
- **Domain types:** reused from `@dipstick/core` (`Product`, `VarianceStatus`, etc.) — never redefined. Money is kobo, formatted via `formatNaira()`.
- **Icons:** via the `@icons` proxy (`packages/ui/src/icons/index.ts`) → lucide-react. UI components import it relatively (`../../icons/index.js`) to keep the source swappable.
- **Lint/typecheck:** every batch run through `pnpm nx run-many -t typecheck lint -p ui web`. `eqeqeq: always`, `no-explicit-any`, `consistent-type-imports`, unused-imports — all clean. `web:build` passes.
- **Tests:** none written (no tests next to components in the repo; matches preference).

## Setup changes made (config — diffs shown before writing)

- `apps/web/index.html` — fonts already corrected to Source Serif 4 / Inter / IBM Plex Mono before this session (verified).
- `apps/web/tailwind.config.ts` — token colors switched to `var(--*)` + missing tokens + `borderRadius.card` added.
- The `@solon/* → @dipstick/*` rename (package.json, vite aliases, main.tsx, theme) had already landed before this session — verified, not re-done.
- `apps/web/src/app.provider.tsx` — mounted `<ModalHost />` + `<ToastHost />` (one additive edit).

---

## Components generated (24 components across 23 preview parts)

### Primitives (`packages/ui/src/primitives/`)
| Component | Source spec | Notes |
|---|---|---|
| `AppButton` *(migrated)* | 10-buttons.html · _foundation .b | 5 variants (primary/secondary/quiet/ghost/danger) × 3 sizes; moved off hardcoded hexes to token classes |
| `AppText` *(migrated)* | 02-type.html | caption moved to `text-ink-tertiary` |
| `AppInput` · `AppTextarea` · `FieldRow` | 11-inputs.html | numeric (tabular), leading/trailing affixes (₦ / L / /L), sizes, invalid, label/help/error scaffold |
| `AppCheckbox` | 12-selection.html | emerald check |
| `AppRadio` · `AppRadioGroup` | 12-selection.html | context-driven controlled group |
| `AppSwitch` | 12-selection.html | settings toggle |
| `AppSegmented` | 12-selection.html | ink-fill active; generic over option value |
| `AppSelect` | 12-selection.html | styled **native** `<select>` + caret |

### Data display (`packages/ui/src/data/`)
| Component | Source spec |
|---|---|
| `AppPill` (7 tones) | 26-avatars-pills.html |
| `AppFlag` (ok/over/short) | 26-avatars-pills.html |
| `AppAvatar` · `AppPulse` | 26-avatars-pills.html |
| `AppProductMark` (PMS/AGO/DPK) | 26 + _foundation .prod |
| `AppSheet` · `SheetHead` | 27-cards.html + _foundation .sheet |
| `AppFigure` (the readout family) | 03-figures.html + _foundation .read |
| `AppTable` family (Table/Thead/Tbody/Tfoot/Tr/Th/Td) | 20-tables.html |
| `AppProgressBar` · `AppGauge` | 24-progress.html |
| `AppSkeleton` · `AppEmptyState` | 25-skeletons-empty.html |
| `AppTooltip` (hand-rolled, hover+focus, 4 placements, hovercard mode) | 28-tooltips.html |

### Feedback & overlays (`packages/ui/src/feedback/`)
| Component | Source spec | Notes |
|---|---|---|
| `AppModal` · `ModalLedger` | 40-modals.html | portal, scrim, Escape/scrim close, scroll-lock |
| `AppVoidConfirmModal` | 40-modals.html | **the CRITICAL idiom** — hazard stripe, required audited reason, typed-VOID gate (confirm disabled until reason + word match) |
| `AppToast` · `AppBanner` · `AppInlineAlert` | 41-feedback.html | toast tones ok/error/delivered; banner ok/watch/short/info/ink; inline short/over/info |

### Imperative service (`apps/web/src/shared/drawer/`)
Per translation-ui-guide §6.3: `drawer-store.ts` (framework-free pub-sub), `drawer-service.ts` (`DrawerService.toast/confirm/voidConfirm`), `modal-host.tsx` + `toast-host.tsx` (useSyncExternalStore + portal), mounted in `app.provider.tsx`. Lives in the **app**, not the library (your call), so the shared lib stays free of app-level imperative state.

---

## Preview / viewer

The existing dev viewer at `/preview` was extended **incrementally** — every component above has a matching part in `apps/web/src/features/preview/screen/parts/` (numbered), registered in `preview-screen.tsx` (`PARTS`) and `shared/nav-items.ts`. Each part shows the component with all its props/variants/states as samples. Nav groups: Foundation · Primitives · Display · Feedback · Domain Patterns.

Run it: `pnpm nx dev web` → open `/preview`.

---

## Surfaces skipped (scenes — build in app code, not the library)

These are visual specs for full screens, composed from the primitives above. They belong in `apps/web` feature code, not `@dipstick/ui`:

- `30-shift-close` — the end-of-shift reconciliation screen
- `31-rollup` — owner morning roll-up
- `32-tanker` — tanker delivery / offload
- `33-daybook` — the day-book (the product's spine)
- `34-price-change` — price-change log
- `35-staff` — staff & roster
- `36-expenses` — expense ledger
- `42-cross` — cross-record patterns (audit, mentions, sharing)

Building blocks they need are all shipped: `AppTable`/`AppTd` (ledger rows), `AppFigure`, `AppPill`/`AppFlag`, `AppField`, `AppProductMark`, `AppVoidConfirmModal`, `DrawerService`.

## Manual work remaining

- The viewer fonts load weights Source Serif 4 8..60 / 400;500;600 and Inter 400;500;600 — add 700 if you want the heaviest display weight.
- `AppTooltip` positions with CSS only (no collision flipping at viewport edges) — fine for the current uses; swap to a positioning lib if edge cases bite.
- `packages/ui/src/theme/index.ts` still exports `DIPSTICK_COLORS`/`FONTS` constants that nothing imports (tokens live in `styles.css`). Harmless; remove if you want.

## Visual reference

Studio project: `/Users/feranmi/codebases/2026/dockito/design-system/projects/dipstick/` (`index.html` gallery + `preview/*.html` specimens + `preview/_foundation.css`).
