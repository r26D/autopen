#!/usr/bin/env bun

import { Command } from "commander";
import { debian } from "./commands/debian.js";
import { doctor } from "./commands/doctor.js";
import { vault } from "./commands/vault.js";
import { macos } from "./commands/macos.js";
import { tauri } from "./commands/tauri.js";
import { verify } from "./commands/verify.js";

// GPG needs GPG_TTY to prompt for passphrases over SSH (no GUI pinentry)
if (!process.env.GPG_TTY) {
  try {
    const result = Bun.spawnSync(["tty"], { stdin: "inherit" });
    const tty = new TextDecoder().decode(result.stdout).trim();
    if (tty && !tty.includes("not a tty")) {
      process.env.GPG_TTY = tty;
    }
  } catch {
    // Non-fatal: GPG may still work if keys are cached
  }
}

const program = new Command();

program
  .name("autopen")
  .description("Release signing mechanics CLI for R26D")
  .version("0.1.0");

program.addCommand(debian);
program.addCommand(doctor);
program.addCommand(vault);
program.addCommand(macos);
program.addCommand(tauri);
program.addCommand(verify);

program.parse();
