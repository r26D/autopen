# Command: accept (verify acceptance queue item → yank → commit)

Use for: **`accept:`**, **`xp_work accept`**, **`/xp_work accept`** (optionally with a `##` heading, file/line reference, **`**Id:** ACC-N`**, or a pasted block that matches one section in `work/ACCEPTANCE.md`)

**Prerequisites:** Read `../bootstrap.md` and `../rules.md` first.

**Purpose:** Record that the user (or stakeholder) **confirmed** the acceptance criteria for a queued item. This command **does not** implement product work—it only removes the item from `work/ACCEPTANCE.md` and **commits** that verification. **Do not** update **`CHANGELOG.md`** (or any changelog).

**Source file (only):** `work/ACCEPTANCE.md`

## Workflow

1. **Migrate and bootstrap** `work/` files as needed.
2. **Identify the section** in `work/ACCEPTANCE.md`. Try these cues until one resolves **uniquely** (if ambiguous at any step, ask the user to narrow: heading, id, or more pasted text):
   - **Heading or citation** — Match a `##` heading (substring is fine if it matches **exactly one** section), or a reference such as `@work/ACCEPTANCE.md:<lines>` / open-editor path+lines. Prefer the cited range when the user points at a span that falls inside one section.
   - **Entry id** — If the user message includes a token matching **`**Id:** ACC-N`**, find the section whose metadata includes **that exact id line**. If **exactly one** section matches, that is the target. If none or more than one match, ask the user to fix the id or disambiguate.
   - **Pasted block** — If the user pastes a fragment of an item (with or without the `##` line): find the unique section such that **any** of the following holds: (a) the block contains the section’s **`**Id:** ACC-N`** line; (b) the block’s first non-empty line equals the section’s `##` heading line (after trim); (c) after normalizing whitespace (trim ends, collapse blank runs), the block text is a substring of the full section text **or** the section body is clearly the only one containing that distinctive text. If still ambiguous, ask for the id or the full `##` title line.
   **Then backfill** missing entry ids in **`work/ACCEPTANCE.md`** per **`../id-prefixes.md`** (Backfill) before removing the section.
3. **Optional user note** — If the user included extra text meant for the commit (e.g. after an em dash ` — ` on the same line as the id/title, on following lines, or after a `|` separator), capture it verbatim as the **optional note**. Do not invent a note.
4. **Snapshot the block** — Copy the full section text **exactly as queued** (from the `##` line through the content up to but not including the next `##` at the same level—same boundary rules as pluck). Keep this copy for the commit body.
5. **Remove the entire section** from `work/ACCEPTANCE.md` (preserve file structure and remaining sections).
6. **Stage** only `work/ACCEPTANCE.md` (do **not** `git add .` unless the user has explicitly staged other files for this commit and asked to include them—default is acceptance file only).
7. **Commit** — Use a temporary message file (same pattern as **`commands/work-complete.md`**) or `git commit -m` with a multi-line body if appropriate.
   - **Subject (first line):** `chore(work): accept verified ACC-N — <short title from ## line>`  
     Use the snapshot’s **`**Id:** ACC-N`** for `ACC-N`. Trim the `##` title to a concise subject fragment if needed (stay within ~72 characters for the subject line when possible).
   - **Body:**
     - One line such as: `Verified acceptance (user confirmed).` and **today’s date** in `YYYY-MM-DD` if useful.
     - If an **optional note** was captured in step 3, include it under a line such as `Note:`.
     - A separator line, then the **snapshot** under a line such as `Accepted item was:` so history retains what was signed off.
   - **Do not** add or edit **`CHANGELOG.md`** or any other changelog.

8. **Confirm** — Short summary: `ACC-N`, section title, commit hash, and that changelog was **not** updated.

See `../format-guidelines.md` for template paths (`acceptance-template.md` describes the queued item shape).
