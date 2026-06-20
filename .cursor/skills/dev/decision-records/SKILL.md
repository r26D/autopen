---
name: decision-records
description: |
  Create, manage, and maintain Architecture Decision Records (ADR), Design Decision Records (DDR), and Strategic Design Records (SDR) in a project. ALWAYS use this skill when the user types `/decision a`, `/decision d`, or `/decision s` (shorthand for architecture/design/strategy decision). Also trigger for: "write an ADR/DDR/SDR", "let's ADR this", "document this decision", "record this choice", "write a decision record", "new architecture decision", "design decision", "strategic decision", "should we write a decision record for this?", setting up decision-records folders in a new project, superseding or deprecating an existing record, or any time the user wants to document why a technical, design, or strategic choice was made.
---

# Decision Records Skill

## Shorthand commands

| Command | Meaning |
|---------|---------|
| `/decision a <title>` | Create an Architecture Decision Record |
| `/decision d <title>` | Create a Design Decision Record |
| `/decision s <title>` | Create a Strategic Design Record |

If no title is given, ask for one. If the type is unclear, use the guide below to help the user decide.

---

This skill guides you through creating and maintaining three kinds of decision records:

| Type | Abbreviation | Purpose |
|------|-------------|---------|
| **Architecture Decision Record** | ADR | Significant technical/architecture choices: frameworks, infrastructure, patterns, tooling |
| **Design Decision Record** | DDR | Design-level decisions: UX patterns, API shape, component behavior, interaction design |
| **Strategic Design Record** | SDR | Strategic direction, constraints, or product/technical strategy that frames future ADRs and DDRs |

## What is a Strategic Design Record (SDR)?

An SDR captures a strategic commitment — a choice that constrains or directs many future ADRs and DDRs. Unlike an ADR ("we chose tool X") or a DDR ("inputs behave this way"), an SDR answers "what are we fundamentally committed to, and what have we ruled out?"

SDRs typically come from:
- **Product strategy**: "We are a mobile-first product. Desktop is secondary."
- **Technical philosophy**: "We optimize for developer experience over configurability."
- **Non-negotiable constraints**: "We will never store personally identifiable data on our servers."
- **Architectural posture**: "We build for horizontal scalability from day one."
- **Quality commitments**: "Accessibility (WCAG AA) is a first-class requirement, not a retrofit."

An SDR is *not* an implementation detail — it does not say *how* to achieve the goal. It says *what* the team is committed to so that later decisions can refer back to it without re-litigating the same strategic trade-offs.

**Signs you need an SDR:**
- A recurring debate keeps surfacing in ADRs/DDRs and you want to settle it once
- A new team member asks "why do we always do X?" and the answer isn't in any ADR or DDR
- Leadership or product has made a commitment that should guide technical choices
- You're about to make 3+ downstream decisions all motivated by the same constraint

## Quick decision guide: which type?

- "We chose Postgres over MySQL" → **ADR**
- "Modals should be used sparingly" → **DDR**
- "We will build mobile-first and prioritize offline capability" → **SDR**
- "We decided icons always have leading labels" → **DDR**
- "We will use a monorepo" → **ADR**
- "Our product must work for users with slow connections" → **SDR**
- "We prioritize simplicity over features for v1" → **SDR**
- "Forms auto-save state so users never lose input" → **DDR**
- "We use feature flags for all new functionality" → **ADR**

When unsure, ask: Does this frame *other* decisions (SDR), affect *how users experience the product* (DDR), or define *how the system is built* (ADR)?

---

## Folder conventions

The default root is `docs/decisions/`. Projects can override this by placing a `.decisions` config file at the repo root:

```
# .decisions
root: decisions   # e.g. to use /decisions instead of /docs/decisions
```

If `.decisions` exists, read the `root:` value and use it as the base path. If not, use `docs/decisions/`.

Default layout under the root:

```
docs/decisions/          ← configurable root
├── adr/
│   ├── templates/
│   │   └── template.md
│   └── 0001-record-architecture-decisions.md
├── ddr/
│   ├── templates/
│   │   └── template.md
│   └── 0001-record-design-decisions.md
└── sdr/
    ├── templates/
    │   └── template.md
    └── 0001-record-strategic-decisions.md
```

**Always check before creating new folders.** If the project already has a different layout (e.g. `architecture/decisions/` and `design/decisions/` at the root), adapt to it rather than imposing the default structure. The `.decisions` file is for new projects or projects that want to standardize.

### adr-tools compatibility

ADRs in this skill follow the [npryce/adr-tools](https://github.com/npryce/adr-tools) format. If adr-tools is installed in the project (`adr` command available), prefer using it to create and link ADRs:

```bash
adr new "Title of the decision"
adr link 5 Amends 3 "is amended by"   # link records
adr generate toc                        # generate a table of contents
```

Use the skill templates when adr-tools is not available or for DDR/SDR types which adr-tools doesn't cover.

---

## Numbering

Each stream (adr/, ddr/, sdr/) has its own sequential counter, zero-padded to 4 digits:

```
0001-...  0002-...  0003-...
```

To find the next number: list the directory, find the highest existing number, increment by 1.

```bash
ls docs/decisions/adr/ | grep -E '^[0-9]+' | sort | tail -1
```

Gaps are fine (a deleted record leaves a hole — do not reuse its number).

---

## Templates

See `assets/adr-template.md`, `assets/ddr-template.md`, and `assets/sdr-template.md` for the full templates.

### ADR (adr-tools compatible)

```markdown
# NUMBER. Title

Date: YYYY-MM-DD

## Status

Proposed | Accepted | Deprecated | Superseded by [NNNN](link)

## Context

Background and constraints driving this decision.

## Decision

What was decided and why.

## Consequences

What becomes easier or harder; risks introduced; follow-up actions.
```

### DDR

```markdown
# NUMBER. Title

## Date
YYYY-MM-DD

## Status

Proposed | Accepted | Deprecated | Superseded by [NNNN](link)

## Context

Background motivating the decision. Constraints, research, stakeholder inputs.

## Intention

What we aim to achieve for users or the system. The "what" and "why it matters".

## Implementation

The chosen approach, patterns, or components. Alternatives considered and rejected.
```

### SDR

```markdown
# NUMBER. Title

## Date
YYYY-MM-DD

## Status

Proposed | Accepted | Deprecated | Superseded by [NNNN](link)

## Context

The strategic situation: market, product, or organizational forces at play.

## Direction

The strategic choice: what we commit to and what we rule out.

## Rationale

Why this direction over alternatives. Constraints accepted. Trade-offs acknowledged.

## Downstream implications

ADRs and DDRs this frames or constrains (add links as they are created).
```

---

## Workflow

### Creating a new record

1. Determine the type (ADR / DDR / SDR) using the guide above.
2. **Resolve the decisions root from the current git worktree**, not from a hardcoded or remembered path. Run `git rev-parse --show-toplevel` and use that as the base for all path operations. This is critical in worktree-based workflows where the repo root differs from the main checkout.
3. Find the correct folder under that root. If it doesn't exist, create it and initialize with `0001-record-X-decisions.md` as the first record (this is the convention from adr-tools).
4. Copy the template to a new numbered file: `NNNN-short-slug-of-title.md`.
5. Fill in all sections. Status starts as **Proposed** until reviewed; set to **Accepted** once agreed.
6. If this record is motivated by an SDR, add a cross-link in the SDR's "Downstream implications" section.
7. **Commit the new record(s) immediately.** Stage only the decision-record files and commit with the message format `decision: add <TYPE>-NNNN <title>` (e.g. `decision: add ADR-0005 use-pnpm-for-packages`). When creating multiple records in one pass, combine them into a single commit listing each. Uncommitted records get lost in worktree workflows and cause confusion about which branch owns them.

**File naming:** lowercase, hyphens, concise but descriptive:
```
0005-use-pnpm-for-packages.md         ✓
0005-UseNpmOrPnpmForPackageManagement.md  ✗
```

### Status lifecycle

```
Proposed → Accepted → Deprecated
                    ↘ Superseded by NNNN
```

- **Proposed**: drafted but not yet agreed
- **Accepted**: agreed and in effect
- **Deprecated**: no longer relevant; no replacement
- **Superseded**: replaced by a later record — update both the old record's status (`Superseded by [0012](0012-...)`) and add a note in the new record (`Supersedes [0007](0007-...)`)

### Relating records to PRs and code

- Reference the decision record in PR descriptions: "This implements ADR-0015."
- In code, add a short comment near the affected area: `// See docs/decisions/adr/0015-git-town-for-git-workflow.md`
- When a code change *creates* a new architectural or design choice, file the record *before or alongside* the PR — not after.

### Cross-linking ADR / DDR / SDR

- SDRs express broad direction. When an ADR or DDR is directly motivated by an SDR, note it in both files.
- Example: SDR-0001 ("mobile-first, offline capable") → ADR-0008 ("use IndexedDB for local storage"), DDR-0005 ("offline indicator in the UI").
- Keep links relative within the repo.

---

## Deprecating or superseding

When a decision changes:

1. Create the new record with its decision and add `Supersedes [NNNN](../NNNN-old-title.md)` under Status.
2. Edit the old record's Status line to read: `Superseded by [NNNN](../NNNN-new-title.md)`.
3. Do not delete old records — they are the history of *why* the codebase is the way it is.

---

## Setting up a new project

When bootstrapping decision records for the first time, auto-install all three `0001` records — they document the decision to *use* each record type, which is itself a decision worth recording. This mirrors what `adr init` does for ADRs.

**Steps:**

1. Create the folder structure:
   ```bash
   mkdir -p docs/decisions/adr/templates docs/decisions/ddr/templates docs/decisions/sdr/templates
   ```

2. Copy the three bootstrap records from `assets/` (in this skill directory) into the project, replacing `DATE` with today's date:
   - `assets/0001-record-architecture-decisions.md` → `docs/decisions/adr/0001-record-architecture-decisions.md`
   - `assets/0001-record-design-decisions.md` → `docs/decisions/ddr/0001-record-design-decisions.md`
   - `assets/0001-record-strategic-decisions.md` → `docs/decisions/sdr/0001-record-strategic-decisions.md`

3. Copy the templates:
   - `assets/adr-template.md` → `docs/decisions/adr/templates/template.md`
   - `assets/ddr-template.md` → `docs/decisions/ddr/templates/template.md`
   - `assets/sdr-template.md` → `docs/decisions/sdr/templates/template.md`

**If adr-tools is installed:** run `adr init docs/decisions/adr` instead of steps 1–3 for the ADR stream — it handles the folder and bootstrap record automatically. Still create the ddr/ and sdr/ folders and their bootstrap records manually.

The project is now ready. The next ADR is `0002-...`, the next DDR is `0002-...`, the next SDR is `0002-...`.
