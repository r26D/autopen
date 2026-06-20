# Command: done (mark iteration item done)

Use for: **`done:`** (optionally with a `##` heading, file/line reference, **`**Id:** ITER-N`**, or a pasted block that matches one section in `work/ITERATION.md`)

**Prerequisites:** Read `../bootstrap.md` and `../rules.md` first.

## Trigger

**`done: [reference to section in ITERATION.md]`**

→ Find the referenced section in ITERATION.md  
→ Remove that section from ITERATION.md  
→ Confirm completion

## Workflow

1. **Read ITERATION.md** — **backfill missing ids** per **`../id-prefixes.md`** (Backfill), then locate the referenced section.
2. **Identify the section** in `work/ITERATION.md`. Try these cues until one resolves **uniquely** (if ambiguous at any step, ask the user to narrow: heading, id, or more pasted text):
   - **Heading or citation** — Match a `##` heading (substring is fine if it matches **exactly one** section), or a reference such as `@work/ITERATION.md:<lines>` / open-editor path+lines. Prefer the cited range when the user points at a span that falls inside one section.
   - **Entry id** — If the user message includes a token matching **`**Id:** ITER-N`** per **`../id-prefixes.md`**, search `work/ITERATION.md` for a section whose metadata includes **that exact id line**. If **exactly one** section matches, that is the target. If none or more than one match, ask the user to fix the id or disambiguate.
   - **Pasted block** — If the user pastes a fragment of an item (with or without the `##` line): find the unique section such that **any** of the following holds: (a) the block contains the section's **`**Id:** ITER-N`** line; (b) the block's first non-empty line equals the section's `##` heading line (after trim); (c) after normalizing whitespace (trim ends, collapse blank runs), the block text is a substring of the full section text **or** the section body is clearly the only one containing that distinctive text. If still ambiguous, ask for the id or the full `##` title line.
3. **Snapshot the block** — Copy the full section text before removing it. Capture the **Source** and **Source id** fields from the iteration entry for provenance.
4. **Remove the section** from ITERATION.md (preserve file structure)
5. **CHANGELOG** — If `CHANGELOG.md` exists at the workspace root and the completed work is worth recording, update it: add **one sentence** summarizing the outcome, matching the file's existing style. **Do not include the entry id** in the CHANGELOG line — describe the change in plain language.
6. **Commit** — Stage only the changed `work/` file(s) and `CHANGELOG.md` (when updated). Commit with message `xp_work: done ITER-N` (using the id of the removed section, e.g. `xp_work: done ITER-3`). Do not use `git add .`; only stage specific files that were modified.
7. **Ship Proof gate** (conditional) — If the project has a `ship-proof` skill (check for `.claude/skills/ship-proof/SKILL.md`), and the done item involved **user-visible UI changes**, invoke the `ship-proof` skill. Decide the proof level based on the feature: **screenshots** for static UI, **video** for animations/transitions/real-time updates, **screenshots + debug-eval** for data-flow features. Tell ship-proof what level you chose. Store proof in `docs/features_proof/<ITER-N>-<slugified-title>/` and commit separately: `ship-proof: <section-title>`. If the skill doesn't exist or the item has no UI impact, skip.
8. **Human verification gate** — After commit, decide whether a human still needs to verify anything (e.g. local UI walkthrough, E2E with credentials, device testing, production smoke).
   - If **no** human verification is needed → continue to step 9.
   - If **yes** → append a new `ACC-N` section to `work/ACCEPTANCE.md` (read `commands/acceptance.md`, `../templates/acceptance-template.md`, and `../id-prefixes.md`). Rules:
     - **Source:** `ITERATION.md`.
     - **Source id:** the iteration section's `**Id:** ITER-N`.
     - **Date Moved to Acceptance:** today.
     - **Description / Context / Acceptance Criteria:** derived from the snapshot and what was completed; criteria must be checkable by the human.
     - **Why:** Copy the iteration section's **`**Why:**`** verbatim when present. If absent, set **`**Why:** [Not yet documented]`**.
     - **Pre-verification:** Describe only what the human needs to do to verify. Omit if they can verify in the current checkout as-is.
     - After appending, raise `ACCEPTANCE.md`'s `**Last id:** ACC-N` counter to the newly assigned id per `../id-prefixes.md` (Persistent counter).
     - **Commit** with subject: `xp_work: queue ACC-N for ITER-N`. Only stage `work/ACCEPTANCE.md`.
9. **Confirm completion** by saying "Marked as done and removed from iteration" and:
   - Whether `CHANGELOG.md` was updated
   - If ship-proof ran, where proof artifacts are stored
   - If `ACC-N` was created (and that `accept:` / `xp_work accept` should be used after the human verifies)
