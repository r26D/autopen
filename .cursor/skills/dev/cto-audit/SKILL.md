---
name: cto-audit
summary: Route CTO-level audits to spec vs code subskills under dev/cto-audit/.
description: CTO-level technical audit entry point. Use when the user asks for a CTO audit, engineering audit, architecture review, pre-implementation review, spec audit, code audit, TypeScript or JavaScript review, Dockerfile or Docker Compose review, container review, quality review of a PRD or design doc, or review of source code for production readiness. This skill does not perform the audit itself—it routes to dev/cto-audit/spec-audit for specifications (PRDs, RFCs, architecture docs, implementation plans) or dev/cto-audit/code-audit for source code, tests, and container configuration. Use dev/cto-audit/spec-improve when the user wants to audit a spec, apply edits to the spec file, optionally sync a separate design document to the revised spec, and create ADR/DDR/SDR records via dev/decision-records. Use whenever audit intent is unclear between spec and code until resolved. If the user mentions both, run spec first then code or clarify order.
---

# CTO Audit (router)

**Compatible tools:** Cursor (agent skills), Codex CLI (optional), any agent that can read nested skills under `.cursor/skills/dev/cto-audit/`.

This skill installs to `.cursor/skills/dev/cto-audit/` (full pack includes `spec-audit/`, `spec-improve/`, and `code-audit/`). It **routes** to the correct subskill; the heavy prompts live in those folders.

## Workflow

1. Determine whether the audit target is primarily a **specification** (narrative requirements, design, architecture, workflows) or **code / infra** (modules, tests, repos, diffs, Dockerfiles, Compose files). If the user wants a spec **audited and improved in place** plus **ADR/DDR/SDR** filed (with or without a separate design doc to sync), route to **spec-improve** instead of read-only spec-audit.
2. Read and follow the chosen subskill’s `SKILL.md` and its `references/` from the paths below.
3. If intent is ambiguous (e.g. “audit this” with no artifact), ask one short question: spec document vs which code paths, repo, or container files.

## Subskill paths (installed project root)

| Target | Skill root |
|--------|------------|
| Specs, PRDs, RFCs, plans (audit-only) | `.cursor/skills/dev/cto-audit/spec-audit/` |
| Spec + edit spec + optional design sync + file ADR/DDR/SDR | `.cursor/skills/dev/cto-audit/spec-improve/` |
| Code and container config (references inside) | `.cursor/skills/dev/cto-audit/code-audit/` |

For each invocation:

- **Spec audit:** Open `<project>/.cursor/skills/dev/cto-audit/spec-audit/SKILL.md`, then load `<project>/.cursor/skills/dev/cto-audit/spec-audit/references/dirk_prompt.md` in full. Apply that framework and output contract.
- **Spec improve:** Open `<project>/.cursor/skills/dev/cto-audit/spec-improve/SKILL.md` and follow it end-to-end (audit framework from spec-audit, edit spec, optional design sync, decision records via dev/decision-records).
- **Code audit:** Open `<project>/.cursor/skills/dev/cto-audit/code-audit/SKILL.md`, select reference(s) (e.g. `references/elixir.md` for Elixir, `references/typescript.md` for TypeScript/JavaScript, `references/docker.md` for Dockerfile/Compose), and apply their review standards and output schema.

If a subskill directory is missing, tell the user to install `dev/cto-audit` (full tree), `dev/cto-audit/spec-audit`, `dev/cto-audit/spec-improve`, `dev/cto-audit/code-audit`, or the bundle `dev/cto-audit-suite`.

## Routing heuristics

- **Spec improve:** User gives `<SPEC_FILE>` (required), optionally `<DESIGN_SOURCE>`, wants the spec **rewritten/improved in place**, **decision records** created, and if a design path is given the design artifact **updated to match**—use **spec-improve**.
- **Spec (read-only):** User points at markdown/Google Doc excerpts, “PRD”, “RFC”, “requirements”, “before we build”, no file paths or only doc paths, **no** request to apply edits or file ADRs.
- **Code / infra:** User points at `*.ex`, `*.exs`, `mix.exs`, `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `package.json`, `tsconfig.json`, test files, `Dockerfile`, `docker-compose*.yml` / `*.yaml`, “this module”, “PR diff”, or asks for idiomatic / test / OTP / container review.
- **Elixir:** Under `code-audit`, use `references/elixir.md` when the stack is Elixir, Phoenix, or Mix.
- **Elixir Credo enforcement:** Under `code-audit/credo/`, install custom Credo checks that mechanically enforce a subset of the Elixir audit standards. Offer when auditing Elixir code that doesn't already have the checks installed.
- **TypeScript / JavaScript:** Under `code-audit`, use `references/typescript.md` when the stack is TypeScript, JavaScript, or Node.js.
- **Docker / Compose:** Under `code-audit`, use `references/docker.md` for container build and orchestration files.

## Rules

- Do not merge spec and code findings into one ad-hoc format; use each subskill’s required output.
- Prefer reading subskill files from disk over improvising audit criteria.
