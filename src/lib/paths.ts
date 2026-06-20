import { resolve } from "path";

export function vaultAppleDir(vaultPath: string): string {
  return resolve(vaultPath, "apple");
}

export function vaultTauriAppsDir(vaultPath: string): string {
  return resolve(vaultPath, "tauri-apps");
}

export function vaultTauriAppDir(vaultPath: string, app: string): string {
  return resolve(vaultPath, "tauri-apps", app);
}

export function vaultEnvSigning(vaultPath: string): string {
  return resolve(vaultPath, ".env.signing");
}

export function vaultDebianDir(vaultPath: string): string {
  return resolve(vaultPath, "debian");
}
