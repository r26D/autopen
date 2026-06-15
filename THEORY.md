# Theory

## Identity

This project is **Autopen** — the release-signing mechanics CLI for R26D software. **r26d_signing_secrets** holds secret custody, and Autopen handles signing mechanics.

## Why This Exists

R26D builds desktop applications targeting multiple platforms. On macOS, apps must be signed with a company-owned Developer ID certificate. On all platforms, update artifacts must be signed so users can trust that updates came from R26D.

These signing identities are company authority, not application dependencies. If every app repo owns a copy of signing material, the trust boundary expands with every clone, every CI job, and every old laptop.

This project exists to keep signing authority close enough to be usable, but separate enough to remain safe.

## Core Theory

Signing has two very different responsibilities:

**Vault responsibility:** Protect cryptographic material. Store encrypted keys, certificates, provisioning profiles, and passwords. Change rarely. Be boring. Control access tightly.

**Autopen responsibility:** Use available signing material to sign, verify, package, and document releases. Evolve often. Be ergonomic and testable. Be safe to improve without reviewing private keys.

These responsibilities must not be blended in a single system.

> Secret custody and signing mechanics are different kinds of work with different change rates, different access requirements, and different risk profiles. Combining them forces every improvement to traverse the security boundary.

## What This Is Not

This is not a universal secrets repository. Only signing-related secrets belong here.

This is not an application build system. App repos own their own builds, bundle IDs, entitlements, and release decisions.

This is not compliance theater. Structure exists because it reduces risk, not because it creates the appearance of process.

## The Vault / Autopen Split

### The Vault (`r26d_signing_secrets`)

The vault is a custody repo. It stores:

- SOPS-encrypted environment secrets (Match password, signing passwords)
- Apple App Store Connect API keys (encrypted)
- Tauri updater private keys (encrypted, per-app)
- Tauri updater public keys
- SOPS configuration and team GPG keys
- Fastlane Match configuration (Matchfile, Gemfile, Fastfile)
- Admin-only tasks (key generation, certificate rotation)

The vault should be:

- Low-churn (changes only when keys are rotated or new apps are provisioned)
- Access-controlled (limited to team members who need signing authority)
- Intentionally boring (no clever automation, no frequent improvements)
- Self-contained (does not depend on external tooling repos)

### Autopen

Autopen is a Bun + TypeScript + Commander.js CLI. It provides:

- `autopen doctor` — prerequisite and environment checks
- `autopen vault status/url` — vault accessibility, decryption state, configuration
- `autopen macos prepare/cleanup` — temporary signing environment lifecycle
- `autopen macos keychain create/delete` — individual keychain operations
- `autopen macos match pull` — readonly Match fetch
- `autopen macos identity list` — list available codesigning identities
- `autopen macos verify` — verify signing identity and notarization tools
- `autopen macos tauri-env` — print eval-able Tauri signing+notarization env vars
- `autopen tauri pubkey/sign` — Tauri updater key retrieval and signing
- `autopen verify artifact` — signed macOS artifact verification

Autopen should be:

- Safe to improve without touching secrets
- Testable without access to real signing material
- Installable as a standalone CLI or devkit package
- Eventually part of `r26d-devkit` monorepo

## How Autopen Finds the Vault

Autopen never contains secrets. It discovers the vault at runtime through a resolution chain:

1. **Local path** (`R26D_SIGNING_VAULT_PATH` env var or `path` in config file) — used when the vault is already checked out locally. No clone, no cleanup.

2. **Git URL** (`R26D_SIGNING_VAULT_GIT_URL` env var or `git_url` in config file, defaults to `r26d_signing_secrets`) — vault is shallow-cloned to a temp directory, secrets are decrypted with SOPS, and the clone is removed after the operation completes.

3. **Config file** (`~/.config/r26d/autopen/config.toml`) — persistent per-machine configuration for both local path and git URL.

This means `autopen macos prepare` works the same way on a developer laptop with a local checkout and in CI with only SSH access to the vault repo. The vault session is scoped: opened before work, closed (and cleaned up if temporary) after.

## Operational Invariants

**Signing identity is company-scoped.** Certificates and signing identities are not app-owned assets.

**The vault changes rarely.** Admin operations (key creation, rotation, revocation) are explicit, guarded, and infrequent.

**Autopen changes often.** Improvements to signing workflows, error messages, validation, and documentation should not require vault access or review.

**Normal signing is read-only.** Regular build workflows fetch existing material. They do not create, rotate, or mutate signing state.

**Temporary state is temporary.** Keychains, decrypted keys, cloned vault copies, and signing state are created when needed and removed after use.

**Secrets are never printed.** Tasks may print diagnostic information, identities, and tool versions. Never passwords, tokens, or private keys.

**The vault is not required at install time.** Autopen can be installed and its `doctor` command run without vault access. Signing operations require vault access at runtime.

**Cleanup must be safe.** Only resources provably created by this tooling may be deleted. Never the user's login keychain or unrelated state.

## Natural Extensions

**iOS signing.** Fastlane Match already supports iOS certificate types. Adding `autopen ios match pull` and related commands follows the same model.

**Android signing.** Keystore management for Android follows a similar custody/mechanics split.

**Windows signing.** Azure Trusted Signing, DigiCert KeyLocker, or similar cloud HSM services. The vault stores access credentials; autopen wraps the signing workflow.

**Signature verification.** `autopen verify artifact` can grow to support all platform artifact types.

**CI/CD integration.** Autopen already supports headless operation with all configuration via environment variables. Further integration (GitHub Actions action, dedicated CI mode) can build on this.

**Release readiness checks.** Pre-release validation that confirms signing identity is available and artifacts are properly signed.

## Theory Violations

**Putting secrets in autopen.** Any encrypted key, certificate, or password file in the autopen package violates the split.

**Making autopen depend on vault structure.** Autopen should reference vault path and read specific expected files, not parse vault internals or depend on its directory layout evolving.

**Automating admin operations.** Key generation, rotation, and revocation should always require human confirmation. Never schedule them in CI.

**Bypassing the admin guard.** The `R26D_SIGNING_ADMIN_CONFIRM=yes` pattern exists to prevent accidental mutation. Never remove it for convenience.

**Copying signing material into app repos.** Even "just the public key" for Tauri is fine, but private keys, certificates, and passwords must never leave the vault boundary into app repos.

**Making the vault depend on autopen.** The vault must remain self-contained. It should work with plain `task` commands and `sops` without requiring autopen to be installed.

**Leaving signing state behind.** A workflow that creates keychains, clones vault repos, or decrypts keys and does not clean up is leaking the trust boundary.
