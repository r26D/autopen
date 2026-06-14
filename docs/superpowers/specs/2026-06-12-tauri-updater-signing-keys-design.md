# Tauri Updater Signing Keys

Per-app Ed25519 key pair management for Tauri's built-in updater, integrated into the `r26d-release-signing` infrastructure.

## Problem

Tauri apps that use `tauri-plugin-updater` need an Ed25519 key pair: the private key signs update bundles during release, and the public key is embedded in the app so the updater can verify authenticity. Without this, Tauri builds that produce updater artifacts will fail or produce unsigned bundles that the updater rejects.

This repo already manages Apple codesigning via Fastlane Match, temporary keychains, and notarization credentials. Tauri updater keys are a different trust layer: they protect the update channel, not the OS-level code signature. They still belong in the same operational boundary because they are company signing authority and should not be copied into every app repo.

## Goals

- Keep Tauri updater private keys inside this repo's trust boundary.
- Give each Tauri app an isolated key pair so one compromise does not affect other apps.
- Expose the workflow through discoverable Taskfile tasks instead of ad hoc shell commands.
- Keep normal operations read-only except for an explicit admin-only key generation path.
- Ensure plaintext private key material exists only transiently during key generation and signing.

## Non-Goals

- This spec does not define key rotation, key revocation, or incident-response workflows. Those are separate follow-up specs.
- This spec does not centralize app builds in this repo. App repos still own their own release commands and Tauri config.
- This spec does not add Tauri updater metadata publishing. It only covers key generation, public-key retrieval, and artifact signing.

## Design Decisions

**Per-app keys, not a shared key.** Each Tauri app gets its own key pair under `tauri-apps/<app-name>/`. Compromising one app's key does not affect others.

**Private keys never leave this repo.** App repos receive only the public key to embed in `tauri.conf.json`. Signing happens by calling a task in this repo, not by exporting the private key. This matches the "signing desk" metaphor: apps bring artifacts, the signing desk applies trust.

**SOPS encryption at rest, transient decryption for signing.** Private keys are SOPS-encrypted with the existing team GPG keys. They are not included in `encrypted_files.txt` and are never bulk-decrypted. Only `task tauri:sign` decrypts a specific app's key for the duration of the signing operation, then cleans up.

**Single shared password.** Tauri's signer format password-protects the private key. A single `R26D_TAURI_SIGNING_PASSWORD` stored in `.env.signing` is used for all app keys. Tasks map this to Tauri's expected `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` internally, avoiding env var collisions when both repos are sourced in the same shell. Since SOPS encryption is the primary protection layer, the password is a second factor, not the sole defense.

**Tauri CLI via `npx`.** Key generation and signing use `npx @tauri-apps/cli`. This avoids adding a compiled helper now and keeps the first implementation simple. If signing volume or performance becomes a real problem, that can be revisited later.

## Scope Boundaries

This repo owns:

- storage of encrypted private keys and committed public keys,
- the task interface for key generation, public-key retrieval, and signing,
- documentation for how app repos consume the public key and signing task,
- and the secret-management wiring needed to protect the private keys.

Application repos own:

- `tauri.conf.json` or equivalent updater configuration,
- release artifact production,
- versioning and publishing,
- and deciding when to call `task -d /path/to/r26d-release-signing tauri:sign`.

## Domain Model

### App identifier

`APP` is the canonical identifier for a Tauri app inside this repo.

- It becomes the directory name under `tauri-apps/`.
- It must be a single safe path segment.
- Validation must reject an empty value and any value containing `/`, `\`, `..`, leading `-`, or whitespace.
- Callers should use stable kebab-case names, but the hard requirement is path safety and determinism.

### Key material states

Each app's updater key material is always in one of these states:

| State | Files present | Meaning |
|---|---|---|
| Unprovisioned | no `tauri-apps/<APP>/` directory | No updater key has been created yet. |
| Provisioned | `pubkey.pub` and `privkey.enc`, no plaintext `privkey` | Normal steady state. |
| Signing in progress | `pubkey.pub`, `privkey.enc`, temporary decrypted file outside git-tracked paths | Allowed only while `tauri:sign` is running. |
| Failed operation | same as previous valid steady state | Tasks must clean up and leave no new plaintext private key behind. |

Plaintext `privkey` under `tauri-apps/<APP>/` may exist transiently only inside `tauri:keygen` between CLI generation and SOPS encryption. The task must delete it before reporting success, and cleanup must also run on failure.

## Directory Structure

```
tauri-apps/
  <app-name>/
    pubkey.pub        # plaintext, committed; app repos embed this in tauri.conf.json
    privkey.enc       # SOPS-encrypted Ed25519 private key in Tauri signer format
```

The `tauri-apps/` directory is committed to the repo. Public keys are readable by anyone with repo access. Plaintext private keys (`privkey` without `.enc`) are gitignored and must never remain in the repo after a task exits.

## Path Resolution Rules

All storage paths are repo-root relative, not taskfile-relative in the conceptual model.

- Canonical key directory: `tauri-apps/<APP>/`
- Canonical public key path: `tauri-apps/<APP>/pubkey.pub`
- Canonical encrypted private key path: `tauri-apps/<APP>/privkey.enc`

Implementation may use `{{.TASKFILE_DIR}}/../tauri-apps/...` inside `tauri/Taskfile.yml`, but the observable contract is always the repo-root paths above.

`ARTIFACT` must be supplied as an absolute filesystem path. Relative artifact paths are rejected because `task -d` changes execution context and would otherwise make artifact resolution ambiguous.

## Task Interface

Add three new tasks under a `tauri` namespace, included from `tauri/Taskfile.yml`.

### Shared task requirements

All three tasks must:

- run with `set -euo pipefail`,
- avoid printing secrets, decrypted key contents, or password values,
- load `.env.signing` automatically when the required `R26D_*` variable is unset and the repo-root file exists, matching the existing Apple task pattern,
- and produce failure messages that tell the operator which required variable or file is missing.

All tasks must be callable both from the repo root and via `task -d /path/to/r26d-release-signing ...`.

### `tauri:keygen`

Generate a new Ed25519 key pair for a Tauri app.

**Inputs**

- `APP` (required)
- `R26D_SIGNING_ADMIN_CONFIRM=yes` (required guard)
- `R26D_TAURI_SIGNING_PASSWORD` (required; may be auto-loaded from `.env.signing`)
- `npm` and network access sufficient for `npx @tauri-apps/cli`

**Preconditions**

1. `APP` passes validation.
2. `R26D_SIGNING_ADMIN_CONFIRM` equals `yes`.
3. `tauri-apps/<APP>/` does not already exist.
4. The repo can run `npx @tauri-apps/cli signer generate`.

**Flow**

1. Validate `APP`.
2. Enforce the admin guard with the same warning style used by `apple:match:admin`.
3. Load `.env.signing` if needed.
4. Require `R26D_TAURI_SIGNING_PASSWORD`.
5. Create `tauri-apps/<APP>/`.
6. Run `npx @tauri-apps/cli signer generate` with `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` set from `R26D_TAURI_SIGNING_PASSWORD`.
7. Write the generated private key to `tauri-apps/<APP>/privkey`.
8. Write the generated public key to `tauri-apps/<APP>/pubkey.pub`.
9. SOPS-encrypt `tauri-apps/<APP>/privkey` into `tauri-apps/<APP>/privkey.enc`.
10. Delete the plaintext `tauri-apps/<APP>/privkey`.
11. Print the public key and the path to `pubkey.pub`.

**Postconditions**

- `tauri-apps/<APP>/pubkey.pub` exists.
- `tauri-apps/<APP>/privkey.enc` exists and is SOPS-encrypted.
- `tauri-apps/<APP>/privkey` does not exist.
- No existing app key directory was overwritten.

**Failure behavior**

- If generation or encryption fails after the directory is created, the task must remove any plaintext `privkey` before exit.
- If no valid `privkey.enc` was created, the task must fail loudly. Leaving an empty app directory is acceptable; leaving plaintext key material is not.

### `tauri:pubkey`

Print the public key for a Tauri app.

**Inputs**

- `APP` (required)

**Preconditions**

1. `APP` passes validation.
2. `tauri-apps/<APP>/pubkey.pub` exists.

**Flow**

1. Validate `APP`.
2. Check that `pubkey.pub` exists.
3. Print the file contents exactly as stored.

**Postconditions**

- No files are created, changed, decrypted, or deleted.

### `tauri:sign`

Sign a Tauri update artifact with the app's private key.

**Inputs**

- `APP` (required)
- `ARTIFACT` (required; absolute path to the update bundle)
- `R26D_TAURI_SIGNING_PASSWORD` (required; may be auto-loaded from `.env.signing`)

**Preconditions**

1. `APP` passes validation.
2. `ARTIFACT` is an absolute path and exists as a file.
3. `tauri-apps/<APP>/privkey.enc` exists.
4. The repo can run `sops decrypt` and `npx @tauri-apps/cli signer sign`.

**Flow**

1. Validate `APP` and `ARTIFACT`.
2. Load `.env.signing` if needed.
3. Require `R26D_TAURI_SIGNING_PASSWORD`.
4. Decrypt `tauri-apps/<APP>/privkey.enc` to a temporary file created with `mktemp`.
5. Install a `trap` that always deletes the temporary plaintext file on exit.
6. Read the decrypted private key content from that temporary file.
7. Run `npx @tauri-apps/cli signer sign` on `ARTIFACT`, with:
   - `TAURI_SIGNING_PRIVATE_KEY` set to the decrypted key content
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` set from `R26D_TAURI_SIGNING_PASSWORD`
8. Remove the temporary plaintext file.
9. Report the generated signature path.

**Postconditions**

- A signature file exists alongside the artifact after a successful signing run.
- No plaintext private key remains in the repo or temporary location after the task exits.
- The encrypted key file remains unchanged.

**Failure behavior**

- Any failure during decrypt, sign, or cleanup must still execute the trap cleanup path.
- The task must not delete or modify the artifact on signing failure.
- The task may leave a partially created `.sig` file only if the signer itself created it before failing; the task must not guess and delete output it cannot prove it owns.

## Secret Management Changes

### `.env.signing` / `.env.signing.enc`

Add `R26D_TAURI_SIGNING_PASSWORD` to the encrypted env file. This is the password used when generating and using Tauri signer key pairs. Tasks map it to `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` internally to avoid env var collisions.

### `.env.example`

Add:

```bash
R26D_TAURI_SIGNING_PASSWORD=
```

### `.sops.yaml`

Add a creation rule for Tauri private key files:

```yaml
- path_regex: 'tauri-apps/[^/]+/privkey$'
  pgp: >-
    0059F05D7EA93715615DD9DF6A6F9186FC9B541C,
    722789A51168BFB6FAAD257772B85C74BFF2B420
```

This rule applies to the plaintext input path that is encrypted into `privkey.enc`.

### `.gitignore`

Add under the `r26d-release-signing` section:

```gitignore
tauri-apps/*/privkey
```

This prevents plaintext private keys from being committed. The `.enc` files and `pubkey.pub` files are committed normally.

### `encrypted_files.txt`

No changes. Tauri private keys are intentionally excluded from bulk decryption. They are decrypted on demand by `tauri:sign` only.

## Taskfile Structure

Add `tauri/Taskfile.yml` and include it from the root `Taskfile.yml`:

```yaml
# In root Taskfile.yml, add to includes:
tauri:
  taskfile: ./tauri/Taskfile.yml
  dir: ./tauri
  optional: true
```

`tauri/Taskfile.yml` defines `tauri:keygen`, `tauri:pubkey`, and `tauri:sign`. The task descriptions must make the admin-vs-readonly distinction visible in `task --list`.

## Failure Modes And Recovery Expectations

| Scenario | Expected behavior |
|---|---|
| `APP` missing or unsafe | Fail before touching the filesystem. |
| App directory already exists during `tauri:keygen` | Refuse to overwrite; operator must use a future rotation workflow instead. |
| Password missing | Fail with an explicit message; do not prompt interactively. |
| `sops` or `npx` missing | Fail with a clear prerequisite error. |
| Signing key decrypt fails | Abort signing and remove any temporary plaintext file. |
| Signing command fails | Preserve the artifact, clean up plaintext key material, and report the signer failure. |
| Operator runs bulk decrypt | Tauri updater keys remain encrypted because they are not listed in `encrypted_files.txt`. |

## Verification

Implementation is complete only when all of the following pass:

1. `task --list` shows the new `tauri:*` tasks with accurate descriptions.
2. `R26D_SIGNING_ADMIN_CONFIRM=yes task tauri:keygen APP=test-app` creates `tauri-apps/test-app/pubkey.pub`, creates `tauri-apps/test-app/privkey.enc`, prints the public key, and leaves no plaintext `privkey`.
3. Re-running `task tauri:keygen APP=test-app` fails without overwriting the existing app directory.
4. `task tauri:pubkey APP=test-app` prints the same public key stored in `tauri-apps/test-app/pubkey.pub`.
5. `task tauri:sign APP=test-app ARTIFACT=/absolute/path/to/bundle.tar.gz` produces a signature file next to the artifact.
6. After `tauri:sign`, no plaintext private key remains under `tauri-apps/` or in the temporary path used by the task.
7. `task encrypt-files:decrypt-all` does not decrypt any Tauri private keys.
8. `task tauri:sign APP=test-app ARTIFACT=relative/path.tar.gz` fails fast because `ARTIFACT` is not absolute.
9. Any failed task path still leaves the repo with no plaintext Tauri private key file present.

## Open Follow-Ups

- Add a separate rotation and revocation spec before the first production key rotation.
- Add app-integration docs showing how an app repo obtains `pubkey.pub` and passes an absolute artifact path to `tauri:sign`.
- Decide whether a future helper task should sign and verify in one step once real app integration exists.

## Theory Alignment

This design follows the project's core theory:

- **Signing is a boundary of trust.** The private key stays within this repo's trust boundary. App repos never handle it.
- **Normal signing is read-only.** `tauri:sign` and `tauri:pubkey` consume existing keys. Only `tauri:keygen` creates new material, and it is admin-guarded.
- **Temporary signing state should be temporary.** The decrypted private key exists only for the duration of the signing operation.
- **The public interface is discoverable tasks.** `task --list` shows the available Tauri operations.
- **Application repos do not own company signing secrets.** They embed only the public key.
