import { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { resolve } from "path";
import { resolveConfig } from "../lib/config.js";
import { exec, which } from "../lib/exec.js";
import { ok, fail, warn, info, header } from "../lib/logging.js";
import { vaultAppleDir } from "../lib/paths.js";
import { withVault, type VaultSession } from "../lib/vault-session.js";

export const macos = new Command("macos")
  .description("macOS code signing operations");

macos
  .command("prepare")
  .description("Prepare macOS signing environment (keychain + Match)")
  .action(async () => {
    if (process.platform !== "darwin") {
      fail("This command must run on macOS");
      process.exit(1);
    }

    const config = resolveConfig();

    header("Preparing macOS signing environment");

    const requiredTools = ["security", "codesign", "ruby", "bundle"];
    for (const tool of requiredTools) {
      if (!(await which(tool))) {
        fail(`Missing required tool: ${tool}`);
        process.exit(1);
      }
    }
    ok("Prerequisites satisfied");

    await createKeychain(config.stateDir, config.keychainName);

    await withVault(config, async (session) => {
      await matchPull(session.path, config.stateDir, config.keychainName);
    });

    await configureKeychain(config.stateDir, config.keychainName);

    info("Available signing identities:");
    const identities = await exec(["security", "find-identity", "-v", "-p", "codesigning"]);
    console.log(identities.stdout);

    ok("macOS signing environment ready");
  });

macos
  .command("cleanup")
  .description("Remove temporary macOS signing environment")
  .action(async () => {
    if (process.platform !== "darwin") {
      fail("This command must run on macOS");
      process.exit(1);
    }

    const config = resolveConfig();
    await deleteKeychain(config.stateDir);
  });

const keychain = macos.command("keychain").description("Temporary keychain management");

keychain
  .command("create")
  .description("Create temporary signing keychain")
  .action(async () => {
    if (process.platform !== "darwin") {
      fail("This command must run on macOS");
      process.exit(1);
    }
    const config = resolveConfig();
    await createKeychain(config.stateDir, config.keychainName);
  });

keychain
  .command("delete")
  .description("Delete temporary signing keychain")
  .action(async () => {
    if (process.platform !== "darwin") {
      fail("This command must run on macOS");
      process.exit(1);
    }
    const config = resolveConfig();
    await deleteKeychain(config.stateDir);
  });

const match = macos.command("match").description("Fastlane Match operations");

match
  .command("pull")
  .description("Fetch signing identity via readonly Match")
  .action(async () => {
    if (process.platform !== "darwin") {
      fail("This command must run on macOS");
      process.exit(1);
    }
    const config = resolveConfig();
    await withVault(config, async (session) => {
      await matchPull(session.path, config.stateDir, config.keychainName);
    });
  });

const identity = macos.command("identity").description("Signing identity operations");

identity
  .command("list")
  .description("List available codesigning identities")
  .action(async () => {
    if (process.platform !== "darwin") {
      fail("This command must run on macOS");
      process.exit(1);
    }
    const result = await exec(["security", "find-identity", "-v", "-p", "codesigning"]);
    console.log(result.stdout);
  });

macos
  .command("verify")
  .description("Verify signing identity and notarization tooling")
  .action(async () => {
    if (process.platform !== "darwin") {
      fail("This command must run on macOS");
      process.exit(1);
    }

    header("Verifying macOS signing setup");

    const tools = ["security", "codesign", "ruby", "bundle"];
    for (const tool of tools) {
      if (await which(tool)) {
        ok(`${tool} available`);
      } else {
        fail(`${tool} not found`);
      }
    }

    const notarytool = await exec(["xcrun", "--find", "notarytool"]);
    if (notarytool.exitCode === 0) {
      ok("notarytool available");
    } else {
      fail("notarytool not found");
    }

    info("Signing identities:");
    const identities = await exec(["security", "find-identity", "-v", "-p", "codesigning"]);
    console.log(identities.stdout);
  });

macos
  .command("tauri-env")
  .description("Print Tauri signing+notarization env vars (eval-able)")
  .action(async () => {
    if (process.platform !== "darwin") {
      fail("This command must run on macOS");
      process.exit(1);
    }

    const config = resolveConfig();

    await withVault(config, async (session) => {
      const apiKeyPath = resolve(vaultAppleDir(session.path), "api_key.p8");
      if (!existsSync(apiKeyPath)) {
        fail("apple/api_key.p8 could not be decrypted. Check GPG keys.");
        process.exit(1);
      }

      const stateApiKey = session.copyToStateDir("apple/api_key.p8", config.stateDir);

      console.log(`export APPLE_SIGNING_IDENTITY='Developer ID Application: r26D, LLC (W78G6V5S6B)'`);
      console.log(`export APPLE_API_ISSUER='a4725375-b19a-44ec-8aba-0bf4d70a6cf7'`);
      console.log(`export APPLE_API_KEY='SP9B5TA772'`);
      console.log(`export APPLE_API_KEY_PATH='${stateApiKey}'`);
      console.log(`export CODESIGN_KEYCHAIN='${config.keychainName}'`);
    });
  });

// --- Internal helpers ---

async function createKeychain(stateDir: string, keychainName: string): Promise<void> {
  const namePath = resolve(stateDir, "keychain-name");
  if (existsSync(namePath)) {
    info("Keychain state already exists, skipping creation");
    return;
  }

  mkdirSync(stateDir, { recursive: true });

  const passwordResult = await exec(["openssl", "rand", "-base64", "32"]);
  const password = passwordResult.stdout;

  writeFileSync(resolve(stateDir, "keychain-password"), password);
  writeFileSync(namePath, keychainName);

  await exec(["security", "create-keychain", "-p", password, keychainName]);
  await exec(["security", "set-keychain-settings", "-lut", "21600", keychainName]);
  await exec(["security", "unlock-keychain", "-p", password, keychainName]);

  const listResult = await exec(["security", "list-keychains", "-d", "user"]);
  const existingKeychains = listResult.stdout.replace(/"/g, "").split("\n").map(s => s.trim()).filter(Boolean);
  await exec(["security", "list-keychains", "-d", "user", "-s", keychainName, ...existingKeychains]);

  ok(`Temporary keychain created: ${keychainName}`);
}

async function configureKeychain(stateDir: string, keychainName: string): Promise<void> {
  const password = readFileSync(resolve(stateDir, "keychain-password"), "utf-8");
  await exec([
    "security", "set-key-partition-list",
    "-S", "apple-tool:,apple:,codesign:",
    "-s",
    "-k", password,
    keychainName,
  ]);
  ok("Keychain configured for non-interactive codesign");
}

async function deleteKeychain(stateDir: string): Promise<void> {
  const namePath = resolve(stateDir, "keychain-name");
  if (!existsSync(namePath)) {
    info("No signing keychain state found. Nothing to clean up.");
    return;
  }

  const keychainName = readFileSync(namePath, "utf-8").trim();

  if (!keychainName.includes("r26d-release-signing")) {
    fail(`Refusing to delete unexpected keychain: ${keychainName}`);
    process.exit(1);
  }

  await exec(["security", "delete-keychain", keychainName]);

  // Also clean up any api_key copied to stateDir
  rmSync(stateDir, { recursive: true, force: true });
  ok(`Temporary keychain deleted: ${keychainName}`);
}

async function matchPull(
  vaultPath: string,
  stateDir: string,
  keychainName: string,
): Promise<void> {
  const appleDir = vaultAppleDir(vaultPath);
  const envSigningPath = resolve(vaultPath, ".env.signing");

  if (!process.env.R26D_MATCH_PASSWORD && existsSync(envSigningPath)) {
    const content = readFileSync(envSigningPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }

  const matchPassword = process.env.R26D_MATCH_PASSWORD;
  const matchGitUrl = process.env.R26D_MATCH_GIT_URL;
  const teamId = process.env.R26D_FASTLANE_TEAM_ID;

  if (!matchPassword) {
    fail("R26D_MATCH_PASSWORD is required — check GPG keys for vault decryption");
    process.exit(1);
  }
  if (!matchGitUrl) {
    fail("R26D_MATCH_GIT_URL is required");
    process.exit(1);
  }
  if (!teamId) {
    fail("R26D_FASTLANE_TEAM_ID is required");
    process.exit(1);
  }

  const keychainPasswordPath = resolve(stateDir, "keychain-password");
  const keychainPassword = existsSync(keychainPasswordPath)
    ? readFileSync(keychainPasswordPath, "utf-8")
    : "";

  const bundleCheck = await exec(["bundle", "check", "--quiet"], { cwd: appleDir });
  if (bundleCheck.exitCode !== 0) {
    info("Installing Fastlane dependencies...");
    await exec(["bundle", "install"], { cwd: appleDir });
  }

  const fastlaneHome = resolve(appleDir, ".fastlane-home");
  mkdirSync(fastlaneHome, { recursive: true });

  const result = await exec(["bundle", "exec", "fastlane", "match_readonly"], {
    cwd: appleDir,
    env: {
      MATCH_PASSWORD: matchPassword,
      MATCH_GIT_URL: matchGitUrl,
      FASTLANE_TEAM_ID: teamId,
      R26D_ASC_KEY_ID: "SP9B5TA772",
      R26D_ASC_ISSUER_ID: "a4725375-b19a-44ec-8aba-0bf4d70a6cf7",
      R26D_ASC_KEY_PATH: resolve(appleDir, "api_key.p8"),
      FASTLANE_USER: "dirk@r26d.com",
      FASTLANE_HOME: fastlaneHome,
      R26D_SIGNING_KEYCHAIN_NAME: keychainName,
      R26D_SIGNING_KEYCHAIN_PASSWORD: keychainPassword,
    },
  });

  if (result.exitCode !== 0) {
    fail("Match readonly failed");
    if (result.stderr) console.error(result.stderr);
    process.exit(1);
  }

  ok("Signing identity fetched via Match");
}
