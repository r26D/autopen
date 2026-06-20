# Command: acceptance (move to acceptance queue)

Use for: **`needs acceptance:`**, **`acceptance:`**

**Prerequisites:** Read `../bootstrap.md` and `../rules.md` first. Read `../id-prefixes.md` when appending to `ACCEPTANCE.md`.

## Trigger

**`needs acceptance: [reference to section in ITERATION.md]`** or **`acceptance: [reference to section in ITERATION.md]`**

→ Find the referenced section in ITERATION.md  
→ Remove that section from ITERATION.md  
→ Add it to the bottom of `work/ACCEPTANCE.md` using the acceptance template format  
→ Include the date it was moved to acceptance  
→ Mark source as "ITERATION.md"

## Workflow

1. **Read `../bootstrap.md`** if needed; **read `ITERATION.md`** — **backfill missing ids** per **`../id-prefixes.md`** (Backfill), then **read `ACCEPTANCE.md`** and **backfill missing ids** there too
2. **Locate the referenced section** in ITERATION.md
3. **Read the acceptance template** — `../templates/acceptance-template.md`
4. **Identify the section** by title or other reference provided by the user
5. **Extract the entire section** including the title and all content
6. **Remove the section** from ITERATION.md (preserve file structure)
7. **Format the entry** according to the acceptance template:
   - Assign **`**Id:** ACC-N`** — compute the next `ACC-N` in `ACCEPTANCE.md` after backfill as `max(**Last id:** counter, in-file max **Id:** ACC-*) + 1` (`../id-prefixes.md`).
   - If the iteration section had **`**Id:** ITER-N`**, set **`**Source id:** ITER-N`**; otherwise omit **Source id:**.
   - If the iteration section has a **`**Why:**`** field, copy its text verbatim into the acceptance entry's **`**Why:**`** field
   - If the iteration section lacks **`**Why:**`**, set **`**Why:** [Not yet documented]`**
8. **Append to the bottom** of ACCEPTANCE.md (before the final `---` separator if present)
9. **Update the persistent counter** in `ACCEPTANCE.md` — raise **`**Last id:** ACC-N`** to the newly assigned id. Removing the section from `ITERATION.md` (step 6) does **not** change `ITERATION.md`'s **`**Last id:**`** — the counter is monotonic.
10. **Commit** — Stage only the changed `work/` file(s) and commit with message `xp_work: move ITER-N to acceptance as ACC-N` (e.g. `xp_work: move ITER-3 to acceptance as ACC-5`). Do not use `git add .`; only stage specific `work/` files that were modified.
11. **Confirm completion** by saying "Moved to acceptance queue"

## When items arrive from pluck

The **`pluck`** command may append to **`work/ACCEPTANCE.md`** when **implementation is finished** but **human verification** is still required (see **`pluck.md`**, human verification gate). Use the **same** template, **`ACC-N`** assignment, and formatting rules as above. Differences:

- **Source** — The **queue file** the section was plucked from (e.g. **`IMPROVEMENTS.md`**), not **`ITERATION.md`**.
- **Source id** — The plucked entry’s **`PREFIX-N`** from the queue section.
- **Why** — Copy the plucked queue section’s **`**Why:**`** verbatim when present. If absent, set **`**Why:** [Not yet documented]`**.
- **Pre-verification** — In the current pluck workflow, the feature branch is squash-merged to the base branch and the worktree/branch are cleaned up **before** acceptance is queued. Pre-verification therefore does **not** need to describe merge, branch cleanup, or worktree removal. Use this field only when additional non-merge setup steps are needed for the human to test (e.g. environment variables, config files, service restarts).

The pluck workflow creates two commits on the base branch: a **feature delivery commit** (squash merge of the implementation) and a **housekeeping commit** (queue section yank + `ACCEPTANCE.md` append). The owner later runs **`accept:`** / **`xp_work accept`** on the **`ACC-N`** item when verified.

See `../format-guidelines.md` for template paths.
