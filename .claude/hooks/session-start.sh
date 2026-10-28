#!/bin/bash
# Cloud sessions (claude.ai/code) start from a fresh clone: no node_modules, and no copy of the Chromium build the
# pinned @playwright/test expects (cdn.playwright.dev is not reachable there). The image ships other Chromium builds in
# /opt/pw-browsers, so the expected revisions are linked to the newest preinstalled ones and PLAYWRIGHT_BROWSERS_PATH
# points Playwright at the links (27.10.2026: tests/e2e/pr-critical.spec.ts, 60 passed on chromium-1243 linked as 1234).
# Local sessions are left alone.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Reuses the pnpm store the container cache keeps between sessions. Its output stays out of the session's context
# (a SessionStart hook's stdout is added to it); on failure it goes to stderr with the hook's error.
if ! log=$(pnpm install --frozen-lockfile --prefer-offline 2>&1); then
  echo "$log" >&2
  exit 1
fi

PREINSTALLED=/opt/pw-browsers
[ -d "$PREINSTALLED" ] || exit 0

LINKS="$HOME/.cache/rubikon-pw-browsers"
mkdir -p "$LINKS"
expected=$(node -e "
  const path = require('path');
  const core = path.dirname(require.resolve('playwright-core/package.json', { paths: [require.resolve('@playwright/test')] }));
  const { browsers } = require(path.join(core, 'browsers.json'));
  for (const b of browsers) if (['chromium', 'chromium-headless-shell', 'ffmpeg'].includes(b.name)) console.log(b.name.replace(/-/g, '_') + '-' + b.revision);
")
for want in $expected; do
  name="${want%-*}"
  # the revision Playwright expects when the image has it, else the newest preinstalled one
  if [ -d "$PREINSTALLED/$want" ]; then have="$PREINSTALLED/$want"
  else have=$(ls -d "$PREINSTALLED/$name"-[0-9]* 2>/dev/null | sort -V | tail -1 || true); fi
  if [ -n "$have" ]; then ln -sfn "$have" "$LINKS/$want"; fi
done

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PLAYWRIGHT_BROWSERS_PATH=\"$LINKS\"" >> "$CLAUDE_ENV_FILE"
fi
