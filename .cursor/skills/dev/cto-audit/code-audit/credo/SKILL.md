---
name: elixir-credo-checks
summary: Install CTO audit Credo checks into an Elixir project.
description: Scaffold custom Credo checks that enforce the CTO code-audit standards from references/elixir.md. Use when the code-audit skill detects an Elixir project and the user wants automated enforcement of audit rules via static analysis. Installs check modules, ensures the Credo dependency, and merges config into .credo.exs. All changes are additive — never overwrites existing user configuration.
---

# Elixir Credo Checks (CTO Audit Enforcement)

**Purpose:** Install custom Credo checks that mechanically enforce the subset of `references/elixir.md` audit standards that are statically analyzable. This frees the AI audit to focus on structural and judgment-level findings.

## What Gets Installed

Six custom checks, each mapping to a specific section of the Elixir audit:

| Check | Audit Section | Default Threshold |
|-------|--------------|-------------------|
| `SinglePipeChain` | §5 Style & Idioms | n/a (any single-step pipe) |
| `LongWithChain` | §3–4 Function Quality / Control Flow | 5 clauses |
| `MaxFunctionLength` | §3 Function Quality | 40 lines |
| `MaxFunctionArity` | §3 Function Quality | 4 parameters |
| `SwallowedRescue` | §4 Control Flow / Error Handling | n/a (any bare rescue) |
| `MaxModulePublicFunctions` | §1 API / Module Design | 15 functions |

All thresholds are configurable via `.credo.exs` params.

## Installation Workflow

Follow these steps in order. All changes MUST be additive — never delete or overwrite existing configuration.

### Step 1 — Detect the Elixir project

1. Confirm `mix.exs` exists in the project root.
2. Read `mix.exs` and extract the app name from `def project do [app: :the_app_name, ...]`.
3. Convert to module form: `:my_app` → `MyApp`. Use the project's actual top-level module — check `lib/` directory names and existing module declarations if the module name doesn't follow the standard snake_case-to-PascalCase conversion.
4. Store these as `APP_NAME` (atom, e.g. `:my_app`) and `APP_MODULE` (e.g. `MyApp`).

### Step 2 — Ensure Credo dependency

Check `mix.exs` deps for `:credo`. If missing, add:

```elixir
{:credo, "~> 1.7", only: [:dev, :test], runtime: false}
```

Then run `mix deps.get`.

### Step 3 — Ensure .credo.exs exists

If `.credo.exs` does not exist, run:

```bash
mix credo gen.config
```

### Step 4 — Copy check templates

1. Read each `.ex` template from `credo/templates/` (relative to this skill).
2. Replace the placeholder `__APP_MODULE__` with the actual `APP_MODULE` value throughout.
3. Write each file to `lib/<app_name>/credo_checks/<check_name>.ex` in the target project.

The templates to install:

| Template file | Target |
|---------------|--------|
| `single_pipe_chain.ex` | `lib/<app_name>/credo_checks/single_pipe_chain.ex` |
| `long_with_chain.ex` | `lib/<app_name>/credo_checks/long_with_chain.ex` |
| `max_function_length.ex` | `lib/<app_name>/credo_checks/max_function_length.ex` |
| `max_function_arity.ex` | `lib/<app_name>/credo_checks/max_function_arity.ex` |
| `swallowed_rescue.ex` | `lib/<app_name>/credo_checks/swallowed_rescue.ex` |
| `max_module_public_functions.ex` | `lib/<app_name>/credo_checks/max_module_public_functions.ex` |

### Step 5 — Merge into .credo.exs

Read the existing `.credo.exs`. Make two additive changes:

1. **Add `requires` path** (if not already present):
   ```elixir
   requires: ["lib/<app_name>/credo_checks/**/*.ex"]
   ```
   If a `requires` key already exists, append this glob to the existing list.

2. **Append checks** to the `checks` list (do NOT remove or reorder existing entries):
   ```elixir
   {<AppModule>.CredoChecks.SinglePipeChain, []},
   {<AppModule>.CredoChecks.LongWithChain, [max_clauses: 5]},
   {<AppModule>.CredoChecks.MaxFunctionLength, [max_length: 40]},
   {<AppModule>.CredoChecks.MaxFunctionArity, [max_arity: 4]},
   {<AppModule>.CredoChecks.SwallowedRescue, []},
   {<AppModule>.CredoChecks.MaxModulePublicFunctions, [max_count: 15]},
   ```

See `credo/credo_config_fragment.exs` for the reference fragment.

### Step 6 — Validate

Run:

```bash
mix credo
```

Verify that:
- No compilation errors from the new check modules.
- The custom checks appear in the output (they may report issues or pass cleanly).
- Existing checks still run (nothing was broken by the merge).

## Customization

After installation, users can tune thresholds in `.credo.exs`:

```elixir
# Allow longer functions in specific cases
{MyApp.CredoChecks.MaxFunctionLength, [max_length: 60]},

# Disable a check entirely
{MyApp.CredoChecks.SinglePipeChain, false},
```

## Feedback Loop

When running a code audit (via `references/elixir.md`) on a project that has these Credo checks installed:

- If an audit finding overlaps with an installed check, note it — the check threshold may need tuning or the check may have a bug.
- If a recurring audit finding is mechanical and pattern-matchable but has no Credo check, flag it as a candidate for a new check.

## Common Failure Modes

- **Forgetting `requires`** → checks compile but Credo never loads them.
- **Overwriting `.credo.exs`** → destroys user's existing config. Always merge additively.
- **Wrong module namespace** → must match `<AppModule>.CredoChecks.*` exactly.
- **Not running `mix deps.get`** → Credo not available for validation step.
