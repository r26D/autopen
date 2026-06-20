# xp_work behavior evals

Deterministic, single-turn behavior tests for the xp_work skill. Run via:

```sh
./scripts/run_behavior_evals.sh dev/xp_work
```

Each case lives in `evals.json`:

- `id` — stable case number
- `name` — human label
- `prompt` — what gets fed to `claude -p`
- `fixture` (optional) — directory under `fixtures/` whose contents seed the test workspace
- `assertions` — list of structured checks against the post-run workspace

Assertion types: `file_exists`, `file_absent`, `file_contains` (literal substring, `pattern` field), `file_not_contains`, `file_matches` (multi-line regex, `regex` field).

Adding a case:

1. (Optional) create `fixtures/<case-name>/` with the starting state of the test workspace (typically a `work/` tree).
2. Append an entry to `evals.json` with a fresh `id`, a clear `name`, the `prompt`, the `fixture` reference, and the assertions.
3. Run `./scripts/run_behavior_evals.sh dev/xp_work` and confirm it passes.

Multi-turn flows (e.g. `pluck:` with its planner-mode gate) are intentionally out of scope for this first cut.
