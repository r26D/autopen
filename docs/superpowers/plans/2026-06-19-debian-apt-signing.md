# Debian APT Repository Signing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `autopen debian sign-release` and `autopen debian pubkey` commands so Pigeon can GPG-sign APT repository metadata and export the public key.

**Architecture:** Revise the existing `src/commands/debian.ts` draft to use `mkdtempSync` for temp GNUPGHOME, pipe passphrases to GPG via `Bun.spawn` stdin (`--passphrase-fd 0`), discover the signing key fingerprint after import, and load the passphrase from `.env.signing`. The `pubkey` subcommand adds absolute-path validation. Supporting files (`cli.ts`, `paths.ts`, `doctor.ts`) are already modified.

**Tech Stack:** TypeScript, Bun runtime, Commander.js, GPG CLI, SOPS (vault decryption handled by existing `vault-session.ts`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/commands/debian.ts` | Rewrite | Both subcommands: `sign-release` (GPG signing with stdin passphrase pipe, fingerprint discovery, mkdtemp) and `pubkey` (copy public key with absolute-path validation) |
| `src/lib/paths.ts` | Already done | `vaultDebianDir()` helper |
| `src/cli.ts` | Already done | `debian` command registered |
| `src/commands/doctor.ts` | Already done | GPG warning mentions Debian signing |
| `test/debian.test.ts` | Create | Integration tests using disposable GPG keys and Release files |

---

### Task 1: Create test infrastructure and first failing test

This project has no test files yet. Bun has a built-in test runner (`bun test`) that works out of the box — no additional dependencies needed.

**Files:**
- Create: `test/debian.test.ts`

- [ ] **Step 1: Create the test directory and first test file**

Create `test/debian.test.ts` with a test fixture helper that generates a disposable GPG keypair and a minimal Release file. This helper will be reused across all tests.

```typescript
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "../src/lib/exec.js";

const TEST_PASSPHRASE = "test-passphrase-for-autopen";
const TEST_IDENTITY = "Autopen Test Key <test@example.com>";

interface TestFixture {
  gpgHome: string;
  vaultDir: string;
  releaseDir: string;
  releaseFile: string;
  fingerprint: string;
}

async function createTestFixture(): Promise<TestFixture> {
  const base = mkdtempSync(join(tmpdir(), "autopen-test-"));
  const gpgHome = join(base, "gpg");
  const vaultDir = join(base, "vault");
  const debianDir = join(vaultDir, "debian");
  const releaseDir = join(base, "repo");

  mkdirSync(gpgHome, { mode: 0o700 });
  mkdirSync(debianDir, { recursive: true });
  mkdirSync(releaseDir, { recursive: true });

  // Generate a test GPG key
  const keyParams = `
Key-Type: RSA
Key-Length: 2048
Name-Real: Autopen Test Key
Name-Email: test@example.com
Passphrase: ${TEST_PASSPHRASE}
%commit
`;
  const paramsFile = join(base, "key-params.txt");
  writeFileSync(paramsFile, keyParams);

  const genResult = await exec([
    "gpg", "--homedir", gpgHome,
    "--batch", "--gen-key", paramsFile,
  ]);
  if (genResult.exitCode !== 0) throw new Error(`Key generation failed: ${genResult.stderr}`);

  // Get fingerprint
  const listResult = await exec([
    "gpg", "--homedir", gpgHome,
    "--batch", "--with-colons", "--list-secret-keys",
  ]);
  const fprLine = listResult.stdout.split("\n").find((l: string) => l.startsWith("fpr:"));
  if (!fprLine) throw new Error("No fingerprint found");
  const fingerprint = fprLine.split(":")[9];

  // Now re-export with passphrase protection using a new key
  // First export the unprotected key, then reimport with passphrase
  const privkeyArmored = await exec([
    "gpg", "--homedir", gpgHome,
    "--batch", "--armor",
    "--export-secret-keys", fingerprint,
  ]);
  // Write the armored private key as vault would after SOPS decrypt
  writeFileSync(join(debianDir, "repo-signing-key.gpg"), privkeyArmored.stdout);

  // Export binary public key
  const pubkeyResult = await exec([
    "gpg", "--homedir", gpgHome,
    "--batch", "--export", fingerprint,
  ]);
  // Write raw binary output (not text-trimmed)
  const pubProc = Bun.spawnSync([
    "gpg", "--homedir", gpgHome,
    "--batch", "--export", fingerprint,
  ], { stdout: "pipe" });
  const pubkeyBytes = pubProc.stdout;
  await Bun.write(join(debianDir, "repo-signing-key.pub"), pubkeyBytes);

  // Write a minimal Release file
  const releaseFile = join(releaseDir, "Release");
  writeFileSync(releaseFile, [
    "Origin: R26D",
    "Label: R26D",
    "Suite: stable",
    "Codename: stable",
    "Architectures: amd64 arm64",
    "Components: main",
    "Date: Thu, 19 Jun 2026 00:00:00 UTC",
    "SHA256:",
    " e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 0 main/binary-amd64/Packages",
    "",
  ].join("\n"));

  // Write .env.signing with the test passphrase
  writeFileSync(join(vaultDir, ".env.signing"), `R26D_DEBIAN_SIGNING_PASSWORD=${TEST_PASSPHRASE}\n`);

  return { gpgHome, vaultDir, releaseDir, releaseFile, fingerprint };
}

function cleanupFixture(fixture: TestFixture): void {
  rmSync(join(fixture.releaseDir, ".."), { recursive: true, force: true });
}

describe("autopen debian sign-release", () => {
  test("rejects relative --release-file path", async () => {
    const proc = Bun.spawnSync([
      "bun", "run", "src/cli.ts",
      "debian", "sign-release", "--release-file", "relative/path/Release",
    ], { stdout: "pipe", stderr: "pipe" });

    expect(proc.exitCode).not.toBe(0);
    const stderr = new TextDecoder().decode(proc.stderr);
    expect(stderr).toContain("absolute path");
  });

  test("rejects nonexistent --release-file", async () => {
    const proc = Bun.spawnSync([
      "bun", "run", "src/cli.ts",
      "debian", "sign-release", "--release-file", "/nonexistent/Release",
    ], { stdout: "pipe", stderr: "pipe" });

    expect(proc.exitCode).not.toBe(0);
    const stderr = new TextDecoder().decode(proc.stderr);
    expect(stderr).toContain("not found");
  });
});

describe("autopen debian pubkey", () => {
  test("rejects relative --output path", async () => {
    const proc = Bun.spawnSync([
      "bun", "run", "src/cli.ts",
      "debian", "pubkey", "--output", "relative/key.gpg",
    ], { stdout: "pipe", stderr: "pipe" });

    expect(proc.exitCode).not.toBe(0);
    const stderr = new TextDecoder().decode(proc.stderr);
    expect(stderr).toContain("absolute path");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/debian.test.ts`

Expected: The two `sign-release` validation tests may pass (the current draft already has the existence check, but the absolute-path check on the raw input is buggy because it calls `resolve()` first). The `pubkey` relative-path test should fail because the current draft has no absolute-path check for `--output`.

- [ ] **Step 3: Commit test scaffolding**

```bash
git add test/debian.test.ts
git commit -m "test: add initial debian signing test scaffolding with disposable GPG fixtures"
```

---

### Task 2: Rewrite debian.ts — input validation and loadVaultEnv

Fix the absolute-path checks to validate raw input (before `resolve()`), add the absolute-path check for `pubkey --output`, and add the `loadVaultEnv` function.

**Files:**
- Modify: `src/commands/debian.ts`

- [ ] **Step 1: Rewrite the full debian.ts file**

Replace the entire contents of `src/commands/debian.ts` with the complete revised implementation. This is a full rewrite because nearly every line changes (imports, temp dir creation, passphrase handling, signing subprocess API, fingerprint discovery).

```typescript
import { Command } from "commander";
import { existsSync, readFileSync, mkdtempSync, rmSync, copyFileSync, chmodSync } from "fs";
import { resolve, dirname, join } from "path";
import { tmpdir } from "os";
import { resolveConfig } from "../lib/config.js";
import { exec } from "../lib/exec.js";
import { ok, fail, info, header } from "../lib/logging.js";
import { vaultDebianDir, vaultEnvSigning } from "../lib/paths.js";
import { withVault } from "../lib/vault-session.js";

export const debian = new Command("debian")
  .description("Debian APT repository signing operations");

debian
  .command("sign-release")
  .description("GPG-sign a Debian Release file (creates InRelease and Release.gpg)")
  .requiredOption("--release-file <path>", "Absolute path to the Release file")
  .action(async (opts) => {
    const rawPath = opts.releaseFile as string;

    if (!rawPath.startsWith("/")) {
      fail("--release-file must be an absolute path");
      process.exit(1);
    }

    const releaseFile = resolve(rawPath);

    if (!existsSync(releaseFile)) {
      fail(`Release file not found: ${releaseFile}`);
      process.exit(1);
    }

    const outDir = dirname(releaseFile);
    const inReleasePath = resolve(outDir, "InRelease");
    const releaseGpgPath = resolve(outDir, "Release.gpg");

    const config = resolveConfig();

    await withVault(config, async (session) => {
      const debDir = vaultDebianDir(session.path);
      const privkeyPath = resolve(debDir, "repo-signing-key.gpg");

      if (!existsSync(privkeyPath)) {
        fail("Debian signing key could not be decrypted. Check GPG keys.");
        process.exit(1);
      }

      loadVaultEnv(session.path);

      const password = process.env.R26D_DEBIAN_SIGNING_PASSWORD;
      if (!password) {
        fail("R26D_DEBIAN_SIGNING_PASSWORD is required — add it to .env.signing");
        process.exit(1);
      }

      const tmpGpgHome = mkdtempSync(join(tmpdir(), "autopen-gpg-"));
      chmodSync(tmpGpgHome, 0o700);

      try {
        header("Importing signing key");

        const importResult = await exec([
          "gpg", "--homedir", tmpGpgHome,
          "--batch", "--import", privkeyPath,
        ]);
        if (importResult.exitCode !== 0) {
          fail("Failed to import signing key");
          if (importResult.stderr) console.error(importResult.stderr);
          process.exit(1);
        }
        ok("Signing key imported");

        const fingerprint = await discoverFingerprint(tmpGpgHome);

        header("Signing Release file");

        await gpgSignWithPassphrase([
          "gpg", "--homedir", tmpGpgHome,
          "--batch", "--yes",
          "--pinentry-mode", "loopback",
          "--passphrase-fd", "0",
          "--local-user", fingerprint,
          "--clearsign",
          "--output", inReleasePath,
          releaseFile,
        ], password, "Failed to create InRelease (clearsign)");
        ok(`InRelease: ${inReleasePath}`);

        await gpgSignWithPassphrase([
          "gpg", "--homedir", tmpGpgHome,
          "--batch", "--yes",
          "--pinentry-mode", "loopback",
          "--passphrase-fd", "0",
          "--local-user", fingerprint,
          "--detach-sign", "--armor",
          "--output", releaseGpgPath,
          releaseFile,
        ], password, "Failed to create Release.gpg (detached signature)");
        ok(`Release.gpg: ${releaseGpgPath}`);
      } finally {
        rmSync(tmpGpgHome, { recursive: true, force: true });
      }
    });
  });

debian
  .command("pubkey")
  .description("Export the Debian repo signing public key (binary GPG format)")
  .requiredOption("--output <path>", "Destination path for the public key")
  .action(async (opts) => {
    const rawPath = opts.output as string;

    if (!rawPath.startsWith("/")) {
      fail("--output must be an absolute path");
      process.exit(1);
    }

    const output = resolve(rawPath);
    const config = resolveConfig();

    await withVault(config, { decrypt: false }, async (session) => {
      const pubkeyPath = resolve(vaultDebianDir(session.path), "repo-signing-key.pub");
      if (!existsSync(pubkeyPath)) {
        fail("No public key found at debian/repo-signing-key.pub");
        process.exit(1);
      }
      copyFileSync(pubkeyPath, output);
      ok(`Public key written to ${output}`);
    });
  });

async function discoverFingerprint(gpgHome: string): Promise<string> {
  const result = await exec([
    "gpg", "--homedir", gpgHome,
    "--batch", "--with-colons", "--list-secret-keys",
  ]);
  if (result.exitCode !== 0) {
    fail("Failed to list imported secret keys");
    process.exit(1);
  }

  const lines = result.stdout.split("\n");
  const fingerprints: string[] = [];
  let sawSec = false;
  for (const line of lines) {
    if (line.startsWith("sec:")) {
      sawSec = true;
    } else if (sawSec && line.startsWith("fpr:")) {
      const fpr = line.split(":")[9];
      if (fpr) fingerprints.push(fpr);
      sawSec = false;
    } else if (!line.startsWith("fpr:")) {
      sawSec = false;
    }
  }

  if (fingerprints.length === 0) {
    fail("No usable secret keys found in imported keyring");
    process.exit(1);
  }
  if (fingerprints.length > 1) {
    fail(`Expected exactly one signing key but found ${fingerprints.length}`);
    process.exit(1);
  }

  info(`Signing key: ${fingerprints[0]}`);
  return fingerprints[0];
}

async function gpgSignWithPassphrase(
  cmd: string[],
  passphrase: string,
  errorMessage: string,
): Promise<void> {
  const proc = Bun.spawn(cmd, {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  proc.stdin.write(passphrase + "\n");
  proc.stdin.end();

  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    fail(errorMessage);
    if (stderr.trim()) console.error(stderr.trim());
    process.exit(1);
  }
}

function loadVaultEnv(vaultPath: string): void {
  const envPath = vaultEnvSigning(vaultPath);
  if (!process.env.R26D_DEBIAN_SIGNING_PASSWORD && existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}
```

- [ ] **Step 2: Run the validation tests**

Run: `bun test test/debian.test.ts`

Expected: All three validation tests pass (relative path for sign-release, nonexistent file for sign-release, relative path for pubkey).

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/commands/debian.ts
git commit -m "feat(debian): rewrite with mkdtemp, stdin passphrase pipe, fingerprint discovery, and input validation"
```

---

### Task 3: Add integration test for sign-release happy path

Test that `sign-release` produces valid `InRelease` and `Release.gpg` files using a disposable GPG key and a local vault override.

**Files:**
- Modify: `test/debian.test.ts`

- [ ] **Step 1: Add the happy-path signing test**

Add the following test inside the existing `describe("autopen debian sign-release")` block. This test uses the `createTestFixture()` helper from Task 1 and points autopen at the fixture vault using `R26D_SIGNING_VAULT_PATH`.

```typescript
  test("signs a Release file producing InRelease and Release.gpg", async () => {
    const fixture = await createTestFixture();
    try {
      const proc = Bun.spawnSync([
        "bun", "run", "src/cli.ts",
        "debian", "sign-release", "--release-file", fixture.releaseFile,
      ], {
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          R26D_SIGNING_VAULT_PATH: fixture.vaultDir,
          R26D_DEBIAN_SIGNING_PASSWORD: TEST_PASSPHRASE,
        },
      });

      const stderr = new TextDecoder().decode(proc.stderr);
      expect(proc.exitCode).toBe(0);

      const inReleasePath = join(fixture.releaseDir, "InRelease");
      const releaseGpgPath = join(fixture.releaseDir, "Release.gpg");

      expect(existsSync(inReleasePath)).toBe(true);
      expect(existsSync(releaseGpgPath)).toBe(true);

      // Verify InRelease contains the original Release content (clearsigned wraps it)
      const inReleaseContent = readFileSync(inReleasePath, "utf-8");
      expect(inReleaseContent).toContain("Origin: R26D");
      expect(inReleaseContent).toContain("-----BEGIN PGP SIGNED MESSAGE-----");

      // Verify Release.gpg is an armored detached signature
      const releaseGpgContent = readFileSync(releaseGpgPath, "utf-8");
      expect(releaseGpgContent).toContain("-----BEGIN PGP SIGNATURE-----");

      // Verify no temp GPG home directories remain
      const tmpFiles = Bun.spawnSync(["find", tmpdir(), "-maxdepth", "1", "-name", "autopen-gpg-*", "-type", "d"], { stdout: "pipe" });
      const remainingDirs = new TextDecoder().decode(tmpFiles.stdout).trim();
      expect(remainingDirs).toBe("");
    } finally {
      cleanupFixture(fixture);
    }
  });
```

- [ ] **Step 2: Run the test**

Run: `bun test test/debian.test.ts`

Expected: All tests pass, including the new happy-path test. The signing test takes a few seconds due to GPG key generation.

- [ ] **Step 3: Commit**

```bash
git add test/debian.test.ts
git commit -m "test(debian): add sign-release happy-path integration test with disposable GPG key"
```

---

### Task 4: Add integration test for pubkey happy path

Test that `pubkey` copies the binary public key file unchanged.

**Files:**
- Modify: `test/debian.test.ts`

- [ ] **Step 1: Add the pubkey copy test**

Add inside the existing `describe("autopen debian pubkey")` block:

```typescript
  test("copies the public key binary unchanged", async () => {
    const fixture = await createTestFixture();
    try {
      const outputPath = join(fixture.releaseDir, "r26d-archive-keyring.gpg");

      const proc = Bun.spawnSync([
        "bun", "run", "src/cli.ts",
        "debian", "pubkey", "--output", outputPath,
      ], {
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          R26D_SIGNING_VAULT_PATH: fixture.vaultDir,
        },
      });

      expect(proc.exitCode).toBe(0);
      expect(existsSync(outputPath)).toBe(true);

      // Compare bytes: output must match the vault's public key exactly
      const sourcePath = join(fixture.vaultDir, "debian", "repo-signing-key.pub");
      const sourceBytes = readFileSync(sourcePath);
      const outputBytes = readFileSync(outputPath);
      expect(Buffer.compare(sourceBytes, outputBytes)).toBe(0);
    } finally {
      cleanupFixture(fixture);
    }
  });
```

- [ ] **Step 2: Run the test**

Run: `bun test test/debian.test.ts`

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add test/debian.test.ts
git commit -m "test(debian): add pubkey binary copy integration test"
```

---

### Task 5: Add edge-case tests — wrong passphrase, multiple keys, cleanup on failure

Cover the failure modes from the spec: wrong passphrase exits non-zero and cleans up, multiple secret keys in the keyring fail before signing, and temp dirs are always cleaned up.

**Files:**
- Modify: `test/debian.test.ts`

- [ ] **Step 1: Add wrong-passphrase test**

Add inside `describe("autopen debian sign-release")`:

```typescript
  test("fails with wrong passphrase and cleans up temp dir", async () => {
    const fixture = await createTestFixture();
    try {
      const proc = Bun.spawnSync([
        "bun", "run", "src/cli.ts",
        "debian", "sign-release", "--release-file", fixture.releaseFile,
      ], {
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          R26D_SIGNING_VAULT_PATH: fixture.vaultDir,
          R26D_DEBIAN_SIGNING_PASSWORD: "wrong-passphrase",
        },
      });

      expect(proc.exitCode).not.toBe(0);

      const stderr = new TextDecoder().decode(proc.stderr);
      // Must not print the wrong passphrase in error output
      expect(stderr).not.toContain("wrong-passphrase");

      // Verify no temp GPG home directories remain
      const tmpFiles = Bun.spawnSync(["find", tmpdir(), "-maxdepth", "1", "-name", "autopen-gpg-*", "-type", "d"], { stdout: "pipe" });
      const remainingDirs = new TextDecoder().decode(tmpFiles.stdout).trim();
      expect(remainingDirs).toBe("");
    } finally {
      cleanupFixture(fixture);
    }
  });
```

- [ ] **Step 2: Add multi-key rejection test**

Create a fixture helper that imports two different GPG keys into the vault's private key file. Add inside `describe("autopen debian sign-release")`:

```typescript
  test("fails when keyring contains multiple secret keys", async () => {
    const fixture = await createTestFixture();
    try {
      // Generate a second key and append it to the vault private key file
      const secondKeyParams = join(dirname(fixture.gpgHome), "key-params-2.txt");
      writeFileSync(secondKeyParams, `
Key-Type: RSA
Key-Length: 2048
Name-Real: Second Test Key
Name-Email: second@example.com
Passphrase: ${TEST_PASSPHRASE}
%commit
`);
      await exec([
        "gpg", "--homedir", fixture.gpgHome,
        "--batch", "--gen-key", secondKeyParams,
      ]);

      // Re-export all secret keys (now two) into the vault private key file
      const exportProc = Bun.spawnSync([
        "gpg", "--homedir", fixture.gpgHome,
        "--batch", "--armor", "--export-secret-keys",
      ], { stdout: "pipe" });
      const allKeys = new TextDecoder().decode(exportProc.stdout);
      writeFileSync(join(fixture.vaultDir, "debian", "repo-signing-key.gpg"), allKeys);

      const proc = Bun.spawnSync([
        "bun", "run", "src/cli.ts",
        "debian", "sign-release", "--release-file", fixture.releaseFile,
      ], {
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          R26D_SIGNING_VAULT_PATH: fixture.vaultDir,
          R26D_DEBIAN_SIGNING_PASSWORD: TEST_PASSPHRASE,
        },
      });

      expect(proc.exitCode).not.toBe(0);
      const stderr = new TextDecoder().decode(proc.stderr);
      expect(stderr).toContain("found 2");

      // InRelease and Release.gpg should not have been created
      expect(existsSync(join(fixture.releaseDir, "InRelease"))).toBe(false);
      expect(existsSync(join(fixture.releaseDir, "Release.gpg"))).toBe(false);
    } finally {
      cleanupFixture(fixture);
    }
  });
```

- [ ] **Step 3: Add missing-passphrase test**

Add inside `describe("autopen debian sign-release")`:

```typescript
  test("fails when R26D_DEBIAN_SIGNING_PASSWORD is not set", async () => {
    const fixture = await createTestFixture();
    try {
      // Remove the password from .env.signing and don't set it in env
      writeFileSync(join(fixture.vaultDir, ".env.signing"), "");

      const env = { ...process.env, R26D_SIGNING_VAULT_PATH: fixture.vaultDir };
      delete env.R26D_DEBIAN_SIGNING_PASSWORD;

      const proc = Bun.spawnSync([
        "bun", "run", "src/cli.ts",
        "debian", "sign-release", "--release-file", fixture.releaseFile,
      ], {
        stdout: "pipe",
        stderr: "pipe",
        env,
      });

      expect(proc.exitCode).not.toBe(0);
      const stderr = new TextDecoder().decode(proc.stderr);
      expect(stderr).toContain("R26D_DEBIAN_SIGNING_PASSWORD");
    } finally {
      cleanupFixture(fixture);
    }
  });
```

- [ ] **Step 4: Run all tests**

Run: `bun test test/debian.test.ts`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add test/debian.test.ts
git commit -m "test(debian): add edge-case tests for wrong passphrase, multi-key rejection, and missing password"
```

---

### Task 6: Add overwrite test and doctor check verification

Test that existing `InRelease` and `Release.gpg` are replaced on a successful re-sign, and verify the doctor output.

**Files:**
- Modify: `test/debian.test.ts`

- [ ] **Step 1: Add overwrite test**

Add inside `describe("autopen debian sign-release")`:

```typescript
  test("replaces existing InRelease and Release.gpg on re-sign", async () => {
    const fixture = await createTestFixture();
    try {
      const env = {
        ...process.env,
        R26D_SIGNING_VAULT_PATH: fixture.vaultDir,
        R26D_DEBIAN_SIGNING_PASSWORD: TEST_PASSPHRASE,
      };

      // First sign
      Bun.spawnSync([
        "bun", "run", "src/cli.ts",
        "debian", "sign-release", "--release-file", fixture.releaseFile,
      ], { stdout: "pipe", stderr: "pipe", env });

      const inReleasePath = join(fixture.releaseDir, "InRelease");
      const firstInRelease = readFileSync(inReleasePath, "utf-8");

      // Modify the Release file to change the signature
      const releaseContent = readFileSync(fixture.releaseFile, "utf-8");
      writeFileSync(fixture.releaseFile, releaseContent + "Description: Updated\n");

      // Second sign
      const proc = Bun.spawnSync([
        "bun", "run", "src/cli.ts",
        "debian", "sign-release", "--release-file", fixture.releaseFile,
      ], { stdout: "pipe", stderr: "pipe", env });

      expect(proc.exitCode).toBe(0);

      const secondInRelease = readFileSync(inReleasePath, "utf-8");
      expect(secondInRelease).toContain("Description: Updated");
      expect(secondInRelease).not.toBe(firstInRelease);
    } finally {
      cleanupFixture(fixture);
    }
  });
```

- [ ] **Step 2: Add doctor check test**

Add a new describe block:

```typescript
describe("autopen doctor", () => {
  test("mentions Debian signing in gpg check", async () => {
    const proc = Bun.spawnSync([
      "bun", "run", "src/cli.ts", "doctor",
    ], { stdout: "pipe", stderr: "pipe" });

    const stderr = new TextDecoder().decode(proc.stderr);
    // Whether gpg is found or not, the output should reference Debian signing
    expect(stderr.toLowerCase()).toContain("debian");
  });
});
```

- [ ] **Step 3: Run all tests**

Run: `bun test test/debian.test.ts`

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add test/debian.test.ts
git commit -m "test(debian): add overwrite and doctor verification tests"
```

---

### Task 7: Final verification and cleanup

Run the full test suite one more time, run typecheck, and verify the CLI help output.

**Files:**
- No new files

- [ ] **Step 1: Run typecheck**

Run: `bun run typecheck`

Expected: No type errors.

- [ ] **Step 2: Run all tests**

Run: `bun test`

Expected: All tests pass.

- [ ] **Step 3: Verify CLI help output**

Run: `bun run src/cli.ts debian --help`

Expected output should show:
```
Usage: autopen debian [command]

Debian APT repository signing operations

Commands:
  sign-release  GPG-sign a Debian Release file (creates InRelease and Release.gpg)
  pubkey        Export the Debian repo signing public key (binary GPG format)
  help [command]  display help for command
```

Run: `bun run src/cli.ts debian sign-release --help`

Expected: Shows `--release-file <path>` as required option.

Run: `bun run src/cli.ts debian pubkey --help`

Expected: Shows `--output <path>` as required option.

- [ ] **Step 4: Verify no temp dirs leaked**

Run: `find /tmp -maxdepth 1 -name "autopen-gpg-*" -type d 2>/dev/null`

Expected: No output (all temp dirs cleaned up).

- [ ] **Step 5: Commit any final adjustments**

If any adjustments were needed, commit them:

```bash
git add -A
git commit -m "chore(debian): final cleanup after verification"
```
