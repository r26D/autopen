# Command: pluck (queue → claim → plan → isolate → execute → squash merge → housekeeping → confirm)

Use for: **`pluck:`**, **`xp_work pluck`**, **`/xp_work pluck`** (optionally with a `##` heading, file/line reference, **`**Id:** PREFIX-N`**, or a pasted block that matches one queued section)

**Prerequisites:** Read `../bootstrap.md` and `../rules.md` first. This command **implements** product/repo changes—not "record only."

Eligible source files (same as iteration): `work/IMPROVEMENTS.md`, `work/TODO.md`, `work/USER_GOALS.md`, `work/BUGS.md`, `work/DEFERRED.md`, `work/TECH_DEBT.md`.

## Workflow

1. **Migrate and bootstrap** `work/` files as needed.
2. **Identify the section.** Try these resolution strategies in order until one succeeds:

   **2a. Inline pluck snapshot** — If the user message contains a `<pluck-snapshot>…</pluck-snapshot>` block (sent automatically by Workbench when plucking from the UI), extract the item content directly from that block. The block contains `**Source:** <FILENAME>`, a `## Title` heading, and the full item body. Use this as the authoritative section content — do **not** require it to exist in the local worktree's queue file (the worktree may have been created before the item was recorded on the base branch). Derive the source file from the `**Source:**` line and the entry id from the `**Id:** PREFIX-N` line within the body. If the block is present and well-formed, skip 2b–2d entirely.

   **2b. Local file search** — Search the eligible queue files in the **local worktree** using these cues until one resolves **uniquely** (if ambiguous at any step, ask the user to narrow: file, heading, or more pasted text):
   - **Heading or citation** — Match a `##` heading (substring is fine if it matches **exactly one** section), or a reference such as `@work/<FILE>:<lines>` / open-editor path+lines. Prefer the cited range when the user points at a span that falls inside one section.
   - **Entry id** — If the user message includes a token matching **`**Id:** PREFIX-N`** per **`../id-prefixes.md`** (same line format as in the queue file), search **all** eligible files for a section whose metadata includes **that exact id line**. If **exactly one** section matches, that is the target. If none or more than one match, ask the user to fix the id or disambiguate.
   - **Pasted block** — If the user pastes a fragment of an item (with or without the `##` line): find the unique section such that **any** of the following holds: (a) the block contains the section's **`**Id:** PREFIX-N`** line; (b) the block's first non-empty line equals the section's `##` heading line (after trim); (c) after normalizing whitespace (trim ends, collapse blank runs), the block text is a substring of the full section text **or** the section body is clearly the only one containing that distinctive text. If still ambiguous, ask for the id or the full `##` title line.

   **2c. Base-branch worktree fallback** — If the item was not found locally (2b returned no match), the local worktree may have branched before the item was recorded on the base branch. Detect whether the base branch is checked out in another worktree:
   ```bash
   BASE_BRANCH=$(git config --get git-town.main-branch 2>/dev/null || \
     git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || \
     echo "main")
   BASE_WORKTREE=$(git worktree list --porcelain | awk -v b="refs/heads/${BASE_BRANCH}" '/^worktree /{wt=$2} /^branch /{if($2==b) print wt}')
   ```
   If `BASE_WORKTREE` is non-empty, search the eligible queue files under `${BASE_WORKTREE}/work/` using the same cues as 2b. If found, use that section content and note the source worktree path for the claim commit in step 4.

   **2d. Failure** — If none of 2a–2c resolved the item, stop and tell the user the item could not be found in the local worktree or the base-branch worktree. Do not attempt to record a new item.

   **Then backfill** missing entry ids in **that** queue file per **`../id-prefixes.md`** (Backfill) before copying or editing the section.
3. **Snapshot the block** — Copy the full section text **exactly as queued** (from the `##` line through the content up to but not including the next `---` or the next `##` at the same level—same boundary rules as other section moves). Keep this copy for the final commit body.

### Preconditions before the claim commit

Before editing the queue file or switching branches for the claim:

   **Detect the base branch** using this three-tier fallback (reuse this value for the rest of the pluck run):
   1. `git config --get git-town.main-branch`
   2. `git symbolic-ref refs/remotes/origin/HEAD | sed 's|refs/remotes/origin/||'`
   3. Fallback to `main`

   ```bash
   BASE_BRANCH=$(git config --get git-town.main-branch 2>/dev/null || \
     git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || \
     echo "main")
   ```

   **Record the starting branch** so the workflow can return to it if pluck started off-base:
   ```bash
   STARTING_BRANCH=$(git branch --show-current)
   ```

   **Require a clean working tree.** If the working tree has unrelated staged or unstaged changes, stop and ask the user how to proceed. Do not auto-stash, auto-reset, or silently mix unrelated local edits into the claim commit.

   **Refresh the base branch when an upstream exists.** If the base branch has an upstream, update it with a fast-forward-only pull before checking the queue section so claim detection uses the latest known base-branch state. If the fast-forward pull fails, stop and ask the user.

4. **Mark in progress on the base branch and commit the claim**

   **4a. Ensure the workflow can edit the base branch's working tree:**
   - If `STARTING_BRANCH` equals `BASE_BRANCH`, stay there. Set `BASE_WORKTREE=""` (empty — operating in place).
   - If `STARTING_BRANCH` is a non-base branch, attempt `git checkout ${BASE_BRANCH}`.
     - If the checkout **succeeds**, set `BASE_WORKTREE=""` and continue.
     - If the checkout **fails** because the base branch is checked out in another worktree (error contains `already used by worktree`), detect the worktree path:
       ```bash
       BASE_WORKTREE=$(git worktree list --porcelain | awk -v b="refs/heads/${BASE_BRANCH}" '/^worktree /{wt=$2} /^branch /{if($2==b) print wt}')
       ```
       All file edits and git commands for steps 4b–4d operate in `${BASE_WORKTREE}` (e.g. edit `${BASE_WORKTREE}/work/<SOURCEFILE>.md`, run `git -C "${BASE_WORKTREE}" add …` and `git -C "${BASE_WORKTREE}" commit …`). Do **not** switch branches in the current checkout.

   **4b. Check whether the target section is already claimed:**

   Inspect the target queue section on the base branch before writing anything.
   - If no `**Pluck status:** In progress` line exists on the section, continue.
   - If the section already contains `**Pluck status:** In progress ...`, stop and tell the user the item appears to be claimed. Do not silently overwrite an existing claim marker.
   - Only if the user explicitly instructs the workflow to re-claim the item may the workflow replace the existing marker date and continue.

   **4c. Write the claim marker:**

   Insert directly under the section's `## Title` line:
   `**Pluck status:** In progress (started YYYY-MM-DD)`

   Rules:
   - Use today's date in ISO format.
   - If re-claiming with explicit user approval, replace the existing in-progress line in place rather than adding a duplicate.
   - Preserve all other section content exactly.

   **4d. Create the claim commit:**
   1. Stage only the queue source file. If `BASE_WORKTREE` is set, use `git -C "${BASE_WORKTREE}" add work/<SOURCEFILE>.md`; otherwise `git add work/<SOURCEFILE>.md`.
   2. Commit: subject `xp_work: mark <PREFIX-N> in progress`. If `BASE_WORKTREE` is set, use `git -C "${BASE_WORKTREE}" commit …`.
   3. Do not include product code, changelog edits, or other work-file changes in this commit.

   **4e. Return to the starting context:**
   - If `BASE_WORKTREE` is set, no branch switch is needed — the current checkout is still on `STARTING_BRANCH`.
   - Otherwise, if `STARTING_BRANCH` differs from `BASE_BRANCH`, switch back: `git checkout ${STARTING_BRANCH}`
   - If pluck started on the base branch, stay there and continue to the planning gate.

### Planning mode gate (mandatory — do not skip)

5. **Auto-route BUG items:** If the plucked item's entry id has a **`BUG`** prefix (i.e. it was sourced from `work/BUGS.md`), the planning mode is **`superpowers:systematic-debugging`** automatically — skip the choice prompt and go to step 6. The user can still override this by explicitly declaring a different mode in the same message (see below).

   **If the user already declared a mode in the same message**, treat it as their choice and go to step 6. Accept plain-language equivalents, for example:
   - Native / Plan / Cursor plan → **Native planning** (see below).
   - Brainstorm / superpowers → **`superpowers:brainstorming`**.
   - Debug / systematic debugging → **`superpowers:systematic-debugging`**.
   If there is **no** such declaration **and** the item is not a BUG, you **must** obtain a choice before any implementation work:
   - **Stop after step 4.** The claim marker is already committed to the base branch. Do **not** read the codebase for implementation, do **not** write or change product code, and do **not** run tool calls whose purpose is to implement the plucked item.
   - Your **next message to the user** must present **only** the planning-mode question (optional: one short line naming the section you plucked). Prefer a **multiple-choice UI** when the product supports it (e.g. Cursor **AskQuestion** with exactly two options) so the user must pick before you continue.
   - Offer **exactly two** options (same meaning every time):
     - **Native planning** — Use **Cursor Plan mode** (or the product's built-in planning flow) so a **written plan exists and is visible to the user before coding**. If Plan mode is not available, post a **short bullet plan in chat** and **wait for explicit approval** (e.g. "proceed," "looks good," or thumbs-up) before writing implementation code.
     - **`superpowers:brainstorming`** — Run the **`superpowers:brainstorming`** flow first, then implement.
   - **Wait for the user's reply** that selects one option. Do not assume defaults.

6. **Isolate feature work** — Before implementation begins, ensure work will happen on a feature branch in a managed worktree.

   **6a. Derive the candidate branch name** — `pluck/<prefix-n>-<slugified-title>`.

   Slug rules: lowercase only; convert spaces and underscores to `-`; remove characters outside `[a-z0-9-]`; collapse repeated dashes; trim leading/trailing dashes; truncate the slug so the full branch name stays readable.

   **Collision handling:** If the branch already exists locally **or** `.worktrees/<branch-name>` already exists, append `-2`, `-3`, … until both the branch name and the worktree path are free. The resulting name is the **final branch name** used for creation, reporting, and cleanup.

   **6b. Decide whether a feature branch is needed:**
   - **Current branch is the base branch** → Feature branch required. Continue to 6c.
   - **Current branch is already a non-base branch** → Treat it as the feature branch unless the user explicitly asks for a new branch. Skip to step 7 (hand off to planner).

   **6c. Checkout safety precondition** — Before creating a new branch, editing `.gitignore`, or creating a worktree, the starting checkout must be clean. If the working tree has unrelated staged or unstaged changes, stop and ask the user how to proceed. Do not auto-stash, auto-reset, or silently mix unrelated local edits into branch/worktree setup.

   **6d. Ensure `.worktrees/` repo hygiene** (only when creating a new worktree):
   1. Run `git check-ignore -q .worktrees`.
   2. If `.worktrees` is already ignored, continue.
   3. If `.worktrees` is **not** ignored:
      - If root `.gitignore` exists and does not already contain an exact `.worktrees` entry, append one line.
      - If root `.gitignore` does not exist, create it with `.worktrees` as the only entry.
      - Commit only that change: `chore: add .worktrees to .gitignore`.
      - Report in the final summary (step 15) that this extra housekeeping commit was required.
   4. `mkdir -p .worktrees`

   **6e. Create worktree + feature branch:**
   ```bash
   git worktree add .worktrees/<final-branch-name> -b <final-branch-name>
   ```
   After creation, **record the created path** (e.g. `.worktrees/pluck/imp-13-unify-worktree-directory`) so step 11 cleanup can remove that exact directory later.

   **Hard stop:** If worktree or branch creation fails, stop. Do not continue on the base branch.

   **6f. Project setup auto-detection** — In the new worktree, inspect the repo root and run the **first** matching setup command:

   | File present | Command |
   |-------------|---------|
   | `package.json` | `npm install` |
   | `Cargo.toml` | `cargo build` |
   | `requirements.txt` | `pip install -r requirements.txt` |
   | `pyproject.toml` | `poetry install` |
   | `go.mod` | `go mod download` |

   Skip if none found. If the chosen command fails, stop and ask the user whether to investigate or proceed without local setup.

   **6g. Clean baseline verification** — Run the repo's canonical verification command in the worktree (the same command step 9 will later use for pre-merge verification). If no canonical verification command is discoverable, stop and ask the user rather than guessing.
   - Tests **pass** → report ready, continue to step 7.
   - Tests **fail** → report failures, ask user whether to proceed or investigate.

   **Fallback path** — If the user declines a worktree: `git checkout -b <final-branch-name>` in the current checkout. Skip 6d, 6f, and 6g (the checkout is shared). Step 9 pre-merge verification is still mandatory later.

   **Explicit prohibition:** Do not use `EnterWorktree`, `ExitWorktree`, or delegate directory selection to `superpowers:using-git-worktrees`. Pluck owns the worktree location.

7. **Hand off to the chosen planner** — Read `../templates/pluck-planner-brief.md` and give the planner explicit instructions that it must:
   - Follow the **squash-merge** path and produce **two commits** on the base branch: one feature delivery commit (step 9) and one housekeeping commit (step 13).
   - The planner brief contains a top-of-file **HARD STOP** block that forbids non-standard completion paths after verification. Reinforce: no `superpowers:finishing-a-development-branch`, no merge/PR/keep/discard options, and immediate continuation from verification success into squash merge.
   - Complete all implementation on the feature branch before merging.

8. **Execute on the feature branch** — All non-`work/` changes for the plucked item are made on the feature branch. Follow the selected planning mode: **native planning** means a **visible** plan first (Plan mode or chat plan + approval), then implement; **`superpowers:brainstorming`** means that flow first, then implement; **`superpowers:systematic-debugging`** means run that flow first to diagnose the root cause, then implement the fix.

   **8a. Checkpoint 1 — commit approved spec artifact:** When the `superpowers:brainstorming` flow completes and the user approves the written spec, check whether the spec file has uncommitted changes before invoking `superpowers:writing-plans`:

   ```bash
   git status --porcelain -- <spec-path>
   ```

   - If empty: the spec is clean. Continue to `superpowers:writing-plans`.
   - If dirty: stage only the spec file and commit:
     ```bash
     git add -- <spec-path>
     git commit -m "docs: incorporate user revisions to <spec-filename>"
     ```
     where `<spec-filename>` is the basename of the spec path.
   - If staging or committing fails, stop before `superpowers:writing-plans`. Do not continue with an approved-but-uncommitted spec revision.
   - Do not broaden this commit to other dirty files — checkpoint 1 is scoped to the approved spec artifact only.

   By the end of this step the feature branch contains the commits whose messages will later be harvested into the feature delivery commit body. If the implementation produces **no meaningful diff** relative to the base branch, stop and do not continue to merge.

8b. **Sync feature branch with base** — Before verification, integrate the latest base branch into the feature branch so conflicts are localized here rather than on the base branch during squash merge.

   **8b.1 Entry checks:**
   1. Confirm the current branch is the feature branch, not `BASE_BRANCH`. If they are equal, stop — the workflow lost its isolation guarantee.
   2. Confirm the working tree has no unresolved merge conflicts from a prior failed merge attempt.
   3. Reuse the previously detected `BASE_BRANCH` value (from the preconditions). Do not re-detect.

   If any entry check fails, stop and report the condition.

   **8b.2 Refresh the base ref (conditional):**

   Skip refresh entirely when:
   - The base branch has no configured upstream, **or**
   - `git-town.offline` is `true`

   In these cases, use the local base ref as-is and proceed to 8b.4.

   Otherwise refresh the local base ref:
   - If `BASE_WORKTREE` is set:
     ```bash
     git -C "${BASE_WORKTREE}" pull --ff-only
     ```
   - Otherwise, update the local ref without switching branches. Derive the upstream remote from the branch configuration (do not assume `origin`):
     ```bash
     git fetch <upstream-remote> ${BASE_BRANCH}:${BASE_BRANCH}
     ```

   **8b.3 Refresh failure handling:**

   If the refresh command fails (non-fast-forward, unreachable upstream, or other error), stop. Report that step 8b could not establish the latest base-branch ref. Do not proceed to merge, verification, squash merge, cleanup, or yank.

   **8b.4 Merge base into the feature branch:**
   ```bash
   git merge ${BASE_BRANCH}
   ```

   Rules:
   - Use a normal merge (not rebase, not squash merge).
   - Do not use custom merge strategies or conflict-resolution options.
   - If Git creates an automatic merge commit (no conflicts), continue to step 8c.

   **8b.5 Merge outcome handling:**

   | Condition | Next action |
   |-----------|-------------|
   | Exit code `0`, no unmerged paths | Continue to step 8c |
   | Unresolved conflicts remain | Stop and report conflicted files |
   | Merge aborts for another reason | Stop and report the raw failure |

   To report conflicted files:
   ```bash
   git diff --name-only --diff-filter=U
   ```

   **8b.6 Conflict recovery:**

   If the merge leaves unresolved conflicts:
   1. Stop on the feature branch.
   2. Report which files conflict.
   3. The user resolves conflicts on the feature branch and commits the merge resolution.
   4. The workflow resumes from step 8c (checkpoint 2). Do not re-run step 8b after manual resolution.

8c. **Checkpoint 2 — commit outstanding changes before verification:** Before verification runs, ensure the feature branch is fully committed so verification operates on the exact tree that will later be merged.

   **8c.1 Entry conditions:**
   1. The current branch must be the feature branch, not `BASE_BRANCH`.
   2. The working tree must have no unresolved merge conflicts.

   If any entry condition fails, stop and report the condition.

   **8c.2 Dirty detection:**
   ```bash
   git status --porcelain
   ```

   - If empty: the feature branch is already clean. Skip checkpoint 2 and continue to step 9.
   - If any output: checkpoint 2 must run.

   **8c.3 Commit behavior:**
   1. Stage all tracked, untracked, and deleted changes:
      ```bash
      git add -A
      ```
   2. Commit:
      ```bash
      git commit -m "chore: commit outstanding changes before squash merge"
      ```
   3. Continue to step 9 only after the commit succeeds.

   **8c.4 Failure handling:**
   - If `git add -A` or the commit fails, stop before verification.
   - Do not silently continue with a dirty feature branch.
   - Do not filter by file type — preserve the full feature-branch state.

9. **Pre-merge verification and immediate squash merge** — Determine the repo's canonical verification command and run it on the feature branch.
   - If verification **fails**, stop on the feature branch. Do not begin squash merge. Fix the issue and rerun verification before proceeding.
   - If the repo has **no discoverable verification command**, stop and ask the user rather than guessing.
   - **When verification passes, immediately execute the squash merge below.** Do NOT invoke `superpowers:finishing-a-development-branch`, do NOT present merge/PR/keep/discard options, do NOT ask what the user wants to do next. Pluck owns the completion path — it is always a local squash merge. Proceed without asking.

   **Squash merge to the base branch** — Do NOT invoke any finishing or branch-completion skill. Execute these sub-steps in order:

    1. **Reuse the base branch** detected in the preconditions (`BASE_BRANCH`). Do not re-detect.
    2. **Read the current feature branch name:**
       ```bash
       FEATURE_BRANCH=$(git branch --show-current)
       ```
    3. **Assert** `FEATURE_BRANCH != BASE_BRANCH`. If they are equal, stop — the workflow lost its isolation guarantee.
    4. **Collect** all commit messages on the feature branch that are not on the base branch:
       ```bash
       git log ${BASE_BRANCH}..${FEATURE_BRANCH} --format="%B" > /tmp/pluck-squash-msg-$$.txt
       ```
    5. **Switch to the base branch** and update from upstream when an upstream exists. If no upstream exists, skip the pull step and note that fact in the final summary.
       - **Try** `git checkout ${BASE_BRANCH}`.
       - If the checkout **fails** because the base branch is checked out in another worktree, detect the worktree path (reuse `BASE_WORKTREE` from step 4a if already set, or detect now):
         ```bash
         BASE_WORKTREE=$(git worktree list --porcelain | awk -v b="refs/heads/${BASE_BRANCH}" '/^worktree /{wt=$2} /^branch /{if($2==b) print wt}')
         ```
         All remaining sub-steps (pull, merge, stage, commit) use `git -C "${BASE_WORKTREE}" …` and file paths under `${BASE_WORKTREE}/`.
       - Pull: `git -C "${BASE_WORKTREE}" pull` (or `git pull` if operating in place).
    6. **Ensure the base branch checkout is clean** before merging. If it is not clean, stop and ask the user to resolve it. Do not auto-stash, auto-reset, or silently mix unrelated changes.
    7. **Run the squash merge:**
       ```bash
       git merge --squash ${FEATURE_BRANCH}
       # or, if BASE_WORKTREE is set:
       git -C "${BASE_WORKTREE}" merge --squash ${FEATURE_BRANCH}
       ```
    8. **If the squash merge conflicts**, stop. Do not yank the queue item, do not create the housekeeping commit, and do not delete the feature branch or worktree.
    9. **Stage** the merged implementation changes and `CHANGELOG.md` when updated. Do **not** stage `work/` files. Use `git -C "${BASE_WORKTREE}" add …` when operating via an external worktree.
    10. **Commit** with this structure (use `git -C "${BASE_WORKTREE}" commit …` when operating via an external worktree):
        ```
        <concise summary of what shipped>

        Plucked from work/<SOURCEFILE>.md:
        <snapshot block from step 3>

        Commits from <feature-branch>:
        <collected commit messages>
        ```

10. **Post-merge verification** — Run the same verification command on the base branch after the feature delivery commit. When `BASE_WORKTREE` is set, run verification inside `${BASE_WORKTREE}` (e.g. `cd "${BASE_WORKTREE}" && <verification-command>`).
    - If verification **passes**, continue to cleanup (step 11).
    - If verification **fails**, stop before cleanup and before yanking the queue item. Preferred recovery: fix the problem on the feature branch and repeat the merge path so the delivered feature remains one reviewable commit.

10a. **Ship Proof gate** (conditional) — Capture visual evidence that a UI feature works. Uses spec-prescribed proof levels when available, falls back to ad-hoc classification for older specs.

   **Step 1 — Check ship-proof installation.** Look for the skill at any of these paths (relative to workspace root):
   - `skills/dev/ship-proof/SKILL.md`
   - `.codex/skills/dev/ship-proof/SKILL.md`
   - `.cursor/skills/dev/ship-proof/SKILL.md`
   - `.claude/skills/dev/ship-proof/SKILL.md`
   - `.claude/skills/ship-proof/SKILL.md`

   If none exist, skip this step entirely.

   **Step 2 — Locate the project spec.** Look for a `## Ship Proof Requirements` section using convention-based spec discovery:
   - Candidate roots, in order: `docs/superpowers/specs/`, then `docs/specs/`.
   - If a root does not exist, skip it.
   - Collect `*.md` files from the first root that exists and contains at least one markdown file.
   - If no candidate root yields markdown files → skip to step 4 (ad-hoc fallback).

   **Step 3 — Match against the spec's Ship Proof Requirements table.**

   3a. Build the current-item search text from: the plucked section title, the plucked source id (if present), and the source filename.

   3b. Choose the spec file:
   - If exactly one candidate spec exists → use it.
   - If multiple candidates exist, normalize each candidate's filename stem and first markdown heading to lowercase alphanumeric tokens. Score each by the number of unique normalized tokens shared with the current-item search text. Use the highest-scoring candidate with score > 0. If tied, use the most recently modified file. If every candidate scores zero → skip to step 4.

   3c. Read the chosen spec's `## Ship Proof Requirements` section.
   - If the section is missing or malformed (missing the required `Feature key | Match cues | Proof level | What to capture | Why` header, duplicate `Feature key` values, or unknown `Proof level` values) → skip to step 4.

   3d. For each row, compare the normalized current-item search text with the row's `Feature key` and each `Match cues` phrase (semicolon-delimited).
   - A row matches when the normalized text contains the full normalized feature key or one full normalized cue phrase.
   - If multiple rows match, prefer exact `Feature key` matches; otherwise prefer the row with the longest matching cue phrase.

   3e. If a row matches → use that row's `Proof level` and `What to capture` instructions. State which spec file and `Feature key` row are being followed. Continue to **How to run** below.

   3f. If no row matches → skip ship-proof. The spec author decided this feature does not need visual proof. Note in the step 15 summary that ship-proof was skipped (not in spec's proof requirements).

   **Step 4 — Ad-hoc fallback** (only when no spec or no valid section exists). Decide based on the feature type:

   | Feature type | Proof level | Why |
   |---|---|---|
   | Static UI (new panel, dialog, settings section, layout change) | **Screenshots** | Start/end states are sufficient |
   | Animation, transition, drag interaction, real-time updates | **Video** (required) | Motion cannot be proven with stills |
   | Data flow (Tauri command → rendered values, refresh button) | **Screenshots** + debug-eval verification | Need to prove real data renders, not just layout |
   | Complex multi-step workflow (wizard, onboarding, multi-panel) | **Video** + screenshots at key states | Sequence matters, not just final state |

   Skip for backend-only, config-only, or pure refactoring changes with no UI impact. Pass your decision to ship-proof by stating it when you invoke the skill.

   **How to run:** Invoke the `ship-proof` skill with the proof level determined above. It will:
   1. Run validation (compile, lint, test)
   2. Launch the app (Playwright or full Tauri, depending on the feature)
   3. Exercise the feature and capture proof at the level you specified
   4. Write a `ship-proof.md` report

   **Artifact storage:** Ship-proof stores artifacts in `artifacts/<feature-name>/<date>/` by default. After ship-proof completes, **copy** (not move) the artifacts to `docs/features_proof/<PREFIX-N>-<slugified-title>/`:
   ```bash
   PROOF_DIR="docs/features_proof/<PREFIX-N>-<slugified-title>"
   mkdir -p "$PROOF_DIR"
   cp -r artifacts/<feature-name>/<date>/* "$PROOF_DIR/"
   ```
   Include the `docs/features_proof/` directory in the feature delivery commit (amend step 9's commit if ship-proof ran after the initial commit, or include it if it ran before).

   **If ship-proof fails:** Report the failure. The pluck workflow continues — ship-proof is evidence, not a hard gate. Note the failure in the step 15 summary and in the ACC-N acceptance criteria if human verification is queued.

11. **Clean up branch and worktree** — Only after step 10 passes:
    1. Delete the local feature branch: `git branch -D <feature-branch>`
    2. If a worktree was used, remove it using the **exact path recorded in step 6e**: `git worktree remove <recorded-worktree-path>`
    3. If the feature branch was pushed, delete the remote branch (best-effort): `git push origin --delete <feature-branch>`

    Remote branch deletion is best-effort. If it fails, report it but do not roll back a successful local merge.

12. **Human verification gate** — After the merged result passes automated verification, decide whether a human still needs to verify anything (e.g. local UI walkthrough, E2E with credentials, device testing, production smoke).
    - If **no** human verification is needed → continue to step 13.
    - If **yes** → continue to step 12a.

    12a. **Queue for acceptance** — Append a new `ACC-N` section to `work/ACCEPTANCE.md` (read `commands/acceptance.md`, `../templates/acceptance-template.md`, and `../id-prefixes.md`). Rules:
    - **Source:** the pluck queue file name (e.g. `IMPROVEMENTS.md`).
    - **Source id:** the plucked section's `**Id:** PREFIX-N` if present.
    - **Date Moved to Acceptance:** today.
    - **Description / Context / Acceptance Criteria:** derived from the step 3 snapshot and what was implemented; criteria must be checkable by the human.
    - **Why:** Copy the plucked queue section's **`**Why:**`** verbatim when present. If absent, set **`**Why:** [Not yet documented]`**.
    - **Pre-verification:** Must **not** describe merge, branch cleanup, or worktree removal — those already happened before acceptance was queued. Describe only what the human needs to do to verify.
    - After appending, raise `ACCEPTANCE.md`'s `**Last id:** ACC-N` counter to the newly assigned id per `../id-prefixes.md` (Persistent counter).

13. **Yank + housekeeping commit** — Remove the entire plucked section from its queue file (same boundaries as step 3). If step 12a ran, include the new `ACCEPTANCE.md` entry in the same commit. When `BASE_WORKTREE` is set, edit the queue file at `${BASE_WORKTREE}/work/<SOURCEFILE>.md` and `${BASE_WORKTREE}/work/ACCEPTANCE.md`, then stage and commit with `git -C "${BASE_WORKTREE}" …`.

    Rules:
    - Only stage `work/` files that changed.
    - Subject: `xp_work: yank <PREFIX-N> from <SOURCEFILE>`
    - Mention `ACC-N` in the subject or body when acceptance was queued.
    - Do **not** include feature code, test changes, or `CHANGELOG.md` in this commit.
    - Do **not** change the queue file's `**Last id:**` counter when yanking. The counter is monotonic — once an id has been assigned and yanked, the next entry recorded in that file must get the next number, never reuse the yanked one.

14. **CHANGELOG** — If `CHANGELOG.md` exists and the change is worth recording, update it as part of the **feature delivery commit** (step 9), not the housekeeping commit. Add **one sentence** summarizing what shipped or changed, matching the file's existing structure (e.g. Keep a Changelog `## [Unreleased]`). **Do not include the entry id** (e.g. `BUG-1`, `IMP-7`) in the CHANGELOG line — entry ids are per-file and not unique across time; describe the change in plain language. The snapshot in the commit body preserves the id for traceability.

15. **Confirm** — Return a short summary including:
    - Source file and section title
    - Planning mode used
    - Claim commit hash (from step 4)
    - Feature delivery commit hash (from step 9)
    - Housekeeping commit hash (from step 13)
    - Whether `CHANGELOG.md` was updated
    - Whether `ACC-N` was created (and if so, note that `accept:` / `xp_work accept` should be used after the human verifies)
    - Whether ship-proof ran (spec-driven or ad-hoc fallback), passed, or was skipped — and why (spec row matched, no spec found, not in spec requirements, no UI changes). Include artifact location when it ran: `docs/features_proof/<PREFIX-N>-<slug>/`
    - Whether base-branch pull was skipped (no upstream)
    - Whether remote branch deletion was skipped or failed
    - Whether Workbench workspace archive was triggered or skipped (no Workbench MCP)

16. **Workbench workspace archive** (conditional) — If the `mcp__workbench__archive_workspace` tool is available, the session is running inside a Workbench workspace. Call `mcp__workbench__archive_workspace` to archive the workspace. This must be the **absolute last action** — after the confirm summary has been returned to the user. The tool is irreversible: it stops processes, removes the worktree, and preserves chat history. If the tool is not available, skip this step entirely.

See `../format-guidelines.md` for template paths.
