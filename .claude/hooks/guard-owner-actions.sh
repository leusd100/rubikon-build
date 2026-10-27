#!/bin/bash
# PreToolUse guard for what only the owner approves (AGENTS.md; DEC-30 merge and deploy, DEC-18 baselines;
# docs/ci-tier-model.md). The logic and its reasons are in guard_owner_actions.py: it answers "ask" — a person confirms in
# the permission prompt — or nothing. Tests: tests/unit/claude-guard-hook.test.ts.
#
# Without a working Python (GUARD_PYTHON overrides python3) the call is not waved through: anything that looks like an
# owner action asks. Any exit code but 2 lets a call run, so this wrapper always exits 0 and decides through its output.
input=$(cat)
python="${GUARD_PYTHON:-python3}"
if out=$("$python" "$(dirname "$0")/guard_owner_actions.py" <<<"$input" 2>/dev/null); then
  printf '%s' "$out"
  exit 0
fi
if grep -Eq 'push|merge|wrangler|vinext|deploy|update-snapshots|visual:update|lighthouserc|sonar-project|-snapshots/|\.claude/(settings|hooks)|rulesets|protection' <<<"$input"; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"The owner-action guard could not run (no working python3): confirm this call yourself."}}'
fi
exit 0
