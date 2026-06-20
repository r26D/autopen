# Bootstrap (run before any xp_work command)

## Work directory (project-scoped)

All work tracking files live in a `work/` directory at the **root of the current workspace**. Do not hardcode a specific repo path.

- **Resolve paths at runtime**: Use the workspace root path (the project folder opened in Cursor). All tracking files are under `work/` relative to that root, e.g. `work/IMPROVEMENTS.md`, `work/TODO.md`.
- **When reading or writing files**: Use the full path formed from the workspace root.
- **If `work/` does not exist**: Create it when performing any xp_work operation.

## Legacy file: FEEDBACK.md → IMPROVEMENTS.md

Projects may still have `work/FEEDBACK.md` from an older skill version. **Migrate before other steps**:

1. If `work/FEEDBACK.md` exists and `work/IMPROVEMENTS.md` does **not**: read `FEEDBACK.md`, write its body into `IMPROVEMENTS.md` with the standard **IMPROVEMENTS.md** file header (see table below), then delete `FEEDBACK.md`.
2. If **both** exist: append the contents of `FEEDBACK.md` to `IMPROVEMENTS.md` with a separator line `---` and a short note `<!-- merged from FEEDBACK.md on YYYY-MM-DD -->`, then delete `FEEDBACK.md`.
3. If only `IMPROVEMENTS.md` exists: do nothing.

## Ensure all tracking files exist

**Whenever you perform any xp_work operation** that reads or writes under `work/`, first run **migration** (above), then ensure **every canonical file** below exists. If a file is missing, create it containing **only** the standard header block for that file (no entries yet).

Canonical files and their standard headers (use these exact purposes; adjust the `#` title wording only if the project already uses a different but equivalent title—then keep one short purpose paragraph):

| File | Purpose (include in file as an intro paragraph under the title) |
|------|------------------------------------------------------------------|
| **IMPROVEMENTS.md** | Improvement ideas and feedback: changes that would make the product or workflow better, from reviews, users, or conversation. Use `improve:` or `feedback:`. Move sections to `ITERATION.md` when scheduling work. |
| **TODO.md** | Planned tasks and features to implement. Use `feat:`, `todo:`, or `task:`. |
| **BUGS.md** | Defects and incorrect behavior. Use `bug:` or `bug report:`. |
| **USER_GOALS.md** | User outcomes and scenarios—what people are trying to accomplish. Use `goal:`, `scenario:`, `user_goal:`, or `user_scenario:`. |
| **ITERATION.md** | Active work for the current iteration. Items arrive from other tracking files or manual entry. |
| **ACCEPTANCE.md** | Work waiting for product owner or stakeholder sign-off. Items usually arrive from `ITERATION.md` via the **acceptance** command, or from **pluck** when implementation is done but human verification is still required. |
| **DEFERRED.md** | Suggestions (often from the AI) that are valid but not worth doing now. Use `deferred:`. Review later; move to another file when priorities change. |
| **TECH_DEBT.md** | Known shortcuts, fragile areas, or cleanup—not urgent bugs (`BUGS.md`). Use `tech debt:` or `debt:`. |

**Standard header pattern** for a newly created empty file:

```markdown
# <Title>

<One or two sentences from the purpose column above.>

**Last id:** <PREFIX>-0

```

`<PREFIX>` is from the table in `assets/id-prefixes.md` (e.g. `BUG`, `IMP`, `TODO`, `DEF`, `DEBT`, `GOAL`, `ITER`, `ACC`). The **`**Last id:**`** line is the **persistent id counter** for the file — see `assets/id-prefixes.md` (Persistent counter).

Do not duplicate long explanations—the table above is the reference; each file’s intro should be self-contained and short.

## Entry ids (new and existing)

When **appending** a new section to any canonical file above, assign a unique **`**Id:** PREFIX-N`** per **`assets/id-prefixes.md`** (next id is `max(**Last id:** counter, in-file max) + 1`). After append, raise the **`**Last id:**`** counter line in the file header to the new id.

Whenever an xp_work command **reads or writes** one of those files and it already contains `##` sections, **backfill** any sections missing **`**Id:**`** **and** ensure the **`**Last id:**`** counter is at least the in-file max, per **`assets/id-prefixes.md`** (Backfill) **before** other changes—so older projects pick up ids and a counter as soon as a command touches the file.

## Full-directory id backfill

When the user asks to assign ids to **all** items in `work/`, to backfill ids across the directory, or to sync or repair entry ids project-wide, **before** other steps: for **each** canonical file in the table above that exists under `work/`, open it and run the **Backfill missing ids** procedure in **`assets/id-prefixes.md`**, even if you would not otherwise edit that file. The procedure also ensures every file has a **`**Last id:**`** counter line, so header-only files without a counter still get one inserted (`PREFIX-0`).

## Full-directory id backfill

When the user asks to assign ids to **all** items in `work/`, to backfill ids across the directory, or to sync or repair entry ids project-wide, **before** other steps: for **each** canonical file in the table above that exists under `work/`, open it and run the **Backfill missing ids** procedure in **`assets/id-prefixes.md`**, even if you would not otherwise edit that file. The procedure also ensures every file has a **`**Last id:**`** counter line, so header-only files without a counter still get one inserted (`PREFIX-0`).
