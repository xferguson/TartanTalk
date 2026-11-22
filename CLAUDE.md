# Tartan Talk: agent guide

Scottish Gaelic learning PWA where learning is woven into a tartan scarf.

| Doc | What it is |
|---|---|
| `docs/PRD.md` | Product requirements (source of truth for behaviour) |
| `docs/TECH_PLAN.md`, `docs/TECH_PLAN_2.md` | Technical decisions |
| `docs/WORKPLAN.md` | **Task board.** Every task, its owned paths, dependencies, status, and UI specs (Appendix B) |
| `docs/LEARNINGS.md` | **Shared memory.** Mistakes, difficulties and efficiencies with tallies |

## Vocabulary
Tartans are woven. Use weave / loom / shuttle / reweave in all copy, UI, code and docs. Never "knit".

## Principles to preserve
No streaks, no guilt, no lost progress. Local-only data, no accounts. Free and open source.

## Starting a session
1. Read `docs/WORKPLAN.md` and `docs/LEARNINGS.md` before doing anything else.
2. Pick one `todo` task whose dependencies are all `done`, unless the user assigned you one.
3. Mark it `in progress (<branch>)` (see "Keeping the workplan current").
4. Work only inside the task's **Owns** paths. Needing a file outside them is a signal: stop, then split the work or coordinate through the workplan.

## Git and PR workflow
Use the `ship-pr` skill (`.claude/skills/ship-pr/SKILL.md`) to ship any change. It runs the steps below.

- Never commit to `main` directly. Always work on a branch and open a PR. Open it as a draft while work is in progress.
- **Sync with `main` before every push and before opening or updating a PR.** Run `git fetch origin main`, then merge `origin/main` into your branch. Resolve conflicts locally and re-run the checks. Only then push. This prevents surprise conflicts and failed PRs.
- Once CI is green, mark the draft PR ready and merge it (squash) without asking the user. Wait for the user only when they have explicitly said to for that specific change. GitHub does not let an agent approve PRs opened under the user's account, so a merge on green is the approval step.
- Do not skip, disable or weaken tests to get CI green.
- Merging to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## Keeping the workplan current
- Starting a task: set its status to `in progress (<branch>)`.
- Task PR merged: set it to `done (#PR)`.
- Blocked: set it to `blocked (<reason>)` and add a learning.
- Status updates and `docs/LEARNINGS.md` updates are documentation-only changes. CI skips PRs that only touch `docs/**` or Markdown files, so as long as there is no merge conflict you can open them and merge them immediately, without waiting for CI. Do not bundle learnings into the task PR.
- Edit only your own task's **Status** line. Add new tasks as new blocks with owned paths and dependencies. Keep the blank lines between fields; they keep parallel edits from conflicting.

## Self-learning process
Update `docs/LEARNINGS.md` in a separate docs-only PR **after** the task PR has merged, never inside the task PR, to avoid merge conflicts. Merge conflicts themselves are not tallied.
- Record every mistake you made or found, issue dealt with, difficulty, or efficiency discovered. Check the existing entries first.
- If the learning already exists, add your PR number to its **Seen in** line (the tally is the number of PRs listed). Otherwise add a new entry in alphabetical order by slug under "Entries by slug", never at the end of the file.
- **When an entry reaches a tally of 5,** evaluate whether a skill (`.claude/skills/<name>/SKILL.md`) or a hook (`.claude/settings.json`) would make the problem avoidable, predictable or faster.
  - Write the proposal into the entry under **Proposal**.
  - Present it to the user and ask whether to adopt it. Do not add skills or hooks without the user's approval.
  - Approved skills and hooks are committed to the repo, so every session benefits. Then mark the entry `adopted`.

## UI work is built from written specs, not mock-ups
- Mock-ups (`design/mockups/`) are inspiration and evidence. They are **not** the build target.
- Before any UI task is worked on, the tech lead transcribes the mock-up into an exact spec in the task (`docs/WORKPLAN.md` Appendix B). The spec covers measurements, tokens, type, copy, states, empty states, motion and accessibility.
- Agents implement the spec precisely and check their result against it. Loose interpretation is a defect.
- If the spec is missing, ambiguous or conflicts with the mock-up, do not guess. Mark the task `blocked (spec)`, ask for a spec update, and log a learning.
- Any deliberate deviation must be noted in the PR description and in `docs/LEARNINGS.md`.

## Coding standards
- **Red, green, refactor (TDD).** Write a failing test that states the behaviour, make it pass with the simplest code, then refactor with the tests green. Bug fixes start with a failing test that reproduces the bug.
- **DRY.** One source of truth for each piece of knowledge: tokens in `tokens.css`, contracts in `src/domain/types.ts`, content in `content/`. Extract shared logic rather than copy it, but don't build abstractions before the second real use.
- **SOLID:**
  - Single responsibility for each module and component.
  - Open for extension through data and config, rather than edits to callers.
  - Substitutable implementations behind interfaces.
  - Small focused interfaces.
  - Depend on abstractions: inject collaborators such as the clock, scheduler and DB into the domain and services instead of importing concrete ones.
- **KISS and YAGNI.** Build what the current task and spec need, nothing speculative.
- **Pure domain.** `src/domain` has no React, no DOM and no IndexedDB, and takes `now` as a parameter.
- **Types.** Strict TypeScript. No `any`, no non-null assertions without a comment, and no `@ts-ignore`.
- **Naming and comments.** Use names from the product's vocabulary (scarf, weave, moth, reweave, tangle, ell). Comments explain why, not what.
- **Accessibility is part of done:** labels, `lang="gd"` on Gaelic, focus states, reduced motion, 44px targets.

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest; component tests opt into jsdom per file |
| `npm run build` | Production build |
| `npm run e2e` | Playwright |
| `npm run icons` | Regenerate the PWA icons |

Run lint, typecheck, test and e2e before pushing.

## Architecture
| Area | Location |
|---|---|
| Learning logic | `src/domain`: pure functions with injected time. Shared contracts in `src/domain/types.ts` |
| Weaving | `src/weave` |
| Storage | `src/db` (Dexie) |
| Screens | `src/ui/screens/<Screen>/` (CSS Modules) |
| Shared components | `src/ui/components/` |
| Routes | Registered once in `src/app/router.tsx` (hash router) |
| Content | YAML in `content/` (CC BY-SA 4.0); code is MIT |
