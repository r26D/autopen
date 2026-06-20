# Entry ids (`TYPE-Count`)

Each entry in a canonical `work/` file should have a short, stable id: **`PREFIX-N`** (hyphen, integer **N** ≥ 1). Use the **`**Id:**`** line in templates so items are easy to reference, move, and pluck.

**Legacy files:** Projects may already have sections without **`**Id:**`** lines. Whenever an xp_work command **reads or writes** a canonical file, **backfill missing ids** in that file before other edits (see [Backfill missing ids](#backfill-missing-ids) below).

## Prefix by file

| `work/` file        | Prefix | Example   |
|---------------------|--------|-----------|
| IMPROVEMENTS.md     | `IMP`  | `IMP-7`   |
| TODO.md             | `TODO` | `TODO-3`  |
| BUGS.md             | `BUG`  | `BUG-12`  |
| DEFERRED.md         | `DEF`  | `DEF-2`   |
| TECH_DEBT.md        | `DEBT` | `DEBT-4`  |
| USER_GOALS.md       | `GOAL` | `GOAL-1`  |
| ITERATION.md        | `ITER` | `ITER-5`  |
| ACCEPTANCE.md       | `ACC`  | `ACC-3`   |

## Persistent counter (`**Last id:**`)

Each canonical `work/` file carries a **`**Last id:** PREFIX-N`** line in its header recording the **highest id ever assigned** in that file. Place it directly below the intro paragraph and above any `##` sections:

```markdown
# Bugs

Defects and incorrect behavior. Use `bug:` or `bug report:`.

**Last id:** BUG-12

## Some Bug Title

**Id:** BUG-12
...
```

A new (empty) file starts at **`PREFIX-0`** as part of the standard header (see `bootstrap.md`). For an existing file without the line, **backfill** inserts it (see [Backfill missing ids](#backfill-missing-ids) below).

The counter is monotonically **non-decreasing**: update it on append; **never lower it** when a section is removed (pluck, iteration move, done, accept). That is the whole point — once `BUG-1` has been assigned and yanked, the next bug must be `BUG-2`, even though the file no longer contains a `BUG-*` entry.

## Assigning the next number

1. Read the target file.
2. Find the **counter**: the line `**Last id:** PREFIX-N` in the file header (with the file's prefix). If missing, treat **counter = 0**.
3. Find every line matching `**Id:** PREFIX-N` (with the file's prefix) and take the **maximum** `N` (the **in-file max**; `0` if none).
4. The new id is `PREFIX-(max(counter, in-file max) + 1)`.
5. **After** appending the new entry, **update the `**Last id:**` line** in the file header to the newly assigned id. Only raise the counter — never lower it. If the counter line is missing, insert it per [Persistent counter](#persistent-counter) above.

**Removing a section never updates the counter.** Pluck (yank), iteration moves, `done`, and `accept` all leave `**Last id:**` untouched.

Ids are **per file**: moving a section from `IMPROVEMENTS.md` to `ITERATION.md` assigns a **new** `ITER-*` id (and bumps `ITERATION.md`'s counter); keep traceability with **`**Source id:**`** when the source had an id (see `commands/iteration.md` and `commands/acceptance.md`).

## Format

Place immediately under the section `##` title:

```markdown
## Title

**Id:** PREFIX-N
**Date:** ...
```

Do not reuse numbers within a file; do not change an id after assignment.

## Backfill missing ids

Run this for **each** canonical file you open for an xp_work operation, **before** appending, moving sections, marking pluck in progress, or removing sections—so existing items gain ids without waiting for a one-off migration.

1. Determine this file’s **PREFIX** from the [table](#prefix-by-file) above.
2. Scan the whole file for lines matching `**Id:** PREFIX-N` and record **M** = the maximum **N** (if none, **M = 0**).
3. Walk the file **top to bottom**. Treat each `##`-level section (each block starting with a `##` heading at the start of a line) as one entry. Skip the document header (content before the first `##`).
4. For each section, check whether it already has a line **`**Id:** PREFIX-N`** for **this file’s** PREFIX. **`**Source id:**`** (used when an item moved from another file) does **not** count—the section still needs its own **`**Id:**`** for the current file (`ITER-*` in `ITERATION.md`, `ACC-*` in `ACCEPTANCE.md`, etc.).
5. For each section missing a valid **`**Id:**`**, assign the next integer in order: set **M ← M + 1** and insert a new line immediately under the `##` title line:  
   `**Id:** PREFIX-M`
6. **Ensure the persistent counter exists.** Look for `**Last id:** PREFIX-K` in the file header (above the first `##` section).
   - If **missing**, insert `**Last id:** PREFIX-K` directly under the intro paragraph (blank line above and below), where **K = M** (or **0** if no entries exist).
   - If **present** and **K < M**, raise it to **M**.
   - If **present** and **K ≥ M**, leave it alone. **Never lower** an existing counter.
7. Save the file if you inserted any ids or adjusted the counter, then continue the command (re-read if needed so "next id" for a new append uses the updated counter and **M**).

Do not renumber existing **`**Id:**`** lines when backfilling; only insert missing ones. Likewise, never lower an existing **`**Last id:**`**.
