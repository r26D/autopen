import { Command } from "commander";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { resolveConfig } from "../lib/config.js";
import { exec } from "../lib/exec.js";
import { ok, fail, info, header } from "../lib/logging.js";
import { vaultTauriAppDir, vaultEnvSigning } from "../lib/paths.js";
import { withVault } from "../lib/vault-session.js";

export const tauri = new Command("tauri")
  .description("Tauri updater signing operations");

tauri
  .command("pubkey")
  .description("Print the Tauri updater public key for an app")
  .requiredOption("--app <name>", "App name (e.g. workbench)")
  .action(async (opts) => {
    const app = validateApp(opts.app);
    const config = resolveConfig();

    await withVault(config, { decrypt: false }, async (session) => {
      const pubkeyPath = resolve(vaultTauriAppDir(session.path, app), "pubkey.pub");
      if (!existsSync(pubkeyPath)) {
        fail(`No public key found at tauri-apps/${app}/pubkey.pub`);
        process.exit(1);
      }
      console.log(readFileSync(pubkeyPath, "utf-8").trim());
    });
  });

tauri
  .command("sign")
  .description("Sign a Tauri update artifact with an app's private key")
  .requiredOption("--app <name>", "App name (e.g. workbench)")
  .requiredOption("--artifact <path>", "Absolute path to the update bundle")
  .action(async (opts) => {
    const app = validateApp(opts.app);
    const artifact = opts.artifact as string;

    if (!artifact.startsWith("/")) {
      fail("ARTIFACT must be an absolute path");
      process.exit(1);
    }
    if (!existsSync(artifact)) {
      fail(`Artifact not found: ${artifact}`);
      process.exit(1);
    }

    const config = resolveConfig();

    await withVault(config, async (session) => {
      const appDir = vaultTauriAppDir(session.path, app);
      const privkeyPath = resolve(appDir, "privkey");

      if (!existsSync(privkeyPath)) {
        fail(`Private key for ${app} could not be decrypted. Check GPG keys.`);
        process.exit(1);
      }

      loadVaultEnv(session.path);

      const password = process.env.R26D_TAURI_SIGNING_PASSWORD;
      if (!password) {
        fail("R26D_TAURI_SIGNING_PASSWORD is required — add it to .env.signing");
        process.exit(1);
      }

      header(`Signing artifact for ${app}`);

      const signResult = await exec([
        "npx", "@tauri-apps/cli", "signer", "sign",
        "-f", privkeyPath,
        "-p", password,
        artifact,
      ]);

      if (signResult.exitCode !== 0) {
        fail("Signing failed");
        if (signResult.stderr) console.error(signResult.stderr);
        process.exit(1);
      }

      ok(`Artifact signed: ${artifact}`);
      info(`Signature: ${artifact}.sig`);
    });
  });

function validateApp(app: string): string {
  if (!app) {
    fail("APP is required");
    process.exit(1);
  }
  if (/[/\\:\s]|^-|\.\./.test(app)) {
    fail("APP contains unsafe characters. Use a simple kebab-case name.");
    process.exit(1);
  }
  return app;
}

function loadVaultEnv(vaultPath: string): void {
  const envPath = vaultEnvSigning(vaultPath);
  if (!process.env.R26D_TAURI_SIGNING_PASSWORD && existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}
