# Release Signing Toolkit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Taskfile-based macOS signing toolkit with Fastlane Match, temporary keychains, and documentation so app repos can call `task apple:prepare` / `task apple:cleanup` without owning Ruby or signing config.

**Architecture:** Root `Taskfile.yml` delegates to platform-specific `apple/Taskfile.yml` and `windows/Taskfile.yml`. Apple signing uses Fastlane Match (via Bundler) for certificate management, temporary keychains for isolation, and environment variables for all secrets. The Match encrypted storage lives in a separate repo (`r26d-apple-match-secrets`).

**Tech Stack:** Taskfile (v3), Ruby 3.3.0, Fastlane (via Bundler), Bash (embedded in Taskfile cmds), macOS `security` / `codesign` / `xcrun` tools.

---

## Existing State

The repo already has:
- `Taskfile.yml` with bootstrap and encrypt-files tasks (proggy-managed)
- `docs/THEORY.md` with full project theory
- `.gitignore` with proggy-managed sections
- `.tool-versions` pinning ruby 3.3.0 and task 3.44.1
- `.sops.yaml` and encryption scripts under `scripts/`
- `lefthook.yml` for git hooks

We are **adding** signing infrastructure alongside the existing setup, not replacing it.

---

### Task 1: Add signing-specific .gitignore rules

**Files:**
- Modify: `.gitignore` (append after existing proggy sections)

- [ ] **Step 1: Append signing-specific ignore rules**

Add a new section at the end of `.gitignore`:

```gitignore
# >>> r26d-release-signing
# Signing secrets and temporary state — never commit these.
*.p12
*.cer
*.key
*.mobileprovision
*.provisionprofile
*.keychain
*.keychain-db
.env.*
!.env.example
tmp/
.apple-signing-state/
# <<< r26d-release-signing
```

Note: `.env` is already ignored by the proggy python section. The `!.env.example` negation allows committing example env files. We do NOT ignore `*.enc` files since those are SOPS-encrypted and intentionally tracked.

- [ ] **Step 2: Verify no false positives**

Run: `git status`
Expected: only `.gitignore` modified, no existing tracked files suddenly untracked.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add signing-specific gitignore rules"
```

---

### Task 2: Move THEORY.md to root

**Files:**
- Move: `docs/THEORY.md` → `THEORY.md`

The INITIAL_PLAN specifies `THEORY.md` at the repo root. It currently lives at `docs/THEORY.md`. The content is already complete and matches the spec.

- [ ] **Step 1: Move the file**

```bash
git mv docs/THEORY.md THEORY.md
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: move THEORY.md to repo root per project structure"
```

---

### Task 3: Create root README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

```markdown
# r26d-release-signing

Shared release-signing toolkit for R26D applications.

This repo owns company-level signing workflows. Application repos should not store company signing certificates — even encrypted.

## Quick Start (macOS)

```bash
# On the signing machine, with env vars configured:
task apple:prepare

# In your app repo:
pnpm tauri build   # or whatever your build command is

# Back in this repo:
task apple:cleanup
```

## What This Repo Provides

- **macOS signing** via Fastlane Match, temporary keychains, and Taskfile tasks
- **Readonly by default** — normal builds fetch existing signing material
- **Admin workflows** — certificate creation/rotation is separate and guarded
- **Temporary signing environments** — keychains are created for the build and deleted after

## What This Repo Does NOT Provide

- Application source code, build configuration, or release decisions
- App-specific secrets (bundle IDs, entitlements, notarization credentials)
- Windows signing (placeholder exists, not yet implemented)

## Available Tasks

```bash
task --list                  # Show all tasks
task apple:doctor            # Check macOS signing prerequisites
task apple:prepare           # Prepare signing environment (keychain + Match)
task apple:cleanup           # Remove temporary signing environment
task apple:verify            # Verify signing identity and tools
task apple:match:readonly    # Fetch signing identity (readonly)
task apple:match:admin       # Admin: create/rotate signing material
task apple:identity:list     # List available codesigning identities
```

## Required Environment Variables

| Variable | Purpose |
|---|---|
| `MATCH_PASSWORD` | Passphrase for Match encrypted storage |
| `MATCH_GIT_URL` | Git URL of the Match secrets repo (e.g. `r26d-apple-match-secrets`) |
| `FASTLANE_TEAM_ID` | Apple Developer Team ID |

### Optional

| Variable | Purpose | Default |
|---|---|---|
| `FASTLANE_USER` | Apple ID email for App Store Connect | Not required for Developer ID signing |
| `R26D_SIGNING_KEYCHAIN_NAME` | Name for temporary keychain | `r26d-release-signing.keychain-db` |
| `R26D_SIGNING_STATE_DIR` | Directory for temporary signing state | `.apple-signing-state` |
| `R26D_SIGNING_ADMIN_CONFIRM` | Set to `yes` to allow admin Match operations | (unset) |

## Repo Structure

```
r26d-release-signing/
  README.md              # This file
  THEORY.md              # Design philosophy
  Taskfile.yml           # Root task interface
  apple/
    README.md            # Apple signing details
    Gemfile              # Fastlane via Bundler
    Matchfile            # Match configuration
    Taskfile.yml         # macOS signing tasks
    fastlane/
      Fastfile           # Fastlane lanes
    docs/
      app-integration.md
      setup-mac-signing-machine.md
      rotating-apple-certs.md
  windows/
    README.md            # Placeholder for future signing
    Taskfile.yml         # Placeholder tasks
```

## Documentation

- [App Integration Guide](apple/docs/app-integration.md) — how app repos use this
- [Signing Machine Setup](apple/docs/setup-mac-signing-machine.md) — preparing a Mac for signing over SSH
- [Certificate Rotation](apple/docs/rotating-apple-certs.md) — admin rotation guide
- [Design Philosophy](THEORY.md) — why signing is separated from app repos
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add root README with quick start and task reference"
```

---

### Task 4: Create apple/Gemfile

**Files:**
- Create: `apple/Gemfile`

- [ ] **Step 1: Write Gemfile**

```ruby
source "https://rubygems.org"

gem "fastlane"
```

No version pin needed — Bundler will lock the resolved version in `Gemfile.lock`. The `.tool-versions` already pins Ruby 3.3.0.

- [ ] **Step 2: Commit**

```bash
git add apple/Gemfile
git commit -m "chore(apple): add Gemfile for Fastlane via Bundler"
```

Note: Do NOT run `bundle install` here — that should happen on a macOS machine. `Gemfile.lock` will be committed after the first `bundle install`.

---

### Task 5: Create apple/Matchfile

**Files:**
- Create: `apple/Matchfile`

- [ ] **Step 1: Write Matchfile**

```ruby
git_url(ENV.fetch("MATCH_GIT_URL"))
type("developer_id")
readonly(true)

# Team ID is read from FASTLANE_TEAM_ID env var automatically by Fastlane.
# MATCH_PASSWORD env var is used to decrypt the Match repo.
#
# The Match encrypted storage repo (e.g. r26d-apple-match-secrets) is separate
# from this toolkit repo. That repo contains only encrypted certificates and
# profiles managed by `fastlane match`.
```

- [ ] **Step 2: Commit**

```bash
git add apple/Matchfile
git commit -m "chore(apple): add Matchfile for Developer ID signing via Match"
```

---

### Task 6: Create apple/fastlane/Fastfile

**Files:**
- Create: `apple/fastlane/Fastfile`

- [ ] **Step 1: Write Fastfile**

```ruby
default_platform(:mac)

platform :mac do
  desc "Fetch Developer ID signing identity in readonly mode"
  lane :match_readonly do
    match(
      type: "developer_id",
      readonly: true,
      git_url: ENV.fetch("MATCH_GIT_URL"),
      keychain_name: ENV.fetch("R26D_SIGNING_KEYCHAIN_NAME", "r26d-release-signing.keychain-db"),
      keychain_password: ENV["R26D_SIGNING_KEYCHAIN_PASSWORD"]
    )
  end

  desc "Admin flow for creating or rotating Developer ID signing material"
  lane :match_admin do
    match(
      type: "developer_id",
      readonly: false,
      git_url: ENV.fetch("MATCH_GIT_URL")
    )
  end
end
```

The `match_readonly` lane passes `keychain_name` and `keychain_password` so Match installs the certificate into the temporary keychain created by the `keychain:create` task, not the login keychain. The `match_admin` lane omits keychain params — admin operations use the default keychain interactively.

- [ ] **Step 2: Commit**

```bash
git add apple/fastlane/Fastfile
git commit -m "chore(apple): add Fastfile with readonly and admin Match lanes"
```

---

### Task 7: Create apple/Taskfile.yml

**Files:**
- Create: `apple/Taskfile.yml`

This is the main signing interface. All tasks are designed to be called from the root as `task apple:<name>`.

- [ ] **Step 1: Write apple/Taskfile.yml**

```yaml
version: "3"

vars:
  STATE_DIR: '{{.R26D_SIGNING_STATE_DIR | default ".apple-signing-state"}}'
  KEYCHAIN_NAME: '{{.R26D_SIGNING_KEYCHAIN_NAME | default "r26d-release-signing.keychain-db"}}'

tasks:
  default:
    desc: Show Apple signing tasks
    cmds:
      - task --list

  doctor:
    desc: Check macOS signing prerequisites
    cmds:
      - |
        set -euo pipefail
        echo "Checking macOS signing prerequisites..."

        test "$(uname)" = "Darwin" || { echo "FAIL: This task must run on macOS."; exit 1; }
        echo "  OK: macOS detected"

        command -v ruby >/dev/null || { echo "FAIL: Missing ruby"; exit 1; }
        echo "  OK: ruby $(ruby --version | head -1)"

        command -v bundle >/dev/null || { echo "FAIL: Missing bundler (gem install bundler)"; exit 1; }
        echo "  OK: bundler found"

        command -v security >/dev/null || { echo "FAIL: Missing security command"; exit 1; }
        echo "  OK: security found"

        command -v codesign >/dev/null || { echo "FAIL: Missing codesign"; exit 1; }
        echo "  OK: codesign found"

        xcrun --find notarytool >/dev/null 2>&1 || { echo "FAIL: Missing notarytool (install Xcode CLI tools)"; exit 1; }
        echo "  OK: notarytool found"

        echo ""
        echo "All prerequisites satisfied."

  bundle:
    desc: Install Fastlane dependencies with Bundler
    cmds:
      - bundle check --quiet 2>/dev/null || bundle install

  match:readonly:
    desc: Fetch Apple Developer ID signing identity using Fastlane Match (readonly)
    deps:
      - bundle
    env:
      R26D_SIGNING_KEYCHAIN_PASSWORD:
        sh: 'cat "{{.STATE_DIR}}/keychain-password" 2>/dev/null || true'
    cmds:
      - |
        set -euo pipefail
        : "${MATCH_PASSWORD:?MATCH_PASSWORD is required}"
        : "${MATCH_GIT_URL:?MATCH_GIT_URL is required}"
        : "${FASTLANE_TEAM_ID:?FASTLANE_TEAM_ID is required}"
        bundle exec fastlane match_readonly

  match:admin:
    desc: "Admin-only: create or rotate signing material (DESTRUCTIVE)"
    deps:
      - bundle
    cmds:
      - |
        set -euo pipefail
        if [ "${R26D_SIGNING_ADMIN_CONFIRM:-}" != "yes" ]; then
          echo "=========================================="
          echo "  WARNING: Admin signing operation"
          echo "=========================================="
          echo ""
          echo "This task can CREATE, ROTATE, or REVOKE"
          echo "Apple Developer ID signing material."
          echo ""
          echo "Set R26D_SIGNING_ADMIN_CONFIRM=yes to proceed."
          exit 1
        fi
        : "${MATCH_PASSWORD:?MATCH_PASSWORD is required}"
        : "${MATCH_GIT_URL:?MATCH_GIT_URL is required}"
        : "${FASTLANE_TEAM_ID:?FASTLANE_TEAM_ID is required}"
        bundle exec fastlane match_admin

  keychain:create:
    desc: Create and unlock temporary signing keychain
    cmds:
      - |
        set -euo pipefail
        mkdir -p "{{.STATE_DIR}}"

        KEYCHAIN_PASSWORD="$(openssl rand -base64 32)"
        printf '%s' "$KEYCHAIN_PASSWORD" > "{{.STATE_DIR}}/keychain-password"
        printf '%s' "{{.KEYCHAIN_NAME}}" > "{{.STATE_DIR}}/keychain-name"

        security create-keychain -p "$KEYCHAIN_PASSWORD" "{{.KEYCHAIN_NAME}}"
        security set-keychain-settings -lut 21600 "{{.KEYCHAIN_NAME}}"
        security unlock-keychain -p "$KEYCHAIN_PASSWORD" "{{.KEYCHAIN_NAME}}"

        # Add temporary keychain to search list while preserving existing keychains
        security list-keychains -d user -s "{{.KEYCHAIN_NAME}}" $(security list-keychains -d user | sed s/\"//g)

        echo "Temporary keychain created: {{.KEYCHAIN_NAME}}"
    status:
      - test -f "{{.STATE_DIR}}/keychain-name"

  keychain:configure:
    desc: Configure temporary keychain for non-interactive codesign access
    cmds:
      - |
        set -euo pipefail
        KEYCHAIN_PASSWORD="$(cat "{{.STATE_DIR}}/keychain-password")"
        # Allow codesign to access keys without UI prompt
        security set-key-partition-list \
          -S apple-tool:,apple:,codesign: \
          -s \
          -k "$KEYCHAIN_PASSWORD" \
          "{{.KEYCHAIN_NAME}}"
        echo "Keychain configured for non-interactive codesign."

  keychain:delete:
    desc: Delete temporary signing keychain created by this repo
    cmds:
      - |
        set -euo pipefail
        if [ ! -f "{{.STATE_DIR}}/keychain-name" ]; then
          echo "No signing keychain state found. Nothing to clean up."
          exit 0
        fi

        KEYCHAIN_NAME="$(cat "{{.STATE_DIR}}/keychain-name")"

        # Safety check: only delete keychains we created
        case "$KEYCHAIN_NAME" in
          *r26d-release-signing*)
            security delete-keychain "$KEYCHAIN_NAME" 2>/dev/null || true
            rm -rf "{{.STATE_DIR}}"
            echo "Temporary keychain deleted: $KEYCHAIN_NAME"
            ;;
          *)
            echo "REFUSING to delete unexpected keychain: $KEYCHAIN_NAME"
            exit 1
            ;;
        esac

  prepare:
    desc: Prepare macOS signing environment (keychain + readonly Match)
    cmds:
      - task: doctor
      - task: keychain:create
      - task: match:readonly
      - task: keychain:configure
      - task: identity:list

  cleanup:
    desc: Clean up temporary macOS signing environment
    cmds:
      - task: keychain:delete

  identity:list:
    desc: List available codesigning identities
    cmds:
      - security find-identity -v -p codesigning

  verify:
    desc: Verify macOS signing identity and notarization tooling
    cmds:
      - task: doctor
      - |
        set -euo pipefail
        echo ""
        echo "=== Signing Identities ==="
        security find-identity -v -p codesigning
        echo ""
        echo "=== Notarytool ==="
        xcrun notarytool --help >/dev/null 2>&1 && echo "OK: notarytool available"
        echo ""
        echo "=== Xcode Version ==="
        xcodebuild -version 2>/dev/null || echo "(xcodebuild not available — CLI tools only)"

  verify-artifact:
    desc: Verify a signed macOS artifact (pass ARTIFACT_PATH)
    cmds:
      - |
        set -euo pipefail
        ARTIFACT="${ARTIFACT_PATH:?Set ARTIFACT_PATH to the file or .app bundle to verify}"

        if [ ! -e "$ARTIFACT" ]; then
          echo "File not found: $ARTIFACT"
          exit 1
        fi

        echo "=== Verifying: $ARTIFACT ==="
        echo ""

        echo "--- codesign --verify ---"
        codesign --verify --deep --strict --verbose=2 "$ARTIFACT" 2>&1 || echo "(verification failed or not applicable)"
        echo ""

        echo "--- codesign -dv ---"
        codesign -dv --verbose=4 "$ARTIFACT" 2>&1 || echo "(display failed or not applicable)"
        echo ""

        echo "--- spctl --assess ---"
        spctl --assess --type execute --verbose "$ARTIFACT" 2>&1 || echo "(assessment failed or not applicable)"
```

Key design notes:
- `prepare` uses `cmds` with sequential `task:` calls (not `deps`) because keychain must be created before Match runs, and partition list must be set after Match imports certs.
- `keychain:create` has a `status` check so it's idempotent — won't recreate if state already exists.
- `match:readonly` reads the keychain password from state and passes it via env so Fastlane installs into the temporary keychain.
- `verify-artifact` replaces the planned `bin/verify-signature` script as a task.

- [ ] **Step 2: Commit**

```bash
git add apple/Taskfile.yml
git commit -m "feat(apple): add Taskfile with signing, keychain, and Match tasks"
```

---

### Task 8: Update root Taskfile.yml

**Files:**
- Modify: `Taskfile.yml` (add includes and delegating tasks)

- [ ] **Step 1: Add apple and windows includes and signing tasks**

Add the `includes` block and signing delegation tasks to the existing `Taskfile.yml`. Keep all existing tasks intact.

Add at the top, after `version: '3'`:

```yaml
includes:
  apple:
    taskfile: ./apple/Taskfile.yml
    dir: ./apple
    optional: true
  windows:
    taskfile: ./windows/Taskfile.yml
    dir: ./windows
    optional: true
```

Add these tasks alongside the existing ones:

```yaml
  default:
    desc: Show available release-signing tasks
    cmds:
      - task --list

  verify:
    desc: Verify release-signing tooling for the current platform
    cmds:
      - task apple:verify

  prepare-macos:
    desc: Prepare temporary macOS signing environment
    cmds:
      - task apple:prepare

  cleanup-macos:
    desc: Clean up temporary macOS signing environment
    cmds:
      - task apple:cleanup
```

The `optional: true` on includes means the root Taskfile still works on machines without the apple/ or windows/ directories present, which is useful during development.

- [ ] **Step 2: Verify existing tasks still work**

Run: `task --list`
Expected: all existing bootstrap and encrypt-files tasks plus new default, verify, prepare-macos, cleanup-macos tasks visible.

- [ ] **Step 3: Commit**

```bash
git add Taskfile.yml
git commit -m "feat: add signing task delegation to root Taskfile"
```

---

### Task 9: Create apple/README.md

**Files:**
- Create: `apple/README.md`

- [ ] **Step 1: Write apple/README.md**

```markdown
# Apple Signing

macOS code signing for R26D applications using Fastlane Match.

## How It Works

1. **`task apple:prepare`** creates a temporary keychain, fetches the Developer ID signing identity from the Match secrets repo (readonly), and configures the keychain for non-interactive `codesign` access.
2. Your app repo runs its build (e.g. `pnpm tauri build`). The signing identity is available in the temporary keychain.
3. **`task apple:cleanup`** deletes the temporary keychain and removes state files.

## Architecture

- **This repo** (`r26d-release-signing`) owns the Taskfile interface, Fastlane config, keychain lifecycle, and documentation.
- **A separate repo** (e.g. `r26d-apple-match-secrets`) stores the encrypted certificates and profiles managed by `fastlane match`.
- **App repos** own their build process, bundle ID, entitlements, and Tauri/Electron/framework config.

## Required Environment Variables

```bash
export MATCH_PASSWORD="..."        # Passphrase for Match encrypted storage
export MATCH_GIT_URL="..."         # Git URL of Match secrets repo
export FASTLANE_TEAM_ID="..."      # Apple Developer Team ID
```

## Tasks

```bash
task apple:doctor            # Check prerequisites
task apple:prepare           # Full signing setup (keychain + Match + configure)
task apple:cleanup           # Delete temporary keychain
task apple:verify            # Verify signing identity and tools
task apple:match:readonly    # Fetch signing identity only
task apple:match:admin       # Admin: create/rotate (requires R26D_SIGNING_ADMIN_CONFIRM=yes)
task apple:identity:list     # List codesigning identities
task apple:verify-artifact   # Verify a signed .app (ARTIFACT_PATH=...)
```

## Documentation

- [App Integration](docs/app-integration.md)
- [Signing Machine Setup](docs/setup-mac-signing-machine.md)
- [Certificate Rotation](docs/rotating-apple-certs.md)
```

- [ ] **Step 2: Commit**

```bash
git add apple/README.md
git commit -m "docs(apple): add README with architecture and task reference"
```

---

### Task 10: Create windows/README.md and windows/Taskfile.yml

**Files:**
- Create: `windows/README.md`
- Create: `windows/Taskfile.yml`

- [ ] **Step 1: Write windows/README.md**

```markdown
# Windows Signing

Windows code signing for R26D applications.

## Status

**Not yet implemented.** This directory is a placeholder for future Windows signing support.

## Future Direction

Likely options include:

- **Azure Trusted Signing** — cloud-based, no local certificate management
- **DigiCert KeyLocker** — cloud HSM-backed code signing
- **SignPath** — CI-integrated signing service
- **signtool** with a managed certificate — traditional approach

## Important

Do not copy Windows `.pfx` files or signing certificates into application repos. When Windows signing is implemented, it should follow the same theory as macOS: signing is a company capability, not an app dependency.

See [THEORY.md](../THEORY.md) for the design philosophy.
```

- [ ] **Step 2: Write windows/Taskfile.yml**

```yaml
version: "3"

tasks:
  default:
    desc: "Windows signing (not yet implemented)"
    cmds:
      - |
        echo "Windows signing is not yet implemented."
        echo "See windows/README.md for future direction."
        exit 1
```

- [ ] **Step 3: Commit**

```bash
git add windows/README.md windows/Taskfile.yml
git commit -m "docs(windows): add placeholder README and Taskfile"
```

---

### Task 11: Create apple/docs/app-integration.md

**Files:**
- Create: `apple/docs/app-integration.md`

- [ ] **Step 1: Write app-integration.md**

```markdown
# App Integration Guide

How to use `r26d-release-signing` from an application repository.

## Quick Version

```bash
# 1. Prepare signing (in this repo)
cd /path/to/r26d-release-signing
task apple:prepare

# 2. Build your app (in your app repo)
cd /path/to/my-app
pnpm tauri build

# 3. Clean up (in this repo)
cd /path/to/r26d-release-signing
task apple:cleanup
```

## Using `task -d` From Your App Repo

You can call tasks without changing directories:

```bash
task -d /path/to/r26d-release-signing apple:prepare
pnpm tauri build
task -d /path/to/r26d-release-signing apple:cleanup
```

## Adding a Signed Build Task to Your App

In your app's `Taskfile.yml`:

```yaml
version: "3"

vars:
  SIGNING_REPO: '{{.R26D_SIGNING_REPO | default "../r26d-release-signing"}}'

tasks:
  build:macos:signed:
    desc: Build signed macOS app
    cmds:
      - task -d "{{.SIGNING_REPO}}" apple:prepare
      - pnpm tauri build
      - task -d "{{.SIGNING_REPO}}" apple:cleanup
```

## What Your App Repo Owns

Your application repository is responsible for:

- **Bundle identifier** (`com.r26d.your-app`)
- **Entitlements** (hardened runtime, sandbox, etc.)
- **Framework config** (Tauri's `tauri.conf.json`, Electron's `forge.config.ts`, etc.)
- **App-specific release process** (versioning, changelogs, distribution)
- **Notarization credentials** if they are app-specific

## What This Signing Repo Owns

- Fastlane Match access to the company Developer ID certificate
- Temporary keychain creation and cleanup
- The task interface for signing preparation
- Documentation for signing machine setup and cert rotation

## Environment Variables

Your signing machine (or CI environment) needs these set before `task apple:prepare`:

```bash
export MATCH_PASSWORD="..."        # Match encryption passphrase
export MATCH_GIT_URL="..."         # Git URL of Match secrets repo
export FASTLANE_TEAM_ID="..."      # Apple Developer Team ID
```

These are company-level secrets, not app-level secrets. They should be configured on the signing machine, not stored in your app repo.

## Tauri-Specific Notes

Tauri reads `APPLE_SIGNING_IDENTITY` to select the signing certificate. After `task apple:prepare`, the Developer ID certificate is in the temporary keychain. Tauri should find it automatically if only one Developer ID identity is present.

If you need to be explicit:

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: R26D LLC (TEAM_ID)"
```

For notarization, Tauri uses `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), and `APPLE_TEAM_ID`. These are typically app-level concerns and should be configured in your app repo's environment, not here.

## Verifying a Signed Build

After building:

```bash
task -d /path/to/r26d-release-signing apple:verify-artifact ARTIFACT_PATH=/path/to/YourApp.app
```
```

- [ ] **Step 2: Commit**

```bash
git add apple/docs/app-integration.md
git commit -m "docs(apple): add app integration guide"
```

---

### Task 12: Create apple/docs/setup-mac-signing-machine.md

**Files:**
- Create: `apple/docs/setup-mac-signing-machine.md`

- [ ] **Step 1: Write setup-mac-signing-machine.md**

```markdown
# Setting Up a Mac Signing Machine

How to configure a Mac to sign R26D builds, including over SSH.

## Prerequisites

A Mac (physical or VM) with:
- macOS 13 Ventura or later (for notarytool)
- An admin user account
- SSH access enabled (System Settings → General → Sharing → Remote Login)
- Network access to the Match secrets repo

## Step 1: Install Xcode Command Line Tools

```bash
xcode-select --install
```

Accept the license:

```bash
sudo xcodebuild -license accept
```

## Step 2: Install Ruby and Bundler

If using the project's `.tool-versions` with asdf:

```bash
# Install asdf (if not present)
# See: https://asdf-vm.com/guide/getting-started.html

asdf plugin add ruby
asdf install ruby 3.3.0
```

Or use the system Ruby if >= 3.0. Then install Bundler:

```bash
gem install bundler
```

## Step 3: Install Taskfile

```bash
# Via asdf (matches .tool-versions)
asdf plugin add task
asdf install task 3.44.1

# Or via Homebrew
brew install go-task
```

## Step 4: Clone This Repo

```bash
git clone <this-repo-url> ~/r26d-release-signing
cd ~/r26d-release-signing
```

## Step 5: Configure Environment Variables

Add to `~/.zshrc` or `~/.bash_profile` (or use a secrets manager):

```bash
export MATCH_PASSWORD="..."
export MATCH_GIT_URL="git@github.com:r26d/r26d-apple-match-secrets.git"
export FASTLANE_TEAM_ID="..."
```

For SSH sessions, make sure these are loaded. If using `~/.zshrc`, SSH sessions on macOS should pick them up automatically.

## Step 6: Verify Setup

```bash
cd ~/r26d-release-signing
task apple:doctor
```

This checks for ruby, bundler, security, codesign, and notarytool.

## Step 7: Test the Full Flow

```bash
task apple:prepare
# Should: create keychain, fetch signing identity, configure codesign access
# Should: print available signing identities

task apple:cleanup
# Should: delete temporary keychain
```

## SSH Signing Workflow

From a remote machine:

```bash
ssh signing-mac "cd ~/r26d-release-signing && task apple:prepare"
ssh signing-mac "cd ~/my-app && pnpm tauri build"
ssh signing-mac "cd ~/r26d-release-signing && task apple:cleanup"
```

Or as a single command:

```bash
ssh signing-mac 'cd ~/r26d-release-signing && task apple:prepare && cd ~/my-app && pnpm tauri build && cd ~/r26d-release-signing && task apple:cleanup'
```

## Troubleshooting

### "security: SecKeychainCreate: The specified keychain already exists."

The temporary keychain wasn't cleaned up from a previous run. Clean up first:

```bash
task apple:cleanup
```

### "errSecInternalComponent" during codesign

The keychain partition list wasn't configured for non-interactive access. This happens if `prepare` was interrupted between keychain creation and configuration. Clean up and re-run:

```bash
task apple:cleanup
task apple:prepare
```

### SSH sessions can't find signing identity

Make sure environment variables are loaded in non-interactive shells. Add exports to `~/.zshenv` (not just `~/.zshrc`) if needed.

### "No signing identity found"

Match may not have fetched correctly. Check:

```bash
task apple:identity:list
```

If empty, verify `MATCH_GIT_URL` points to the correct secrets repo and `MATCH_PASSWORD` is correct.
```

- [ ] **Step 2: Commit**

```bash
git add apple/docs/setup-mac-signing-machine.md
git commit -m "docs(apple): add signing machine setup guide"
```

---

### Task 13: Create apple/docs/rotating-apple-certs.md

**Files:**
- Create: `apple/docs/rotating-apple-certs.md`

- [ ] **Step 1: Write rotating-apple-certs.md**

```markdown
# Rotating Apple Certificates

Guide for creating, rotating, or revoking Apple Developer ID signing certificates managed by Fastlane Match.

## Who Can Rotate

Only people with:
- Admin access to the R26D Apple Developer account
- Write access to the Match secrets repo (`r26d-apple-match-secrets`)
- The `MATCH_PASSWORD` encryption passphrase

This should be a small, intentional group.

## When to Rotate

- Certificate is expiring (Developer ID certs last 5 years)
- Certificate is compromised or suspected compromised
- Team membership changes require a new certificate
- Apple revokes the certificate

## Pre-Rotation Checklist

- [ ] Confirm no active release builds are in progress
- [ ] Notify team members who use signing
- [ ] Identify all build machines that need updating
- [ ] Back up current Match repo state (git tag or branch)
- [ ] Verify you have admin access to Apple Developer portal

## Running the Admin Match Lane

```bash
cd /path/to/r26d-release-signing
R26D_SIGNING_ADMIN_CONFIRM=yes task apple:match:admin
```

This will:
1. Connect to the Apple Developer portal
2. Create or rotate the Developer ID certificate
3. Encrypt and push the new certificate to the Match secrets repo

You will need to authenticate with Apple (possibly with 2FA).

## After Rotation

### Update Build Machines

On each signing machine:

```bash
cd ~/r26d-release-signing
task apple:cleanup            # Remove old keychain
task apple:prepare            # Fetch new certificate
task apple:identity:list      # Verify new identity
```

### Verify New Certificate

```bash
# Check the new identity is available
task apple:identity:list

# Build and sign a test artifact
cd ~/some-test-app
pnpm tauri build

# Verify the signature
task -d ~/r26d-release-signing apple:verify-artifact ARTIFACT_PATH=./target/release/bundle/macos/TestApp.app
```

### Verify Old Releases Still Work

Previously signed and notarized applications are not affected by certificate rotation. They were signed with the old certificate at build time and Apple's notarization ticket is independent of the signing certificate's current status.

However, if the old certificate is **revoked** (not just expired), macOS may reject previously signed apps that haven't been notarized. Notarized apps are unaffected by revocation.

## Emergency Revocation

If the signing certificate is compromised:

1. Revoke the certificate in the Apple Developer portal immediately
2. Run `R26D_SIGNING_ADMIN_CONFIRM=yes task apple:match:admin` to create a new one
3. Update all build machines
4. Re-sign and re-notarize any releases that were signed with the compromised certificate but not yet distributed

## Troubleshooting

### "Could not create a new Developer ID Application certificate"

Apple limits the number of active Developer ID certificates. You may need to revoke an old one first in the Apple Developer portal.

### "The certificate has an invalid issuer"

The Apple intermediate certificate may have changed. Run:

```bash
xcode-select --install
```

to update the certificate chain.
```

- [ ] **Step 2: Commit**

```bash
git add apple/docs/rotating-apple-certs.md
git commit -m "docs(apple): add certificate rotation guide"
```

---

### Task 14: Verify and finalize

- [ ] **Step 1: Run `task --list` from root**

```bash
task --list
```

Expected: all existing bootstrap/encrypt-files tasks plus new default, verify, prepare-macos, cleanup-macos, and all apple:* tasks visible.

- [ ] **Step 2: Verify directory structure**

```bash
find . -not -path './.git/*' -not -path './.cursor/*' -not -path './.skills/*' -not -path './.proggy/*' -type f | grep -E '(apple|windows|README|THEORY|Taskfile|Gemfile|Matchfile|Fastfile|\.gitignore)' | sort
```

Expected:
```
./.gitignore
./apple/docs/app-integration.md
./apple/docs/rotating-apple-certs.md
./apple/docs/setup-mac-signing-machine.md
./apple/fastlane/Fastfile
./apple/Gemfile
./apple/Matchfile
./apple/README.md
./apple/Taskfile.yml
./README.md
./Taskfile.yml
./THEORY.md
./windows/README.md
./windows/Taskfile.yml
```

- [ ] **Step 3: Verify no secrets committed**

```bash
git diff --cached --name-only | grep -iE '\.(p12|cer|key|mobileprovision|provisionprofile|keychain|keychain-db)$'
```

Expected: no output (no secrets staged).

- [ ] **Step 4: Note for the user**

The actual signing flow (`task apple:prepare` → build → `task apple:cleanup`) must be tested on a macOS machine with:
- Xcode command line tools installed
- Environment variables configured (`MATCH_PASSWORD`, `MATCH_GIT_URL`, `FASTLANE_TEAM_ID`)
- Network access to the Match secrets repo

The `Gemfile.lock` will be created on first `bundle install` on macOS and should be committed at that time.

---

## Acceptance Criteria Cross-Check

| # | Criterion | Task |
|---|---|---|
| 1 | `Taskfile.yml` is the primary interface | Task 7, 8 |
| 2 | Root tasks delegate to `apple/Taskfile.yml` | Task 8 |
| 3 | Apple signing tasks discoverable with `task --list` | Task 7, 14 |
| 4 | Normal usage is `task apple:prepare` / `task apple:cleanup` | Task 7 |
| 5 | Admin Match guarded by `R26D_SIGNING_ADMIN_CONFIRM=yes` | Task 7 |
| 6 | Ruby/Fastlane isolated under `apple/` | Task 4, 5, 6 |
| 7 | App repos don't need Ruby/Fastlane config | Task 11 |
| 8 | No unencrypted signing secrets committed | Task 1, 14 |
| 9 | Docs show Taskfile-based usage | Task 9, 11, 12, 13 |
| 10 | Windows has placeholder Taskfile | Task 10 |
