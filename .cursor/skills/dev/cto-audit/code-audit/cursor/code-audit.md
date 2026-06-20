# Code audit (CTO)

Deep **code and container-config** audit—not for PRDs or architecture prose (use `dev/cto-audit/spec-audit` for those).

## Skill root

Directory containing `SKILL.md` and `references/` (e.g. `.cursor/skills/dev/cto-audit/code-audit/` when installed).

## Steps

1. Pick reference(s) from `references/` using `SKILL.md` signals. Read each in full:
   - Elixir/Phoenix/Mix → `references/elixir.md`
   - TypeScript/JavaScript/Node.js → `references/typescript.md`
   - `Dockerfile`, `docker-compose*.yml` / `*.yaml`, Compose → `references/docker.md`
2. If multiple apply (e.g. app + containers), read **all** matching references and produce **one** Issues list unless the user asks otherwise.
3. Return output using each reference’s schema: Executive Summary, **Issues** (category, severity, confidence, evidence, recommendation), Suggested Refactor Direction, optional sections.
4. **Categories** are defined per reference: Elixir uses `idiomatic_elixir`; TypeScript uses `idiomatic_typescript`; Docker uses `security`, `reproducibility`, `agent_execution_risk`, etc. (see each file’s OUTPUT FORMAT).

See `SKILL.md` in this directory for workflow and `references/README.md` for how references are extended.
