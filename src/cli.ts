#!/usr/bin/env bun

import { Command } from "commander";
import { doctor } from "./commands/doctor.js";
import { vault } from "./commands/vault.js";
import { macos } from "./commands/macos.js";
import { tauri } from "./commands/tauri.js";
import { verify } from "./commands/verify.js";

const program = new Command();

program
  .name("autopen")
  .description("Release signing mechanics CLI for R26D")
  .version("0.1.0");

program.addCommand(doctor);
program.addCommand(vault);
program.addCommand(macos);
program.addCommand(tauri);
program.addCommand(verify);

program.parse();
