# Execution recommendation

This file defines how the agent chooses between inline execution and subagent-driven execution after producing a completed plan through `superpowers:writing-plans`. It is referenced by the planner-brief templates and overrides any static upstream recommendation.

## Inputs

Evaluate the completed plan using only information already present in it:

- **Task count** — the number of top-level tasks (e.g. `### Task N` headings).
- **Independence** — whether tasks share files, require outputs from previous tasks, or can be implemented and verified in isolation.
- **Complexity / risk** — whether the work is mechanical (renames, config, straightforward wiring, localized refactors, documentation) or requires broader design judgment, touches multiple subsystems, or carries meaningful regression risk.

Do not ask the user to classify the plan when these signals are already present in the plan text.

## Decision matrix

| Factor | Favors inline | Favors subagents |
|--------|--------------|-----------------|
| Task count | 1–2 top-level tasks | 3 or more top-level tasks |
| Independence | Tasks are sequential, share the same files, or require outputs from previous tasks | Tasks can be implemented and verified independently without shared intermediate state |
| Complexity / risk | Mechanical edits, straightforward wiring, localized refactors, or low-risk documentation/script work | Cross-cutting behavior, multiple subsystems, design judgment, or meaningful regression risk that benefits from review gates |

## Decision rule

1. Evaluate all three factors against the completed plan.
2. Assign each factor to either `inline` or `subagents`.
3. If two or more factors favor `inline`, recommend inline execution.
4. Otherwise recommend subagent-driven execution.
5. If any factor is genuinely unclear from the plan, classify that factor as `subagents` rather than asking the user. The fallback bias is safety, not optimism.

Example: 3 sequential mechanical tasks still route to inline because independence and complexity both favor inline (2 of 3 factors).

## Output contract

Emit exactly one sentence that:

- states the chosen execution mode
- cites the dominant reason in plain language
- uses the completed plan as evidence

Examples:

- `This plan has 2 tightly coupled mechanical tasks, so executing inline.`
- `This plan spans 5 independent tasks across multiple subsystems, so using subagent-driven execution.`
- `This plan leaves task independence unclear, so using subagent-driven execution as the safe default.`

Immediately after the sentence:

- invoke `superpowers:executing-plans` when the recommendation is inline
- invoke `superpowers:subagent-driven-development` when the recommendation is subagent-driven

Do not:

- restate both options
- ask the user to choose between the two modes
- mention the upstream `(recommended)` label as authoritative
- stop after giving the recommendation

## Failure fallback

- If this file is missing at runtime, default to `superpowers:subagent-driven-development` and note the artifact was missing.
- If the completed plan does not expose enough structure to count tasks or assess independence, default to `superpowers:subagent-driven-development`.
