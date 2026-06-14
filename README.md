# Autopen

Release signing mechanics CLI for R26D. An autopen is a machine that mechanically reproduces a signature — this tool applies authorized signatures using properly supplied credentials.

This is the **mechanics** half of the signing system. The **custody** half is [vault](../vault/).

## Install

```bash
bun install
```

## Usage

```bash
# From this directory:
bun run src/cli.ts <command>

# From repo root:
bun run autopen/src/cli.ts <command>
```

## Commands

```bash
autopen doctor                    # Check all prerequisites
autopen vault status              # Check vault accessibility
autopen vault path                # Print configured vault path

autopen macos prepare             # Full signing setup (keychain + Match)
autopen macos cleanup             # Remove temporary environment
autopen macos keychain create     # Create temporary keychain
autopen macos keychain delete     # Remove temporary keychain
autopen macos match pull          # Fetch signing identity (readonly)
autopen macos identity list       # List codesigning identities
autopen macos verify              # Verify signing tools
autopen macos tauri-env           # Print Tauri env vars

autopen tauri pubkey --app <name> # Print updater public key
autopen tauri sign --app <name> --artifact /path  # Sign artifact

autopen verify artifact <path>    # Verify signed macOS artifact
```

## Configuration

Autopen finds the vault in this order:

1. `R26D_SIGNING_VAULT_PATH` environment variable
2. `~/.config/r26d/autopen/config.toml` → `[vault] path = "..."`
3. `../vault` (monorepo sibling)
4. `../r26d-signing-vault` (separate repo)

## Technology

- Bun runtime
- TypeScript
- Commander.js
- No secrets stored in this package
