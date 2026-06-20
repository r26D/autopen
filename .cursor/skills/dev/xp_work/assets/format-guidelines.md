# Format guidelines (templates)

**Entry ids:** Each entry uses a per-file **`TYPE-Count`** id (`IMP-1`, `TODO-2`, …). Each tracking file also carries a **`**Last id:** PREFIX-N`** counter in its header (the highest id ever assigned, monotonically non-decreasing — yank/move never lowers it). See **`id-prefixes.md`** for the prefix table, the persistent counter, how to pick the next number, and **backfilling** ids on older sections when a command touches a file.

**Why field:** Every entry template includes a **`**Why:**`** field positioned immediately after the date metadata (`**Date:**` or `**Date Added:**` / `**Date Moved to Acceptance:**`). This field captures the rationale for why the item matters — its purpose is to provide context for automated prioritization (expediter). When recording new entries, populate from user-provided rationale; use `[Not yet documented]` when none is given. When moving entries between files, copy **`**Why:**`** verbatim from the source; insert `[Not yet documented]` only when the source lacks the field.

Each entry should follow the format defined in the template files under **`assets/templates/`**:

| Target file | Template |
|-------------|----------|
| IMPROVEMENTS.md | `templates/improvements-template.md` |
| DEFERRED.md | `templates/deferred-template.md` |
| TECH_DEBT.md | `templates/tech-debt-template.md` |
| TODO.md | `templates/todo-template.md` |
| BUGS.md | `templates/bug-template.md` |
| USER_GOALS.md | `templates/user-goal-template.md` |
| ITERATION.md | `templates/iteration-template.md` |
| ACCEPTANCE.md | `templates/acceptance-template.md` |
| Pluck handoff copy | `templates/pluck-planner-brief.md` (fill in source file, mode, dates) |
| Work-complete handoff copy | `templates/work-complete-planner-brief.md` (fill in iteration item, mode, dates) |

Read the appropriate template file before creating or moving entries.
