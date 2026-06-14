import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import { resolveConfig, requireVaultPath } from "../lib/config.js";
import { ok, fail, warn, info, header } from "../lib/logging.js";
import { vaultEnvSigning } from "../lib/paths.js";

export const vault = new Command("vault")
  .description("Vault status and configuration");

vault
  .command("status")
  .description("Check vault accessibility and decryption state")
  .action(async () => {
    const config = resolveConfig();

    header("Vault Status");

    if (!config.vaultPath) {
      fail("Vault not configured");
      info("Set R26D_SIGNING_VAULT_PATH or create ~/.config/r26d/autopen/config.toml");
      process.exit(1);
    }

    ok(`Vault path: ${config.vaultPath}`);

    const sopsYaml = resolve(config.vaultPath, ".sops.yaml");
    if (existsSync(sopsYaml)) {
      ok(".sops.yaml present");
    } else {
      fail(".sops.yaml missing");
    }

    const envSigning = vaultEnvSigning(config.vaultPath);
    if (existsSync(envSigning)) {
      ok(".env.signing decrypted (secrets available)");
    } else {
      const encPath = resolve(config.vaultPath, ".env.signing.enc");
      if (existsSync(encPath)) {
        warn(".env.signing.enc present but not decrypted — run vault decrypt first");
      } else {
        fail("No .env.signing.enc found");
      }
    }

    const tauriApps = resolve(config.vaultPath, "tauri-apps");
    if (existsSync(tauriApps)) {
      const { readdirSync } = await import("fs");
      const apps = readdirSync(tauriApps).filter(
        (f) => !f.startsWith(".") && existsSync(resolve(tauriApps, f, "pubkey.pub"))
      );
      if (apps.length > 0) {
        ok(`Tauri apps provisioned: ${apps.join(", ")}`);
      } else {
        info("No Tauri apps provisioned yet");
      }
    }
  });

vault
  .command("path")
  .description("Print the configured vault path")
  .action(() => {
    const config = resolveConfig();
    const path = requireVaultPath(config);
    console.log(path);
  });
