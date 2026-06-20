---
name: spec-audit
summary: Audit specs for safe, deterministic agentic implementation.
description: Audit technical specifications for agentic implementation readiness. Use when reviewing PRDs, design docs, architecture specs, or implementation plans before coding to identify ambiguity, missing constraints, state/workflow gaps, safety risks, and areas where coding agents may diverge. When the project has dev/decision-records installed, the audit also lists candidate ADR, DDR, and SDR items to file from implied or stated choices. Part of dev/cto-audit; for code reviews use dev/cto-audit/code-audit. For the router that chooses spec vs code use dev/cto-audit. To apply edits to the spec, sync a design document, and create decision records in one workflow, use dev/cto-audit/spec-improve instead of this read-only audit..
---

# Spec audit (CTO)

**Specification** subskill under **dev/cto-audit**. For the umbrella router, use `dev/cto-audit` (or install `dev/cto-audit-suite` / `dev/cto-audit` for the full tree including this folder).

**Compatible tools:** Cursor (agent skills / rules), Codex CLI (optional `agents/openai.yaml` metadata), and any agent that can read bundled `references/`. Installs under `.cursor/skills/dev/cto-audit/spec-audit/` when using the nested skill id, or as `spec-audit/` inside `.cursor/skills/dev/cto-audit/` when the full `dev/cto-audit` pack is installed.

Load and apply `references/dirk_prompt.md` as the canonical audit framework (nine audit dimensions and exact output headings).

## Decision records (`dev/decision-records`)

If the project has the **decision-records** skill installed, the audit must also surface **candidate items** to log as ADR, DDR, or SDR records—choices implied or stated by the spec that deserve a formal decision record, classified using that skill’s taxonomy (architecture vs design vs strategic).

**Treat as installed** if any of these exist (or the user confirms it):

- `.cursor/skills/dev/decision-records/SKILL.md`
- `skills/dev/decision-records/SKILL.md` (e.g. skiller-style layout)

**When installed:** While working through the nine dimensions, note architecture choices (ADR), design/UX or API-behavior choices (DDR), and strategic commitments or non-negotiable constraints (SDR). Consolidate them in the **Decision Record Candidates (ADR / DDR / SDR)** section defined in `references/dirk_prompt.md` (exact heading and substructure).

**When not installed:** Omit that section entirely—do not leave an empty placeholder.

## Workflow

1. Read the target specification end-to-end before scoring quality.
2. If decision-records is installed (see above), scan for ADR-, DDR-, and SDR-worthy decisions while auditing.
3. Evaluate the spec against the nine audit dimensions from `references/dirk_prompt.md`.
4. Prioritize findings by implementation risk, not writing style.
5. Require deterministic guidance for agent execution; flag places where agents would need to guess.
6. Return output in the exact structure defined in `references/dirk_prompt.md` (including Decision Record Candidates when applicable).

## Audit Rules

- Do not rewrite the entire spec.
- Do not assume missing behavior; call gaps out explicitly.
- Prefer constraints and contracts over narrative prose.
- Focus on state transitions, data integrity, failure modes, and boundary conditions.
- Distinguish must-fix risks from structural improvements.

## Evidence Standard

- Anchor findings to specific sections or line references when available.
- Mark assumptions explicitly.
- If a critical area is unspecified, label it as a blocker.

## Output Contract

Use these sections exactly:

- Executive Summary
- Critical Risks (Must Fix Before Implementation)
- Structural Improvements
- Missing Definitions
- Agent Execution Risks
- Suggested Additions
- Decision Record Candidates (ADR / DDR / SDR) — **only when decision-records is installed** (see above); otherwise omit
- Optional: Refined Snippets

For `Optional: Refined Snippets`, include only small examples that clarify contracts; do not produce full rewrites.
