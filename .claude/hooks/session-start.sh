#!/bin/bash
# Installs npm dependencies in cloud sessions so lint, typecheck and test work on the first run (L11).
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Skip the install unless a file that decides what gets installed has changed since it last succeeded.
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  # Delete the old hashes first, so a failed install runs again next time.
  rm -f "$hashes"

  # npm install rather than npm ci: it reuses node_modules cached in the container state.
  npm install --no-audit --no-fund

  sha256sum .claude/hooks/session-start.sh package.json package-lock.json > "$hashes" || rm -f "$hashes"
fi
