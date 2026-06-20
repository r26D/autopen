# Command: unpluck (reverse a pluck claim → commit)

Use for: **`unpluck:`**, **`xp_work unpluck`**, **`/xp_work unpluck`** (optionally with a `##` heading, file/line reference, **`**Id:** PREFIX-N`**, or a pasted block that matches one section in an eligible queue file)

**Prerequisites:** Read `../bootstrap.md` and `../rules.md` first. This command **does not** implement product work—it only removes the pluck claim marker from a queue file and **commits** that reversal.

**Purpose:** Reverse an in-progress pluck claim when work is abandoned or cancelled. Removes the `**Pluck status:** In progress` line so the item returns to its original queued state and can be plucked again.

Eligible source files (same as pluck): `work/IMPROVEMENTS.md`, `work/TODO.md`, `work/USER_GOALS.md`, `work/BUGS.md`, `work/DEFERRED.md`, `work/TECH_DEBT.md`.

## Workflow

1. **Migrate and bootstrap** `work/` files as needed.
2. **Identify the section** in one of the eligible files. Try these cues until one resolves **uniquely** (if ambiguous at any step, ask the user to narrow: file, heading, or more pasted text):
   - **Heading or citation** — Match a `##` heading (substring is fine if it matches **exactly one** section), or a reference such as `@work/<FILE>:<lines>` / open-editor path+lines. Prefer the cited range when the user points at a span that falls inside one section.
   - **Entry id** — If the user message includes a token matching **`**Id:** PREFIX-N`** per **`../id-prefixes.md`** (same line format as in the queue file), search **all** eligible files for a section whose metadata includes **that exact id line**. If **exactly one** section matches, that is the target. If none or more than one match, ask the user to fix the id or disambiguate.
   - **Pasted block** — If the user pastes a fragment of an item (with or without the `##` line): find the unique section such that **any** of the following holds: (a) the block contains the section's **`**Id:** PREFIX-N`** line; (b) the block's first non-empty line equals the section's `##` heading line (after trim); (c) after normalizing whitespace (trim ends, collapse blank runs), the block text is a substring of the full section text **or** the section body is clearly the only one containing that distinctive text. If still ambiguous, ask for the id or the full `##` title line.
   **Then backfill** missing entry ids in **that** queue file per **`../id-prefixes.md`** (Backfill) before editing the section.

3. **Verify the section is plucked** — Inspect the target section for a `**Pluck status:** In progress` line.
   - If no such line exists, stop and tell the user the item is not currently plucked — nothing to unpluck.
   - If the line exists, continue.

### Preconditions before the unpluck commit

4. **Detect the base branch** using this three-tier fallback:
   ```bash
   BASE_BRANCH=$(git config --get git-town.main-branch 2>/dev/null || \
     git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || \
     echo "main")
   ```

   **Record the starting branch:**
   ```bash
   STARTING_BRANCH=$(git branch --show-current)
   ```

   **Require a clean working tree.** If the working tree has unrelated staged or unstaged changes, stop and ask the user how to proceed.

   **Refresh the base branch when an upstream exists.** If the base branch has an upstream, update it with a fast-forward-only pull. If the fast-forward pull fails, stop and ask the user.

5. **Ensure the workflow can edit the base branch's working tree:**
   - If `STARTING_BRANCH` equals `BASE_BRANCH`, stay there. Set `BASE_WORKTREE=""`.
   - If `STARTING_BRANCH` is a non-base branch, attempt `git checkout ${BASE_BRANCH}`.
     - If the checkout **succeeds**, set `BASE_WORKTREE=""` and continue.
     - If the checkout **fails** because the base branch is checked out in another worktree (`already used by worktree`), detect the worktree path:
       ```bash
       BASE_WORKTREE=$(git worktree list --porcelain | awk -v b="refs/heads/${BASE_BRANCH}" '/^worktree /{wt=$2} /^branch /{if($2==b) print wt}')
       ```
       All file edits and git commands for step 6 operate in `${BASE_WORKTREE}`.

6. **Remove the pluck status line and commit:**

   **6a.** Edit the queue file (at `${BASE_WORKTREE}/work/<SOURCEFILE>.md` when operating via an external worktree, otherwise `work/<SOURCEFILE>.md`). Remove the entire `**Pluck status:** In progress (started YYYY-MM-DD)` line. Preserve all other section content exactly.

   **6b.** Stage only the queue source file. If `BASE_WORKTREE` is set, use `git -C "${BASE_WORKTREE}" add work/<SOURCEFILE>.md`; otherwise `git add work/<SOURCEFILE>.md`.

   **6c.** Commit: subject `xp_work: unpluck <PREFIX-N> in <SOURCEFILE>`. If `BASE_WORKTREE` is set, use `git -C "${BASE_WORKTREE}" commit …`.

   **6d. Return to the starting context:**
   - If `BASE_WORKTREE` is set, no branch switch is needed.
   - Otherwise, if `STARTING_BRANCH` differs from `BASE_BRANCH`, switch back: `git checkout ${STARTING_BRANCH}`.

7. **Confirm** — Return a short summary including:
   - Source file and section title
   - Entry id (`PREFIX-N`)
   - Commit hash
   - That the item is now available to be plucked again

**Do not** update `CHANGELOG.md` or any other changelog. **Do not** clean up feature branches or worktrees — the user handles that separately.
