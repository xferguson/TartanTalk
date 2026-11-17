# Tartan Talk: Technical Plan, phase 2 (UI decisions)

## Context
Design rounds 1-2 are done and merged. The chosen direction is Cozy hearth (Daylight and Peat fire themes), and the app icon is variant A. The app already uses the Hearth tokens (`src/styles.css`). The twill renderer exists only as a prototype inside `design/mockups/*.html` and `design/icon/icon.html`. Phase 1 (`docs/TECH_PLAN.md`) fixed the stack: Vite, React, TS, Dexie, ts-fsrs, Canvas. This phase settles UI architecture so M1 (weave and tartan library) and M3 (learning loop) can be built.

## Decisions (with user)
- **Styling:** CSS Modules per component; all colour, type and radius values come from Hearth CSS variables in `src/styles/tokens.css`. No CSS-in-JS and no Tailwind.
- **Moth holes:** three sizes, capped. A hole is **small** when an item first becomes due (retrievability below the desired retention). It grows to **medium** at overdue ≥ 1× the item's last interval, and to **large** at ≥ 3×, then stops growing. Total visible hole area per scarf is capped at about 15%: beyond the cap, more holes appear as extra moths rather than more damage. One moth perches near the largest hole. Implemented as a pure function `mothHoles(items, now) → [{itemId, size}]` in `src/domain/moths.ts`, with the thresholds as constants.
- **Animation:** CSS transitions for UI and `requestAnimationFrame` on the weave canvas (shuttle pass on weave, moth flutter-off on reweave). No animation library. Everything respects `prefers-reduced-motion`: instant states, no flutter.
- **Theme:** follows the system by default, with a Settings choice of Daylight, Peat fire or Match system, stored in the Dexie `settings` table (with localStorage as an early-boot hint to avoid a flash). Applied as `data-theme` on `<html>`. Tokens use the guarded media-query pattern so the override wins both ways.

## Further technical choices (tech-lead defaults)
- **Fonts:** self-host Fraunces and Source Sans 3 via `@fontsource-variable/*` (OFL licence), limited to the Latin subsets, which cover à è ì ò ù. They are precached by Workbox, so the app works offline. No Google Fonts at runtime.
- **Routing:** React Router with `createHashRouter`, so deep links work on GitHub Pages without 404 tricks. Routes: `/` shelf, `/scarf/:id`, `/loom/:scarfId`, `/reweave/:scarfId`, `/tangles`, `/library`, `/new`, `/settings`.
- **State:** Dexie `useLiveQuery` for persisted data, plus a small Zustand store for the in-session state (the queue and the current card). Domain logic stays pure in `src/domain`.
- **Component layout:** `src/ui/components/` holds shared pieces (Button, Chip, Card, TagPicker, RatingBar, AccentKeys, BottomNav, ScarfCanvas, MothSprite). `src/ui/screens/` holds one folder per screen with `Screen.tsx` and `Screen.module.css`.
- **Accessibility:** every canvas has a text alternative (e.g. "Love and feelings, 2.4 ells, 2 moth holes"), and holes are focusable buttons overlaid on the canvas. Touch targets are ≥ 44 px. Gaelic text is marked `lang="gd"`. AA contrast is checked in both themes.

## Weave module (`src/weave`, M1)
Port the prototype into typed modules with tests:
- `sett.ts`: parses thread-count notation, including symmetric pivots (`B/30`) and asymmetric setts, to a thread sequence. Unit tests cover Ferguson (Old), Balquhidder and an asymmetric case.
- `twill.ts`: a 2/2 twill colour function plus `renderTile(threads, colours, threadPx)` to an `OffscreenCanvas` (falling back to a canvas). Shading and noise are deterministic (the existing hash). The tile cache is keyed by tartan and size.
- `scarf.ts`: lays out a scarf from `wovenOrder` (each item is a band of weft picks; item type sets the band height) and draws the fringe and the hole overlays from `mothHoles`. The same code serves the horizontal shelf strip and the vertical detail view.
- `ScarfCanvas.tsx`: a React wrapper that handles DPR, resizes (ResizeObserver), and runs the shuttle animation.
- `scripts/render-icons.mjs` and `design/icon/icon.html` stay as they are.

## Tartan library (M1)
- `content/tartans/*.yaml` holds `{id, name, clan, variant, sett, colours, provenance, verified}`. The first batch is Ferguson (Old), Ferguson of Balquhidder, Ferguson 1831, other Ferguson variants found, and MacKenzie for Murchison, plus about 20 well-known clan setts.
- The provenance field is required. `verified: false` shows a small "pattern unverified" note in the library.
- `scripts/build-content.ts` validates with zod and compiles to `src/content/generated/tartans.json`. CI runs it.
- The Library screen offers search by clan or variant, swatches rendered with the weave module, and a detail view.

## Delivery (on approval)
1. Save this plan to `docs/TECH_PLAN_2.md` and link it from `CLAUDE.md`.
2. **PR A, foundations:**
   - token file and CSS Modules setup
   - self-hosted fonts
   - theme setting (with the Dexie `settings` table and migration v1)
   - hash router with placeholder screens
   - BottomNav
3. **PR B, weave:** `src/weave` port with unit tests, ScarfCanvas, `mothHoles` with tests, and a shelf showing sample scarves.
4. **PR C, tartan library:** content pipeline for tartans, first batch with provenance, and the Library screen.

Each PR follows the CLAUDE.md flow: draft, green CI, merge.

## Verification
- `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e` pass for each PR.
- Unit tests cover:
  - the sett parser (symmetric and asymmetric)
  - the twill pixel rule
  - the `mothHoles` thresholds (small, medium and large at 0×, 1× and 3× overdue)
  - the 15% cap
  - the theme preference resolution
- Playwright tests check:
  - navigation between routes under the `/TartanTalk/` base
  - that the theme override persists across a reload
  - that fonts and the app load offline
  - that the shelf canvas renders (a non-blank pixel check)
