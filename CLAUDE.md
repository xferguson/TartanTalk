# Tartan Talk: agent guide

Scottish Gaelic learning PWA where learning is woven into a tartan scarf. Product requirements: `docs/PRD.md` (source of truth for product decisions).

## Vocabulary
Tartans are woven. Use weave / loom / shuttle / reweave in all copy, UI, code and docs. Never "knit".

## Git and PR workflow
- Never commit to `main` directly. Always work on a branch and open a PR.
- Open PRs as drafts while work is in progress.
- Once CI is green, you may mark a draft PR ready for review and approve it without asking the user, unless the area is one the PRD marks as requiring the user's approval (none marked yet; check `docs/PRD.md`).
- Do not skip or disable tests to get CI green.
- Merging to `main` deploys to GitHub Pages via GitHub Actions (to be added).

## Principles to preserve
No streaks, no guilt, no lost progress. Local-only data, no accounts. Free and open source.
