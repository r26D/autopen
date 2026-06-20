#!/usr/bin/env bash
# Install this skill into a project's .cursor/skills directory.
# Usage: ./install.sh [DEST]
#   DEST  Project root (default: current directory)

set -e

DEST="${1:-.}"
SKILL_ID="dev/cto-audit"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
TARGET="${DEST}/.cursor/skills/${SKILL_ID}"

if [[ ! -d "$DEST" ]]; then
  echo "Error: destination is not a directory: $DEST" >&2
  exit 1
fi

mkdir -p "$(dirname "$TARGET")"
if [[ -d "$TARGET" ]]; then
  echo "Skill already present at $TARGET. Remove it first or run uninstall.sh." >&2
  exit 1
fi

cp -r "$SKILL_DIR" "$TARGET"
echo "Installed skill to $TARGET"
