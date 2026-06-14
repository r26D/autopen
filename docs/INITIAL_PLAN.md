You are helping me create a new private repo called `r26d-release-signing`.

## Context

I build several desktop applications that target Linux and macOS, and may later target Windows. On macOS, apps must be signed with R26D’s Apple Developer certificate. The Apple signing identity is company-scoped, not app-scoped, so it should not live inside individual application repos.

I have used `fastlane match` before and want this repo to follow that model. I do **not** want to use Docker for this. Ruby/Fastlane can live in this repo, but the application repos should not need to own Ruby configuration or signing secrets.

This repo should become the shared release-signing toolkit for R26D apps.

## Goal

Set up the initial repo structure, scripts, and documentation for managing macOS signing through Fastlane Match, temporary keychains, and app-level signing workflows.

The result should make it easy for an app repo to do something like:

```bash
../r26d-release-signing/apple/bin/prepare-macos-signing
pnpm tauri build
../r26d-release-signing/apple/bin/cleanup-macos-signing
```

or later:

```bash
../r26d-release-signing/bin/sign-macos ./path/to/app-or-artifact
```

## Important constraints

* Do not store unencrypted certificates in this repo.
* Do not store app-specific secrets here unless they are truly shared release infrastructure.
* Assume this repo is private.
* Prefer readonly Match usage for normal signing/build workflows.
* Any command that can create, rotate, or revoke signing credentials should be clearly separated from normal build usage.
* Signing should use a temporary keychain where practical.
* Scripts should be defensive, readable, and safe to run repeatedly.
* Avoid clever abstractions. Make the workflow obvious.
* The first target is macOS signing. Leave room for Windows signing later, but do not implement Windows yet.
* Do not introduce Docker.

## Proposed repo structure

Create something close to this:

```text
r26d-release-signing/
  README.md
  THEORY.md
  .gitignore

  apple/
    README.md
    Gemfile
    Matchfile
    fastlane/
      Fastfile
    bin/
      prepare-macos-signing
      cleanup-macos-signing
      verify-macos-signing
      match-readonly
      match-admin
    docs/
      setup-mac-signing-machine.md
      rotating-apple-certs.md
      app-integration.md

  windows/
    README.md

  bin/
    sign-macos
    verify-signature
```

## What each piece should do

### Root `README.md`

Explain:

* This repo owns company-level release signing workflows.
* App repos should not store company signing certs.
* macOS signing currently uses Fastlane Match.
* Normal usage should be readonly.
* Admin/rotation usage is intentionally separate.
* Windows signing is planned but not implemented yet.

### `THEORY.md`

Write a short theory document explaining the design philosophy:

* Signing is a company capability, not an app dependency.
* App repos own build configuration, bundle IDs, entitlements, and release commands.
* This repo owns shared signing material access and signing workflow conventions.
* The main risk is blast radius: avoid copying the company signing identity into every app repo.
* The signing machine should get access only when it needs to sign.
* Temporary keychains reduce residue on developer/build machines.
* The interface should be scriptable over SSH.

### `apple/Gemfile`

Set up Fastlane through Bundler.

Use a normal conservative Fastlane setup. Do not pin to a random ancient version unless there is a strong reason. If pinning is needed, explain why in a comment.

### `apple/Matchfile`

Create a template Matchfile for Apple Developer ID signing.

It should include placeholders for:

* Git URL for the Match storage repo or this repo’s encrypted signing storage, depending on the cleanest Match setup.
* Team ID
* Apple ID / username if needed
* `type("developer_id")`
* readonly default behavior

Use environment variables where appropriate, such as:

```bash
MATCH_GIT_URL
FASTLANE_TEAM_ID
FASTLANE_USER
MATCH_PASSWORD
```

Do not hardcode real credentials.

### `apple/fastlane/Fastfile`

Create lanes for:

```ruby
match_readonly
match_admin
prepare_macos_signing
verify_macos_signing
```

Keep them simple.

Normal workflows should use readonly Match.

Admin workflows may allow non-readonly behavior but should be clearly named and documented.

### `apple/bin/match-readonly`

Wrapper script that:

* Runs from the `apple/` directory
* Checks required environment variables
* Runs Bundler/Fastlane
* Calls the readonly match lane
* Exits clearly if prerequisites are missing

### `apple/bin/match-admin`

Wrapper script for intentional admin usage.

It should:

* Warn loudly that this may modify signing state
* Require an explicit confirmation environment variable, such as:

```bash
R26D_SIGNING_ADMIN_CONFIRM=yes
```

* Refuse to run otherwise

### `apple/bin/prepare-macos-signing`

This is the main script app repos will call.

It should:

* Verify it is running on macOS
* Verify required tools exist:

  * `ruby`
  * `bundle`
  * `security`
  * `codesign`
  * `xcrun`
* Ensure Fastlane gems are installed with Bundler if needed
* Create or select a temporary keychain for signing
* Run readonly Match
* Make sure the signing identity is available
* Print the identity discovered by `security find-identity -v -p codesigning`
* Avoid printing secret values
* Write any temporary state needed for cleanup into a safe local state directory, probably under:

```bash
.apple-signing-state/
```

or:

```bash
tmp/apple-signing/
```

Do not commit that state.

### `apple/bin/cleanup-macos-signing`

This should:

* Delete the temporary keychain created by `prepare-macos-signing`, if present
* Remove temporary state files
* Avoid failing noisily if there is nothing to clean up
* Never delete the user’s normal login keychain
* Never delete anything unless it can verify it created it

### `apple/bin/verify-macos-signing`

This should:

* Confirm a Developer ID Application signing identity is available
* Confirm `notarytool` is available via `xcrun notarytool`
* Print enough diagnostic info to debug signing setup
* Not print secrets

### `bin/sign-macos`

For now, create a placeholder script with a clear message.

It should explain that app-specific signing is usually handled by the app framework, such as Tauri, after `prepare-macos-signing` has installed the signing identity.

Later this script can become a generic wrapper for signing standalone artifacts.

### `bin/verify-signature`

Create a useful initial version that can inspect a macOS artifact.

It should accept a path and run appropriate checks where possible, such as:

```bash
codesign --verify --deep --strict --verbose=2 <path>
codesign -dv --verbose=4 <path>
spctl --assess --type execute --verbose <path>
```

It should be safe if some commands do not apply to the artifact type.

### `apple/docs/setup-mac-signing-machine.md`

Document how to set up a Mac that can sign builds over SSH.

Include:

* Install Xcode command line tools
* Install Ruby/Bundler if missing
* Clone `r26d-release-signing`
* Configure required env vars
* Run `apple/bin/verify-macos-signing`
* Run `apple/bin/prepare-macos-signing`
* Run app build
* Run cleanup

### `apple/docs/app-integration.md`

Document how an app repo should integrate with this repo.

Show an example for a Tauri app:

```bash
/path/to/r26d-release-signing/apple/bin/prepare-macos-signing
pnpm tauri build
/path/to/r26d-release-signing/apple/bin/cleanup-macos-signing
```

Explain that the app repo still owns:

* Bundle identifier
* Entitlements
* Tauri config
* App-specific release process
* Notarization credentials, if they are app-specific

But this signing repo owns:

* Match access
* Certificate/keychain preparation
* Shared signing workflow

### `apple/docs/rotating-apple-certs.md`

Write the first version of a rotation guide.

Include:

* Who is allowed to rotate certs
* How to run admin Match lane
* How to update affected build machines
* How to verify old/new cert behavior
* How to avoid breaking active releases
* A checklist for rotation

### `windows/README.md`

Create a placeholder that explains:

* Windows signing is intentionally not implemented yet.
* Future likely options include Azure Trusted Signing, DigiCert KeyLocker, SignPath, or signtool with a managed certificate.
* Do not copy Windows `.pfx` files into app repos.

## Environment variables

Document expected env vars, including:

```bash
MATCH_PASSWORD
MATCH_GIT_URL
FASTLANE_USER
FASTLANE_TEAM_ID
APPLE_TEAM_ID
```

If some names are redundant, pick a clean canonical set and explain it.

Also consider variables for temporary keychain behavior:

```bash
R26D_SIGNING_KEYCHAIN_NAME
R26D_SIGNING_STATE_DIR
```

## Security requirements

Add `.gitignore` rules for:

```text
*.p12
*.cer
*.key
*.mobileprovision
*.provisionprofile
*.keychain
*.keychain-db
.env
.env.*
tmp/
.apple-signing-state/
```

But be careful not to ignore files that Fastlane Match intentionally expects to track if this repo is also used as the encrypted Match storage repo. If there is a tension there, explain the tradeoff and choose the safer structure.

## Acceptance criteria

When complete:

1. The repo has a clear root README.
2. The repo explains why signing is separated from app repos.
3. macOS signing setup is isolated under `apple/`.
4. Fastlane is configured through Bundler.
5. Match has readonly and admin flows.
6. Temporary keychain setup and cleanup scripts exist.
7. Scripts check prerequisites and fail clearly.
8. App repos can call the signing scripts without owning Ruby/Fastlane config.
9. No unencrypted signing secrets are committed.
10. Windows signing has a placeholder with future direction.
11. Documentation explains how to use this over SSH on a Mac signing machine.

## Implementation style

* Prefer Bash for scripts.
* Use `set -euo pipefail`.
* Quote variables.
* Use clear function names.
* Add comments where the Apple signing behavior is non-obvious.
* Do not over-engineer.
* Do not make this depend on Docker.
* Do not assume this repo already contains real signing credentials.

Build the initial repo now.

A small implementation note: I’d keep the Match encrypted storage repo separate from this r26d-release-signing toolkit repo unless you have a reason to combine them. So the cleanest split is usually:

r26d-release-signing        # scripts, docs, Fastlane wrapper
r26d-apple-match-secrets    # encrypted match cert/profile storage

That way app developers can read/use the signing tooling without necessarily having access to the encrypted certificate store.

Update the `r26d-release-signing` repo plan to use [Taskfile](https://taskfile.dev/) as the primary task management interface instead of many standalone scripts.

## Change in direction

We prefer `task` over a directory full of shell scripts because it is easier to inspect, discover, and run.

So the repo should expose workflows through `Taskfile.yml` files.

Shell scripts are allowed only when they meaningfully simplify implementation, but they should not be the main user interface.

## Updated repo structure

Use something close to this:

```text
r26d-release-signing/
  README.md
  THEORY.md
  .gitignore
  Taskfile.yml

  apple/
    README.md
    Gemfile
    Matchfile
    Taskfile.yml
    fastlane/
      Fastfile
    docs/
      setup-mac-signing-machine.md
      rotating-apple-certs.md
      app-integration.md

  windows/
    README.md
    Taskfile.yml
```

Avoid creating lots of files under `bin/` unless there is a clear reason.

## Root Taskfile

Create a root `Taskfile.yml` that delegates to platform-specific Taskfiles.

It should include tasks like:

```yaml
version: "3"

includes:
  apple:
    taskfile: ./apple/Taskfile.yml
    dir: ./apple
  windows:
    taskfile: ./windows/Taskfile.yml
    dir: ./windows

tasks:
  default:
    desc: Show available release-signing tasks
    cmds:
      - task --list

  verify:
    desc: Verify release-signing tooling for the current machine
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

## Apple Taskfile

Create `apple/Taskfile.yml` as the main interface for macOS signing.

It should include tasks like:

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
        test "$(uname)" = "Darwin" || { echo "This task must run on macOS."; exit 1; }
        command -v ruby >/dev/null || { echo "Missing ruby"; exit 1; }
        command -v bundle >/dev/null || { echo "Missing bundler"; exit 1; }
        command -v security >/dev/null || { echo "Missing security"; exit 1; }
        command -v codesign >/dev/null || { echo "Missing codesign"; exit 1; }
        xcrun --find notarytool >/dev/null || { echo "Missing notarytool"; exit 1; }

  bundle:
    desc: Install Fastlane dependencies with Bundler
    cmds:
      - bundle check || bundle install

  match:readonly:
    desc: Fetch Apple Developer ID signing identity using Fastlane Match readonly mode
    deps:
      - bundle
    cmds:
      - |
        set -euo pipefail
        : "${MATCH_PASSWORD:?MATCH_PASSWORD is required}"
        : "${MATCH_GIT_URL:?MATCH_GIT_URL is required}"
        : "${FASTLANE_TEAM_ID:?FASTLANE_TEAM_ID is required}"
        bundle exec fastlane match_readonly

  match:admin:
    desc: Admin-only Match workflow for creating/rotating signing material
    deps:
      - bundle
    cmds:
      - |
        set -euo pipefail
        test "${R26D_SIGNING_ADMIN_CONFIRM:-}" = "yes" || {
          echo "Refusing to run admin signing task."
          echo "Set R26D_SIGNING_ADMIN_CONFIRM=yes if you really intend to modify signing state."
          exit 1
        }
        bundle exec fastlane match_admin

  keychain:create:
    desc: Create and unlock temporary signing keychain
    cmds:
      - |
        set -euo pipefail
        mkdir -p "{{.STATE_DIR}}"

        KEYCHAIN_PASSWORD="$(openssl rand -base64 32)"
        echo "$KEYCHAIN_PASSWORD" > "{{.STATE_DIR}}/keychain-password"
        echo "{{.KEYCHAIN_NAME}}" > "{{.STATE_DIR}}/keychain-name"

        security create-keychain -p "$KEYCHAIN_PASSWORD" "{{.KEYCHAIN_NAME}}"
        security set-keychain-settings -lut 21600 "{{.KEYCHAIN_NAME}}"
        security unlock-keychain -p "$KEYCHAIN_PASSWORD" "{{.KEYCHAIN_NAME}}"

        security list-keychains -d user -s "{{.KEYCHAIN_NAME}}" $(security list-keychains -d user | sed s/\"//g)

  keychain:configure:
    desc: Configure temporary keychain for non-interactive codesign access
    cmds:
      - |
        set -euo pipefail
        KEYCHAIN_PASSWORD="$(cat "{{.STATE_DIR}}/keychain-password")"
        security set-key-partition-list \
          -S apple-tool:,apple:,codesign: \
          -s \
          -k "$KEYCHAIN_PASSWORD" \
          "{{.KEYCHAIN_NAME}}"

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

        case "$KEYCHAIN_NAME" in
          *r26d-release-signing*)
            security delete-keychain "$KEYCHAIN_NAME" || true
            rm -rf "{{.STATE_DIR}}"
            ;;
          *)
            echo "Refusing to delete unexpected keychain: $KEYCHAIN_NAME"
            exit 1
            ;;
        esac

  prepare:
    desc: Prepare macOS signing environment using temporary keychain and readonly Match
    deps:
      - doctor
      - keychain:create
      - match:readonly
      - keychain:configure
    cmds:
      - task apple:identity:list

  cleanup:
    desc: Clean up temporary macOS signing environment
    cmds:
      - task apple:keychain:delete

  identity:list:
    desc: List available code signing identities
    cmds:
      - security find-identity -v -p codesigning

  verify:
    desc: Verify macOS signing identity and notarization tooling
    deps:
      - doctor
    cmds:
      - security find-identity -v -p codesigning
      - xcrun notarytool --help >/dev/null
```

Adjust task names as needed, but preserve this style:

```bash
task apple:doctor
task apple:prepare
task apple:cleanup
task apple:match:readonly
task apple:match:admin
task apple:identity:list
```

## Fastlane integration

Keep Fastlane lanes simple.

The Taskfile should be the main interface. Fastlane should do the Apple-specific Match work.

Example `Fastfile` lanes:

```ruby
default_platform(:mac)

platform :mac do
  desc "Fetch Developer ID signing identity in readonly mode"
  lane :match_readonly do
    match(
      type: "developer_id",
      readonly: true,
      git_url: ENV.fetch("MATCH_GIT_URL")
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

## Documentation changes

Update the docs so app repos call Taskfile tasks instead of shell scripts.

Example app usage:

```bash
cd /path/to/r26d-release-signing
task apple:prepare

cd /path/to/my-tauri-app
pnpm tauri build

cd /path/to/r26d-release-signing
task apple:cleanup
```

Or as a single app-level task:

```yaml
tasks:
  build:macos:signed:
    desc: Build signed macOS app
    cmds:
      - task -d ../r26d-release-signing apple:prepare
      - pnpm tauri build
      - task -d ../r26d-release-signing apple:cleanup
```

Prefer app repos depending on the public task interface, not on internal scripts.

## Acceptance criteria update

When complete:

1. `Taskfile.yml` is the primary interface.
2. Root tasks delegate to `apple/Taskfile.yml`.
3. Apple signing tasks are discoverable with `task --list`.
4. Normal build usage is `task apple:prepare` and `task apple:cleanup`.
5. Admin Match usage is guarded by `R26D_SIGNING_ADMIN_CONFIRM=yes`.
6. Ruby/Fastlane are isolated under `apple/`.
7. App repos do not need to own Ruby/Fastlane config.
8. No unencrypted signing secrets are committed.
9. The docs show Taskfile-based usage.
10. Windows has a placeholder Taskfile for future signing workflows.

Implement this now.

