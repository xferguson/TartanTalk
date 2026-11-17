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
- **Status:** adopted (`.claude/skills/ship-pr/SKILL.md`, approved by the user)

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

### L10. Placing settings in the navigation
- **Type:** difficulty
- **Tally:** 1
- **Seen in:** #5
- **Detail:** The mock-up had four nav items but the theme setting needed a home.
- **Resolution:** Settings is the fifth bottom-nav item, approved by the user. When an implementation needs something the mock-up lacks, record the decision in the spec (Appendix B) and confirm it with the user.
- **Status:** resolved

### L11. Fresh cloud sessions have no `node_modules`
- **Type:** difficulty
- **Tally:** 3
- **Seen in:** #12, #13, #11
- **Detail:** `npm run lint`, `typecheck` and `test` failed with missing-package errors until dependencies were installed.
- **Resolution:** Run `npm ci` before the first check in a new session.
- **Proposal:** A SessionStart hook (`.claude/settings.json`) that runs `npm ci` when `node_modules` is missing, so every cloud session starts ready to lint, typecheck and test.
- **Status:** proposal pending user

### L12. Testing-library does not auto-clean between tests here
- **Type:** mistake
- **Tally:** 1
- **Seen in:** #13
- **Detail:** Component tests saw buttons left by earlier renders because Vitest globals are off, so RTL's automatic cleanup never registered.
- **Resolution:** Call `afterEach(cleanup)` in each component test file (or add it to `tests/setup.ts` in a task that owns it).
- **Status:** open

### L12. Off-by-one between a step counter and the contract's meaning
- **Type:** mistake
- **Tally:** 1
- **Seen in:** #10
- **Detail:** `markLearned` set `seededStep: 0`, which re-used the 1-day interval on the first review. The contract comment in `types.ts` ("0 = next interval 1d, 1 = 4d …") was right, and the tests caught the mismatch.
- **Resolution:** Read the contract's field comments before implementing, and write the test against the contract's wording.
- **Status:** resolved

### L13. Parallel sessions pick the same next learning ID
- **Type:** issue
- **Tally:** 1
- **Seen in:** #10
- **Detail:** Two sessions each added "L11", which caused a merge conflict in `docs/LEARNINGS.md`.
- **Resolution:** When syncing with main, keep both entries and renumber yours to the next free ID. This is cheap to resolve; keep appending new entries at the end of the file.
- **Status:** resolved

### L14. Parking work while an earlier PR on the same branch is in CI
- **Type:** difficulty
- **Tally:** 1
- **Seen in:** #15
- **Detail:** Only one remote branch is allowed per session. While W1-D's PR was waiting on CI, the finished W1-F files couldn't be pushed without joining that PR, and the stop hook objects to untracked files.
- **Resolution:** Commit the next task to a local-only staging branch. After the earlier PR merges, reset the work branch to `origin/main`, cherry-pick the staging commit, and ship it.
- **Status:** resolved

### L14. LEARNINGS.md edits inside task PRs cause repeated merge conflicts
- **Type:** issue
- **Tally:** 1
- **Seen in:** #11
- **Detail:** Parallel task PRs all edited `docs/LEARNINGS.md` (and WORKPLAN rows), so squash-merging needed several conflict-resolving syncs.
- **Resolution:** Update `LEARNINGS.md` only in a separate docs-only PR after the task PR has merged (user decision). Merge conflicts themselves are not tallied.
- **Status:** resolved
