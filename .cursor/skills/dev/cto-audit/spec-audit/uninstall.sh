#!/usr/bin/env bash
# Remove this skill from a project.
# Usage: ./uninstall.sh [DEST]
#   DEST  Project root (default: current directory)

set -e

DEST="${1:-.}"
SKILL_ID="dev/cto-audit/spec-audit"
TARGET="${DEST}/.cursor/skills/${SKILL_ID}"

if [[ ! -d "$DEST" ]]; then
  echo "Error: destination is not a directory: $DEST" >&2
  exit 1
fi

if [[ ! -d "$TARGET" ]]; then
  echo "Skill not found at $TARGET" >&2
  exit 1
fi

rm -rf "$TARGET"
echo "Uninstalled skill from $TARGET"
