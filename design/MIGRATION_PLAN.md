# Migration Plan

How to transition from the current `r26d-release-signing` monorepo to the vault/autopen split.

## Current Command Users

Projects currently reference this repo via:

```bash
task -d /path/to/r26d-release-signing apple:prepare
task -d /path/to/r26d-release-signing apple:cleanup
task -d /path/to/r26d-release-signing apple:tauri-env
task -d /path/to/r26d-release-signing tauri:sign APP=<app> ARTIFACT=/path
task -d /path/to/r26d-release-signing tauri:pubkey APP=<app>
```

And via `.envrc` / `direnv` to load `.env.signing`.

## Migration Phases

### Phase 1: Autopen CLI in Current Repo (Now)

Build the autopen CLI inside the current repo as `autopen/`. This allows iterative development without breaking existing users.

**What changes for users:** Nothing. Existing `task` commands continue to work.

**What's new:** `autopen` CLI is available for early adopters.

### Phase 2: Taskfile Delegates to Autopen

Update existing Taskfile tasks to delegate to autopen where implemented:

```yaml
tasks:
  apple:prepare:
    desc: Prepare macOS signing environment
    cmds:
      - bun run --cwd autopen autopen macos prepare
```

**What changes for users:** Nothing visible. Same task names, same behavior. Autopen is the implementation.

### Phase 3: Extract Vault

Create `r26d-signing-vault` as a new repo containing only custody material:

```
r26d-signing-vault/
  .env.signing.enc
  apple/
    api_key.p8.enc
    Matchfile
    Gemfile
    Gemfile.lock
    fastlane/Fastfile
  tauri-apps/
    workbench/
      privkey.enc
      pubkey.pub
  TeamPublicKeys/
  scripts/
  .sops.yaml
  encrypted_files.txt
  Taskfile.yml
  README.md
  THEORY.md
```

**What changes for users:** Must clone the vault separately. Must configure `R26D_SIGNING_VAULT_PATH`.

### Phase 4: Publish Autopen

Extract autopen into its own repo or package:

```
autopen/
  package.json
  src/
  docs/
  test/
  Taskfile.yml
  README.md
  THEORY.md
```

Eventually fold into `r26d-devkit` monorepo.

**What changes for users:** Install autopen globally or as a devkit dependency.

### Phase 5: Deprecate Original Repo

Archive `r26d-release-signing`. Update all references to point to `r26d-signing-vault` + `autopen`.

## New Autopen Commands (mapped from current tasks)

| Current Task | Autopen Command | Status |
|--------------|-----------------|--------|
| `apple:doctor` | `autopen doctor` | Phase 1 |
| `apple:prepare` | `autopen macos prepare` | Phase 1 |
| `apple:cleanup` | `autopen macos cleanup` | Phase 1 |
| `apple:match:readonly` | `autopen macos match pull` | Phase 1 |
| `apple:keychain:create` | `autopen macos keychain create` | Phase 1 |
| `apple:keychain:delete` | `autopen macos keychain delete` | Phase 1 |
| `apple:identity:list` | `autopen macos identity list` | Phase 1 |
| `apple:verify` | `autopen macos verify` | Phase 1 |
| `apple:tauri-env` | `autopen macos tauri-env` | Phase 2 |
| `apple:verify-artifact` | `autopen verify artifact` | Phase 2 |
| `tauri:pubkey` | `autopen tauri pubkey` | Phase 2 |
| `tauri:sign` | `autopen tauri sign` | Phase 2 |
| — | `autopen vault status` | Phase 3 |
| — | `autopen vault path` | Phase 3 |

## Temporary Aliases

During Phase 2, the root `Taskfile.yml` keeps all existing task names as aliases:

```yaml
tasks:
  prepare-macos:
    desc: "[DEPRECATED] Use 'autopen macos prepare'"
    cmds:
      - echo "Note: This task now delegates to autopen. Consider using 'autopen macos prepare' directly."
      - bun run --cwd autopen autopen macos prepare
```

These aliases survive until Phase 5.

## What Should Be Deprecated

| Item | When | Replacement |
|------|------|-------------|
| `task apple:prepare` | Phase 4 | `autopen macos prepare` |
| `task apple:cleanup` | Phase 4 | `autopen macos cleanup` |
| `task tauri:sign` | Phase 4 | `autopen tauri sign` |
| `task tauri:pubkey` | Phase 4 | `autopen tauri pubkey` |
| Direct script calls | Phase 2 | Via autopen or vault tasks |
| `task -d ../r26d-release-signing` pattern | Phase 3 | `autopen` (finds vault via config) |

## What Should Be Removed Later

- `scripts/` directory (after vault extraction, Proggy manages these in the vault)
- Root-level signing task aliases (after Phase 4)
- The original `r26d-release-signing` repo (Phase 5)
- Ruby/Bundler in autopen (stays in vault only)

## How Projects Should Migrate

### Step 1: Install Autopen

```bash
# From autopen repo (Phase 1-3)
cd autopen && bun install && bun link

# Or from devkit (Phase 4+)
bun add -g @r26d/autopen
```

### Step 2: Configure Vault Path

```bash
mkdir -p ~/.config/r26d/autopen
cat > ~/.config/r26d/autopen/config.toml << 'EOF'
[vault]
path = "/path/to/r26d-signing-vault"
EOF
```

Or set `R26D_SIGNING_VAULT_PATH` environment variable.

### Step 3: Update App Taskfiles

Before:
```yaml
tasks:
  build:signed:
    cmds:
      - task -d "{{.SIGNING_REPO}}" apple:prepare
      - defer: task -d "{{.SIGNING_REPO}}" apple:cleanup
      - eval "$(task -d '{{.SIGNING_REPO}}' apple:tauri-env)" && cargo tauri build
```

After:
```yaml
tasks:
  build:signed:
    cmds:
      - autopen macos prepare
      - defer: autopen macos cleanup
      - eval "$(autopen macos tauri-env)" && cargo tauri build
```

### Step 4: Update CI

Replace `task -d` invocations with `autopen` commands. Vault checkout becomes a separate step.

## How r26d-devkit Monorepo Might Consume Autopen

Autopen is designed to be a standalone package with no vault dependencies in its source. It can be placed as a workspace package in a monorepo:

```
r26d-devkit/
  packages/
    autopen/
      package.json  (name: "@r26d/autopen")
      src/
      ...
    other-tools/
```

The key constraint: autopen must remain installable and runnable without the vault present. It discovers the vault at runtime via configuration.

## Risk Areas

1. **Fastlane dependency location** — Match needs `Matchfile`, `Gemfile`, `Fastfile`. These must stay in the vault (or be auto-generated by autopen from config). Current plan: autopen invokes `bundle exec fastlane` inside the vault directory.

2. **SOPS dependency** — Tauri signing needs `sops decrypt`. Autopen calls sops but the encrypted files live in the vault. Autopen needs the vault path at runtime.

3. **Hardcoded values** — ASC API key ID, issuer ID, and user email are currently in `apple/Taskfile.yml`. These should move to autopen config or vault metadata.

4. **Proggy-managed scripts** — The encrypt/decrypt scripts are auto-generated by Proggy. They stay with the vault. Autopen should not depend on Proggy.

5. **direnv integration** — The `.envrc` that loads `.env.signing` is vault-specific. Autopen should work without direnv (reads vault path from config, loads secrets from vault).
