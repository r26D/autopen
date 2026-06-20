# Spec improve (CTO)

**End-to-end:** audit `<SPEC_FILE>` with the **spec-audit** framework, **apply edits** to the spec, **optionally update `<DESIGN_SOURCE>`** to match the revised spec when a design path is given, then **create ADR / DDR / SDR** files using **decision-records**.

This skill **edits files**—unlike **spec-audit** alone (audit-only).

## Inputs

- **`<SPEC_FILE>`** — Canonical spec path (repo-relative or absolute). **Required.**
- **`<DESIGN_SOURCE>`** — Optional. Design doc or secondary artifact to align with the spec after edits. If omitted, skip design alignment and say so in the summary.

## Steps

1. Read `../spec-audit/references/dirk_prompt.md` in full, plus `../spec-audit/SKILL.md` for norms.
2. Read `<SPEC_FILE>`; produce the **exact** audit structure from `dirk_prompt.md` (including Decision Record Candidates when **decision-records** is installed).
3. **Edit `<SPEC_FILE>`** to address critical gaps and high-value improvements (surgical edits preferred).
4. **If `<DESIGN_SOURCE>` is set:** **Edit `<DESIGN_SOURCE>`** so terminology, scope, and decisions match the updated spec; no contradictions. **If not set:** skip this step.
5. Read `dev/decision-records/SKILL.md` and **create** numbered ADR/DDR/SDR files for validated candidates; de-duplicate against existing `docs/decisions/` (or `.decisions` root). **Resolve the decisions root from `git rev-parse --show-toplevel`** — never hardcode a path, especially in worktree contexts. Skip filing if decision-records is not installed—list candidates only.
6. **Commit all new/updated decision records** with message format `decision: add <TYPE>-NNNN <title>`. Uncommitted records get lost in worktree workflows.

## Rules

- **Worktree safety:** All file paths must resolve from `git rev-parse --show-toplevel`. Never write outside the current worktree.

## Router

The umbrella skill is **`dev/cto-audit`**; this workflow lives at **`dev/cto-audit/spec-improve/SKILL.md`**.
