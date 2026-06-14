import { Command } from "commander";
import { existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { resolveConfig } from "../lib/config.js";
import { withVault } from "../lib/vault-session.js";
import { ok, fail, warn, info, header } from "../lib/logging.js";

export const vault = new Command("vault")
  .description("Vault status and configuration");

vault
  .command("status")
  .description("Clone vault, verify decryption, and report contents")
  .action(async () => {
    const config = resolveConfig();

    header("Vault Status");
    info(`Git URL: ${config.vaultGitUrl}`);
    if (config.vaultLocalPath) {
      info(`Local override: ${config.vaultLocalPath}`);
    }

    await withVault(config, async (session) => {
      const sopsYaml = resolve(session.path, ".sops.yaml");
      if (existsSync(sopsYaml)) {
        ok(".sops.yaml present");
      } else {
        fail(".sops.yaml missing");
      }

      const envSigning = resolve(session.path, ".env.signing");
      if (existsSync(envSigning)) {
        ok(".env.signing decrypted");
      } else {
        warn(".env.signing could not be decrypted — check GPG keys");
      }

      const apiKey = resolve(session.path, "apple/api_key.p8");
      if (existsSync(apiKey)) {
        ok("apple/api_key.p8 decrypted");
      } else {
        warn("apple/api_key.p8 could not be decrypted");
      }

      const tauriApps = resolve(session.path, "tauri-apps");
      if (existsSync(tauriApps)) {
        const apps = readdirSync(tauriApps).filter(
          (f) =>
            !f.startsWith(".") &&
            existsSync(resolve(tauriApps, f, "pubkey.pub")),
        );
        if (apps.length > 0) {
          ok(`Tauri apps provisioned: ${apps.join(", ")}`);
          for (const app of apps) {
            const privkey = resolve(tauriApps, app, "privkey");
            if (existsSync(privkey)) {
              ok(`  ${app}/privkey decrypted`);
            } else {
              warn(`  ${app}/privkey could not be decrypted`);
            }
          }
        } else {
          info("No Tauri apps provisioned yet");
        }
      }
    });
  });

vault
  .command("url")
  .description("Print the configured vault git URL")
  .action(() => {
    const config = resolveConfig();
    console.log(config.vaultGitUrl);
  });
