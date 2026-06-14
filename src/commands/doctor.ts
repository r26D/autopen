import { Command } from "commander";
import { which } from "../lib/exec.js";
import { resolveConfig } from "../lib/config.js";
import { ok, fail, warn, header, info } from "../lib/logging.js";

export const doctor = new Command("doctor")
  .description("Check signing prerequisites and dependencies")
  .action(async () => {
    const config = resolveConfig();
    let failures = 0;

    header("Autopen Doctor");

    // Platform detection
    const platform = process.platform;
    info(`Platform: ${platform}`);

    // Core tools
    header("Core Tools");

    if (await which("git")) {
      ok("git available");
    } else {
      fail("git not found");
      failures++;
    }

    if (await which("bun")) {
      ok("bun available");
    } else {
      fail("bun not found");
      failures++;
    }

    if (await which("sops")) {
      ok("sops available");
    } else {
      warn("sops not found (needed for secret decryption)");
    }

    if (await which("gpg")) {
      ok("gpg available");
    } else {
      warn("gpg not found (needed for SOPS decryption)");
    }

    // macOS-specific tools
    if (platform === "darwin") {
      header("macOS Signing Tools");

      if (await which("security")) {
        ok("security available");
      } else {
        fail("security not found");
        failures++;
      }

      if (await which("codesign")) {
        ok("codesign available");
      } else {
        fail("codesign not found");
        failures++;
      }

      const xcrun = await which("xcrun");
      if (xcrun) {
        ok("xcrun available");
        const { exec } = await import("../lib/exec.js");
        const notarytool = await exec(["xcrun", "--find", "notarytool"]);
        if (notarytool.exitCode === 0) {
          ok("notarytool available");
        } else {
          warn("notarytool not found (install Xcode CLI tools)");
        }
      } else {
        fail("xcrun not found (install Xcode CLI tools)");
        failures++;
      }

      if (await which("ruby")) {
        ok("ruby available");
      } else {
        warn("ruby not found (needed for Fastlane Match)");
      }

      if (await which("bundle")) {
        ok("bundler available");
      } else {
        warn("bundler not found (needed for Fastlane Match)");
      }
    } else {
      info("Skipping macOS-specific checks (not on macOS)");
    }

    // Tauri tools
    header("Tauri Tools");

    if (await which("npx")) {
      ok("npx available");
    } else {
      warn("npx not found (needed for Tauri signing)");
    }

    // Vault configuration
    header("Vault Configuration");

    if (config.vaultPath) {
      ok(`Vault found: ${config.vaultPath}`);
    } else {
      warn("Vault not configured (set R26D_SIGNING_VAULT_PATH or create ~/.config/r26d/autopen/config.toml)");
    }

    // Environment variables
    header("Environment");

    const envVars = [
      { name: "R26D_MATCH_PASSWORD", required: false, desc: "Match encryption passphrase" },
      { name: "R26D_MATCH_GIT_URL", required: false, desc: "Match secrets repo URL" },
      { name: "R26D_FASTLANE_TEAM_ID", required: false, desc: "Apple Developer Team ID" },
      { name: "R26D_TAURI_SIGNING_PASSWORD", required: false, desc: "Tauri key pair password" },
    ];

    for (const v of envVars) {
      if (process.env[v.name]) {
        ok(`${v.name} is set`);
      } else {
        warn(`${v.name} not set (${v.desc})`);
      }
    }

    // Summary
    header("Summary");

    if (failures > 0) {
      fail(`${failures} required tool(s) missing`);
      process.exit(1);
    } else {
      ok("All required tools present");
    }
  });
