# Work-complete planner handoff (copy and fill in)

Use this when handing off after **`work complete:`**. Replace placeholders in angle brackets.

---

## Instructions for the chosen planner

You are continuing a **work-complete** workflow from `xp_work`: an iteration item was selected from `work/ITERATION.md`, and planning mode was chosen (**<native planning | superpowers:brainstorming>**). The user must have **already** selected this mode (or pre-declared it in the work-complete message)—do not skip that gate.

### You must

1. **Plan and deliver on the feature branch** — All implementation happens on the feature branch, never on the base branch.
   - **Worktree directory is `.worktrees/`** — all work-complete worktrees go here, regardless of which tool you are running in (Claude Code, Codex, Cursor).
   - **Branch naming is deterministic** — derive `iter/<iter-n>-<slugified-title>` (lowercase, spaces/underscores → `-`, remove non-`[a-z0-9-]`, collapse dashes, trim). If the branch name or `.worktrees/<branch-name>` already exists, append `-2`, `-3`, … until both are free. The result is the **final branch name**.
   - **Gitignore safety** — run `git check-ignore -q .worktrees`; if not ignored, update root `.gitignore` idempotently (append `.worktrees` if the entry is absent, or create the file), commit as `chore: add .worktrees to .gitignore`, then `mkdir -p .worktrees`.
   - **Create worktree:** `git worktree add .worktrees/<final-branch-name> -b <final-branch-name>`. Record the created path for cleanup later.
   - **Project setup** — in the new worktree, inspect the repo root and run the **first** matching setup command: `package.json` → `npm install`; `Cargo.toml` → `cargo build`; `requirements.txt` → `pip install -r requirements.txt`; `pyproject.toml` → `poetry install`; `go.mod` → `go mod download`. Skip if none found. If setup fails, stop and ask the user.
   - **Clean baseline verification** — run the same canonical verification command that step 4 (pre-merge verification) will use later. If no command is discoverable, stop and ask the user. If tests fail, report and ask before proceeding.
   - **Fallback** — if the user declines a worktree, `git checkout -b <final-branch-name>` in the current checkout (skip gitignore setup, project setup, and baseline verification).
   - If you are on the base branch, create a feature branch before implementation. Do not implement directly on the base branch.
   - If the mode is **native planning**, produce a **visible** plan **before** implementation: use **Cursor Plan mode** (or the product's planning UI), **or** post a short bullet plan in chat and wait for explicit user approval. Silent codebase exploration without a written plan does **not** satisfy native planning.
   - If the mode is **`superpowers:brainstorming`**, run that flow first. **Checkpoint 1:** after the user approves the written spec and before invoking `superpowers:writing-plans`, check `git status --porcelain -- <spec-path>`. If dirty, stage only the spec and commit: `docs: incorporate user revisions to <spec-filename>`. If staging or committing fails, stop before `superpowers:writing-plans`. Then implement.
   - All implementation commits go on the feature branch. By the end of this step, the feature branch must contain all non-`work/` changes.

2. **Execution recommendation override** — When you produce a completed plan through `superpowers:writing-plans`, ignore any static `(recommended)` label in the upstream agentic-worker handoff. Read `skills/dev/xp_work/assets/execution-recommendation.md`, evaluate the plan you just wrote against its matrix, emit exactly one recommendation sentence with the dominant reason, and then immediately continue with the chosen skill (`superpowers:executing-plans` or `superpowers:subagent-driven-development`). Do not ask the user to choose unless the chosen skill later requires user input for a different reason.

2b. **Checkpoint 2 — commit outstanding changes before verification:** Before verification, ensure the feature branch is fully committed.

   1. Confirm the current branch is the feature branch, not `BASE_BRANCH`. Confirm no unresolved merge conflicts. If either fails, stop.
   2. Run `git status --porcelain`. If empty, skip to step 3.
   3. Stage all changes: `git add -A`
   4. Commit: `chore: commit outstanding changes before squash merge`
   5. If staging or committing fails, stop before verification. Do not continue with a dirty feature branch.

3. **Pre-merge verification** — Determine the repo's canonical verification command and run it on the feature branch.
   - If verification **fails**, stop on the feature branch. Do not begin squash merge. Fix the issue and rerun verification before proceeding.
   - If the repo has **no discoverable verification command**, stop and ask the user rather than guessing.

4. **Squash merge to the base branch** — Execute these sub-steps in order:

   1. **Detect the base branch** once and reuse it for the rest of the workflow:
      ```bash
      BASE_BRANCH=$(git config --get git-town.main-branch 2>/dev/null || \
        git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || \
        echo "main")
      ```
   2. **Read the current feature branch name:**
      ```bash
      FEATURE_BRANCH=$(git branch --show-current)
      ```
   3. **Assert** `FEATURE_BRANCH != BASE_BRANCH`. If they are equal, stop — the workflow lost its isolation guarantee.
   4. **Collect** all commit messages on the feature branch that are not on the base branch:
      ```bash
      git log ${BASE_BRANCH}..${FEATURE_BRANCH} --format="%B" > /tmp/work-complete-squash-msg-$$.txt
      ```
   5. **Switch to the base branch** and update from upstream when an upstream exists. If no upstream exists, skip the pull step and note that fact in the final summary:
      ```bash
      git checkout ${BASE_BRANCH} && git pull
      ```
   6. **Ensure the base branch checkout is clean** before merging. If it is not clean, stop and ask the user to resolve it. Do not auto-stash, auto-reset, or silently mix unrelated changes.
   7. **Run the squash merge:**
      ```bash
      git merge --squash ${FEATURE_BRANCH}
      ```
   8. **If the squash merge conflicts**, stop. Do not yank the iteration item, do not create the housekeeping commit, and do not delete the feature branch or worktree.
   9. **Stage** the merged implementation changes and `CHANGELOG.md` when updated. Do **not** stage `work/` files.
   10. **Commit** with this structure:
       ```
       <concise summary of what shipped>

       From work/ITERATION.md (ITER-N):
       <snapshot block from work-complete time>

       Original source: <Source field> (<Source id> if present)

       Commits from <feature-branch>:
       <collected commit messages>
       ```

5. **Post-merge verification** — Run the same verification command on the base branch after the feature delivery commit.
   - If verification **passes**, continue to cleanup.
   - If verification **fails**, stop before cleanup and before yanking the iteration item. Preferred recovery: fix the problem on the feature branch and repeat the merge path so the delivered feature remains one reviewable commit.

6. **Clean up branch and worktree** — Only after post-merge verification passes:
   - Delete the local feature branch: `git branch -D <feature-branch>`
   - If a worktree was used, remove it using the **exact path recorded during creation**: `git worktree remove <recorded-worktree-path>`
   - If the feature branch was pushed, delete the remote branch (best-effort): `git push origin --delete <feature-branch>`

   Remote branch deletion is best-effort. If it fails, report it but do not roll back a successful local merge.

7. **Human verification gate** — After the merged result passes automated verification, decide whether a human still needs to verify anything (e.g. local UI walkthrough, E2E with credentials, device testing, production smoke).
   - If **no** human verification is needed → go straight to **Yank** (step 8).
   - If **yes** → **before** yanking, append a new section to **`work/ACCEPTANCE.md`** using the same format as the **`acceptance`** command (`../templates/acceptance-template.md`, next **`**Id:** ACC-N`**). Set **Source** to **`ITERATION.md`**, **Source id** to the iteration entry's **`ITER-N`**, fill **Acceptance Criteria** with a concrete checklist of the remaining human checks only. **Pre-verification** must **not** describe merge, branch cleanup, or worktree removal — those already happened. Describe only what the human needs to do to verify. Then go to **Yank** (step 8).

8. **Yank + housekeeping commit** — Remove the **entire** iteration section from **`work/ITERATION.md`** (from its `##` heading through the next `---` or the next `##` at the same or higher level). Do not leave an empty stub. If step 7 added an `ACCEPTANCE.md` entry, include it in the same commit.

   Rules:
   - Only stage `work/` files that changed.
   - Subject: `xp_work: yank ITER-N from ITERATION`
   - Mention `ACC-N` in the subject or body when acceptance was queued.
   - Do **not** include feature code, test changes, or `CHANGELOG.md` in this commit.

   This must be a **separate commit** from the feature delivery commit (step 4).

9. **CHANGELOG** — If **`CHANGELOG.md`** (or the repo's canonical changelog at the workspace root) exists, add **one sentence** describing the user-visible or maintenance outcome, matching existing bullet style. **Do not include the entry id** (e.g. `ITER-3`, `IMP-7`) in the CHANGELOG line — describe the change in plain language. Include the CHANGELOG update in the **feature delivery commit** (step 4), not the housekeeping commit (step 8).

### Do not

- Do not use `superpowers:finishing-a-development-branch` for the merge step — follow the squash-merge instructions above instead.
- Do not mix feature code and `work/` file changes in the same commit.
- Do not yank the iteration section before the feature delivery commit exists and post-merge verification passes.
- Do not drop the commit-body requirement (snapshot block + collected commit messages in the feature delivery commit body).
- Do not skip `ACCEPTANCE.md` when human verification is still required.
- Do not add unrelated drive-by refactors beyond what the iteration item requires.
- Do not use `EnterWorktree` or `ExitWorktree` tools for worktree creation.
- Do not delegate directory selection to `superpowers:using-git-worktrees` — work-complete owns the worktree location (`.worktrees/`).
- Do not recompute the cleanup path later; use the exact created worktree path.
