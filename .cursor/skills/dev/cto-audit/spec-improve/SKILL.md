---
name: spec-improve
summary: Audit a spec with CTO + spec-audit, apply edits, optionally sync a design doc, then create ADR/DDR/SDR via decision-records.
description: End-to-end spec hardening for agentic implementation. Use when the user provides a specification file and wants it improved using dev/cto-audit and dev/cto-audit/spec-audit, with changes applied in place, optionally a separate design document brought in line with the revised spec, and formal ADR, DDR, or SDR records created using dev/decision-records. Design sync is optional when only a spec path is given. Part of dev/cto-audit; for read-only audits use dev/cto-audit/spec-audit instead.
---

# Spec improve (CTO)

**Executable workflow** subskill under **dev/cto-audit**. It **does** edit files—unlike **spec-audit**, which is audit-only.

**Compatible tools:** Cursor (agent skills), Codex CLI, any agent that can read nested skills under `dev/cto-audit/`.

Install path (skiller layout): `skills/dev/cto-audit/spec-improve/` → `.cursor/skills/dev/cto-audit/spec-improve/` in the target project.

## Inputs

The user (or invoker) supplies:

| Placeholder | Required? | Meaning |
|-------------|-----------|---------|
| `<SPEC_FILE>` | **Yes** | Path to the canonical specification to audit and edit (markdown or text the agent can edit in-repo). |
| `<DESIGN_SOURCE>` | **No** | If provided: path to the design document, diagram notes, or secondary doc that must **match** the spec after edits (same repo unless the user says otherwise). If omitted, skip design alignment (step 4). |

Resolve paths from the **workspace root** unless the user gives absolute paths.

**Dependencies:** This workflow assumes **dev/cto-audit** (router), **dev/cto-audit/spec-audit** (audit framework), and **dev/decision-records** are available. If **decision-records** is missing, complete spec edits (and design sync when `<DESIGN_SOURCE>` is set); skip record creation and say what to install.

---

## Workflow (run in order)

### 1. Load the audit framework (do not skip)

1. Read **`dev/cto-audit/SKILL.md`** so routing and subskill conventions are clear.
2. Read **`dev/cto-audit/spec-audit/SKILL.md`** for evidence standards and decision-record candidate rules.
3. Read **`dev/cto-audit/spec-audit/references/dirk_prompt.md`** in full — it defines the nine dimensions and the **exact** audit output headings used in step 2.

### 2. Audit `<SPEC_FILE>`

1. Read `<SPEC_FILE>` end-to-end before judging quality.
2. Evaluate the spec using the nine dimensions and produce output in the **exact structure** required by `dirk_prompt.md` (Executive Summary through **Decision Record Candidates (ADR / DDR / SDR)** when decision-records is installed).
3. Prioritize by implementation risk. Anchor findings to sections or lines where possible.

This step is the same analytical pass as **spec-audit**; the difference is that you will **act** on the findings in the following steps.

### 3. Apply changes to `<SPEC_FILE>`

1. Edit `<SPEC_FILE>` to address **Critical Risks**, **Missing Definitions**, and high-value items under **Suggested Additions** and **Structural Improvements**.
2. Prefer **surgical edits** (new subsections, tables, schemas, state definitions, acceptance criteria). Avoid wholesale replacement unless the spec is unsalvageably unstructured.
3. After edits, briefly re-check agent-execution readiness: interfaces, states, failure modes, and boundaries should be more deterministic than before.
4. If the audit’s **Optional: Refined Snippets** suggested concrete text, merge it where it fits.

### 3b. Ship Proof Requirements (conditional)

**Conditions — all must be true:**

1. The target project has `ship-proof` installed. Check for any of these paths (relative to workspace root):
   - `skills/dev/ship-proof/SKILL.md`
   - `.codex/skills/dev/ship-proof/SKILL.md`
   - `.cursor/skills/dev/ship-proof/SKILL.md`
   - `.claude/skills/dev/ship-proof/SKILL.md`
   - `.claude/skills/ship-proof/SKILL.md`
2. The revised spec describes features with user-visible UI components.

If either condition is false, skip this step. If ship-proof is not installed, skip silently with no mention in the spec. If ship-proof is installed but no UI features are detected, note in the run summary that no ship-proof requirements were needed.

**When conditions are met:**

Scan the revised spec for features that involve user-visible UI. Treat a feature as UI-visible when the spec explicitly describes what a user sees, clicks, drags, types into, waits for, or visually verifies.

For each UI-visible feature, classify the required evidence:

| Feature type | Proof level |
|---|---|
| Static UI (new panel, dialog, settings section, layout change) | Screenshots |
| Animation, transition, drag interaction, real-time updates | Video (required) |
| Data flow (command → rendered values, refresh button) | Screenshots + debug-eval |
| Complex multi-step workflow (wizard, onboarding, multi-panel) | Video + screenshots at key states |

If multiple rows apply to the same feature, combine the obligations:

- Motion or animation always requires video.
- Multi-step workflows require screenshots at key states even when video is also required.
- Data-backed rendering always requires debug-eval evidence in addition to the visual capture method.

Add a `## Ship Proof Requirements` section to `<SPEC_FILE>` after the main spec content but before any appendices or changelog sections:

```
## Ship Proof Requirements

Features in this spec that involve user-visible UI changes require visual proof
before delivery. Each row specifies what to capture and why.

| Feature key | Match cues | Proof level | What to capture | Why |
|-------------|------------|-------------|-----------------|-----|
| <slug> | <semicolon-delimited phrases> | <level> | <what to capture> | <why> |
```

- `Feature key`: lowercase, hyphenated identifier unique within the section.
- `Match cues`: semicolon-delimited phrases derived from spec section headings, feature names, and stable nouns. Delivery workflows compare these against queue-item titles, iteration titles, and source ids.
- `Proof level`: one of `Screenshots`, `Video (required)`, `Screenshots + debug-eval`, `Video + screenshots at key states`, or `Video + screenshots at key states + debug-eval`.
- `What to capture`: specific states or transitions to prove.
- `Why`: human-facing classification rationale.

**Rerun behavior:** If the spec already has a `## Ship Proof Requirements` section, update it in place:

- Preserve rows whose `Feature key` still describes a feature in the revised spec.
- Preserve human-refined `Match cues` and `What to capture` text unless the surrounding feature requirements changed materially.
- Remove rows whose feature was removed from the spec.
- Add rows for newly introduced UI-visible features.

### 4. Align `<DESIGN_SOURCE>` with the revised spec (only if provided)

If **no** `<DESIGN_SOURCE>` was given, **skip this step** and state in the run summary that design sync was not requested.

Otherwise:

1. Read `<DESIGN_SOURCE>` after `<SPEC_FILE>` is updated.
2. Update `<DESIGN_SOURCE>` so it is **consistent** with the canonical spec: same terminology, scope, user journeys, boundaries, and decisions. Remove or fix contradictions.
3. If the design doc is a summary or stakeholder-facing view, it may stay shorter than the spec but must not **disagree** with it.
4. Add cross-references between the two files if the repo’s docs style uses them (e.g. “See `<SPEC_FILE>` for full requirements”).

### 4b. Commit spec and design edits

1. Check whether any edited files have uncommitted changes:
   ```bash
   git status --porcelain -- <SPEC_FILE> <DESIGN_SOURCE>
   ```
   Omit `<DESIGN_SOURCE>` from the command if it was not provided or step 4 was skipped.

2. If the output is empty, skip this step — nothing to commit.

3. Stage only the files that were modified:
   ```bash
   git add -- <SPEC_FILE>
   git add -- <DESIGN_SOURCE>   # only if provided and dirty
   ```

4. Commit:
   ```bash
   git commit -m "spec-improve: update <spec-basename>"
   ```
   Where `<spec-basename>` is the filename (not full path) of `<SPEC_FILE>`.

5. If the commit fails, stop the workflow and report the error. Do not continue to step 5.

### 5. Create ADR, DDR, and SDR records (`dev/decision-records`)

1. Read **`dev/decision-records/SKILL.md`** and follow its folder layout (respect `.decisions` at repo root if present; default `docs/decisions/`). **Use `git rev-parse --show-toplevel` to resolve the decisions root** — do not assume the repo root path, especially in worktree contexts.
2. From the audit’s **Decision Record Candidates** section, take each **still-accurate** candidate after your spec edits (drop or merge candidates that are now redundant).
3. For each distinct decision that warrants a formal record, create **one** numbered file in the correct stream (`adr/`, `ddr/`, or `sdr/`) using that skill’s templates and numbering rules. Use **Proposed** or **Accepted** per project norms.
4. **De-duplicate:** Before creating a file, list existing records in the target folders; if an equivalent decision already exists, **link or update** instead of adding a duplicate title.
5. Cross-link SDR → ADR/DDR when the skill describes downstream implications.
6. **Commit all new/updated decision records** — the `decision-records` skill’s workflow includes a commit step; verify it ran. If it didn’t (e.g. records were created outside that skill), stage and commit them now with message format `decision: add <TYPE>-NNNN <title>`.

If **decision-records** is not installed, list the candidates that *would* have been filed and stop.

---

## Rules

- **Order matters:** audit → edit spec → (optional) sync design → file records. Do not edit the design doc before the spec is canonical. If `<DESIGN_SOURCE>` is set, do not skip alignment unless the user explicitly opts out.
- **Do not invent product decisions** that are not in the spec or clearly implied; if something remains ambiguous after edits, note it in the audit summary or as an open question in the spec rather than guessing.
- **One audit report:** You may present the `dirk_prompt.md` structured output once (before or after edits). If shown after edits, note what changed from the pre-edit pass.
- **Git — decision records must be committed:** After step 5, all newly created or updated ADR/DDR/SDR files **must** be committed before the workflow ends. The `decision-records` skill handles this, but if you are creating records directly, stage and commit them yourself. Uncommitted decision records get lost in worktree workflows and create confusion about which branch they belong to. Spec and design edits are committed in step 4b before decision-records runs. Do not skip this commit.
- **Worktree safety:** All file operations must resolve paths from `git rev-parse --show-toplevel`, not from assumptions about the repo root. When running inside a git worktree, the toplevel is the worktree directory, not the main checkout. Never write files to a path outside the current worktree.

## When to use this vs spec-audit

| Goal | Skill |
|------|--------|
| Review only, no file edits | **dev/cto-audit/spec-audit** |
| Improve spec, optionally sync a design doc, create decision records | **dev/cto-audit/spec-improve** (this skill) |

## Related paths (installed project)

| Piece | Location |
|-------|----------|
| CTO router | `.cursor/skills/dev/cto-audit/SKILL.md` |
| Spec audit | `.cursor/skills/dev/cto-audit/spec-audit/` |
| Decision records | `.cursor/skills/dev/decision-records/SKILL.md` |
