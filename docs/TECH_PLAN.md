# Tartan Talk: Technical Plan (tech-lead phase 1)

## Context
The product plan is approved and saved in `docs/PRD.md` (draft PR #1). This phase picks the stack, architecture, data model, algorithms and CI/CD, so that engineering can start on what doesn't depend on visual design. A second technical pass follows the palette/icon mock-ups for UI-specific decisions. The repo currently holds only `README.md`, `CLAUDE.md` and `docs/PRD.md`.

## Decisions
- **Stack:** Vite + React + TypeScript (strict). `vite-plugin-pwa` (Workbox) for offline and install, **Dexie** over IndexedDB, **ts-fsrs** for scheduling, Canvas 2D for weaving, React Router (hash or base-aware routes for Pages), Zustand for UI state.
- **Content:** YAML in `content/`, validated with zod and compiled to JSON at build. AI drafts are generated in agent sessions and committed via PR; no API keys in CI.
- **Licences:** MIT for code (`LICENSE`), CC BY-SA 4.0 for content (`content/LICENSE`), with per-item provenance and an attributions page.
- **Approvals:** green CI is sufficient to mark ready, approve and merge. Wait for the user only when they explicitly say so for a specific change. Update `CLAUDE.md` and the PRD to say this.

## Repository layout
```
content/            YAML source: words/, forms/, sentences/, topics.yaml, tartans/, LICENSE
scripts/            build-content.ts (validate + compile), check-content.ts
src/
  content/          generated types + loader for compiled JSON
  domain/           pure logic, no React: answer-check, scheduler, session, unlock, credit, moths, length
  weave/            sett parser, twill renderer, scarf layout, moth overlay
  db/               Dexie schema, migrations, export/import
  ui/               React screens: Shelf, ScarfSetup, Workshop, Reweave, Tangles, TartanLibrary, Settings
  app/              routing, PWA registration, providers
tests/              vitest unit tests mirror src/domain and src/weave; e2e/ for Playwright
.github/workflows/  ci.yml, deploy.yml
```
Keep all learning logic in `src/domain` as pure functions with injected time, so it is unit-testable and independent of UI.

## Content model (YAML -> compiled JSON)
- **Lexeme** `{id, gd, en, pos, gender?, tags[], freqRank?, audio?, source, review}`.
- **Form** `{id, lexemeId, gd, en, features (person/number/gender), tags[]}`, e.g. `aig.1sg = agam`.
- **Sentence** `{id, gd, en, alt_gd[], tokens: [{text, itemId}], pattern, tags[], source, review}`. `tokens` link every word to a lexeme or form, which drives unlocking, cloze choice and implicit credit. `pattern` (e.g. `tha-X-aig-Y-air-Z`) is the skeleton used for similarity spacing.
- **Topic** tags plus suggested starter scarves `{id, name, tags}`.
- **Tartan** `{id, name, clan, variant, sett, symmetric, colours{code: hex}, provenance}`.
- **Build validation:** schema, unique ids, every token resolves, every tag declared, no orphan forms, frequency coverage report, Ferguson and Murchison present. Fails CI on errors.

## Local data (Dexie)
- `progress` keyed by itemId: `{phase: new|learning|review, correctInSession, ladderStep, fsrsCard, seededStep, ownerScarfId, wovenAt, consecutiveMisses, tangled}`.
- `reviewLog`: every answer with item, exercise type, rating, explicit/implicit, timestamp. This is the source of truth; FSRS state can be rebuilt by replay.
- `scarves`: `{id, name, tagFilter, tartanId, createdAt, pausedAt?, wovenOrder[]}`.
- `settings`: desired retention (default 0.9), units, accent helper.
- Versioned migrations with tests on fixture DBs. Export/import is a single JSON file with a schema version.

## Algorithms (src/domain)
- **Answer checking:** NFC-normalise, case-fold, trim punctuation, unify apostrophes. Compare exactly first, then accent-insensitively: an accent-only miss is correct with a nudge and is capped at Hard. Also accept `alt_gd`.
- **Learning ladder:** an item goes recognition, then cloze, then typed production. Learned means 2 correct answers in the session; then it is woven, assigned `ownerScarfId`, and enters review. A miss re-queues it at max(10 minutes, end of batch).
- **Scheduler:** seeded intervals of 1, 4 and 16 days (x4) for the first reviews, with Hard/Easy nudging within the step. After that, ts-fsrs with `request_retention` from settings, its memory state computed by replaying `reviewLog`. A wrong answer is Again. Two consecutive misses set `tangled`, and relearning through the ladder clears it.
- **Unlock and pacing:** a sentence is eligible when all its token items are learned. The session builder uses word batches of 3-4, then up to 2 unlocked sentences per new item in the first session (the rest deferred), a minimum gap of 4 cards between cards sharing a focal item, and a penalty for consecutive sentences with the same pattern. Scoring is soft; a test suite pins the behaviour.
- **Implicit credit:** a typed sentence counts as a full Good review for every token item. A cloze reviews the target fully and gives the others weight 0.25: stability moves 25% toward its Good-outcome value, only if retrievability is below 0.9. This is positive-only and logged as `implicit`. The weights are constants in one module for tuning.
- **Moths:** a hole appears on a woven block when its retrievability falls below the desired retention. Hole size grows with overdue time, capped so a scarf never looks ruined (final curve decided after mock-ups).
- **Length in ells:** a fixed fraction of an ell per item type (constants to be tuned).

## Weaving renderer (src/weave)
- **Sett parser:** reads thread-count notation such as `K/4 R24 K24 Y/4`, with symmetric pivots and asymmetric setts, and expands it to a thread-colour sequence.
- **2/2 twill:** a cell shows the warp colour when `(x + y) mod 4 < 2`, otherwise the weft colour. One sett repeat is rendered to an offscreen canvas tile, with subtle per-thread shading and noise for wool texture, then tiled.
- **Scarf:** a vertical strip whose weft picks are grouped into blocks, one per woven item in `wovenOrder`. Moth holes are drawn as an overlay mask, so the cloth data never changes. Render at device pixel ratio and cache the tiles.
- Pure geometry and colour functions are unit-tested. Canvas output gets snapshot checks in Playwright.

## CI/CD
- **`ci.yml`** (PRs and pushes): `npm ci`, ESLint, `tsc --noEmit`, content validation, Vitest with coverage, `vite build`, Playwright smoke test on Chromium (`--trace off`).
- **`deploy.yml`** (push to `main`): build with `base: '/TartanTalk/'`, `actions/upload-pages-artifact` and `actions/deploy-pages`. Requires the Pages source to be set to "GitHub Actions" in repo settings. If the first deploy fails on this, tell the user the exact setting.
- PR workflow per `CLAUDE.md`: draft PR, green CI, mark ready, approve and merge.

## Delivery order
1. **M0 scaffold (do on approval of this plan):** save this plan to `docs/TECH_PLAN.md`; update the approvals wording in `CLAUDE.md` and `docs/PRD.md`; add licences; set up the Vite/React/TS PWA skeleton with a placeholder shelf page; lint, typecheck, Vitest and Playwright smoke tests; `ci.yml` and `deploy.yml`. Merge PR #1 first or fold this into it.
2. **Design mock-ups:** palette directions and icon concepts (static HTML/canvas pages, using a prototype of the real twill renderer so the tartans look right). Then tech-lead phase 2 for UI decisions.
3. **M1 weave:** sett parser, renderer, tartan library seeded with Ferguson and Murchison variants plus the first batch of researched setts.
4. **M2 content:** content schema and build, plus a first content batch (prepositions, core function words, a starter topic) with sources researched and recorded.
5. **M3 learning loop:** domain logic (answer check, ladder, scheduler, unlock, credit, moths), Dexie, and the Workshop/Reweave/Tangles screens.
6. **M4 polish:** audio trial, export/import, remaining content batches.

## Verification
- `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e` pass locally and in CI.
- After the M0 merge, the Pages URL loads the placeholder, is installable, and works offline (checked with a Playwright offline test against `vite preview`).
- Domain behaviour is covered by deterministic unit tests with a fake clock: ladder to woven, seeded intervals of 1/4/16 days, two misses to tangled, sentence unlock, the 2-sentence cap, gap spacing, and implicit-credit thresholds.
