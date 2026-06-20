# Spec audit (CTO)

Audit technical specifications for **agentic implementation readiness**. Do not rewrite the spec end-to-end; produce a structured audit.

## Where the framework lives

The skill root is the directory that contains `SKILL.md` and `references/` (when installed via skiller: `.cursor/skills/dev/cto-audit/spec-audit/` in the project).

1. Read `<skill-root>/references/dirk_prompt.md` in full — it defines the nine audit dimensions and the **exact** output section headings and rules.
2. Use `<skill-root>/SKILL.md` for the short workflow, decision-records integration, and evidence standard if needed.

## Decision records

If **decision-records** is installed (see paths in `SKILL.md`), include **Decision Record Candidates (ADR / DDR / SDR)** per `dirk_prompt.md`. Otherwise omit that section.

## Workflow

1. Read the target specification end-to-end before scoring quality.
2. If decision-records is installed, note ADR/DDR/SDR-worthy choices while auditing (see `SKILL.md`).
3. Evaluate the spec against the nine audit dimensions in `references/dirk_prompt.md`.
4. Prioritize findings by implementation risk, not writing style.
5. Require deterministic guidance for agent execution; flag places where agents would need to guess.
6. Return output in the **exact** structure defined in `references/dirk_prompt.md` (headings and subsections as written there).

## Audit rules

- Do not rewrite the entire spec.
- Do not assume missing behavior; call gaps out explicitly.
- Prefer constraints and contracts over narrative prose.
- Focus on state transitions, data integrity, failure modes, and boundary conditions.
- Distinguish must-fix risks from structural improvements.

## Evidence standard

- Anchor findings to specific sections or line references when available.
- Mark assumptions explicitly.
- If a critical area is unspecified, label it as a blocker.
