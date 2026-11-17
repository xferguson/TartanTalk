# Learnings

Shared memory across agent sessions. Every PR adds to this file (see `CLAUDE.md`, "Self-learning process").

- **Add** a new entry when you hit a mistake, issue, difficulty, or find an efficiency.

- **Tally** is the number of PRs in **Seen in**. When you meet an existing entry again, add your PR number to that line. There is no separate Tally line.

- **At a tally of 5:** write a **Proposal** for a skill or hook that would prevent or speed up the problem. Present it to the user, record their decision in **Status**, and commit adopted skills to `.claude/skills/` or adopted hooks to `.claude/settings.json`.

**Types:** `mistake` · `issue` · `difficulty` · `efficiency`
**Status:** `open` · `proposal pending user` · `adopted` · `declined` · `resolved`

---

### L1. Agents cannot approve PRs opened under the user's account

- **Type:** issue

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

- **Seen in:** #1

- **Detail:** `tsc` failed on `vite.config.ts` plugin types.

- **Resolution:** Use Vitest 3 with Vite 6. Check that peer versions line up when upgrading.

- **Status:** resolved

### L3. Controlled inputs backed by async IndexedDB live queries lag

- **Type:** mistake

- **Seen in:** #5

- **Detail:** The theme radio didn't visibly change on click until the Dexie live query returned. Playwright reported "Clicking the checkbox did not change its state".

- **Resolution:** Keep optimistic local state, persist in the background, and clear the optimistic value once the stored value matches. Use this pattern for all settings.

- **Status:** resolved

### L4. Width 100% plus padding overflows without border-box

- **Type:** mistake

- **Seen in:** #2

- **Detail:** Mock-up phones overlapped neighbouring grid columns.

- **Resolution:** Global `box-sizing: border-box` (now in `src/styles/global.css`).

- **Status:** resolved

### L5. Some research sites are blocked by the session's network policy

- **Type:** difficulty

- **Seen in:** #2, #22, #29, #35

- **Detail:** `tartandictionary.org` doesn't resolve from cloud sessions (curl), so sett data came from search-result snippets. In W1-I it was reachable through WebFetch, and `tartanregister.gov.uk` loads but hides thread counts behind a login. W1-M (audio) also hit `isca-archive.org`, `learn.microsoft.com`, `docs.cloud.google.com` and `commonvoice.mozilla.org`; its findings are search-snippet only and marked unverified.

- **Resolution:** Data tasks should record exact source URLs and mark data `verified: false` until it's checked. Ask the user to allow-list hosts if direct access is needed.

- **Proposal:** A short `research-sources` skill listing which hosts work with which tool (WebFetch vs curl) and their licence terms, so data tasks skip the trial and error.

- **Status:** adopted (`.claude/skills/research-sources/SKILL.md`, approved by the user)

### L6. A brand-new repo has no `main` branch, so PRs can't be opened

- **Type:** issue

- **Seen in:** #1

- **Resolution:** Create a README-only initial commit on `main` (with the user's permission), then merge it into the work branch.

- **Status:** resolved

### L7. A chained shell command can abort part-way

- **Type:** mistake

- **Seen in:** #5

- **Detail:** `git rm` refused files with local changes, which stopped the rest of the `&&` chain, so files that should have been removed were left behind.

- **Resolution:** Check `git status` after file moves, and prefer explicit `rm` for untracked or edited files.

- **Status:** resolved

### L8. Installing every dependency up front avoids lockfile conflicts

- **Type:** efficiency

- **Seen in:** #5

- **Detail:** `package.json` and `package-lock.json` conflict whenever parallel PRs add dependencies.

- **Resolution:** F1 installs all vertical-slice dependencies once. Later dependencies go through a dedicated `deps:` PR.

- **Status:** resolved

### L9. Building UI straight from mock-ups leads to loose interpretation

- **Type:** difficulty

- **Seen in:** #5

- **Resolution:** The tech lead transcribes mock-ups into exact specs (`docs/WORKPLAN.md` Appendix B) before UI tasks start. Agents build to the spec.

- **Status:** resolved

### L10. Placing settings in the navigation

- **Type:** difficulty

- **Seen in:** #5

- **Detail:** The mock-up had four nav items but the theme setting needed a home.

- **Resolution:** Settings is the fifth bottom-nav item, approved by the user. When an implementation needs something the mock-up lacks, record the decision in the spec (Appendix B) and confirm it with the user.

- **Status:** resolved

### L11. Fresh cloud sessions have no `node_modules`

- **Type:** difficulty

- **Seen in:** #12, #13, #11, #9

- **Detail:** `npm run lint`, `typecheck` and `test` failed with missing-package errors until dependencies were installed.

- **Resolution:** Run `npm ci` before the first check in a new session.

- **Proposal:** A SessionStart hook that installs npm dependencies in cloud sessions. Measured: a clean install takes about 5 seconds, and a repeat run is skipped in about 4 ms.

- **Status:** adopted (`.claude/hooks/session-start.sh`, registered in `.claude/settings.json`, approved by the user)

### L12. Testing-library does not auto-clean between tests here

- **Type:** mistake

- **Seen in:** #13

- **Detail:** Component tests saw buttons left by earlier renders because Vitest globals are off, so RTL's automatic cleanup never registered.

- **Resolution:** Call `afterEach(cleanup)` in each component test file (or add it to `tests/setup.ts` in a task that owns it).

- **Status:** open

### L12. Off-by-one between a step counter and the contract's meaning

- **Type:** mistake

- **Seen in:** #10

- **Detail:** `markLearned` set `seededStep: 0`, which re-used the 1-day interval on the first review. The contract comment in `types.ts` ("0 = next interval 1d, 1 = 4d …") was right, and the tests caught the mismatch.

- **Resolution:** Read the contract's field comments before implementing, and write the test against the contract's wording.

- **Status:** resolved

### L13. Parallel sessions pick the same next learning ID

- **Type:** issue

- **Seen in:** #10, #20

- **Detail:** Two sessions each added "L11", which caused a merge conflict in `docs/LEARNINGS.md`.

- **Resolution:** When syncing with main, keep both entries and renumber yours to the next free ID. This is cheap to resolve; keep appending new entries at the end of the file.

- **Status:** resolved

### L14. Parking work while an earlier PR on the same branch is in CI

- **Type:** difficulty

- **Seen in:** #15

- **Detail:** Only one remote branch is allowed per session. While W1-D's PR was waiting on CI, the finished W1-F files couldn't be pushed without joining that PR, and the stop hook objects to untracked files.

- **Resolution:** Commit the next task to a local-only staging branch. After the earlier PR merges, reset the work branch to `origin/main`, cherry-pick the staging commit, and ship it.

- **Status:** resolved

### L14. LEARNINGS.md edits inside task PRs cause repeated merge conflicts

- **Type:** issue

- **Seen in:** #11

- **Detail:** Parallel task PRs all edited `docs/LEARNINGS.md` (and WORKPLAN rows), so squash-merging needed several conflict-resolving syncs.

- **Resolution:** Update `LEARNINGS.md` only in a separate docs-only PR after the task PR has merged (user decision). Merge conflicts themselves are not tallied.

- **Status:** resolved

### L15. Data tasks with no dictionary access can only produce unreviewed drafts

- **Type:** difficulty

- **Seen in:** #22

- **Detail:** W1-J (prepositions, core vocabulary, topics) needed frequency evidence, but no dictionary or corpus host was reachable. Vocabulary came from model knowledge, so there are no honest `freqRank` values.

- **Resolution:** Mark every entry `review: unreviewed`, omit `freqRank`, and state the limits in `content/SOURCES.md`. A Gaelic speaker or W3-B should verify. Also tallied against L5.

- **Status:** open

### L16. A validator that needs data nobody has written yet

- **Type:** difficulty

- **Seen in:** #21

- **Detail:** W1-H must require Ferguson and Murchison tartans, but `content/` was empty until the data tasks landed, so a strict check would have failed CI on day one. Main also moved twice during CI, each time conflicting in `docs/WORKPLAN.md`.

- **Resolution:** The required-clan check applies only once a tartan exists, and warns otherwise. Generated JSON is committed and CI fails if `npm run content` changes it. After resolving a conflict, re-run `npm run content` in case newly merged data changes the output.

- **Status:** resolved

### L17. A pre-existing test sits outside the task's owned test folder

- **Type:** difficulty

- **Seen in:** #26

- **Detail:** `tests/unit/db.test.ts` (from F1) tests the settings helpers, but W1-K owns `tests/unit/db/**`, so the new tests went in that folder and the old file was left alone.

- **Resolution:** Keep `db.ts`'s v1 exports (`getSetting`, `setSetting`, `db`) unchanged so it keeps passing. Move it into `tests/unit/db/` in a later tidy-up.

- **Status:** open

---

## Entries by slug

New entries use a short slug heading (`### some-short-slug`) and go in **alphabetical order** in this section, not at the end. Different insertion points are what keep parallel PRs from conflicting. Keep a blank line between fields. Entries above this line keep their original `L` numbers, which other docs refer to.

### conflicted-pr-never-gets-ci

_A PR that conflicts with `main` never gets CI, so the session waits forever._

- **Type:** issue

- **Seen in:** #30

- **Detail:** GitHub does not start `pull_request` workflows for a PR that cannot merge cleanly. `ship-pr` waited for a check-suite event that never came, and the user had to notice. Most conflicts are in `docs/WORKPLAN.md` and `docs/LEARNINGS.md`, where every session edits the same table rows or appends at the end of the file.

- **Resolution:** `ship-pr` step 5 now reads `mergeable_state` straight after opening the PR, schedules a `send_later` fallback, and re-checks on every wake. `.github/workflows/conflict-notifier.yml` comments on open PRs that conflict after `main` moves. A stale "mark done" commit left on a reused branch also caused one; check the branch against `origin/main` before starting. The docs layout was also changed so parallel edits land on different lines (see `docs-layout-avoids-conflicts`).

- **Status:** adopted (skill and workflow, approved by the user)

### docs-layout-avoids-conflicts

- **Type:** efficiency

- **Seen in:** #31

- **Detail:** Git reports a conflict only when two changes touch the same or adjacent lines. Table rows in `docs/WORKPLAN.md` (status at the end of a long line, neighbours directly below) and entries appended to the end of `docs/LEARNINGS.md` collided every time sessions ran in parallel.

- **Resolution:** Each task is its own block with its **Status** on its own line, and every field is separated by a blank line. Learnings have no stored tally (count the PRs in **Seen in**), a blank line between fields, and new entries go in alphabetical order by slug instead of at the end. Splitting into one file per entry was rejected as heavier than needed.

- **Status:** adopted

### ell-weighting-has-no-owner-yet

_The spec says per-kind length weighting is "in W2-B", but a screen needs it first._

- **Type:** difficulty

- **Seen in:** #37

- **Detail:** B2 and B5 show a scarf's length in ells and say the kind weighting lives in W2-B. W2-D (scarf detail) merged first, with no service to ask. A UI task cannot edit `src/app/services/**`.

- **Resolution:** W2-D keeps a small `ELLS_PER_ITEM` table in `src/ui/screens/Scarf/scarfView.ts` (word 0.04, form 0.03, sentence 0.08). W2-B should own the table and W2-C (shelf) must use the same numbers, or the two screens will disagree. Placeholder values; tell the user before they become permanent.

- **Status:** open

### skill-proposal-threshold

_Skill and hook proposals now wait for a tally of 5, not 3._

- **Type:** efficiency

- **Seen in:** #32

- **Detail:** At a tally of 3 the proposals came up often (L5 hit 3 in its third PR), and each needed the user's attention. Proposals named in plain terms also confused: "the resources skill" was misnamed in chat before it was explained.

- **Resolution:** The user raised the threshold to 5 in `CLAUDE.md`, this file and `ship-pr`. When asking about a proposal, give its exact name and say in two lines what it is and what it saves.

- **Status:** adopted

### tartan-dictionary-licence

_Tartan Dictionary data has an NC-ND upstream and no stated licence._

- **Type:** issue

- **Seen in:** #29

- **Detail:** One Tartan Dictionary page names `thetartan/tartan-database` (CC BY-NC-ND 4.0) in its data chain, which clashes with our CC BY-SA content licence. WebFetch summaries also garble sett strings (some stripe codes look wrong), so none can be marked verified. Guessed page URLs often 404.

- **Resolution:** The user chose to drop the setts. They were removed before merge, `content/tartans/SOURCES.md` records what is still needed, and the follow-up is `W-TARTAN-SOURCES` in the workplan Backlog. Before copying data from any site, check its licence and its upstream chain.

- **Status:** resolved

### sentences-from-generator-script
- **Type:** efficiency

- **Tally:** 1

- **Seen in:** #36

- **Detail:** Hand-writing token lists for 48 sentences is error-prone. A throwaway script that takes plain Gaelic text, looks each word up in the lexeme and form YAML by surface form, and fails on any word that is missing or ambiguous (for example `air`, `ann`, which are both a lexeme and a 3sg-m form) caught every link problem before `npm run content` ran.

- **Resolution:** For future sentence batches, keep the script outside the repo (scratchpad), use `word|id` overrides for ambiguous surface forms, and map lenited forms to their base lexeme explicitly. A corpus lookup was not possible in this session, so every sentence is `review: generated`.

- **Status:** open

### content-prs-regenerate-json

_Content PRs must commit the regenerated `src/content/generated/`._

- **Type:** mistake

- **Seen in:** #29

- **Detail:** CI runs `npm run content` and fails if `src/content/generated` differs. A data-only PR (W1-I) added tartans without regenerating, so CI went red. That folder is outside a data task's Owns paths.

- **Resolution:** After changing anything under `content/`, run `npm run content` and commit the generated JSON in the same PR.

- **Status:** resolved

### L18. Testing Library does not auto-clean without Vitest globals
- **Type:** difficulty

- **Tally:** 1

- **Seen in:** #33

- **Detail:** With several `render` calls in one test file, earlier renders stayed in the DOM, so `getAllByRole` counted buttons from other tests.

- **Resolution:** Component test files call `afterEach(cleanup)`.

- **Status:** resolved
