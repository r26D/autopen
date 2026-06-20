# Rules and context

## Project context

The skill runs in **whatever project is the current workspace**. Use the workspace root to resolve `work/`; do not assume a specific repo name or path. When recording items, consider the current project's structure and conventions so entries stay relevant.

## User goals and scenarios

User goals and scenarios represent the goals or loops that users try to accomplish with the application. These are tracked to evaluate whether the app is fulfilling user needs.

## Deferred vs improvements vs tech debt

- **DEFERRED.md**: Ideas (often AI-suggested) explicitly parked for later—not committed to the near-term backlog.
- **IMPROVEMENTS.md**: Product or process improvements you may want soon; still distinct from scheduled iteration work until moved.
- **TECH_DEBT.md**: Codebase quality and maintainability tradeoffs; different from feature todos and from defect tracking.

## Important rules

- **Always migrate FEEDBACK → IMPROVEMENTS** when `work/FEEDBACK.md` is present
- **Ensure all canonical files exist** (with purpose headers) on any xp_work touch of `work/` (see `bootstrap.md`)
- **Always read the target file first** (after bootstrap) to see the current format and content
- **Assign entry ids** for every new item appended to a canonical `work/` file: **`**Id:** PREFIX-N`** per `id-prefixes.md` (next id is `max(**Last id:** counter, in-file max) + 1`)
- **Persistent id counter** — Each canonical `work/` file carries a **`**Last id:** PREFIX-N`** line in its header recording the highest id ever assigned. Read it (alongside the in-file max) when computing the next id; raise it on append; **never lower it** when a section is removed (pluck, iteration move, done, accept). See `id-prefixes.md` (Persistent counter).
- **Backfill missing ids** in any canonical `work/` file you read or write during an xp_work command—existing sections without **`**Id:**`** get one in document order, and the **`**Last id:**`** counter is inserted or raised to at least the in-file max, before other edits (`id-prefixes.md`, Backfill)
- **Add new entries to the end** of the file
- **Maintain consistent formatting** — match the style of existing entries
- **Ask clarifying questions only** when the correct file or a minimal title cannot be determined—do not ask to refine scope or solution
- **Do NOT implement application or product changes** except when running the **`pluck`** command end-to-end (see `commands/pluck.md`). The **`accept`** command only edits `work/ACCEPTANCE.md` and commits (see `commands/accept.md`)—no product code. Otherwise only record and manage tracking files.
- **Pluck claim before planning gate** — For **`pluck`**, the claim marker (`**Pluck status:** In progress`) is committed to the base branch **before** the planning gate. The planning gate still blocks implementation: do not implement until a planning mode is resolved. For **BUG**-prefixed items, the mode auto-selects to **`superpowers:systematic-debugging`** (no prompt needed). For all other items, the user must choose **native planning** vs **`superpowers:brainstorming`** (or pre-declare it in the pluck message). The user can always override BUG auto-routing by explicitly declaring a different mode. “Native planning” requires a **visible** plan (Cursor Plan mode or chat plan + user approval), not silent exploration.
- **Pluck target resolution** — The agent may locate the queued section by **`##` heading / citation**, by unique **`**Id:** PREFIX-N`** across eligible `work/` files, or by a **pasted block** that matches exactly one section (see `commands/pluck.md`).
- **Accept target resolution** — Same disambiguation pattern as pluck, but **only** in `work/ACCEPTANCE.md`, and only for **`**Id:** ACC-N`** ids (see `commands/accept.md`).
- **Pluck → acceptance** — When **`pluck`** finishes implementation but a human must still verify, append to **`ACCEPTANCE.md`** per **`commands/acceptance.md`** / **`acceptance-template.md`** (including **Pre-verification** for merge/worktree integration when needed); then yank the queue section in the same closing commit (see **`commands/pluck.md`**).
- **Resolve paths from workspace root** — never hardcode a specific project path
- **Get today's date** using `date +%Y-%m-%d` or system date in YYYY-MM-DD format
- **When moving sections**, extract the entire section including the heading and all content
- **For iteration moves**, always include source information (which file the item came from)
- **For acceptance moves**, include both the original date and the date moved to acceptance
