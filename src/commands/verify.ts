import { Command } from "commander";
import { existsSync } from "fs";
import { exec } from "../lib/exec.js";
import { ok, fail, info, header } from "../lib/logging.js";

export const verify = new Command("verify")
  .description("Verify signed artifacts");

verify
  .command("artifact")
  .description("Verify a signed macOS artifact")
  .argument("<path>", "Path to the file or .app bundle to verify")
  .action(async (artifactPath: string) => {
    if (process.platform !== "darwin") {
      fail("Artifact verification requires macOS");
      process.exit(1);
    }

    if (!existsSync(artifactPath)) {
      fail(`File not found: ${artifactPath}`);
      process.exit(1);
    }

    header(`Verifying: ${artifactPath}`);

    // codesign --verify
    info("codesign --verify");
    const verifyResult = await exec([
      "codesign", "--verify", "--deep", "--strict", "--verbose=2", artifactPath,
    ]);
    if (verifyResult.exitCode === 0) {
      ok("Signature valid");
      if (verifyResult.stderr) console.log(verifyResult.stderr);
    } else {
      fail("Signature verification failed");
      if (verifyResult.stderr) console.error(verifyResult.stderr);
    }

    // codesign -dv
    console.log("");
    info("codesign -dv (signature details)");
    const dvResult = await exec([
      "codesign", "-dv", "--verbose=4", artifactPath,
    ]);
    if (dvResult.exitCode === 0) {
      console.log(dvResult.stderr || dvResult.stdout);
    } else {
      fail("Could not display signature details");
    }

    // spctl --assess
    console.log("");
    info("spctl --assess (Gatekeeper)");
    const spctlResult = await exec([
      "spctl", "--assess", "--type", "execute", "--verbose", artifactPath,
    ]);
    if (spctlResult.exitCode === 0) {
      ok("Gatekeeper assessment passed");
      if (spctlResult.stderr) console.log(spctlResult.stderr);
    } else {
      fail("Gatekeeper assessment failed");
      if (spctlResult.stderr) console.error(spctlResult.stderr);
    }
  });
