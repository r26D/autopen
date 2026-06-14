# Signing Repo Split Analysis

Analysis of `r26d-release-signing` for the vault/autopen split.

## Current Signing Flows

### macOS Code Signing (Apple Developer ID)

**Flow:** `task apple:prepare` → app builds → `task apple:cleanup`

Steps:
1. `apple:doctor` — checks macOS, ruby, bundler, security, codesign, notarytool
2. `apple:keychain:create` — creates temporary keychain with random password
3. `apple:match:readonly` — fetches Developer ID cert from Match secrets repo
4. `apple:keychain:configure` — sets partition list for non-interactive codesign
5. App repo builds (uses signing identity from temporary keychain)
6. `apple:keychain:delete` — removes temporary keychain and state

**Admin flow:** `task apple:match:admin` — creates/rotates certs (requires `R26D_SIGNING_ADMIN_CONFIRM=yes`)

**Account Holder flow:** `task apple:match:admin-account-holder` — one-time cert creation via Apple ID auth

### Tauri Updater Signing

**Key generation:** `task tauri:keygen APP=<name>` — generates Ed25519 key pair, SOPS-encrypts private key

**Signing:** `task tauri:sign APP=<name> ARTIFACT=/path` — decrypts key to temp file, signs artifact, cleans up

**Public key retrieval:** `task tauri:pubkey APP=<name>` — prints public key for embedding in app config

### Tauri macOS Build Environment

**Flow:** `task apple:tauri-env` — prints export statements for `APPLE_SIGNING_IDENTITY`, `APPLE_API_*`, `CODESIGN_KEYCHAIN`

### macOS Artifact Verification

**Flow:** `task apple:verify-artifact ARTIFACT_PATH=/path` — runs codesign --verify, codesign -dv, spctl --assess

### Secret Management (SOPS/GPG)

**Encrypt:** `task encrypt-files:encrypt-all` — encrypts files listed in `encrypted_files.txt`
**Decrypt:** `task encrypt-files:decrypt-all` — decrypts those files
**Clean:** `task encrypt-files:clean` — removes decrypted files
**Team keys:** `task encrypt-files:install-team-keys` — imports GPG public keys for SOPS

### Bootstrap

**Flow:** `task bootstrap` — installs asdf tools, project deps, decrypts secrets, installs lefthook hooks

## Sensitive / Secret-Adjacent Files

| File | Type | Notes |
|------|------|-------|
| `.env.signing.enc` | SOPS-encrypted env vars | Contains Match password, Git URL, Team ID, Tauri signing password |
| `apple/api_key.p8.enc` | SOPS-encrypted Apple API key | App Store Connect API key for notarization |
| `tauri-apps/workbench/privkey.enc` | SOPS-encrypted Tauri private key | Ed25519 updater signing key |
| `tauri-apps/workbench/pubkey.pub` | Public key | Safe to expose, but coupled to vault |
| `.sops.yaml` | SOPS config | Defines which GPG keys can decrypt |
| `TeamPublicKeys/*.asc` | GPG public keys | Not secret, but vault infrastructure |
| `apple/Matchfile` | Match config | References `r26d-apple-match-secrets` repo |
| `encrypted_files.txt` | Manifest | Lists files for bulk encrypt/decrypt |

## Mechanics-Only Files

| File | Purpose |
|------|---------|
| `Taskfile.yml` (root) | Delegates to platform Taskfiles |
| `apple/Taskfile.yml` | All macOS signing mechanics |
| `tauri/Taskfile.yml` | Tauri updater key management |
| `windows/Taskfile.yml` | Placeholder |
| `apple/fastlane/Fastfile` | Fastlane Match lanes |
| `apple/Gemfile` / `Gemfile.lock` | Ruby/Fastlane dependencies |
| `scripts/decrypt_all.sh` | SOPS bulk decrypt (Proggy-managed) |
| `scripts/encrypt_all.sh` | SOPS bulk encrypt (Proggy-managed) |
| `scripts/clean_all.sh` | Remove decrypted files |
| `scripts/install_team_keys.sh` | Import GPG keys |
| `scripts/post_decrypt_all.sh` | Post-decrypt hook |
| All `docs/` content | Documentation |

## Taskfile Classification

### Keep in Vault

| Task | Reason |
|------|--------|
| `encrypt-files:decrypt-all` | Operates on vault secrets |
| `encrypt-files:encrypt-all` | Operates on vault secrets |
| `encrypt-files:clean` | Cleans vault secrets |
| `encrypt-files:install-team-keys` | Vault access management |
| `bootstrap:secrets` | Vault-specific setup |
| `apple:match:admin` | Mutates signing state (admin) |
| `apple:match:admin-account-holder` | Mutates signing state (admin) |
| `tauri:keygen` | Creates new key material (admin) |

### Move to Autopen CLI

| Task | Proposed Autopen Command |
|------|-------------------------|
| `apple:doctor` | `autopen doctor` (macOS checks) |
| `apple:prepare` | `autopen macos prepare` |
| `apple:cleanup` | `autopen macos cleanup` |
| `apple:match:readonly` | `autopen macos match pull` |
| `apple:keychain:create` | `autopen macos keychain create` |
| `apple:keychain:configure` | (internal to prepare) |
| `apple:keychain:delete` | `autopen macos keychain delete` |
| `apple:identity:list` | `autopen macos identity list` |
| `apple:verify` | `autopen macos verify` |
| `apple:tauri-env` | `autopen macos tauri-env` |
| `apple:verify-artifact` | `autopen verify artifact` |
| `tauri:pubkey` | `autopen tauri pubkey` |
| `tauri:sign` | `autopen tauri sign` |

### Keep as Repo Maintenance

| Task | Reason |
|------|--------|
| `bootstrap` | Generic repo setup |
| `bootstrap:tools` | asdf tooling |
| `bootstrap:deps` | Language deps |
| `bootstrap:hooks` | Git hooks |

## Fastlane Match Configuration

**Status:** Fully configured and working.

- `apple/Matchfile` points to `ENV.fetch("MATCH_GIT_URL")` — currently `git@github.com:r26D/r26d-apple-match-secrets.git`
- Type: `developer_id` (team-wide, not per-app)
- Provisioning profiles skipped (not needed for macOS Developer ID)
- Match secrets repo is **separate** from this toolkit repo
- Match password is stored in `.env.signing.enc`

## SOPS Usage

**Status:** Active. SOPS encrypts secrets with team GPG keys.

- `.sops.yaml` defines creation rules matching `*.enc*` and specific paths
- Two GPG keys authorized: `FC9B541C` (Brett Elmendorf) and `BFF2B420` (Dirk Elmendorf)
- Bulk decrypt via `scripts/decrypt_all.sh` handles `encrypted_files.txt` entries
- Tauri private keys use SOPS but are NOT in `encrypted_files.txt` (on-demand only)
- Scripts are Proggy-managed (auto-generated)

## Tauri Signing Keys

**Status:** Implemented. One app key exists (`workbench`).

- `tauri-apps/workbench/pubkey.pub` — committed public key
- `tauri-apps/workbench/privkey.enc` — SOPS-encrypted private key
- Password from `R26D_TAURI_SIGNING_PASSWORD` in `.env.signing`
- Uses `npx @tauri-apps/cli signer` for generation and signing
- Designed for per-app isolation

## Mac Certificate Import/Export

**Status:** Handled via Fastlane Match.

- Match fetches the Developer ID cert from the secrets repo
- Cert is imported into the temporary keychain
- `keychain:configure` sets partition list for codesign access
- No manual import/export scripts exist — Match handles this

## Mobile Signing

**Status:** Not present. No iOS-specific tasks, no Android signing.

- The `Matchfile` uses `skip_provisioning_profiles: true`
- Type is `developer_id` only (macOS)
- iOS/Android would be future extensions

## Environment Variables

### Required for macOS signing:
- `R26D_MATCH_PASSWORD` — Match encryption passphrase
- `R26D_MATCH_GIT_URL` — Git URL of Match secrets repo
- `R26D_FASTLANE_TEAM_ID` — Apple Developer Team ID

### Required for Tauri signing:
- `R26D_TAURI_SIGNING_PASSWORD` — Tauri key pair password

### Optional:
- `FASTLANE_USER` — Apple ID email (hardcoded as `dirk@r26d.com` in Taskfile)
- `R26D_SIGNING_KEYCHAIN_NAME` — temporary keychain name
- `R26D_SIGNING_STATE_DIR` — state directory path
- `R26D_SIGNING_ADMIN_CONFIRM` — admin guard

### Hardcoded values in apple/Taskfile.yml:
- `ASC_API_KEY_ID: SP9B5TA772`
- `ASC_API_ISSUER_ID: a4725375-b19a-44ec-8aba-0bf4d70a6cf7`
- `ASC_API_KEY_PATH` — relative to taskfile dir
- `R26D_FASTLANE_USER: dirk@r26d.com`

## Assumptions About Local Paths

- `.env.signing` expected at repo root (auto-loaded by tasks)
- `apple/api_key.p8` expected after decryption
- `.apple-signing-state/` used for temporary keychain state
- `.fastlane-home/` used as isolated Fastlane home
- Expects `../r26d-release-signing` as relative path from app repos
- Signing machine needs GPG key that can decrypt SOPS

## Tool Dependencies

From `.tool-versions`:
- direnv 2.37.1
- lefthook 2.1.6
- python 3.12.9
- ruby 3.4.9
- sops 3.13.1
- task 3.44.1
- nodejs 24.13.0

Additional runtime deps:
- Bundler (Ruby gem)
- Fastlane (via Bundler)
- macOS `security` CLI
- macOS `codesign`
- macOS `xcrun` / `notarytool`
- `npx` (via Node.js)
- `openssl` (keychain password generation)
- GPG (for SOPS decryption)
- Git (for Match repo access)
