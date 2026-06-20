# Command: iteration (move to iteration)

Use for: **`add to iteration:`**, **`iteration:`**

**Prerequisites:** Read `../bootstrap.md` and `../rules.md` first. Read `../id-prefixes.md` when appending to `ITERATION.md`.

## Triggers

**`add to iteration: [reference to section]`** or **`iteration: [reference to section]`**

→ Find the referenced section in `IMPROVEMENTS.md`, `TODO.md`, `USER_GOALS.md`, `BUGS.md`, `DEFERRED.md`, or `TECH_DEBT.md` (under workspace `work/`)  
→ Remove that section from the source file  
→ Add it to the bottom of `work/ITERATION.md` using the iteration template format  
→ Include source information (which file it came from)

**`add to iteration: [new text block]`** (without referencing an existing section)

→ Add the new text block directly to the bottom of `work/ITERATION.md` using the iteration template format (assign the next **`**Id:** ITER-N`**, per `../id-prefixes.md`)  
→ Mark source as "Manual Entry"

## Workflow

1. **Migrate and bootstrap** `work/` files as needed (`../bootstrap.md`)
2. **Read the source file** (when moving an existing section) and **`../id-prefixes.md`** — **backfill missing ids** in that source file, then **read `ITERATION.md`** and **backfill missing ids** there (`id-prefixes.md`, Backfill). For manual-only adds, only backfill **`ITERATION.md`**.
3. **Read the iteration template** — `../templates/iteration-template.md`
4. **Identify the referenced section** in the source file (if the user supplied **only new text** with no queue reference, **omit steps 5–6** and use that text in step 7 with **Source:** Manual Entry)
5. **Extract the entire section** including the title and all content
6. **Remove the section** from the source file (preserve file structure)
7. **Format the entry** according to the iteration template:
   - Assign **`**Id:** ITER-N`** — compute the next `ITER-N` in `ITERATION.md` after backfill as `max(**Last id:** counter, in-file max **Id:** ITER-*) + 1` (`../id-prefixes.md`).
   - Use the original title
   - Set "Date Added" to today's date
   - Set "Source" to the source file name (e.g., "IMPROVEMENTS.md")
   - If the extracted section contained **`**Id:** PREFIX-N`**, set **`**Source id:** PREFIX-N`** on the new iteration entry; otherwise omit **Source id:** (or for manual entry without a prior id, omit).
   - Include the original description/content in "Description"
   - Preserve any additional context in "Context"
   - If the source section has a **`**Why:**`** field, copy its text verbatim into the iteration entry's **`**Why:**`** field
   - If the source section lacks **`**Why:**`**, set **`**Why:** [Not yet documented]`**
   - For manual iteration entries (no source section), use user-provided rationale when clear; otherwise set **`**Why:** [Not yet documented]`**
8. **Append to the bottom** of ITERATION.md (before the final `---` separator if present)
9. **Update the persistent counter** in `ITERATION.md` — raise **`**Last id:** ITER-N`** to the newly assigned id. Removing the section from the **source** file (step 6) does **not** change that source file's **`**Last id:**`** — the counter is monotonic.
10. **Commit** — Stage only the changed `work/` file(s) and commit with message `xp_work: move PREFIX-N to iteration as ITER-N` (e.g. `xp_work: move IMP-5 to iteration as ITER-2`). Do not use `git add .`; only stage specific `work/` files that were modified.
11. **Confirm completion** by saying "Moved to iteration" or "Added to iteration"

See `../format-guidelines.md` for template paths.
