import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

const DEFAULT_VAULT_GIT_URL = "git@github.com:r26D/r26d_signing_secrets.git";

export interface AutopenConfig {
  vaultGitUrl: string;
  vaultLocalPath: string | null;
  keychainName: string;
  stateDir: string;
}

export function resolveConfig(): AutopenConfig {
  return {
    vaultGitUrl: resolveVaultGitUrl(),
    vaultLocalPath: resolveVaultLocalPath(),
    keychainName:
      process.env.R26D_SIGNING_KEYCHAIN_NAME ||
      "autopen-signing.keychain-db",
    stateDir: process.env.R26D_SIGNING_STATE_DIR || ".apple-signing-state",
  };
}

function resolveVaultGitUrl(): string {
  if (process.env.R26D_SIGNING_VAULT_GIT_URL) {
    return process.env.R26D_SIGNING_VAULT_GIT_URL;
  }

  const configPath = resolve(homedir(), ".config/r26d/autopen/config.toml");
  if (existsSync(configPath)) {
    const content = readFileSync(configPath, "utf-8");
    const match = content.match(/git_url\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  }

  return DEFAULT_VAULT_GIT_URL;
}

function resolveVaultLocalPath(): string | null {
  if (process.env.R26D_SIGNING_VAULT_PATH) {
    const p = resolve(process.env.R26D_SIGNING_VAULT_PATH);
    if (existsSync(p)) return p;
  }

  const configPath = resolve(homedir(), ".config/r26d/autopen/config.toml");
  if (existsSync(configPath)) {
    const content = readFileSync(configPath, "utf-8");
    const match = content.match(/\bpath\s*=\s*"([^"]+)"/);
    if (match && existsSync(match[1])) return match[1];
  }

  return null;
}
