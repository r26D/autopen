# XP Work Manager Skill - Usage Guide

This skill helps you record improvements, todos, bugs, user goals, deferred ideas, and technical debt into tracking files, and manage your iteration workflow **in the current project**. It uses a `work/` directory at the root of whatever workspace you have open, so you can use the skill in any repo and it stays scoped to that project.

## How to Use

### Automatic Invocation

The skill is automatically invoked when you use any of these trigger commands in your chat:

#### Recording New Items

- **Improvements (formerly feedback):**
  - `improve: [your request]`
  - `improve : [your request]`
  - `feedback: [your request]` (still writes to `work/IMPROVEMENTS.md`)

- **Deferred (AI or other suggestions to revisit later):**
  - `deferred: [description]`
  - `defer: [description]`

- **Technical debt:**
  - `tech debt: [description]`
  - `debt: [description]`
  - `technical debt: [description]`

- **Tasks/Features:**
  - `feat: [description]`
  - `todo: [description]`
  - `task: [description]`

- **Bug Reports:**
  - `bug: [description]`
  - `bug report: [description]`

- **User Goals/Scenarios:**
  - `goal: [description]`
  - `scenario: [description]`
  - `user_goal: [description]`
  - `user_scenario: [description]`

#### Managing Iteration Work

- **Moving Items to Iteration:**
  - `add to iteration: [reference to section]`
  - `iteration: [reference to section]`
  - `add to iteration: [new text block]` (for new items)

- **Marking Items as Done:**
  - `done: [reference to section in ITERATION.md]`

- **Moving Items to Acceptance:**
  - `needs acceptance: [reference to section in ITERATION.md]`
  - `acceptance: [reference to section in ITERATION.md]`

### Accept (verify acceptance item → yank → commit)

After you have verified an item that was queued in **`work/ACCEPTANCE.md`**, record sign-off and remove it in one step:

- **`accept: [reference to section or ACC-N]`** — optional note after ` — ` or on following lines (included in the commit body).
- **`/xp_work accept`** or **`xp_work accept`** — then point at the section (heading, **`ACC-N`**, or paste).

The agent removes the section from **`work/ACCEPTANCE.md`**, commits with the snapshot in the message body, and **does not** update **`CHANGELOG.md`**. Details: **`assets/commands/accept.md`**.

### Pluck (queue → plan → execute → yank)

Pick a **section** from a queue file (`work/IMPROVEMENTS.md`, `work/DEFERRED.md`, etc.—same sources as “add to iteration”), then plan and ship it in one streamlined flow:

- **`pluck: [reference to section]`** — identify the heading or text in a queue file.
- **`/xp_work pluck`** or **`xp_work pluck`** — then say which section (and file if needed).

For **BUG**-prefixed items (from `work/BUGS.md`), the agent **auto-selects `superpowers:systematic-debugging`** — no planning-mode prompt. You can override by explicitly stating a different mode in the same message. For all other items, the agent will **ask you to choose** (in a **separate** step, before coding) between **native planning** (Cursor **Plan mode** or a visible chat plan you approve) and **`superpowers:brainstorming`**. If you already stated the mode in the same message as `pluck`, that counts as your choice. After you answer, the agent marks the block **in progress**, completes the work, and—if **human verification** is still needed after implementation—**appends** an **`ACC-N`** item to **`work/ACCEPTANCE.md`** (same shape as the **`acceptance`** command), including **Pre-verification** steps when code must be **merged** or brought back from a **git worktree** before you can test. It then **removes** the queue section, **commits** with the full queued block in the commit body, and adds **one sentence** to **`CHANGELOG.md`** at the repo root if it exists. Use **`accept:`** when you have verified the **`ACC-N`** item. Command details: **`assets/commands/pluck.md`**; handoff copy: **`assets/templates/pluck-planner-brief.md`**.

### Manual Invocation

You can also manually invoke the skill by typing:

```
/xp_work
```

Then describe what you want to record or manage.

## Tracking Files

The skill manages these files in a `work/` directory at the **root of your current workspace**. On first use, the agent should create any missing files with a short explanation at the top so the full set can be committed together.

| File | Purpose |
|------|---------|
| **work/IMPROVEMENTS.md** | Improvement ideas and feedback (`improve:`, `feedback:`). Legacy `work/FEEDBACK.md` is migrated automatically to this name. |
| **work/TODO.md** | Planned tasks and features (`feat:`, `todo:`, `task:`). |
| **work/BUGS.md** | Defects (`bug:`, `bug report:`). |
| **work/USER_GOALS.md** | User outcomes and scenarios (`goal:`, `scenario:`, …). |
| **work/DEFERRED.md** | Suggestions parked for later, often AI ideas (`deferred:`). |
| **work/TECH_DEBT.md** | Codebase cleanup and shortcuts (`tech debt:`, `debt:`). |
| **work/ITERATION.md** | Active iteration backlog. |
| **work/ACCEPTANCE.md** | Awaiting product owner sign-off. |

## Examples

### Recording an improvement

```
improve: The GraphQL API could have better error messages for authentication failures
```

The agent ensures `work/` files exist, appends to `work/IMPROVEMENTS.md`, and confirms.

### Recording deferred work

```
deferred: Split the upload pipeline into a separate OTP application
```

The agent appends to `work/DEFERRED.md` with source noted when clear (e.g. AI suggestion).

### Recording technical debt

```
debt: Legacy string keys in config; should migrate to structured schema
```

The agent appends to `work/TECH_DEBT.md`.

### Moving an item to iteration

```
add to iteration: Support Project-Level Tasks with Multiple Steps
```

The agent finds the section in `IMPROVEMENTS.md`, `TODO.md`, `USER_GOALS.md`, `BUGS.md`, `DEFERRED.md`, or `TECH_DEBT.md`, removes it, and appends to `work/ITERATION.md` with the correct **Source** field.

## Command docs and templates

Shared docs stay at the top of `assets/`; command workflows are under **`assets/commands/`**; entry templates under **`assets/templates/`**:

- **`assets/bootstrap.md`** — `work/` layout, FEEDBACK migration, bootstrapping files
- **`assets/rules.md`** — global rules and DEFERRED vs IMPROVEMENTS vs TECH_DEBT
- **`assets/commands/record.md`**, **`iteration.md`**, **`done.md`**, **`work-complete.md`**, **`acceptance.md`**, **`accept.md`**, **`pluck.md`** — triggers and steps
- **`assets/format-guidelines.md`** — index of entry templates below
- **`assets/id-prefixes.md`** — `TYPE-Count` entry ids (`IMP-1`, `TODO-2`, …) per `work/` file
- **`assets/examples.md`** — short interaction examples

Entry templates:

- `assets/templates/improvements-template.md` — `IMPROVEMENTS.md`
- `assets/templates/deferred-template.md` — `DEFERRED.md`
- `assets/templates/tech-debt-template.md` — `TECH_DEBT.md`
- `assets/templates/todo-template.md` — `TODO.md`
- `assets/templates/bug-template.md` — `BUGS.md`
- `assets/templates/user-goal-template.md` — `USER_GOALS.md`
- `assets/templates/iteration-template.md` — `ITERATION.md`
- `assets/templates/acceptance-template.md` — `ACCEPTANCE.md`

## What the Skill Does

✅ Migrates `FEEDBACK.md` to `IMPROVEMENTS.md` when needed  
✅ Ensures all canonical `work/` files exist with short purpose headers  
✅ Reads existing files to maintain format consistency  
✅ Appends entries (with stable **`**Id:** PREFIX-N`** ids), **backfills** missing ids on existing sections when a command touches a file, and moves sections between files per workflow  

## What the Skill Does NOT Do

❌ Implement application code  
❌ Modify existing entries except when moving them  
❌ Decide priority or implementation for you  

## Viewing the Skill

In Cursor: **Settings → Rules** and look for **xp_work** under **Agent Decides**, or open `SKILL.md` in the installed skill folder.
