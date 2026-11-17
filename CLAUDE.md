# Tartan Talk: agent guide

Scottish Gaelic learning PWA where learning is woven into a tartan scarf. Product requirements: `docs/PRD.md`. Technical plan: `docs/TECH_PLAN.md`.

## Vocabulary
Tartans are woven. Use weave / loom / shuttle / reweave in all copy, UI, code and docs. Never "knit".

## Git and PR workflow
- Never commit to `main` directly. Always work on a branch and open a PR.
- Open PRs as drafts while work is in progress.
- Once CI is green, mark the draft PR ready, approve and merge it without asking the user. Only wait for the user's approval when they have explicitly said to for that specific change.
- Do not skip or disable tests to get CI green.
- Merging to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## Principles to preserve
No streaks, no guilt, no lost progress. Local-only data, no accounts. Free and open source.

## Commands
`npm run dev`, `npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npm run build`, `npm run e2e` (Playwright). Run lint, typecheck, test and e2e before pushing.

## Architecture
Learning logic lives in `src/domain` as pure functions with injected time; weaving in `src/weave`; storage in `src/db` (Dexie). Content is YAML in `content/` (CC BY-SA 4.0); code is MIT.
