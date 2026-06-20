# CTO Audit (router)

CTO-level audit entry point: **route** to the right subskill—do not invent audit criteria here.

## Skill tree

Installed under `.cursor/skills/dev/cto-audit/`:

- **Specifications** (PRDs, RFCs, architecture, implementation plans), audit-only: read `spec-audit/SKILL.md`, then `spec-audit/references/dirk_prompt.md` in full. Use that output structure exactly.
- **Spec improve** (edit spec, optionally sync a design doc, create ADR/DDR/SDR): read `spec-improve/SKILL.md` and follow it end-to-end; it uses `spec-audit` for the audit pass and `dev/decision-records` for records.
- **Code and containers**: read `code-audit/SKILL.md`, then the appropriate `code-audit/references/<env>.md` (e.g. `elixir.md` for Elixir/Phoenix/Mix, `docker.md` for Dockerfile / Docker Compose). Use that reference’s output schema exactly; read multiple references if both stacks appear.

## When to use which

- Spec language, no source paths → **spec-audit** (read-only). Audit + apply edits to the spec + file ADR/DDR/SDR, with or without a separate design doc to align → **spec-improve**.
- Source files, tests, Dockerfiles, Compose, idioms, OTP → **code-audit** (pick reference(s) per `code-audit/SKILL.md`).
- Unclear → ask one question: “Audit the written spec, or the code/containers (and which stack)?”

If folders are missing, install `dev/cto-audit` (full pack), `dev/cto-audit-suite`, or the individual nested ids `dev/cto-audit/spec-audit`, `dev/cto-audit/spec-improve`, or `dev/cto-audit/code-audit`.

See `SKILL.md` in this directory for the full workflow.
