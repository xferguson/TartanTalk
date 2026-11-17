# Learnings

Shared memory across agent sessions. Every PR adds to this file (see `CLAUDE.md`, "Self-learning process").

- **Add** a new entry when you hit a mistake, issue, difficulty, or find an efficiency.
- **Tally** when you meet an existing entry again: add your PR number to **Seen in** and increment **Tally**.
- **At tally 3:** write a **Proposal** for a skill or hook that would prevent or speed up the problem. Present it to the user, record their decision in **Status**, and commit adopted skills to `.claude/skills/` or adopted hooks to `.claude/settings.json`.

**Types:** `mistake` · `issue` · `difficulty` · `efficiency`
**Status:** `open` · `proposal pending user` · `adopted` · `declined` · `resolved`

---

### L1. Agents cannot approve PRs opened under the user's account
- **Type:** issue
- **Tally:** 5
- **Seen in:** #1, #2, #3, #4, #5
- **Detail:** GitHub rejects the approval ("Can not approve your own pull request") because the agent's PRs are authored by the user's account.
- **Resolution:** Merge on green CI is the approval step (written into `CLAUDE.md`).
- **Proposal:** A `ship-pr` skill (`.claude/skills/ship-pr/SKILL.md`) that runs the whole ship sequence:
  1. Sync with `origin/main`.
  2. Run lint, typecheck, test and e2e.
  3. Push and open a draft PR with the template.
  4. Subscribe to the PR, wait for CI, mark it ready and squash-merge.
  5. Update `docs/WORKPLAN.md` and `docs/LEARNINGS.md`.

  It removes repeated manual steps and the failed approve call.
- **Status:** proposal pending user

### L2. Vitest 2 bundles its own Vite 5 types, which clash with Vite 6
- **Type:** issue
- **Tally:** 1
- **Seen in:** #1
- **Detail:** `tsc` failed on `vite.config.ts` plugin types.
- **Resolution:** Use Vitest 3 with Vite 6. Check that peer versions line up when upgrading.
- **Status:** resolved

### L3. Controlled inputs backed by async IndexedDB live queries lag
- **Type:** mistake
- **Tally:** 1
- **Seen in:** #5
- **Detail:** The theme radio didn't visibly change on click until the Dexie live query returned. Playwright reported "Clicking the checkbox did not change its state".
- **Resolution:** Keep optimistic local state, persist in the background, and clear the optimistic value once the stored value matches. Use this pattern for all settings.
- **Status:** resolved

### L4. Width 100% plus padding overflows without border-box
- **Type:** mistake
- **Tally:** 1
- **Seen in:** #2
- **Detail:** Mock-up phones overlapped neighbouring grid columns.
- **Resolution:** Global `box-sizing: border-box` (now in `src/styles/global.css`).
- **Status:** resolved

### L5. Some research sites are blocked by the session's network policy
- **Type:** difficulty
- **Tally:** 1
- **Seen in:** #2
- **Detail:** `tartandictionary.org` doesn't resolve from cloud sessions, so sett data came from search-result snippets.
- **Resolution:** Data tasks should record exact source URLs and mark data `verified: false` until it's checked. Ask the user to allow-list hosts if direct access is needed.
- **Status:** open

### L6. A brand-new repo has no `main` branch, so PRs can't be opened
- **Type:** issue
- **Tally:** 1
- **Seen in:** #1
- **Resolution:** Create a README-only initial commit on `main` (with the user's permission), then merge it into the work branch.
- **Status:** resolved

### L7. A chained shell command can abort part-way
- **Type:** mistake
- **Tally:** 1
- **Seen in:** #5
- **Detail:** `git rm` refused files with local changes, which stopped the rest of the `&&` chain, so files that should have been removed were left behind.
- **Resolution:** Check `git status` after file moves, and prefer explicit `rm` for untracked or edited files.
- **Status:** resolved

### L8. Installing every dependency up front avoids lockfile conflicts
- **Type:** efficiency
- **Tally:** 1
- **Seen in:** #5
- **Detail:** `package.json` and `package-lock.json` conflict whenever parallel PRs add dependencies.
- **Resolution:** F1 installs all vertical-slice dependencies once. Later dependencies go through a dedicated `deps:` PR.
- **Status:** resolved

### L9. Building UI straight from mock-ups leads to loose interpretation
- **Type:** difficulty
- **Tally:** 1
- **Seen in:** #5
- **Resolution:** The tech lead transcribes mock-ups into exact specs (`docs/WORKPLAN.md` Appendix B) before UI tasks start. Agents build to the spec.
- **Status:** resolved
