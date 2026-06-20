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
          throw new Error("Failed to import signing key");
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
      } catch (e) {
        rmSync(tmpGpgHome, { recursive: true, force: true });
        process.exit(1);
      }
      rmSync(tmpGpgHome, { recursive: true, force: true });
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
    throw new Error("Failed to list imported secret keys");
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
    throw new Error("No usable secret keys found");
  }
  if (fingerprints.length > 1) {
    fail(`Expected exactly one signing key but found ${fingerprints.length}`);
    throw new Error(`Expected exactly one signing key but found ${fingerprints.length}`);
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
    throw new Error(errorMessage);
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
