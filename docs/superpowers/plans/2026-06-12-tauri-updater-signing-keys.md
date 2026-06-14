# Tauri Updater Signing Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-app Tauri updater signing key management — key generation, public-key retrieval, and artifact signing — as Taskfile tasks integrated into the existing `r26d-release-signing` infrastructure.

**Architecture:** A new `tauri/Taskfile.yml` is included from the root Taskfile and exposes three tasks (`keygen`, `pubkey`, `sign`). Keys are stored under `tauri-apps/<app-name>/` with SOPS-encrypted private keys and plaintext public keys. Config wiring (`.sops.yaml`, `.gitignore`, `.env.example`) ties into the existing secret-management infrastructure.

**Tech Stack:** Taskfile v3, Bash, SOPS (GPG), `npx @tauri-apps/cli` (Tauri v2 signer)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `.sops.yaml` | Add creation rule for `tauri-apps/*/privkey` |
| Modify | `.gitignore` | Add `tauri-apps/*/privkey` to prevent committing plaintext keys |
| Modify | `.env.example` | Add `R26D_TAURI_SIGNING_PASSWORD=` |
| Modify | `Taskfile.yml` | Add `tauri` include |
| Create | `tauri/Taskfile.yml` | All three Tauri tasks: `keygen`, `pubkey`, `sign` |

---

### Task 1: Secret Management Wiring

**Files:**
- Modify: `.sops.yaml`
- Modify: `.gitignore`
- Modify: `.env.example`

- [ ] **Step 1: Add SOPS creation rule for Tauri private keys**

In `.sops.yaml`, add a new creation rule **before** the `proggy:encrypt_files` rule (which is the catch-all for `*.enc*` paths). The new rule matches the plaintext input path that `sops encrypt` receives:

```yaml
  - path_regex: 'tauri-apps/[^/]+/privkey$'
    pgp: >-
      0059F05D7EA93715615DD9DF6A6F9186FC9B541C,
      722789A51168BFB6FAAD257772B85C74BFF2B420
```

Insert it between the existing `(\.env\.signing|api_key\.p8)$` rule and the `proggy:encrypt_files` rule, so the file reads:

```yaml
creation_rules:
  - path_regex: '(\.env\.signing|api_key\.p8)$'
    pgp: >-
      0059F05D7EA93715615DD9DF6A6F9186FC9B541C,
      722789A51168BFB6FAAD257772B85C74BFF2B420
  - path_regex: 'tauri-apps/[^/]+/privkey$'
    pgp: >-
      0059F05D7EA93715615DD9DF6A6F9186FC9B541C,
      722789A51168BFB6FAAD257772B85C74BFF2B420
  # proggy:encrypt_files
  - path_regex: '(^|/).*\.enc(\..+)?$'
    pgp: >-
      0059F05D7EA93715615DD9DF6A6F9186FC9B541C,
      722789A51168BFB6FAAD257772B85C74BFF2B420
```

- [ ] **Step 2: Add gitignore entry for plaintext Tauri private keys**

In `.gitignore`, add the following line inside the `# >>> r26d-release-signing` section, after the existing `*.keychain-db` line:

```gitignore
tauri-apps/*/privkey
```

- [ ] **Step 3: Add R26D_TAURI_SIGNING_PASSWORD to .env.example**

Append to `.env.example`:

```bash
R26D_TAURI_SIGNING_PASSWORD=
```

The full file should read:

```bash
# R26D Apple Signing Environment Variables
# Copy to .env.signing and fill in values,
# or use `task encrypt-files:decrypt-all` to decrypt from .env.signing.enc

R26D_MATCH_PASSWORD=
R26D_MATCH_GIT_URL=git@github.com:r26D/r26d-apple-match-secrets.git
R26D_FASTLANE_TEAM_ID=
R26D_TAURI_SIGNING_PASSWORD=
```

- [ ] **Step 4: Verify config changes**

Run:
```bash
grep -A2 'tauri-apps' .sops.yaml
grep 'tauri-apps' .gitignore
grep 'TAURI_SIGNING' .env.example
```

Expected:
- `.sops.yaml` shows the `tauri-apps/[^/]+/privkey$` rule with both GPG key fingerprints
- `.gitignore` shows `tauri-apps/*/privkey`
- `.env.example` shows `R26D_TAURI_SIGNING_PASSWORD=`

- [ ] **Step 5: Commit**

```bash
git add .sops.yaml .gitignore .env.example
git commit -m "feat: add SOPS, gitignore, and env wiring for Tauri updater signing keys"
```

---

### Task 2: Root Taskfile Include

**Files:**
- Modify: `Taskfile.yml`

- [ ] **Step 1: Add tauri include to root Taskfile.yml**

Add the `tauri` include to the `includes` block in `Taskfile.yml`, after the `windows` include:

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
  tauri:
    taskfile: ./tauri/Taskfile.yml
    dir: ./tauri
    optional: true
```

- [ ] **Step 2: Verify root task listing still works**

Run:
```bash
task --list
```

Expected: Existing tasks still appear. The `tauri` include is `optional: true`, so the missing `tauri/Taskfile.yml` does not cause an error.

- [ ] **Step 3: Commit**

```bash
git add Taskfile.yml
git commit -m "feat: add tauri include to root Taskfile"
```

---

### Task 3: Tauri Taskfile with All Three Tasks

**Files:**
- Create: `tauri/Taskfile.yml`

- [ ] **Step 1: Create tauri directory**

```bash
mkdir -p tauri
```

- [ ] **Step 2: Create tauri/Taskfile.yml**

Create `tauri/Taskfile.yml` with all three tasks. The `APPS_DIR` var uses `{{.TASKFILE_DIR}}/../tauri-apps` so paths resolve correctly whether called from the repo root or via `task -d`.

```yaml
version: "3"

vars:
  APPS_DIR: '{{.TASKFILE_DIR}}/../tauri-apps'
  REPO_ROOT: '{{.TASKFILE_DIR}}/..'

tasks:
  default:
    desc: Show Tauri updater signing tasks
    cmds:
      - task --list

  keygen:
    desc: "Admin-only: generate a new Tauri updater key pair for an app"
    cmds:
      - |
        set -euo pipefail

        # --- Validate APP ---
        APP="${APP:-}"
        if [ -z "$APP" ]; then
          echo "ERROR: APP is required. Usage: task tauri:keygen APP=my-app" >&2
          exit 1
        fi
        if printf '%s' "$APP" | grep -qE '[/\\]|^-|\.\.| |\t'; then
          echo "ERROR: APP contains unsafe characters. Use a simple kebab-case name." >&2
          exit 1
        fi

        # --- Admin guard ---
        if [ "${R26D_SIGNING_ADMIN_CONFIRM:-}" != "yes" ]; then
          echo "=========================================="
          echo "  WARNING: Admin signing operation"
          echo "=========================================="
          echo ""
          echo "This task CREATES a new Tauri updater"
          echo "signing key pair for app: $APP"
          echo ""
          echo "Set R26D_SIGNING_ADMIN_CONFIRM=yes to proceed."
          exit 1
        fi

        # --- Load .env.signing if needed ---
        if [ -z "${R26D_TAURI_SIGNING_PASSWORD:-}" ] && [ -f "{{.REPO_ROOT}}/.env.signing" ]; then
          set -a
          . "{{.REPO_ROOT}}/.env.signing"
          set +a
        fi
        : "${R26D_TAURI_SIGNING_PASSWORD:?R26D_TAURI_SIGNING_PASSWORD is required — add it to .env.signing}"

        # --- Check app directory does not exist ---
        APP_DIR="{{.APPS_DIR}}/$APP"
        if [ -d "$APP_DIR" ]; then
          echo "ERROR: $APP_DIR already exists. Key rotation is a separate workflow." >&2
          exit 1
        fi

        # --- Generate keys ---
        mkdir -p "$APP_DIR"
        TMPDIR_KEYGEN=$(mktemp -d)
        trap 'rm -rf "$TMPDIR_KEYGEN"; rm -f "$APP_DIR/privkey" 2>/dev/null' EXIT

        export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$R26D_TAURI_SIGNING_PASSWORD"
        npx @tauri-apps/cli signer generate -w "$TMPDIR_KEYGEN"

        # Move generated key files (Tauri creates *.key and *.key.pub)
        PRIVKEY_FILE=$(find "$TMPDIR_KEYGEN" -name '*.key' -not -name '*.pub' | head -1)
        PUBKEY_FILE=$(find "$TMPDIR_KEYGEN" -name '*.key.pub' | head -1)

        if [ -z "$PRIVKEY_FILE" ] || [ -z "$PUBKEY_FILE" ]; then
          echo "ERROR: Tauri signer did not produce expected key files in $TMPDIR_KEYGEN" >&2
          ls -la "$TMPDIR_KEYGEN" >&2
          exit 1
        fi

        cp "$PRIVKEY_FILE" "$APP_DIR/privkey"
        cp "$PUBKEY_FILE" "$APP_DIR/pubkey.pub"

        # --- SOPS encrypt the private key ---
        sops encrypt "$APP_DIR/privkey" > "$APP_DIR/privkey.enc"
        rm -f "$APP_DIR/privkey"

        # --- Clean up temp dir ---
        rm -rf "$TMPDIR_KEYGEN"

        # --- Report ---
        echo ""
        echo "Key pair generated for app: $APP"
        echo "Public key (embed in tauri.conf.json):"
        echo ""
        cat "$APP_DIR/pubkey.pub"
        echo ""
        echo "Stored at: tauri-apps/$APP/pubkey.pub"
        echo "Encrypted private key: tauri-apps/$APP/privkey.enc"

  pubkey:
    desc: Print the Tauri updater public key for an app
    cmds:
      - |
        set -euo pipefail

        # --- Validate APP ---
        APP="${APP:-}"
        if [ -z "$APP" ]; then
          echo "ERROR: APP is required. Usage: task tauri:pubkey APP=my-app" >&2
          exit 1
        fi
        if printf '%s' "$APP" | grep -qE '[/\\]|^-|\.\.| |\t'; then
          echo "ERROR: APP contains unsafe characters." >&2
          exit 1
        fi

        # --- Check pubkey exists ---
        PUBKEY_PATH="{{.APPS_DIR}}/$APP/pubkey.pub"
        if [ ! -f "$PUBKEY_PATH" ]; then
          echo "ERROR: No public key found at tauri-apps/$APP/pubkey.pub" >&2
          echo "Run 'R26D_SIGNING_ADMIN_CONFIRM=yes task tauri:keygen APP=$APP' first." >&2
          exit 1
        fi

        cat "$PUBKEY_PATH"

  sign:
    desc: Sign a Tauri update artifact with an app's private key
    cmds:
      - |
        set -euo pipefail

        # --- Validate APP ---
        APP="${APP:-}"
        if [ -z "$APP" ]; then
          echo "ERROR: APP is required. Usage: task tauri:sign APP=my-app ARTIFACT=/path/to/bundle" >&2
          exit 1
        fi
        if printf '%s' "$APP" | grep -qE '[/\\]|^-|\.\.| |\t'; then
          echo "ERROR: APP contains unsafe characters." >&2
          exit 1
        fi

        # --- Validate ARTIFACT ---
        ARTIFACT="${ARTIFACT:-}"
        if [ -z "$ARTIFACT" ]; then
          echo "ERROR: ARTIFACT is required. Provide an absolute path to the update bundle." >&2
          exit 1
        fi
        case "$ARTIFACT" in
          /*) ;; # absolute path, OK
          *)
            echo "ERROR: ARTIFACT must be an absolute path. Got: $ARTIFACT" >&2
            echo "Use an absolute path to avoid ambiguity with task -d." >&2
            exit 1
            ;;
        esac
        if [ ! -f "$ARTIFACT" ]; then
          echo "ERROR: Artifact not found: $ARTIFACT" >&2
          exit 1
        fi

        # --- Check encrypted key exists ---
        PRIVKEY_ENC="{{.APPS_DIR}}/$APP/privkey.enc"
        if [ ! -f "$PRIVKEY_ENC" ]; then
          echo "ERROR: No encrypted private key at tauri-apps/$APP/privkey.enc" >&2
          echo "Run 'R26D_SIGNING_ADMIN_CONFIRM=yes task tauri:keygen APP=$APP' first." >&2
          exit 1
        fi

        # --- Load .env.signing if needed ---
        if [ -z "${R26D_TAURI_SIGNING_PASSWORD:-}" ] && [ -f "{{.REPO_ROOT}}/.env.signing" ]; then
          set -a
          . "{{.REPO_ROOT}}/.env.signing"
          set +a
        fi
        : "${R26D_TAURI_SIGNING_PASSWORD:?R26D_TAURI_SIGNING_PASSWORD is required — add it to .env.signing}"

        # --- Decrypt private key to temp file ---
        TMPFILE=$(mktemp)
        trap 'rm -f "$TMPFILE"' EXIT

        sops decrypt "$PRIVKEY_ENC" > "$TMPFILE"

        # --- Sign the artifact ---
        PRIVKEY_CONTENT=$(cat "$TMPFILE")
        rm -f "$TMPFILE"

        TAURI_SIGNING_PRIVATE_KEY="$PRIVKEY_CONTENT" \
        TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$R26D_TAURI_SIGNING_PASSWORD" \
          npx @tauri-apps/cli signer sign "$ARTIFACT"

        echo ""
        echo "Artifact signed: $ARTIFACT"
        echo "Signature: ${ARTIFACT}.sig"
```

- [ ] **Step 3: Verify task listing**

Run:
```bash
task --list
```

Expected: The output includes new entries:
```
* tauri:keygen:     Admin-only: generate a new Tauri updater key pair for an app
* tauri:pubkey:     Print the Tauri updater public key for an app
* tauri:sign:       Sign a Tauri update artifact with an app's private key
```

- [ ] **Step 4: Verify input validation on tauri:keygen**

Run without APP:
```bash
task tauri:keygen 2>&1; echo "exit:$?"
```

Expected: Error message containing `APP is required`, non-zero exit.

Run without admin confirm:
```bash
task tauri:keygen APP=test-app 2>&1; echo "exit:$?"
```

Expected: Warning block containing `Admin signing operation` and `R26D_SIGNING_ADMIN_CONFIRM=yes`, non-zero exit.

Run with unsafe APP:
```bash
R26D_SIGNING_ADMIN_CONFIRM=yes task tauri:keygen APP="../escape" 2>&1; echo "exit:$?"
```

Expected: Error message containing `unsafe characters`, non-zero exit.

- [ ] **Step 5: Verify input validation on tauri:pubkey**

Run without APP:
```bash
task tauri:pubkey 2>&1; echo "exit:$?"
```

Expected: Error message containing `APP is required`, non-zero exit.

Run with nonexistent app:
```bash
task tauri:pubkey APP=nonexistent 2>&1; echo "exit:$?"
```

Expected: Error message containing `No public key found`, non-zero exit.

- [ ] **Step 6: Verify input validation on tauri:sign**

Run without APP:
```bash
task tauri:sign 2>&1; echo "exit:$?"
```

Expected: Error message containing `APP is required`, non-zero exit.

Run with relative ARTIFACT:
```bash
task tauri:sign APP=test-app ARTIFACT=relative/path.tar.gz 2>&1; echo "exit:$?"
```

Expected: Error message containing `must be an absolute path`, non-zero exit.

- [ ] **Step 7: Commit**

```bash
git add tauri/Taskfile.yml
git commit -m "feat: add Tauri updater signing tasks (keygen, pubkey, sign)"
```

---

### Task 4: End-to-End Verification

This task requires SOPS and GPG to be functional, and `npx` to be available. If running on a machine without GPG keys imported, skip to the commit step and note that verification was deferred to a machine with signing prerequisites.

- [ ] **Step 1: Generate a test key pair**

```bash
R26D_SIGNING_ADMIN_CONFIRM=yes R26D_TAURI_SIGNING_PASSWORD=test-password-123 \
  task tauri:keygen APP=test-app
```

Expected:
- Creates `tauri-apps/test-app/pubkey.pub` (readable text)
- Creates `tauri-apps/test-app/privkey.enc` (SOPS-encrypted)
- No `tauri-apps/test-app/privkey` exists
- Prints the public key

Verify:
```bash
test -f tauri-apps/test-app/pubkey.pub && echo "pubkey OK"
test -f tauri-apps/test-app/privkey.enc && echo "privkey.enc OK"
test ! -f tauri-apps/test-app/privkey && echo "no plaintext privkey OK"
sops decrypt tauri-apps/test-app/privkey.enc > /dev/null 2>&1 && echo "sops decrypt OK"
```

- [ ] **Step 2: Verify keygen refuses to overwrite**

```bash
R26D_SIGNING_ADMIN_CONFIRM=yes R26D_TAURI_SIGNING_PASSWORD=test-password-123 \
  task tauri:keygen APP=test-app 2>&1; echo "exit:$?"
```

Expected: Error containing `already exists`, non-zero exit.

- [ ] **Step 3: Verify pubkey retrieval**

```bash
task tauri:pubkey APP=test-app
```

Expected: Prints the same public key content as `cat tauri-apps/test-app/pubkey.pub`.

- [ ] **Step 4: Create a test artifact and sign it**

```bash
echo "fake update bundle content" > /tmp/test-bundle.tar.gz

R26D_TAURI_SIGNING_PASSWORD=test-password-123 \
  task tauri:sign APP=test-app ARTIFACT=/tmp/test-bundle.tar.gz
```

Expected:
- Creates `/tmp/test-bundle.tar.gz.sig`
- No plaintext private key remains anywhere
- Reports the signature path

Verify:
```bash
test -f /tmp/test-bundle.tar.gz.sig && echo "signature file OK"
test ! -f tauri-apps/test-app/privkey && echo "no plaintext privkey OK"
find /tmp -name '*tauri*privkey*' -o -name '*tmp.*' 2>/dev/null | head -5
```

- [ ] **Step 5: Verify bulk decrypt does not touch Tauri keys**

```bash
grep -c 'tauri' encrypted_files.txt; echo "exit:$?"
```

Expected: `0` (no Tauri entries in encrypted_files.txt), or exit code 1 from grep (no match).

- [ ] **Step 6: Clean up test artifacts**

```bash
rm -rf tauri-apps/test-app
rm -f /tmp/test-bundle.tar.gz /tmp/test-bundle.tar.gz.sig
```

- [ ] **Step 7: Commit the tauri-apps directory placeholder (if desired)**

If the `tauri-apps/` directory should exist in the repo as a known location (even when empty), create a `.gitkeep`:

```bash
mkdir -p tauri-apps
touch tauri-apps/.gitkeep
git add tauri-apps/.gitkeep
git commit -m "chore: add tauri-apps directory placeholder"
```

Otherwise skip this step — the directory will be created by `tauri:keygen` on first use.
