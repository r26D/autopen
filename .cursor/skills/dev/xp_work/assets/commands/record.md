# Command: record (new items)

Use for: **`improve:`**, **`feedback:`**, **`deferred:`**, **`defer:`**, **`tech debt:`**, **`debt:`**, **`technical debt:`**, **`feat:`**, **`todo:`**, **`task:`**, **`bug:`**, **`bug report:`**, **`goal:`**, **`scenario:`**, **`user_goal:`**, **`user_scenario:`**

**Prerequisites:** Read `../bootstrap.md` and `../rules.md` first. For each **new** entry, read `../id-prefixes.md` and assign the next id for the target file.

## Triggers → target file

| User says | Append to |
|-----------|-----------|
| **`improve: request`** or **`improve : request`** or **`feedback: request`** | `work/IMPROVEMENTS.md` |
| **`deferred: description`** or **`defer: description`** | `work/DEFERRED.md` (note **Source:** e.g. AI suggestion, if obvious) |
| **`tech debt: description`** or **`debt: description`** or **`technical debt: description`** | `work/TECH_DEBT.md` |
| **`feat: description`** or **`todo: description`** or **`task: description`** | `work/TODO.md` |
| **`bug: description`** or **`bug report: description`** | `work/BUGS.md` |
| **`goal: description`** or **`scenario: description`** or **`user_goal: description`** or **`user_scenario: description`** | `work/USER_GOALS.md` |

## Scope for this command

- **Do not analyze, design, or solve** the problem. Do not explore the codebase to understand the issue.
- **Only update the tracking file**: read the target file, format the entry, append it, confirm.
- **Keep responses short**: state what you recorded and where. Avoid long explanations unless the user explicitly asks.

## Workflow

1. **Migrate FEEDBACK.md if present**; **ensure all canonical `work/` files exist** with headers (`../bootstrap.md`)
2. **Read the target file first** to understand existing format and content
3. **Backfill missing ids** in the target file per **`../id-prefixes.md`** (Backfill), then **re-read** if you changed the file
4. **Read the appropriate template** (`../format-guidelines.md`)
5. **Read `../id-prefixes.md`** — determine the prefix for the target file; compute the next `PREFIX-N` as `max(**Last id:** counter, in-file max **Id:** PREFIX-N) + 1` (after backfill).
6. **Get today's date** in YYYY-MM-DD format (`date +%Y-%m-%d` or system date)
7. **Ask clarifying questions only** when you cannot choose the correct file or when the text is too vague to form a minimal title—otherwise record as given
8. **Generate an appropriate title** from the request/description (one short line; no design or solution)
9. **Format the entry** according to the template structure — include **`**Id:** PREFIX-N`** on its own line immediately under the `##` title. The **`**Why:**`** field is standard across all templates. When the user's request includes rationale for why the item matters, capture it in **`**Why:**`**. When no rationale is provided, use `[Not yet documented]`.
10. **Append to the end** of the appropriate file
11. **Update the persistent counter** — raise the file's **`**Last id:** PREFIX-N`** header line to the newly assigned id (`../id-prefixes.md`, Persistent counter). Never lower it.
12. **Commit** — Stage only the changed `work/` file(s) and commit with message `xp_work: record PREFIX-N` (using the id just assigned, e.g. `xp_work: record IMP-3`). Do not use `git add .`; only stage specific `work/` files that were modified.
13. **Confirm completion** by saying "It is now on the list" (you may include the id, e.g. `IMP-3`, in the confirmation)
