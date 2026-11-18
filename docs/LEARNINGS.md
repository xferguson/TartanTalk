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

- **Seen in:** #13, #33 (logged again as L18), #62, #65

- **Detail:** Component tests saw buttons left by earlier renders because Vitest globals are off, so RTL's automatic cleanup never registered.

- **Resolution:** Call `afterEach(cleanup)` in each component test file (or add it to `tests/setup.ts` in a task that owns it).

- **Proposal:** Third sighting (with L18). Register `afterEach(cleanup)` once in `tests/setup.ts`, so no component test file can forget it, and merge L18 into this entry.

- **Status:** adopted (W3-G #65, approved by the user). `tests/setup.ts` now runs `afterEach(cleanup)` for every test, and `tests/unit/setupCleanup.test.tsx` guards it. Per-file calls are harmless and can stay.

### L12. Off-by-one between a step counter and the contract's meaning

- **Type:** mistake

- **Seen in:** #10

- **Detail:** `markLearned` set `seededStep: 0`, which re-used the 1-day interval on the first review. The contract comment in `types.ts` ("0 = next interval 1d, 1 = 4d …") was right, and the tests caught the mismatch.

- **Resolution:** Read the contract's field comments before implementing, and write the test against the contract's wording.

- **Status:** resolved

### L13. Parallel sessions pick the same next learning ID

- **Type:** issue

- **Seen in:** #10, #20, #66

- **Detail:** Two sessions each added "L11", which caused a merge conflict in `docs/LEARNINGS.md`. The same happens with task IDs: #62 and #63 both claimed W3-F, and #63 was renumbered to W3-G when it synced with main.

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

### allowed-host-lag-in-webfetch

_After allowing a host, `curl` worked but `WebFetch` still said ENOTFOUND._

- **Type:** difficulty

- **Tally:** 1

- **Seen in:** #45

- **Detail:** Adding Wikipedia and Wikimedia hosts to the environment allowlist took effect for `curl` within seconds, while `WebFetch` kept failing for several minutes. Wikimedia's API also rate-limited a few quick requests.

- **Resolution:** After an allowlist change, test with `curl` first, space out requests, and retry `WebFetch` later. Gutenberg also returned 503 with a one-hour `Retry-After`, so it may rate-limit the session proxy.

- **Status:** open

### approximate-setts-unblock-ui

_Real setts were blocked on licences, so UI work waited._

- **Type:** efficiency

- **Tally:** 1

- **Seen in:** #44, #45

- **Detail:** W1-I stayed blocked on a licence-compatible source, which also held back W2-E and W2-F. Placeholder setts written from general knowledge of each tartan's colours unblock the screens, as long as they are labelled honestly.

- **Resolution:** 26 placeholders were added with `verified: false` and "Approximate placeholder" in the provenance. `W-TARTAN-EXACT-SETTS` tracks replacing them. When data is blocked, ship clearly labelled stand-ins plus a follow-up task rather than waiting.

- **Status:** resolved

### check-mockup-before-designing

_A placeholder in the app can be a placeholder in the mock-up too._

- **Type:** efficiency

- **Seen in:** #62

- **Detail:** The user asked for nicer nav buttons and to check whether the mock-up already had a design. Round 2 draws the nav icons as the same placeholder squares the app uses (`.nav i` in `design/mockups/round2.html`), and B10 had deferred real icons with a pointer to "B11", a number since given to the Tangles spec. Reading the mock-up CSS settled it in one step. Drawing the icons in a scratch HTML page and screenshotting them at 96px and 24px caught a shuttle that read as an eye before any app code was written.

- **Resolution:** Grep the mock-up's CSS and JS for the element before designing. Prototype icons as standalone SVG and screenshot them at real size in both themes. When a spec points at another section, check that the section still says what the pointer expects.

- **Status:** resolved

### known-items-leak-into-clozes
_What the learner already knows must be checked wherever an exercise singles out a word._

- **Type:** mistake

- **Seen in:** #63

- **Detail:** Words marked "I already know this" were still blanked in the clozes for their sentences, and a cloze picked any token at random, so a word could be reviewed before it was due. A sentence typed correctly the first time had no "I already knew this" option. The user found both in real use.

- **Resolution:** `clozeTargets` limits a blank to words woven in this run or due for review. With none, the sentence is typed whole. A first correct sentence answer offers "I already knew this". When adding a way to mark something known, check every builder that picks a target.

- **Status:** resolved

### no-project-details-in-user-agent

_A descriptive User-Agent nearly carried the project owner's handle to an outside service._

- **Type:** mistake

- **Tally:** 1

- **Seen in:** #45

- **Detail:** When Wikimedia rate-limited `curl`, a retry with a descriptive User-Agent included the repository owner's GitHub handle. The permission classifier blocked it.

- **Resolution:** Use a generic client name in headers sent to outside services. Never put the user's name, repo or contact details there without their approval.

- **Status:** resolved

### conflicted-pr-never-gets-ci

_A PR that conflicts with `main` never gets CI, so the session waits forever._

- **Type:** issue

- **Seen in:** #30, #63

- **Detail:** GitHub does not start `pull_request` workflows for a PR that cannot merge cleanly. `ship-pr` waited for a check-suite event that never came, and the user had to notice. Most conflicts are in `docs/WORKPLAN.md` and `docs/LEARNINGS.md`, where every session edits the same table rows or appends at the end of the file.

- **Resolution:** `ship-pr` step 5 now reads `mergeable_state` straight after opening the PR, schedules a `send_later` fallback, and re-checks on every wake. `.github/workflows/conflict-notifier.yml` comments on open PRs that conflict after `main` moves. A stale "mark done" commit left on a reused branch also caused one; check the branch against `origin/main` before starting. The docs layout was also changed so parallel edits land on different lines (see `docs-layout-avoids-conflicts`).

- **Status:** adopted (skill and workflow, approved by the user)

### docs-layout-avoids-conflicts

- **Type:** efficiency

- **Seen in:** #31

- **Detail:** Git reports a conflict only when two changes touch the same or adjacent lines. Table rows in `docs/WORKPLAN.md` (status at the end of a long line, neighbours directly below) and entries appended to the end of `docs/LEARNINGS.md` collided every time sessions ran in parallel.

- **Resolution:** Each task is its own block with its **Status** on its own line, and every field is separated by a blank line. Learnings have no stored tally (count the PRs in **Seen in**), a blank line between fields, and new entries go in alphabetical order by slug instead of at the end. Splitting into one file per entry was rejected as heavier than needed.

- **Status:** adopted

### reweave-item-focus-needs-store-api
_The Scarf screen links a hole to `/reweave/:id?item=…`, but the session store cannot start on a chosen item._

- **Type:** issue

- **Tally:** 1

- **Seen in:** #49

- **Detail:** Spec B5 says a tapped hole opens the reweave "focused on that item". `startReweave` only takes a scarf id and orders by overdue, and the store is outside W2-H's Owns paths, so the screen ignores `?item=`.

- **Resolution:** Follow-up: let `startReweave(scarfId, firstItemId?)` move that item to the front of the queue (W2-B owner), then read the param in `ReweaveScreen`.

- **Status:** open

### preselect-link-needs-other-screen

_A link from one screen that pre-fills another is two tasks, because each screen has its own owner._

- **Type:** difficulty

- **Seen in:** #47

- **Detail:** B9 says "Use for a new scarf" opens `/new` with the tartan pre-selected, but `NewScarfScreen` belongs to W2-E and was already merged.

- **Resolution:** The Library navigates to `/new?tartan=<id>` and the New scarf side was added as W2-E2 instead of editing outside Owns. Specs for cross-screen links should name the query parameter up front. W2-E2 then added the `?tartan=` handling, including paging so a tartan beyond the first nine is visible.

- **Status:** resolved

### settings-control-outside-owns
_A task's UI hook-up can fall outside its Owns paths: split it into its own task._

- **Type:** difficulty

- **Tally:** 1

- **Seen in:** #41

- **Detail:** W2-B asked for a dev time-travel control in Settings, but `src/ui/screens/Settings/**` and `src/main.tsx` belong to no W2-B path.

- **Resolution:** Built the clock service and its persistence in W2-B and added W2-B2 for the Settings control, instead of editing outside Owns.

- **Status:** resolved

### shared-exercise-panel-before-loom
_Reweave and Tangles needed the B6 question card before the Loom screen (W2-G) existed._

- **Type:** difficulty

- **Tally:** 1

- **Seen in:** #49

- **Detail:** B7 and B11 reuse the Loom's exercise card, feedback line and typed input. W2-G owns `src/ui/screens/Loom/**`, so W2-H built `Reweave/ExercisePanel` and Tangles imports it.

- **Resolution:** When W2-G lands, move `ExercisePanel` to `src/ui/components/` in a small refactor PR and use it from all three screens (second real use; avoid duplicating it).

- **Status:** open

### shelf-length-and-owned-paths

- **Type:** difficulty

- **Tally:** 1

- **Seen in:** #39

- **Detail:** W2-C needs a scarf's length in ells, but the per-kind weighting belongs to W2-B (not a dependency). W2-C also owns only `src/ui/screens/Shelf/**`, while vitest only runs `tests/unit/**` and the e2e smoke test hard-coded the morning greeting that B4 makes time-dependent.

- **Resolution:** Kept the ell constants (word 0.02, form 0.03, sentence 0.06) in `Shelf/shelfModel.ts`, to move into W2-B's services. Put tests in `tests/unit/shelf/`. Made the smoke test accept either greeting. "Reweave {N} holes" uses the hole count of the target scarf, which B4 leaves ambiguous.

- **Status:** open

### ell-weighting-has-no-owner-yet

_The spec says per-kind length weighting is "in W2-B", but a screen needs it first._

- **Type:** difficulty

- **Seen in:** #37, #39, #41

- **Detail:** B2 and B5 show a scarf's length in ells and say the kind weighting lives in W2-B. W2-D (scarf detail) merged first, with no service to ask. A UI task cannot edit `src/app/services/**`.

- **Resolution:** W2-D keeps a small `ELLS_PER_ITEM` table in `src/ui/screens/Scarf/scarfView.ts` (word 0.04, form 0.03, sentence 0.08). W2-B should own the table and W2-C (shelf) must use the same numbers, or the two screens will disagree. Placeholder values; tell the user before they become permanent. W2-B now owns it as `ELLS_PER_KIND` in `src/app/services/length.ts` with the same numbers; the Scarf and Shelf screens should switch to importing it. Shelf currently uses different numbers (0.02, 0.03, 0.06), so the two screens disagree until they do.

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

- **Resolution:** Component test files call `afterEach(cleanup)`. Now done once in `tests/setup.ts`; see L12, which this duplicates.

- **Status:** resolved

### word-ladder-has-no-cloze
_Words and forms have no sentence to blank, so the ladder's middle rung needs a rule._

- **Type:** difficulty

- **Tally:** 1

- **Seen in:** #41

- **Detail:** The ladder is recognise, cloze, type, but `buildCloze` only takes sentences. A word on the cloze rung had no exercise. A recognise card with fewer than two options (a tiny scarf) was also unanswerable.

- **Resolution:** `buildExercise` falls back to typing for a word on the cloze rung, and for any choice with fewer than two options. Review questions use choice for the first two reviews, then typing. If the PRD wants words in context, that needs sentences and belongs in a later task.

- **Status:** resolved

### placeholder-headings-in-e2e
_A smoke test that asserts a placeholder's heading breaks when the real screen lands._

- **Type:** issue

- **Tally:** 1

- **Seen in:** #48

- **Detail:** `tests/e2e/smoke.spec.ts` expected the Loom's placeholder heading "At the loom". B6's empty state replaced it, so the nav test failed locally.

- **Resolution:** Screen tasks update the smoke test's expected heading in the same PR and note it as outside their Owns paths. Run `npm run e2e` before pushing.

- **Status:** open

### L19. Raw content tags and dead-end session screens reached learners

- **Type:** issue

- **Tally:** 2

- **Seen in:** #54, and the follow-up that carries resting items into a new batch

- **Detail:** The New scarf and Scarf screens showed machine tags (`topic:love`, `prep:aig`), and the Loom ended every batch, or a wait on a missed thread, with only "Back to the shelf", so a learner could not keep weaving.

- **Resolution:** (follow-up) "Keep weaving" alone was not enough: while a missed item rested, it re-offered that same item. `startLearning` now takes the previous session, skips its resting items and carries them into the next batch; when a scarf has no new words left the Loom recommends subjects to add (`recommendTopics`).  `tagLabel` (src/domain/tagLabel.ts) is the one place that turns a tag into display text; `TagPicker` takes a `format` prop. A finished or resting Loom offers "Keep weaving", which starts the next batch. Any screen that shows content to a learner should format it, and no end state should lack a way forward.

- **Status:** resolved

### L20. The scarf was drawn full-size from the first moment

- **Type:** issue

- **Tally:** 1

- **Seen in:** #60

- **Detail:** `paintScarf` filled the whole cloth every time. Woven items only placed moth holes and the shuttle sweep, so a brand-new scarf looked finished and never changed as the learner wove. The B2 spec said bands spread evenly along the strip, which hid the problem: nothing said what an empty or part-woven scarf looks like.

- **Resolution:** `wovenRect` gives the woven part of the cloth. The strip grows left to right by 16px per item, and the detail scarf grows downward with the newest band at the top. The unwoven part is a dashed outline. Specs for any progress visual must describe the empty, part-woven and full states.

- **Status:** resolved

### L15. Listing a topic as a starter before it has vocabulary lets users build an empty scarf
- **Type:** mistake
- **Tally:** 1
- **Seen in:** #60
- **Detail:** All PRD themes were offered as starters, but only love and languages had words. A tester picked nature, hills, wild animals, food and greetings and was told "out of words" straight away.
- **Resolution:** Added 20+ words or phrases for each of those five topics. Remaining starters (weather, music, sport and others) are still empty. Either fill them or hide a starter until it has items (follow-up).
- **Status:** open

### L21. Stubbing `matchMedia` in Playwright: a MediaQueryList's `matches` is read-only

- **Type:** mistake

- **Tally:** 1

- **Seen in:** #58

- **Detail:** `Object.assign(real('all'), { matches: true })` threw inside the page, so the whole app failed to render and the test timed out looking for a heading.

- **Resolution:** Wrap the real list in a `Proxy` that overrides only `matches` and binds functions to the target. A test that "finds nothing" may mean the page crashed; check the console first.

- **Status:** resolved

### L22. Install-banner rules belong in a pure function with injected `now`

- **Type:** efficiency

- **Tally:** 1

- **Seen in:** #58

- **Detail:** Keeping the show/hide rules (touch only, standalone, installed, 14-day snooze, iOS vs native) in `src/domain/installPrompt.ts` made them testable without a browser; the hook and e2e tests only cover wiring. Browser detection stays in the app layer.

- **Status:** resolved

### L23. A scarf filter by tags starves its own sentences
- **Type:** mistake
- **Tally:** 1
- **Seen in:** #60
- **Detail:** `candidateItems` kept only items matching the scarf's tags, so a preposition scarf never offered `tha` or the nouns its sentences need. Those sentences could never unlock and the learner only saw prepositions as bare words.
- **Resolution:** Candidates now include the words of matching sentences (`scarfItems`). Test content against a realistic filter, not only a filter that matches every word.
- **Status:** resolved

### L24. Quizzing a word before showing it is frustrating
- **Type:** mistake
- **Tally:** 1
- **Seen in:** #60, #63
- **Detail:** The first card for a new word was a multiple-choice question. Found by the user in real use, not by tests.
- **Resolution:** An introduce card (word and meaning only) comes first. Check each new flow from the learner's chair, not just the data model.
- **Status:** resolved

### L25. An e2e test that depends on the time of day passes in the morning and fails after noon
- **Type:** mistake
- **Tally:** 1
- **Seen in:** #60
- **Detail:** `install.spec.ts` looked for the morning greeting only. The Shelf greets "Feasgar math!" after 12:00, so CI failed whenever it ran in the afternoon (UTC). `smoke.spec.ts` already accepted both.
- **Resolution:** Match both greetings, or fix the clock in the test. Never assert on text that changes with the real time.
- **Status:** resolved
