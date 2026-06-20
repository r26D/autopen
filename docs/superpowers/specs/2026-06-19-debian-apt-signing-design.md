# Debian APT Repository Signing

GPG signing support for Debian APT repository metadata, integrated into autopen's vault and CLI infrastructure.

## Problem

Pigeon (our release platform) is adding support for generating APT repositories. APT clients require GPG-signed metadata to verify package authenticity. Specifically, a `Release` file must be accompanied by:

- `InRelease` — a clearsigned copy of the Release file
- `Release.gpg` — a detached armored signature of the Release file

Additionally, clients need the repository's public key to verify these signatures (typically configured via apt's `Signed-By` directive).

Autopen already manages signing keys for Tauri (Minisign/Ed25519) and macOS (codesign/notarize). Debian repository signing is a new trust layer: it protects the package channel, not individual binaries. It belongs in autopen because it is company signing authority — one key signs all R26D Debian repos.

## Goals

- Provide a CLI interface for pigeon to sign Release files and retrieve the public key.
- Keep the GPG private key in the vault, passphrase-protected, SOPS-encrypted.
- Ensure private key material exists only transiently during signing (temp GNUPGHOME, cleaned up in `finally`).
- Pass the key passphrase via stdin pipe, never on the command line or on disk.
- Follow existing autopen patterns: vault session lifecycle, config resolution, logging, error handling.

## Non-Goals

- This spec does not define key rotation or revocation workflows.
- This spec does not cover generating or managing the actual APT repository structure (that's pigeon's job).
- This spec does not add per-app Debian keys. One company-scoped key signs all repos.

## Design Decisions

**Company-scoped key, not per-app.** Unlike Tauri (per-app keys), Debian repos use a single signing key for all R26D packages. This matches Debian ecosystem conventions where a publisher has one archive key.

**Passphrase-protected private key.** The GPG private key is generated with a passphrase. The passphrase is stored in `.env.signing` as `R26D_DEBIAN_SIGNING_PASSWORD` (SOPS-encrypted alongside other signing secrets). This provides defense in depth: SOPS protects the key at rest, the passphrase protects it if the decrypted form is somehow exposed.

**Passphrase via stdin pipe (Approach A).** The passphrase is passed to GPG via `--passphrase-fd 0` with `--pinentry-mode loopback`, piped through `Bun.spawn`'s stdin. This avoids the passphrase appearing in the process argument list (`ps`) or on disk as a temp file.

**Temporary GNUPGHOME for isolation.** Each signing operation creates a disposable GPG homedir with `mkdtemp` under the OS temp directory, imports the key, signs, and removes the homedir in a `finally` block. The user's real keyring is never touched.

**Pre-stored public key.** The public key is stored unencrypted in the vault as a binary GPG file (suitable for apt's `Signed-By` directive). The `pubkey` command copies it without decrypting the vault, matching the Tauri `pubkey` pattern.

## Scope Boundaries

Autopen owns:

- Storage of the encrypted private key and committed public key in the vault.
- The CLI interface for signing Release files and exporting the public key.
- The secret-management wiring (SOPS encryption, passphrase in `.env.signing`).
- Process isolation for GPG signing, including disposable `GNUPGHOME` creation, permissions, and cleanup.

Pigeon owns:

- Generating the APT repository structure (`Packages`, `Release`, directory layout).
- Calling `autopen debian sign-release` after generating the Release file.
- Calling `autopen debian pubkey` to obtain the key for upload to the repo root.
- Publishing the signed repository to S3/hosting.
- Treating a non-zero autopen exit as a failed publish step and withholding partially signed repository metadata.

## Domain Model And Artifacts

| Concept | Owner | Location / shape | Lifecycle |
|---|---|---|---|
| Release file | Pigeon | Absolute filesystem path passed as `--release-file` | Created before autopen runs; never modified by autopen. |
| InRelease | Autopen | Sibling of Release file named exactly `InRelease` | Created or replaced by `sign-release`; caller publishes only after command exits 0. |
| Release.gpg | Autopen | Sibling of Release file named exactly `Release.gpg` | Created or replaced by `sign-release`; caller publishes only after command exits 0. |
| Private signing key | Vault | `debian/repo-signing-key.gpg.enc`; decrypts to armored `repo-signing-key.gpg` inside an open vault session | Imported into a temp GPG home for each signing run; plaintext vault copy removed by vault cleanup. |
| Public signing key | Vault | `debian/repo-signing-key.pub` binary GPG public key | Copied by `pubkey`; never decrypted. |
| Signing passphrase | Vault env | `R26D_DEBIAN_SIGNING_PASSWORD` from process env or decrypted `.env.signing` | Passed only over child-process stdin. |
| Temp GPG home | Autopen | `mkdtemp` directory under the OS temp dir with prefix `autopen-gpg-` and mode `0700` | Created after vault decrypt succeeds; removed in `finally`. |

## Directory Structure

```
vault/
├── debian/
│   ├── repo-signing-key.gpg.enc   # SOPS-encrypted, passphrase-protected GPG private key (armored)
│   └── repo-signing-key.pub       # Unencrypted binary GPG public key (for apt Signed-By)
├── .env.signing.enc               # Contains R26D_DEBIAN_SIGNING_PASSWORD (among others)
└── encrypted_files.txt            # Lists debian/repo-signing-key.gpg.enc
```

SOPS decryption of `repo-signing-key.gpg.enc` produces `repo-signing-key.gpg` — the armored GPG private key, still passphrase-protected.

## CLI Interface

### `autopen debian sign-release`

Sign a Debian Release file, producing InRelease and Release.gpg.

**Inputs**

- `--release-file <path>` (required; absolute path to the Release file)

**Derived paths**

For a Release file at `/repo/dists/stable/Release`, autopen writes:

| Output | Path |
|---|---|
| InRelease | `/repo/dists/stable/InRelease` |
| Release.gpg | `/repo/dists/stable/Release.gpg` |

Existing `InRelease` and `Release.gpg` files at those paths may be overwritten only after all preconditions through private-key import have succeeded. The Release file itself is never rewritten.

**Preconditions**

1. The Release file exists at the given path.
2. `gpg` is available on PATH.
3. The vault contains `debian/repo-signing-key.gpg.enc`.
4. `R26D_DEBIAN_SIGNING_PASSWORD` is available (via `.env.signing` or environment).

**Flow**

1. Validate that `--release-file` is an absolute path (check raw input before resolving, matching Tauri's pattern) and exists.
2. Resolve config, then open the vault with decryption using existing vault-session helpers.
3. Verify `debian/repo-signing-key.gpg` was decrypted successfully and is a readable file.
4. Load `.env.signing` from the open vault session if `R26D_DEBIAN_SIGNING_PASSWORD` is not already set in the process environment. Process environment wins over `.env.signing`.
5. Require `R26D_DEBIAN_SIGNING_PASSWORD`; fail before creating `GNUPGHOME` if it is missing or empty.
6. Create a temp `GNUPGHOME` using `mkdtemp(join(tmpdir(), "autopen-gpg-"))`, set mode `0700`, and pass the path via `--homedir` and `GNUPGHOME` for every GPG subprocess.
7. Import the decrypted private key into the temp keyring via `gpg --homedir <temp> --batch --import <private-key-path>`.
8. Discover the signing key fingerprint from the imported secret keyring with `gpg --homedir <temp> --batch --with-colons --list-secret-keys`, require exactly one usable secret key, and use its fingerprint as `--local-user <fingerprint>` for both signing commands.
9. Clearsign the Release file: `gpg --homedir <temp> --batch --yes --pinentry-mode loopback --passphrase-fd 0 --local-user <fingerprint> --clearsign --output <release-dir>/InRelease <release-file>` with passphrase piped to stdin.
10. Detached sign the Release file: `gpg --homedir <temp> --batch --yes --pinentry-mode loopback --passphrase-fd 0 --local-user <fingerprint> --detach-sign --armor --output <release-dir>/Release.gpg <release-file>` with passphrase piped to stdin.
11. Clean up temp `GNUPGHOME` in a `finally` block, including failure paths.
12. Report output file paths.

**Subprocess contract**

| Operation | API | stdin | Secret handling |
|---|---|---|---|
| Import private key | Existing `exec()` helper is allowed | None | Command arguments include only file paths, never passphrases. |
| List secret key fingerprint | Existing `exec()` helper is allowed | None | Output must be parsed for one fingerprint; do not log full key listing. |
| Clearsign | Direct `Bun.spawn` | Passphrase plus trailing newline to fd 0 | Do not use `exec()` because the passphrase must never be interpolated into a command string. |
| Detached sign | Direct `Bun.spawn` | Passphrase plus trailing newline to fd 0 | Same as clearsign. |

For signing subprocesses, collect stderr for failure messages but redact the passphrase if any unexpected child-process output echoes stdin. The implementation must not log the private key path contents, key material, or the passphrase.

**Postconditions**

- `InRelease` and `Release.gpg` exist in the same directory as the Release file.
- No temp GNUPGHOME or decrypted key material remains.
- The vault is closed and cleaned up.

**Failure behavior**

- Any failure cleans up the temp GNUPGHOME before exit.
- If validation, vault opening, vault decryption, passphrase loading, GPG import, or fingerprint discovery fails, no output files are created or overwritten.
- If clearsign succeeds but detached signing fails, `InRelease` may exist and `Release.gpg` may be absent or stale. The command exits non-zero and Pigeon must not publish the repository.
- Error messages go to stderr, never including key material or passphrases.

### `autopen debian pubkey`

Export the Debian repo signing public key.

**Inputs**

- `--output <path>` (required; destination path for the public key file)

**Preconditions**

1. The vault contains `debian/repo-signing-key.pub`.
2. The parent directory of `--output` exists and is writable.

**Flow**

1. Validate that `--output` is an absolute path using the same raw-input check pattern as `--release-file`.
2. Resolve config, open vault without decryption (`{ decrypt: false }`).
3. Verify `debian/repo-signing-key.pub` exists.
4. Copy the file to the output path, replacing an existing file at that exact path.

**Postconditions**

- The output file contains the binary GPG public key.
- No files in the vault were created, changed, or decrypted.

## Implementation Changes

### Modified files

**`src/commands/debian.ts`** (new, already drafted) — Revise the existing draft to:
- Add `loadVaultEnv` function (same pattern as `tauri.ts`) to load `R26D_DEBIAN_SIGNING_PASSWORD` from `.env.signing`.
- Replace `exec()` calls for GPG clearsign and detach-sign with direct `Bun.spawn` using stdin pipe for passphrase (`--passphrase-fd 0 --pinentry-mode loopback`).
- The GPG import step remains with `exec()` (no passphrase needed).
- Add fingerprint discovery after import and require exactly one usable secret key before signing.
- Use `mkdtemp` under `tmpdir()` instead of a PID-derived fixed path for temp `GNUPGHOME`.
- Enforce absolute output path validation for `pubkey`.
- The `pubkey` subcommand is already correct.

**`src/lib/paths.ts`** (already done) — `vaultDebianDir()` helper added.

**`src/cli.ts`** (already done) — `debian` command registered.

**`src/commands/doctor.ts`** (already done) — GPG warning mentions Debian signing.

### No changes needed

- `src/lib/config.ts` — No new config fields.
- `src/lib/vault-session.ts` — No changes; `encrypted_files.txt` handles discovery.
- `src/lib/exec.ts` — The stdin-pipe signing calls use `Bun.spawn` directly, not `exec()`.

## Secret Management Changes

### `.env.signing` / `.env.signing.enc`

Add `R26D_DEBIAN_SIGNING_PASSWORD` to the encrypted env file. This is the passphrase for the GPG private key used to sign Debian repository metadata.

### `encrypted_files.txt`

Add:

```
debian/repo-signing-key.gpg.enc
```

This enables bulk decryption via `withVault(config, ...)` to produce `repo-signing-key.gpg` during signing sessions.

### `.sops.yaml`

Add a creation rule for the Debian signing key. The GPG fingerprints are the same team fingerprints already used for other vault entries (defined in the vault repo's `.sops.yaml`, not in autopen):

```yaml
- path_regex: 'debian/repo-signing-key\.gpg$'
  pgp: >-
    <same team GPG fingerprints as other vault entries>
```

### `.gitignore`

Add:

```gitignore
debian/repo-signing-key.gpg
```

Prevents the decrypted private key from being committed. The `.enc` and `.pub` files are committed normally.

## Vault Setup (One-Time)

1. Generate an RSA 4096-bit GPG keypair:
   - Identity: `R26D Package Signing <packages@r26d.com>`
   - Passphrase: a strong random passphrase
2. Export the private key armored: `gpg --export-secret-keys --armor "R26D Package Signing" > repo-signing-key.gpg`
3. Export the public key binary: `gpg --export "R26D Package Signing" > repo-signing-key.pub`
4. SOPS-encrypt the private key: `sops encrypt repo-signing-key.gpg > repo-signing-key.gpg.enc`
5. Store `R26D_DEBIAN_SIGNING_PASSWORD=<passphrase>` in `.env.signing` (before SOPS encryption of that file).
6. Add `debian/repo-signing-key.gpg.enc` to `encrypted_files.txt`.
7. Commit `repo-signing-key.gpg.enc` and `repo-signing-key.pub` to the vault. Delete local plaintext private key.

## Contract With Pigeon

Pigeon calls autopen as a subprocess:

```bash
# Sign a Release file (creates InRelease + Release.gpg alongside it)
autopen debian sign-release --release-file /tmp/repo/dists/stable/Release
# Exit 0 = success, non-zero = failure (message on stderr)

# Get the public key for upload to repo root
autopen debian pubkey --output /tmp/repo/r26d-archive-keyring.gpg
# Exit 0 = success, non-zero = failure (message on stderr)
```

Pigeon must treat the two signing outputs as an atomic pair at the workflow level:

1. Generate the Release file.
2. Run `autopen debian sign-release`.
3. Publish `Release`, `InRelease`, and `Release.gpg` only if autopen exits 0.
4. On non-zero exit, discard or regenerate the repository staging directory before retrying, because one output may have been produced before failure.

## Failure Modes And Recovery

| Scenario | Expected behavior |
|---|---|
| Release file missing or not absolute path | Fail before opening vault. |
| Public key output path is relative | Fail before opening vault. |
| Public key output parent directory is missing | Fail with clear filesystem error; vault is not decrypted. |
| GPG not installed | Fail during signing with clear error. |
| Vault clone/decrypt fails | Fail with vault error; no temp GNUPGHOME created. |
| Private key decrypt fails (wrong SOPS keys) | Fail with "could not be decrypted" message. |
| Passphrase missing | Fail with explicit message naming `R26D_DEBIAN_SIGNING_PASSWORD`. |
| Imported keyring contains zero or multiple secret keys | Fail before signing and name the keyring cardinality problem without printing key material. |
| Wrong passphrase | GPG fails during signing; temp GNUPGHOME still cleaned up. |
| Clearsign succeeds but detach-sign fails | InRelease exists, Release.gpg does not. Non-zero exit. Caller retries. |
| Public key missing in vault | Fail with message naming expected path. |

## Verification

Implementation is complete when:

1. `autopen debian sign-release --release-file /tmp/Release` produces `/tmp/InRelease` and `/tmp/Release.gpg`, exits 0.
2. The signatures are valid: `gpg --verify /tmp/InRelease` and `gpg --verify /tmp/Release.gpg /tmp/Release` succeed.
3. `autopen debian pubkey --output /tmp/key.gpg` writes the binary public key, exits 0.
4. After signing, no `/tmp/autopen-gpg-*` directory remains.
5. `autopen debian sign-release --release-file relative/path` fails fast.
6. `autopen debian sign-release --release-file /nonexistent` fails fast.
7. `autopen debian pubkey --output relative/key.gpg` fails fast.
8. A key fixture with two imported secret keys fails before creating `InRelease` or `Release.gpg`.
9. A wrong passphrase exits non-zero, removes temp `GNUPGHOME`, and does not print the passphrase.
10. Existing `InRelease` and `Release.gpg` are replaced on a successful signing run.
11. `autopen doctor` mentions Debian signing in the GPG check.

## Test Fixtures

Use disposable test keys and Release files only. Tests must not depend on real R26D vault material.

| Fixture | Purpose |
|---|---|
| Minimal Release file | Proves signing outputs and verification commands work with ordinary APT metadata text. |
| Temporary GPG key with known passphrase | Proves `--passphrase-fd 0` signing, fingerprint discovery, and wrong-passphrase failure. |
| Public key file | Proves `pubkey` copies binary bytes unchanged. |
| Multi-secret-key private keyring | Proves ambiguous key material fails before signing. |

## Theory Alignment

This design follows autopen's core theory:

- **Signing is a boundary of trust.** The private key stays in the vault. Pigeon never handles it directly.
- **Normal signing is read-only.** `sign-release` and `pubkey` consume an existing key. Key generation is a separate one-time setup.
- **Temporary signing state should be temporary.** The decrypted key and temp GNUPGHOME exist only for the duration of the operation.
- **The public interface is discoverable CLI commands.** `autopen debian --help` shows available operations.
- **Application repos do not own company signing secrets.** Pigeon calls autopen; it never possesses the private key.
