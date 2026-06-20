---
name: code-audit
summary: Deep code and infra audits via references (Elixir, Docker, more).
description: Perform CTO-level audits on source, tests, and container configuration. Use when reviewing Elixir code, TypeScript/JavaScript code, Dockerfiles, Docker Compose, or other supported stacks for correctness, design, maintainability, security, reproducibility, and entropy risk. Use for code audit, Dockerfile review, compose review, DevOps review, or PR review. For specifications use dev/cto-audit/spec-audit. For the router use dev/cto-audit. Read references/elixir.md in full for Elixir/Phoenix/Mix; read references/typescript.md in full for TypeScript/JavaScript/Node.js; read references/docker.md in full for Docker/Compose. When a change set mixes stacks (e.g. app + containers), read every applicable reference and produce one Issues list with categories disambiguating domain unless the user asks for split reports.
---

# Code audit (CTO)

**Compatible tools:** Cursor (agent skills), Codex CLI (optional `agents/openai.yaml`), any agent that can read bundled `references/`. Installs under `.cursor/skills/dev/cto-audit/code-audit/` (nested id) or inside `.cursor/skills/dev/cto-audit/code-audit/` when the full `dev/cto-audit` pack is installed.

## Workflow

1. Identify **stack** from context: programming language **or** container/config artifacts (`Dockerfile`, Compose files), plus user statements.
2. Read **every** matching file from `references/` in full (see table). If both Elixir and Docker files are in scope, read both `references/elixir.md` and `references/docker.md`.
3. Audit against those references’ standards and return output in the **exact schema** each reference defines (Executive Summary, Issues with category/severity/confidence/evidence/recommendation, then Suggested Refactor Direction, optional sections). When multiple references apply, use **one** combined Issues list; categories differ by reference (e.g. `idiomatic_elixir` vs `security` / `agent_execution_risk` for Docker).
4. Do not substitute a different output shape; severity and category replace ad-hoc “Must Fix” sections.

## Reference selection

| Signals | Reference |
|---------|-----------|
| Elixir, Phoenix, Mix, `*.ex` / `*.exs` | `references/elixir.md` |
| TypeScript, JavaScript, Node.js, `*.ts` / `*.tsx` / `*.js` / `*.jsx`, `tsconfig.json`, `package.json` | `references/typescript.md` |
| `Dockerfile`, `*.dockerfile`, `docker-compose*.yml`, `docker-compose*.yaml`, `compose.y*ml`, user says Docker / Compose / container build | `references/docker.md` |

Add more environments as `references/<name>.md` and extend this table; each reference defines its own **category** enum in its OUTPUT FORMAT.

## Evidence standard

- Every issue must have **evidence** anchored to quoted code or `path:line`.
- Prefer fewer, higher-confidence issues over a long low-signal list.

## Credo enforcement (Elixir only)

When auditing an Elixir project, check whether custom CTO Credo checks are installed (look for `lib/*/credo_checks/` in the project). If they are **not** installed and the user would benefit from automated enforcement, mention that the `credo/` sub-skill can install static analysis checks that enforce a subset of the Elixir audit standards automatically. Read `credo/SKILL.md` for the installation workflow.

If the checks **are** installed and an audit finding overlaps with an existing Credo check, note it — the check threshold may need tuning or the check has a bug.

## Rules

- Do not rewrite the whole codebase unless asked.
- Do not conflate spec ambiguity (use `dev/cto-audit/spec-audit`) with code or infra defects here.
