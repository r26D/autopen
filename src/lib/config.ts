import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { homedir } from "os";

export interface AutopenConfig {
  vaultPath: string | null;
  keychainName: string;
  stateDir: string;
}

export function resolveConfig(): AutopenConfig {
  return {
    vaultPath: resolveVaultPath(),
    keychainName:
      process.env.R26D_SIGNING_KEYCHAIN_NAME ||
      "r26d-release-signing.keychain-db",
    stateDir: process.env.R26D_SIGNING_STATE_DIR || ".apple-signing-state",
  };
}

function resolveVaultPath(): string | null {
  if (process.env.R26D_SIGNING_VAULT_PATH) {
    const p = resolve(process.env.R26D_SIGNING_VAULT_PATH);
    if (existsSync(p)) return p;
  }

  const configPath = resolve(
    homedir(),
    ".config/r26d/autopen/config.toml"
  );
  if (existsSync(configPath)) {
    const content = require("fs").readFileSync(configPath, "utf-8");
    const match = content.match(/path\s*=\s*"([^"]+)"/);
    if (match && existsSync(match[1])) return match[1];
  }

  const cwd = process.cwd();

  // Monorepo layout: autopen/ and vault/ are siblings
  const siblingVault = resolve(cwd, "../vault");
  if (existsSync(siblingVault) && existsSync(resolve(siblingVault, ".sops.yaml"))) {
    return siblingVault;
  }

  // Check if we're inside the vault directory itself
  if (existsSync(resolve(cwd, ".sops.yaml")) && existsSync(resolve(cwd, "encrypted_files.txt"))) {
    return cwd;
  }

  // Separate repo layout: vault and app repos side by side
  const parentVault = resolve(cwd, "../r26d-signing-vault");
  if (existsSync(parentVault) && existsSync(resolve(parentVault, ".sops.yaml"))) {
    return parentVault;
  }

  // Legacy name
  const parentLegacy = resolve(cwd, "../r26d-release-signing");
  if (existsSync(parentLegacy) && existsSync(resolve(parentLegacy, ".sops.yaml"))) {
    return parentLegacy;
  }

  return null;
}

export function requireVaultPath(config: AutopenConfig): string {
  if (!config.vaultPath) {
    console.error(
      "Could not find signing vault. Set R26D_SIGNING_VAULT_PATH or configure ~/.config/r26d/autopen/config.toml"
    );
    process.exit(1);
  }
  return config.vaultPath;
}
