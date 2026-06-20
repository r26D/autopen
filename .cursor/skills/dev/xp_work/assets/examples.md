# Example interactions

**User:** `improve: The GraphQL API could have better error messages — users get generic 500s with no actionable detail`

**Agent:** _Ensures work/ files exist; **backfills** any older sections missing **`**Id:**`** in the target file; assigns the next `IMP-N` per `assets/id-prefixes.md`; adds formatted entry (with **`**Id:**`** and **`**Why:**`** inferred from the user's rationale) to work/IMPROVEMENTS.md; confirms. No analysis of endpoints or error types._

**User:** `improve: The sidebar could use a search filter`

**Agent:** _Adds to work/IMPROVEMENTS.md with **`**Why:** [Not yet documented]`** (no rationale supplied); confirms._

**User:** `deferred: Refactor the auth module into smaller GenServers`

**Agent:** _Adds to work/DEFERRED.md with Source noted and **`**Why:** [Not yet documented]`**; confirms._

**User:** `debt: Duplicate validation logic in two controllers`

**Agent:** _Adds to work/TECH_DEBT.md; confirms._

**User:** `feat: Add dark mode support to the settings UI`

**Agent:** _Adds formatted entry to work/TODO.md; confirms._

**User:** `add to iteration: [section title from IMPROVEMENTS.md]`

**Agent:** _Finds the section in IMPROVEMENTS.md, removes it, formats per iteration template (copying **`**Why:**`** verbatim from source), appends to work/ITERATION.md with source_

**User:** `work complete: Join Household Button Doesn't Work After Login`

**Agent:** _Extracts section from ITERATION.md, commits with that message, confirms with hash_

**User:** `pluck: Triple install: Cursor + Claude + Codex...` (or `/xp_work pluck` with a pointer to a queued section)

**Agent (turn 1):** _Resolves section, snapshots the block, commits **Pluck status:** claim to the base branch, **stops** — asks only for planning mode (native planning vs `superpowers:brainstorming`), using AskQuestion if available._

**User:** _Selects an option._

**Agent (turn 2+):** _Follows **templates/pluck-planner-brief.md**, creates worktree/feature branch, produces a visible plan if native planning, implements; if human verification is still required, appends **`ACC-N`** to **ACCEPTANCE.md** (copying **`**Why:**`** from the queue section); yanks the section; commits with block in body; updates CHANGELOG if present._

**User:** `pluck: BUG-3` (or `/xp_work pluck` pointing at a section in `work/BUGS.md`)

**Agent:** _Resolves section, snapshots the block, commits **Pluck status:** claim to the base branch. Detects the `BUG` prefix — auto-selects `superpowers:systematic-debugging` (no planning-mode prompt). Creates worktree/feature branch, runs systematic debugging to diagnose root cause, plans the fix, implements, verifies, squash-merges, yanks._

**User:** `accept: ACC-1 — checked on fresh clone` (or `/xp_work accept` with a pointer to one `work/ACCEPTANCE.md` section)

**Agent:** _Resolves the section in **ACCEPTANCE.md** only, snapshots the block, removes the section, commits with verification subject + optional note + snapshot in body, **does not** touch CHANGELOG, confirms with hash._
