# Autopen / Vault Boundary

Defines what belongs in each repo after the split.

## What Belongs in `r26d_signing_secrets`

The vault repo is the custody boundary. It stores encrypted signing secrets and provides minimal tooling to manage them.

### Contents

- `.env.signing.enc` — SOPS-encrypted environment variables (Match password, Git URL, Team ID, Tauri signing password)
- `apple/api_key.p8.enc` — SOPS-encrypted Apple App Store Connect API key
- `tauri-apps/<app>/privkey.enc` — SOPS-encrypted Tauri updater private keys
- `tauri-apps/<app>/pubkey.pub` — Tauri updater public keys
- `.sops.yaml` — SOPS creation rules and key list
- `TeamPublicKeys/*.asc` — GPG public keys for authorized decryptors
- `encrypted_files.txt` — manifest of bulk-decryptable files
- `scripts/decrypt_all.sh`, `encrypt_all.sh`, `clean_all.sh`, `install_team_keys.sh`, `post_decrypt_all.sh` — SOPS management scripts (Proggy-managed)
- `apple/Matchfile` — Match configuration (references secrets repo URL)
- `apple/Gemfile` / `Gemfile.lock` — Fastlane dependencies (needed for admin Match operations)
- `apple/fastlane/Fastfile` — Fastlane lanes (Match readonly/admin)
- `Taskfile.yml` — vault-level tasks (encrypt/decrypt/admin)
- `README.md`, `THEORY.md` — vault-specific documentation

### Vault Taskfile Tasks

```
vault:decrypt          — Decrypt all secrets
vault:encrypt          — Encrypt all secrets
vault:clean            — Remove decrypted files
vault:install-keys     — Import team GPG keys
vault:bootstrap        — Full vault setup
apple:match:admin      — Create/rotate Apple signing material
apple:match:admin-account-holder — One-time cert creation
tauri:keygen           — Generate new Tauri updater key pair
```

## What Belongs in `autopen`

Autopen is the signing mechanics tool. It knows how to sign things using properly supplied credentials but never owns the secrets.

### Contents

- `package.json`, `bun.lock`, `tsconfig.json` — Bun/TypeScript project
- `src/cli.ts` — CLI entry point
- `src/commands/` — command modules (doctor, macos, tauri, vault, verify)
- `src/lib/` — shared utilities (config, exec, logging, paths)
- `Taskfile.yml` — repo maintenance tasks
- `docs/` — signing workflow documentation
- `test/` — tests

### Autopen Commands

```
autopen doctor                    — Check all prerequisites
autopen vault status              — Check vault accessibility and decryption state
autopen vault path                — Print configured vault path

autopen macos prepare             — Full macOS signing setup (keychain + Match)
autopen macos cleanup             — Remove temporary signing environment
autopen macos keychain create     — Create temporary keychain
autopen macos keychain delete     — Remove temporary keychain
autopen macos match pull          — Fetch signing identity via readonly Match
autopen macos identity list       — List available codesigning identities
autopen macos verify              — Verify signing identity and notarization tools
autopen macos tauri-env           — Print Tauri signing env vars

autopen tauri pubkey              — Print Tauri updater public key for an app
autopen tauri sign                — Sign Tauri update artifact

autopen verify artifact           — Verify a signed macOS artifact
```

## What Should Never Be Placed in Autopen

- Encrypted private keys (`.enc` files)
- SOPS-encrypted environment files
- Apple API keys (encrypted or decrypted)
- GPG keys or key management
- Match encrypted storage configuration
- Any file that, if leaked, would compromise signing authority
- Admin operations that create/rotate/revoke signing material

## What Should Never Be Automated in the Vault

- Automatic decryption on clone or checkout
- Scheduled key rotation without human confirmation
- Any operation that silently exposes plaintext secrets
- CI pipelines that cache decrypted vault state
- Operations that bypass the `R26D_SIGNING_ADMIN_CONFIRM` guard

## Environment Variables Autopen Expects

### Required (from vault or environment)

| Variable | Purpose | Source |
|----------|---------|--------|
| `R26D_MATCH_PASSWORD` | Match encryption passphrase | Vault `.env.signing` |
| `R26D_MATCH_GIT_URL` | Match secrets repo URL | Vault `.env.signing` |
| `R26D_FASTLANE_TEAM_ID` | Apple Developer Team ID | Vault `.env.signing` |
| `R26D_TAURI_SIGNING_PASSWORD` | Tauri key pair password | Vault `.env.signing` |

### Optional

| Variable | Purpose | Default |
|----------|---------|---------|
| `R26D_SIGNING_VAULT_PATH` | Path to vault repo | Auto-detected or `~/.config/r26d/autopen/config.toml` |
| `R26D_SIGNING_KEYCHAIN_NAME` | Temporary keychain name | `autopen-signing.keychain-db` |
| `R26D_SIGNING_STATE_DIR` | Temporary state directory | `.apple-signing-state` |
| `R26D_ASC_KEY_ID` | App Store Connect API key ID | From vault config |
| `R26D_ASC_ISSUER_ID` | App Store Connect issuer ID | From vault config |
| `R26D_ASC_KEY_PATH` | Path to decrypted API key | From vault |

### Configuration File

Autopen looks for configuration in order:

1. CLI flags (highest priority)
2. Environment variables
3. `.autopen.toml` in current directory or ancestors
4. `~/.config/r26d/autopen/config.toml`

Proposed config shape:

```toml
[vault]
path = "/path/to/r26d_signing_secrets"

[macos]
keychain_name = "autopen-signing.keychain-db"
signing_identity = "Developer ID Application: r26D, LLC (W78G6V5S6B)"

[macos.asc]
key_id = "SP9B5TA772"
issuer_id = "a4725375-b19a-44ec-8aba-0bf4d70a6cf7"

[tauri]
# Per-app config is derived from vault path: <vault>/tauri-apps/<app>/
```

## How Fastlane Match Fits

Match is a vault-side tool. It manages encrypted certificate storage in a separate repo (`r26d-apple-match-secrets`).

**Vault owns:**
- `Matchfile` configuration
- `Gemfile` for Fastlane
- Admin Match operations (create/rotate)
- The `r26d-apple-match-secrets` repo reference

**Autopen provides:**
- The `autopen macos match pull` command (readonly fetch)
- Bundler/Fastlane invocation mechanics
- Keychain setup before Match runs
- Environment variable mapping (R26D_* → Fastlane-expected vars)

**Implication:** Autopen needs access to the vault directory to run Match (it needs `Matchfile`, `Gemfile`, `Fastfile`). This is acceptable — Autopen references the vault path but does not contain secrets.

## How Tauri Signing Keys Fit

**Vault owns:**
- `tauri-apps/<app>/privkey.enc` — encrypted private keys
- `tauri-apps/<app>/pubkey.pub` — public keys
- `tauri:keygen` task — key generation (admin)

**Autopen provides:**
- `autopen tauri pubkey` — reads public key from vault path
- `autopen tauri sign` — decrypts key temporarily, signs artifact, cleans up
- Does not store or cache key material

## How Local Keychains Fit

**Autopen creates and manages:**
- Temporary keychains (named `autopen-signing.keychain-db`)
- Keychain state files (under `.apple-signing-state/`)
- Keychain deletion (only keychains it created)

**Autopen never touches:**
- The user's login keychain
- System keychain
- Any keychain not created by autopen

## How CI/CD Uses This

### GitHub Actions / CI

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Checkout signing vault
    uses: actions/checkout@v4
    with:
      repository: r26D/r26d_signing_secrets
      path: .signing-vault
      ssh-key: ${{ secrets.SIGNING_VAULT_DEPLOY_KEY }}

  - name: Decrypt vault secrets
    run: |
      cd .signing-vault
      task vault:decrypt
    env:
      SOPS_GPG_KEY: ${{ secrets.SOPS_GPG_KEY }}

  - name: Prepare signing
    run: autopen macos prepare
    env:
      R26D_SIGNING_VAULT_PATH: .signing-vault
      R26D_MATCH_PASSWORD: ${{ secrets.R26D_MATCH_PASSWORD }}
      R26D_MATCH_GIT_URL: ${{ secrets.R26D_MATCH_GIT_URL }}
      R26D_FASTLANE_TEAM_ID: ${{ secrets.R26D_FASTLANE_TEAM_ID }}

  - name: Build
    run: cargo tauri build

  - name: Cleanup signing
    if: always()
    run: autopen macos cleanup
```

### Local Development

```bash
# One-time: clone vault, decrypt
cd ~/signing
git clone git@github.com:r26D/r26d_signing_secrets.git
cd r26d_signing_secrets
task vault:decrypt

# Configure autopen to find vault
echo '[vault]\npath = "/Users/dev/signing/r26d_signing_secrets"' > ~/.config/r26d/autopen/config.toml

# In any app repo:
autopen macos prepare
pnpm tauri build
autopen macos cleanup
```

## Diagram

```
┌─────────────────────────────────────┐
│         r26d_signing_secrets          │
│                                     │
│  .env.signing.enc                   │
│  apple/api_key.p8.enc              │
│  tauri-apps/*/privkey.enc          │
│  tauri-apps/*/pubkey.pub           │
│  .sops.yaml                        │
│  TeamPublicKeys/                   │
│  apple/Matchfile, Gemfile, Fastfile │
│  scripts/ (encrypt/decrypt)        │
│                                     │
│  Tasks: decrypt, encrypt, admin ops │
└────────────────┬────────────────────┘
                 │ path reference
                 ▼
┌─────────────────────────────────────┐
│              autopen                │
│                                     │
│  src/cli.ts                        │
│  src/commands/ (doctor, macos,     │
│    tauri, vault, verify)           │
│  src/lib/ (config, exec, logging)  │
│                                     │
│  Reads vault path from config      │
│  Invokes Match, sops, codesign     │
│  Creates temporary keychains       │
│  Signs artifacts                   │
│  Never stores secrets              │
│                                     │
│  Commands: doctor, macos prepare,  │
│    macos cleanup, tauri sign, etc. │
└─────────────────────────────────────┘
```
