import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
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

  // Export armored private key as vault would after SOPS decrypt
  const privkeyArmored = await exec([
    "gpg", "--homedir", gpgHome,
    "--batch", "--armor",
    "--pinentry-mode", "loopback",
    "--passphrase", TEST_PASSPHRASE,
    "--export-secret-keys", fingerprint,
  ]);
  if (privkeyArmored.exitCode !== 0) throw new Error(`Secret key export failed: ${privkeyArmored.stderr}`);
  writeFileSync(join(debianDir, "repo-signing-key.gpg"), privkeyArmored.stdout);

  // Export binary public key
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

      const inReleaseContent = readFileSync(inReleasePath, "utf-8");
      expect(inReleaseContent).toContain("Origin: R26D");
      expect(inReleaseContent).toContain("-----BEGIN PGP SIGNED MESSAGE-----");

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
      expect(stderr).not.toContain("wrong-passphrase");

      const tmpFiles = Bun.spawnSync(["find", tmpdir(), "-maxdepth", "1", "-name", "autopen-gpg-*", "-type", "d"], { stdout: "pipe" });
      const remainingDirs = new TextDecoder().decode(tmpFiles.stdout).trim();
      expect(remainingDirs).toBe("");
    } finally {
      cleanupFixture(fixture);
    }
  });

  test("fails when keyring contains multiple secret keys", async () => {
    const fixture = await createTestFixture();
    try {
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

      const exportProc = Bun.spawnSync([
        "gpg", "--homedir", fixture.gpgHome,
        "--batch", "--armor",
        "--pinentry-mode", "loopback",
        "--passphrase", TEST_PASSPHRASE,
        "--export-secret-keys",
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

      expect(existsSync(join(fixture.releaseDir, "InRelease"))).toBe(false);
      expect(existsSync(join(fixture.releaseDir, "Release.gpg"))).toBe(false);
    } finally {
      cleanupFixture(fixture);
    }
  });

  test("fails when R26D_DEBIAN_SIGNING_PASSWORD is not set", async () => {
    const fixture = await createTestFixture();
    try {
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

  test("replaces existing InRelease and Release.gpg on re-sign", async () => {
    const fixture = await createTestFixture();
    try {
      const env = {
        ...process.env,
        R26D_SIGNING_VAULT_PATH: fixture.vaultDir,
        R26D_DEBIAN_SIGNING_PASSWORD: TEST_PASSPHRASE,
      };

      Bun.spawnSync([
        "bun", "run", "src/cli.ts",
        "debian", "sign-release", "--release-file", fixture.releaseFile,
      ], { stdout: "pipe", stderr: "pipe", env });

      const inReleasePath = join(fixture.releaseDir, "InRelease");
      const firstInRelease = readFileSync(inReleasePath, "utf-8");

      const releaseContent = readFileSync(fixture.releaseFile, "utf-8");
      writeFileSync(fixture.releaseFile, releaseContent + "Description: Updated\n");

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

      const sourcePath = join(fixture.vaultDir, "debian", "repo-signing-key.pub");
      const sourceBytes = readFileSync(sourcePath);
      const outputBytes = readFileSync(outputPath);
      expect(Buffer.compare(sourceBytes, outputBytes)).toBe(0);
    } finally {
      cleanupFixture(fixture);
    }
  });
});

describe("autopen doctor", () => {
  test("mentions Debian signing in gpg check", async () => {
    const proc = Bun.spawnSync([
      "bun", "run", "src/cli.ts", "doctor",
    ], { stdout: "pipe", stderr: "pipe" });

    const stderr = new TextDecoder().decode(proc.stderr);
    expect(stderr.toLowerCase()).toContain("debian");
  });
});
