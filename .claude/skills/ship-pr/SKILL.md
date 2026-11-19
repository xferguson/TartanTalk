---
name: ship-pr
description: Ship the current branch's work as a PR in Tartan Talk. Syncs with main, runs all checks, opens a draft PR, waits for green CI, marks it ready and squash-merges it, then updates docs/WORKPLAN.md and docs/LEARNINGS.md. Use whenever a task's changes are ready to go up, or when the user says ship, open a PR, or merge.
---

# Ship a PR (Tartan Talk)

Follow these steps in order. Do not skip any. They encode `CLAUDE.md` rules and learning L1.

## 1. Sync with main
```sh
git fetch origin main
git merge --no-edit origin/main
```
Resolve any conflicts locally. For conflicts in `docs/WORKPLAN.md` or `docs/LEARNINGS.md`, keep both sides' entries and PR numbers. Never rebase or force-push a branch that already has an open PR.

## 2. Run the checks
Skip this step only if the diff is docs or Markdown only.
```sh
npm run lint && npm run typecheck && npm test && npm run build && npm run e2e
```
Fix any failure before continuing. Never skip, disable or weaken a test.

## 3. Update the shared docs in the same PR
- `docs/WORKPLAN.md`: your task's Status line says `in progress (<branch>)` (set it now if it doesn't).
- `docs/LEARNINGS.md`: add new learnings from this work, or add this PR to the **Seen in** line of existing entries. Insert new entries alphabetically by slug, never at the end. If any entry reaches tally 5, write a **Proposal** (a skill or hook) and plan to ask the user.
- UI work: confirm the result matches the task's spec in `docs/WORKPLAN.md` Appendix B, and list any deviations in the PR body.

## 4. Commit, push and open a draft PR
- Commit with the session attribution lines from the system reminder.
- `git push -u origin <branch>`, retrying network errors up to 4 times with backoff.
- Open a **draft** PR against `main` with:
  - a Summary
  - a Testing section (what you ran)
  - Spec deviations, for UI work
  - Learnings added
- Subscribe to PR activity.

## 5. Wait for CI and merge
CI never runs on a PR that conflicts with `main`, so "waiting for the check-suite event" can hang forever. Never wait without checking mergeability first.

1. Right after opening the PR, read it with `pull_request_read` and check `mergeable_state`.
   - `dirty` (conflicts): `git fetch origin main`, merge it, resolve locally, re-run the checks, push. Check again.
   - `behind`: call `update_pull_request_branch`, or merge `origin/main` and push.
   - `unknown`: GitHub is still computing it. Read again after a short while.
2. Schedule a fallback with `send_later` (about 10 minutes, message "Re-check PR #N: mergeable_state and CI"). If no check-suite event has arrived by then, read the PR again and go back to step 1. Cancel the reminder with `delete_trigger` once CI reports.
3. Wake on any PR event (including the conflict-notifier comment from `.github/workflows/conflict-notifier.yml`) by re-checking `mergeable_state` before anything else.
4. **Green:** mark the PR ready, then squash-merge it, passing `expectedHeadSha`.
   - Do not try to approve it. GitHub refuses approval on PRs authored by the user's account (L1). Merge on green is the approval step.
   - If the user explicitly asked to review this change first, stop and ask them instead.
5. **Red:** find the root cause, push a fix (after re-syncing with main), and wait again.
6. Docs-only PRs get no CI run. Merge them directly once `mergeable_state` is clean.

## 6. Close the loop
- Unsubscribe from the PR.
- In a docs-only follow-up PR (or the next PR), set the task to `done (#<PR>)` in `docs/WORKPLAN.md`, and add the PR number to the relevant learnings.
- Tell the user what merged, and ask them about any learning proposals that reached tally 5.
