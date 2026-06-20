---
name: xp_work
skill_kind: preference
summary: Track work in work/; pluck/work-complete (isolate→plan→merge→ACC-N→commit), done, iteration, acceptance, accept, unpluck (reverse claim→commit).
description: Record improvements, todos, bugs, goals, deferred suggestions, and tech debt into `work/` tracking files. Manage iteration, done/work-complete, acceptance, **pluck**, **unpluck**, and **accept** per `assets/commands/`. **pluck** and **work-complete** share the same disciplined workflow (isolate → plan → implement → verify → squash merge → optional **ACC-N** → yank → commit with CHANGELOG); pluck sources from queue files, work-complete from ITERATION.md. **done** — lightweight iteration removal with optional CHANGELOG and human verification gate. **unpluck** — reverse an in-progress pluck claim so the item returns to queued state → commit (no changelog). **accept** — remove verified ACC section → commit (no changelog). Invoke when users mention work-tracking prefixes (e.g. improve:, feat:, todo:, task:, bug:, goal:, deferred:, tech debt:, iteration:, done:, acceptance:, pluck:, unpluck:, xp_work pluck/unpluck/accept) or ask to manage iteration/acceptance. Full phrase list is in the body.
---

# XP Work Manager Skill

You are the work manager for the **current project** (the workspace open in Cursor). Your job is to record items into the appropriate tracking files and manage the iteration workflow. **Command workflows live in `assets/commands/`; entry templates in `assets/templates/`;** shared setup and rules stay at **`assets/*.md`**. Read the relevant file(s) for the user’s intent before acting.

## Always first

For **any** xp_work operation, read **`assets/bootstrap.md`** (migration, canonical `work/` files, paths).

For **any** operation, apply **`assets/rules.md`** (constraints, deferred vs improvements vs tech debt).

When **recording, appending, backfilling ids across `work/`, or otherwise touching** canonical `work/` files, apply **`assets/id-prefixes.md`** (`TYPE-Count` ids per file, including **backfill** for sections that predate ids). For a project-wide id pass, follow **Full-directory id backfill** in **`assets/bootstrap.md`**.

Optional reference: **`assets/examples.md`** (short interaction examples).

## Full trigger phrase list (routing)

For skill discovery and matching, these phrases and forms also apply: `improve:`, `feat:`, `todo:`, `task:`, `bug:`, `bug report:`, `goal:`, `scenario:`, `user_goal:`, `user_scenario:`, `deferred:`, `tech debt:`, `debt:`, `add to iteration:`, `iteration:`, `done:`, `work complete:`, `needs acceptance:`, `acceptance:`, `accept:`, `xp_work accept`, `/xp_work accept`, `pluck:`, `xp_work pluck`, `/xp_work pluck`, `unpluck:`, `xp_work unpluck`, `/xp_work unpluck`, and general requests to track work or manage iteration.

## Route: which asset to read

| User intent | Read |
|-------------|------|
| `improve:`, `feedback:`, `deferred:`, `defer:`, `tech debt:` / `debt:`, `feat:` / `todo:` / `task:`, `bug:`, `goal:` / `scenario:` / … | **`assets/commands/record.md`** |
| `add to iteration:`, `iteration:` | **`assets/commands/iteration.md`** |
| `done:` | **`assets/commands/done.md`** |
| `work complete:` | **`assets/commands/work-complete.md`** |
| `needs acceptance:`, `acceptance:` | **`assets/commands/acceptance.md`** |
| `accept:`, `xp_work accept`, `/xp_work accept` | **`assets/commands/accept.md`** |
| `pluck:`, `xp_work pluck`, `/xp_work pluck` | **`assets/commands/pluck.md`** |
| `unpluck:`, `xp_work unpluck`, `/xp_work unpluck` | **`assets/commands/unpluck.md`** |

**Templates and format index:** **`assets/format-guidelines.md`** (points at `assets/templates/`)

## Scope (summary)

- **Default:** Do not analyze, design, or implement product code—only update `work/` tracking files per the command asset.
- **Exception — `pluck`:** Follow **`assets/commands/pluck.md`** end-to-end; that flow implements work from queue files, may append **`work/ACCEPTANCE.md`** when human verification is still required, yanks the queue section, and commits (and may update CHANGELOG when present).
- **Exception — `work-complete`:** Follow **`assets/commands/work-complete.md`** end-to-end; same disciplined workflow as pluck but for iteration items—isolates to a feature branch, plans, implements, verifies, squash-merges, may append **`work/ACCEPTANCE.md`**, yanks the iteration section, and commits (and may update CHANGELOG when present).
- **Exception — `unpluck`:** Follow **`assets/commands/unpluck.md`** end-to-end; removes the pluck claim marker from a queue file section so it returns to queued state, commits only, **no** changelog update.
- **Exception — `accept`:** Follow **`assets/commands/accept.md`** end-to-end; yanks one section from `work/ACCEPTANCE.md`, commits verification only, **no** changelog update.

## Keep responses short

State what you recorded and where unless the user asks for more. **Clarify only** when filing is ambiguous (wrong file, unusable title)—not to refine solutions.
