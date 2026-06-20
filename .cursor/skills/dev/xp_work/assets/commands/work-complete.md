# Command: work-complete (iterate → isolate → plan → execute → squash merge → housekeeping → confirm)

Use for: **`work complete:`**, **`work complete`** (optionally with a `##` heading, file/line reference, **`**Id:** ITER-N`**, or a pasted block that matches one section in `work/ITERATION.md`)

**Prerequisites:** Read `../bootstrap.md` and `../rules.md` first. This command **implements** product/repo changes—not "record only."

**Source file (only):** `work/ITERATION.md`

## Workflow

1. **Migrate and bootstrap** `work/` files as needed.
2. **Identify the section** in `work/ITERATION.md`. Try these cues until one resolves **uniquely** (if ambiguous at any step, ask the user to narrow: heading, id, or more pasted text):
   - **Heading or citation** — Match a `##` heading (substring is fine if it matches **exactly one** section), or a reference such as `@work/ITERATION.md:<lines>` / open-editor path+lines. Prefer the cited range when the user points at a span that falls inside one section.
   - **Entry id** — If the user message includes a token matching **`**Id:** ITER-N`** per **`../id-prefixes.md`**, search `work/ITERATION.md` for a section whose metadata includes **that exact id line**. If **exactly one** section matches, that is the target. If none or more than one match, ask the user to fix the id or disambiguate.
   - **Pasted block** — If the user pastes a fragment of an item (with or without the `##` line): find the unique section such that **any** of the following holds: (a) the block contains the section's **`**Id:** ITER-N`** line; (b) the block's first non-empty line equals the section's `##` heading line (after trim); (c) after normalizing whitespace (trim ends, collapse blank runs), the block text is a substring of the full section text **or** the section body is clearly the only one containing that distinctive text. If still ambiguous, ask for the id or the full `##` title line.
   **Then backfill** missing entry ids in `work/ITERATION.md` per **`../id-prefixes.md`** (Backfill) before editing the section.

3. **Snapshot the block** — Copy the full section text **exactly as queued** (from the `##` line through the content up to but not including the next `---` or the next `##` at the same level—same boundary rules as pluck). Keep this copy for the final commit body. Also capture the **Source** and **Source id** fields from the iteration entry for provenance.

4. **Isolate feature work** — Before implementation begins, ensure work will happen on a feature branch in a managed worktree.

   **4a. Detect the base branch** using this three-tier fallback (reuse this value for the rest of the run, including step 10):
   1. `git config --get git-town.main-branch`
   2. `git symbolic-ref refs/remotes/origin/HEAD | sed 's|refs/remotes/origin/||'`
   3. Fallback to `main`

   ```bash
   BASE_BRANCH=$(git config --get git-town.main-branch 2>/dev/null || \
     git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || \
     echo "main")
   ```

   **4b. Derive the candidate branch name** — `iter/<iter-n>-<slugified-title>`.

   Slug rules: lowercase only; convert spaces and underscores to `-`; remove characters outside `[a-z0-9-]`; collapse repeated dashes; trim leading/trailing dashes; truncate the slug so the full branch name stays readable.

   **Collision handling:** If the branch already exists locally **or** `.worktrees/<branch-name>` already exists, append `-2`, `-3`, … until both the branch name and the worktree path are free. The resulting name is the **final branch name** used for creation, reporting, and cleanup.

   **4c. Decide whether a feature branch is needed:**
   - **Current branch is the base branch** → Feature branch required. Continue to 4d.
   - **Current branch is already a non-base branch** → Treat it as the feature branch unless the user explicitly asks for a new branch. Skip to the planning mode gate (step 5).

   **4d. Checkout safety precondition** — Before creating a new branch, editing `.gitignore`, or creating a worktree, the starting checkout must be clean. If the working tree has unrelated staged or unstaged changes, stop and ask the user how to proceed. Do not auto-stash, auto-reset, or silently mix unrelated local edits into branch/worktree setup.

   **4e. Ensure `.worktrees/` repo hygiene** (only when creating a new worktree):
   1. Run `git check-ignore -q .worktrees`.
   2. If `.worktrees` is already ignored, continue.
   3. If `.worktrees` is **not** ignored:
      - If root `.gitignore` exists and does not already contain an exact `.worktrees` entry, append one line.
      - If root `.gitignore` does not exist, create it with `.worktrees` as the only entry.
      - Commit only that change: `chore: add .worktrees to .gitignore`.
      - Report in the final summary (step 16) that this extra housekeeping commit was required.
   4. `mkdir -p .worktrees`

   **4f. Create worktree + feature branch:**
   ```bash
   git worktree add .worktrees/<final-branch-name> -b <final-branch-name>
   ```
   After creation, **record the created path** (e.g. `.worktrees/iter/iter-3-add-dark-mode`) so step 12 cleanup can remove that exact directory later.

   **Hard stop:** If worktree or branch creation fails, stop. Do not continue on the base branch.

   **4g. Project setup auto-detection** — In the new worktree, inspect the repo root and run the **first** matching setup command:

   | File present | Command |
   |-------------|---------|
   | `package.json` | `npm install` |
   | `Cargo.toml` | `cargo build` |
   | `requirements.txt` | `pip install -r requirements.txt` |
   | `pyproject.toml` | `poetry install` |
   | `go.mod` | `go mod download` |

   Skip if none found. If the chosen command fails, stop and ask the user whether to investigate or proceed without local setup.

   **4h. Clean baseline verification** — Run the repo's canonical verification command in the worktree (the same command step 9 will later use for pre-merge verification). If no canonical verification command is discoverable, stop and ask the user rather than guessing.
   - Tests **pass** → report ready, continue to step 5.
   - Tests **fail** → report failures, ask user whether to proceed or investigate.

   **Fallback path** — If the user declines a worktree: `git checkout -b <final-branch-name>` in the current checkout. Skip 4e, 4g, and 4h (the checkout is shared). Step 9 pre-merge verification is still mandatory later.

   **Explicit prohibition:** Do not use `EnterWorktree`, `ExitWorktree`, or delegate directory selection to `superpowers:using-git-worktrees`. Work-complete owns the worktree location.

### Planning mode gate (mandatory — do not skip)

5. **If the user already declared a mode in the same message**, treat it as their choice and go to step 6. Accept plain-language equivalents, for example:
   - Native / Plan / Cursor plan → **Native planning** (see below).
   - Brainstorm / superpowers → **`superpowers:brainstorming`**.
   If there is **no** such declaration, you **must** obtain a choice before any implementation work:
   - **Stop after step 4.** Do **not** read the codebase for implementation, do **not** write or change product code, and do **not** run tool calls whose purpose is to implement the item.
   - Your **next message to the user** must present **only** the planning-mode question (optional: one short line naming the section you identified). Prefer a **multiple-choice UI** when the product supports it (e.g. Cursor **AskQuestion** with exactly two options) so the user must pick before you continue.
   - Offer **exactly two** options (same meaning every time):
     - **Native planning** — Use **Cursor Plan mode** (or the product's built-in planning flow) so a **written plan exists and is visible to the user before coding**. If Plan mode is not available, post a **short bullet plan in chat** and **wait for explicit approval** (e.g. "proceed," "looks good," or thumbs-up) before writing implementation code.
     - **`superpowers:brainstorming`** — Run the **`superpowers:brainstorming`** flow first, then implement.
   - **Wait for the user's reply** that selects one option. Do not assume defaults.

6. **Hand off to the chosen planner** — Read `../templates/work-complete-planner-brief.md` and give the planner explicit instructions that it must:
   - Follow the **squash-merge** path and produce **two commits** on the base branch: one feature delivery commit (step 10) and one housekeeping commit (step 14).
   - Do **NOT** use `superpowers:finishing-a-development-branch` for the merge step — the squash-merge procedure in step 10 replaces it.
   - Complete all implementation on the feature branch before merging.

7. **Execute on the feature branch** — All non-`work/` changes for the iteration item are made on the feature branch. Follow the selected planning mode: **native planning** means a **visible** plan first (Plan mode or chat plan + approval), then implement; **`superpowers:brainstorming`** means that flow first, then implement.

   **7a. Checkpoint 1 — commit approved spec artifact:** When the `superpowers:brainstorming` flow completes and the user approves the written spec, check whether the spec file has uncommitted changes before invoking `superpowers:writing-plans`:

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

7b. **Checkpoint 2 — commit outstanding changes before verification:** Before verification runs, ensure the feature branch is fully committed so verification operates on the exact tree that will later be merged.

   **7b.1 Entry conditions:**
   1. The current branch must be the feature branch, not `BASE_BRANCH`.
   2. The working tree must have no unresolved merge conflicts.

   If any entry condition fails, stop and report the condition.

   **7b.2 Dirty detection:**
   ```bash
   git status --porcelain
   ```

   - If empty: the feature branch is already clean. Skip checkpoint 2 and continue to step 8.
   - If any output: checkpoint 2 must run.

   **7b.3 Commit behavior:**
   1. Stage all tracked, untracked, and deleted changes:
      ```bash
      git add -A
      ```
   2. Commit:
      ```bash
      git commit -m "chore: commit outstanding changes before squash merge"
      ```
   3. Continue to step 8 only after the commit succeeds.

   **7b.4 Failure handling:**
   - If `git add -A` or the commit fails, stop before verification.
   - Do not silently continue with a dirty feature branch.
   - Do not filter by file type — preserve the full feature-branch state.

8. **Pre-merge verification** — Determine the repo's canonical verification command and run it on the feature branch.
   - If verification **fails**, stop on the feature branch. Do not begin squash merge. Fix the issue and rerun verification before proceeding.
   - If the repo has **no discoverable verification command**, stop and ask the user rather than guessing.

9. **Squash merge to the base branch** — Execute these sub-steps in order:

    1. **Reuse the base branch** detected in step 4a (`BASE_BRANCH`). Do not re-detect.
    2. **Read the current feature branch name:**
       ```bash
       FEATURE_BRANCH=$(git branch --show-current)
       ```
    3. **Assert** `FEATURE_BRANCH != BASE_BRANCH`. If they are equal, stop — the workflow lost its isolation guarantee.
    4. **Collect** all commit messages on the feature branch that are not on the base branch:
       ```bash
       git log ${BASE_BRANCH}..${FEATURE_BRANCH} --format="%B" > /tmp/work-complete-squash-msg-$$.txt
       ```
    5. **Switch to the base branch** and update from upstream when an upstream exists. If no upstream exists, skip the pull step and note that fact in the final summary.
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
        <snapshot block from step 3>

        Original source: <Source field> (<Source id> if present)

        Commits from <feature-branch>:
        <collected commit messages>
        ```

10. **Post-merge verification** — Run the same verification command on the base branch after the feature delivery commit.
    - If verification **passes**, continue to cleanup (step 11).
    - If verification **fails**, stop before cleanup and before yanking the iteration item. Preferred recovery: fix the problem on the feature branch and repeat the merge path so the delivered feature remains one reviewable commit.

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

   3a. Build the current-item search text from: the iteration section title, the `ITER-N` id, the source filename, and the source id (if present).

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

   **Artifact storage:** Ship-proof stores artifacts in `artifacts/<feature-name>/<date>/` by default. After ship-proof completes, **copy** (not move) the artifacts to `docs/features_proof/<ITER-N>-<slugified-title>/`:
   ```bash
   PROOF_DIR="docs/features_proof/<ITER-N>-<slugified-title>"
   mkdir -p "$PROOF_DIR"
   cp -r artifacts/<feature-name>/<date>/* "$PROOF_DIR/"
   ```
   Include the `docs/features_proof/` directory in the feature delivery commit (amend step 9's commit if ship-proof ran after the initial commit, or include it if it ran before).

   **If ship-proof fails:** Report the failure. The work-complete workflow continues — ship-proof is evidence, not a hard gate. Note the failure in the step 15 summary and in the ACC-N acceptance criteria if human verification is queued.

11. **Clean up branch and worktree** — Only after step 10 passes:
    1. Delete the local feature branch: `git branch -D <feature-branch>`
    2. If a worktree was used, remove it using the **exact path recorded in step 4f**: `git worktree remove <recorded-worktree-path>`
    3. If the feature branch was pushed, delete the remote branch (best-effort): `git push origin --delete <feature-branch>`

    Remote branch deletion is best-effort. If it fails, report it but do not roll back a successful local merge.

12. **Human verification gate** — After the merged result passes automated verification, decide whether a human still needs to verify anything (e.g. local UI walkthrough, E2E with credentials, device testing, production smoke).
    - If **no** human verification is needed → continue to step 13.
    - If **yes** → continue to step 12a.

    12a. **Queue for acceptance** — Append a new `ACC-N` section to `work/ACCEPTANCE.md` (read `commands/acceptance.md`, `../templates/acceptance-template.md`, and `../id-prefixes.md`). Rules:
    - **Source:** `ITERATION.md`.
    - **Source id:** the iteration section's `**Id:** ITER-N`.
    - **Date Moved to Acceptance:** today.
    - **Description / Context / Acceptance Criteria:** derived from the step 3 snapshot and what was implemented; criteria must be checkable by the human.
    - **Why:** Copy the iteration section's **`**Why:**`** verbatim when present. If absent, set **`**Why:** [Not yet documented]`**.
    - **Pre-verification:** Must **not** describe merge, branch cleanup, or worktree removal — those already happened before acceptance was queued. Describe only what the human needs to do to verify.
    - After appending, raise `ACCEPTANCE.md`'s `**Last id:** ACC-N` counter to the newly assigned id per `../id-prefixes.md` (Persistent counter).

13. **Yank + housekeeping commit** — Remove the entire iteration section from `work/ITERATION.md` (same boundaries as step 3). If step 12a ran, include the new `ACCEPTANCE.md` entry in the same commit.

    Rules:
    - Only stage `work/` files that changed.
    - Subject: `xp_work: yank ITER-N from ITERATION`
    - Mention `ACC-N` in the subject or body when acceptance was queued.
    - Do **not** include feature code, test changes, or `CHANGELOG.md` in this commit.
    - Do **not** change `ITERATION.md`'s `**Last id:**` counter when yanking. The counter is monotonic — once an id has been assigned and yanked, the next entry recorded must get the next number, never reuse the yanked one.

14. **CHANGELOG** — If `CHANGELOG.md` exists and the change is worth recording, update it as part of the **feature delivery commit** (step 9), not the housekeeping commit. Add **one sentence** summarizing what shipped or changed, matching the file's existing structure (e.g. Keep a Changelog `## [Unreleased]`). **Do not include the entry id** (e.g. `ITER-3`, `IMP-7`) in the CHANGELOG line — entry ids are per-file and not unique across time; describe the change in plain language. The snapshot in the commit body preserves the id for traceability.

15. **Confirm** — Return a short summary including:
    - Iteration item: ITER-N and section title
    - Original source and source id (provenance)
    - Planning mode used
    - Feature delivery commit hash (from step 9)
    - Housekeeping commit hash (from step 13)
    - Whether `CHANGELOG.md` was updated
    - Whether `ACC-N` was created (and if so, note that `accept:` / `xp_work accept` should be used after the human verifies)
    - Whether ship-proof ran (spec-driven or ad-hoc fallback), passed, or was skipped — and why (spec row matched, no spec found, not in spec requirements, no UI changes). Include artifact location when it ran: `docs/features_proof/<ITER-N>-<slug>/`
    - Whether base-branch pull was skipped (no upstream)
    - Whether remote branch deletion was skipped or failed
    - Whether Workbench workspace archive was triggered or skipped (no Workbench MCP)

16. **Workbench workspace archive** (conditional) — If the `mcp__workbench__archive_workspace` tool is available, the session is running inside a Workbench workspace. Call `mcp__workbench__archive_workspace` to archive the workspace. This must be the **absolute last action** — after the confirm summary has been returned to the user. The tool is irreversible: it stops processes, removes the worktree, and preserves chat history. If the tool is not available, skip this step entirely.

See `../format-guidelines.md` for template paths.
