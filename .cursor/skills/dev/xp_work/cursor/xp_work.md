# XP Work Manager Skill

Follow **`SKILL.md`** in this same directory (for example `.cursor/skills/dev/xp_work/SKILL.md` when the skill is installed). It routes each command to **`assets/commands/<command>.md`** (e.g. `record.md`, `iteration.md`, `pluck.md`). Shared setup is in **`assets/bootstrap.md`**; constraints in **`assets/rules.md`**.

- Migrating legacy `work/FEEDBACK.md` → `work/IMPROVEMENTS.md` — `bootstrap.md`
- Bootstrapping canonical `work/*.md` — `bootstrap.md`
- Triggers and workflows — the matching file from the table in `SKILL.md` under **`assets/commands/`**
- Entry templates under **`assets/templates/`**, including **`pluck-planner-brief.md`** for pluck handoffs

Except for the **`pluck`** workflow (**planning-mode question first** → visible plan if native → implement → optional append to `work/ACCEPTANCE.md` when human verify is needed → yank → commit → optional CHANGELOG) and the **`accept`** workflow (verify one `work/ACCEPTANCE.md` item → yank → commit, **no** CHANGELOG), do not implement product work—only record and manage tracking files per `assets/rules.md` and the command file.
