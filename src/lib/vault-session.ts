import { existsSync, readFileSync, readdirSync, rmSync, cpSync, mkdirSync } from "fs";
import { resolve, basename } from "path";
import { exec } from "./exec.js";
import { info, ok, fail, warn } from "./logging.js";
import type { AutopenConfig } from "./config.js";

export interface VaultOpenOptions {
  decrypt?: boolean;
}

export class VaultSession {
  readonly path: string;
  private readonly isTemp: boolean;

  private constructor(path: string, isTemp: boolean) {
    this.path = path;
    this.isTemp = isTemp;
  }

  static async open(
    config: AutopenConfig,
    options: VaultOpenOptions = {},
  ): Promise<VaultSession> {
    const { decrypt = true } = options;

    if (config.vaultLocalPath && existsSync(config.vaultLocalPath)) {
      info(`Using local vault: ${config.vaultLocalPath}`);
      return new VaultSession(config.vaultLocalPath, false);
    }

    const tmpDir = `/tmp/autopen-vault-${process.pid}`;
    info(`Cloning vault from ${config.vaultGitUrl}...`);
    const result = await exec(["git", "clone", "--depth", "1", config.vaultGitUrl, tmpDir]);
    if (result.exitCode !== 0) {
      fail("Failed to clone vault repository");
      if (result.stderr) console.error(result.stderr);
      process.exit(1);
    }
    ok("Vault cloned");

    const session = new VaultSession(tmpDir, true);
    if (decrypt) {
      await session.decryptAll();
    }
    return session;
  }

  private async decryptAll(): Promise<void> {
    const encFiles = this.findEncryptedFiles();
    if (encFiles.length === 0) return;

    for (const encFile of encFiles) {
      const outFile = encFile.replace(/\.enc$/, "");
      const result = await exec(["sops", "decrypt", "--output", outFile, encFile]);
      if (result.exitCode === 0) {
        ok(`Decrypted ${encFile.slice(this.path.length + 1)}`);
      } else {
        warn(`Could not decrypt ${encFile.slice(this.path.length + 1)}`);
      }
    }
  }

  private findEncryptedFiles(): string[] {
    const files: string[] = [];

    const listPath = resolve(this.path, "encrypted_files.txt");
    if (existsSync(listPath)) {
      const content = readFileSync(listPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const fullPath = resolve(this.path, trimmed);
          if (existsSync(fullPath)) files.push(fullPath);
        }
      }
    }

    const tauriAppsDir = resolve(this.path, "tauri-apps");
    if (existsSync(tauriAppsDir)) {
      for (const app of readdirSync(tauriAppsDir)) {
        if (app.startsWith(".")) continue;
        const privkeyEnc = resolve(tauriAppsDir, app, "privkey.enc");
        if (existsSync(privkeyEnc) && !files.includes(privkeyEnc)) {
          files.push(privkeyEnc);
        }
      }
    }

    return files;
  }

  copyToStateDir(relativePath: string, stateDir: string): string {
    const src = resolve(this.path, relativePath);
    if (!existsSync(src)) {
      throw new Error(`File not found in vault: ${relativePath}`);
    }
    mkdirSync(stateDir, { recursive: true });
    const dest = resolve(stateDir, basename(relativePath));
    cpSync(src, dest);
    return dest;
  }

  async close(): Promise<void> {
    if (this.isTemp) {
      rmSync(this.path, { recursive: true, force: true });
      ok("Vault cleaned up");
    }
  }
}

export async function withVault<T>(
  config: AutopenConfig,
  fn: (session: VaultSession) => Promise<T>,
): Promise<T>;
export async function withVault<T>(
  config: AutopenConfig,
  options: VaultOpenOptions,
  fn: (session: VaultSession) => Promise<T>,
): Promise<T>;
export async function withVault<T>(
  config: AutopenConfig,
  fnOrOptions: ((session: VaultSession) => Promise<T>) | VaultOpenOptions,
  maybeFn?: (session: VaultSession) => Promise<T>,
): Promise<T> {
  let options: VaultOpenOptions = {};
  let fn: (session: VaultSession) => Promise<T>;

  if (typeof fnOrOptions === "function") {
    fn = fnOrOptions;
  } else {
    options = fnOrOptions;
    fn = maybeFn!;
  }

  const session = await VaultSession.open(config, options);
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}
