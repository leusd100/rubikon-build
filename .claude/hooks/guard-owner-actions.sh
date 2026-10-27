#!/bin/bash
# PreToolUse guard for the actions only the owner approves (AGENTS.md; DEC-30 merge and deploy, DEC-18 baselines;
# docs/ci-tier-model.md). Permission rules match a command's prefix only, so `git -C . push origin HEAD:main` or a push
# inside `cd x && …` slips past them; this reads the whole command.
#   exit 2            → blocked, the reason goes back to Claude
#   "ask" decision    → a person confirms in the permission prompt
set -euo pipefail

input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")

block() { echo "Blocked: $1 Only the owner does this (AGENTS.md, CLAUDE.md → «Лише з OK власника»)." >&2; exit 2; }
ask() {
  jq -n --arg reason "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: $reason}}'
  exit 0
}

if [ "$tool" = "Bash" ]; then
  cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
  # Prose is not a command: heredoc bodies and quoted strings with spaces (a commit message that mentions
  # «gh pr merge») are blanked; a quoted single token ("main", 'HEAD:main') stays, unquoted, so quoting cannot hide it.
  if command -v python3 >/dev/null; then
    cmd=$(CMD="$cmd" python3 - <<'PY'
import os, re
c = os.environ["CMD"]
c = re.sub(r"""<<-?\s*(["']?)(\w+)\1[^\n]*\n.*?\n\s*\2(?=\n|$)""", " ", c, flags=re.S)
def token(m):
    return " Q " if re.search(r"\s", m.group(2)) else m.group(2)
c = re.sub(r'("((?:[^"\\]|\\.)*)")', token, c, flags=re.S)
c = re.sub(r"('([^']*)')", token, c, flags=re.S)
print(c)
PY
)
  fi
  # main: no push to it, no merge into it (DEC-30)
  grep -Eq '\bgit\b[^;&|]*\bpush\b[^;&|]*([[:space:]:+]|refs/heads/)main([[:space:];&|]|$)' <<<"$cmd" && block 'pushing to main.'
  grep -Eq '\bgh\b[^;&|]*\bpr\b[^;&|]*\bmerge\b|\bgh\b[^;&|]*\bapi\b[^;&|]*/merge\b' <<<"$cmd" && block 'merging a pull request.'
  # production: deploys, secrets, remote D1, Cloudflare configuration
  grep -Eq '\bwrangler\b[^;&|]*\b(deploy|publish|rollback|secret|versions[[:space:]]+deploy)\b' <<<"$cmd" && block 'a Cloudflare deploy or secret change.'
  grep -Eq '\bwrangler\b[^;&|]*\bd1\b[^;&|]*--remote\b' <<<"$cmd" && block 'a query or migration against the production D1.'
  # repository rulesets and branch protection
  grep -Eq '\bgh\b[^;&|]*\b(ruleset|api\b[^;&|]*/(rulesets|branches/[^/[:space:]]+/protection))' <<<"$cmd" && block 'a ruleset or branch-protection change.'
  # baselines are contracts: refreshed only after the owner reviewed the diff (DEC-18)
  grep -Eq -- '--update-snapshots|\btest:visual:update\b|\bplaywright\b[^;&|]*[[:space:]]-u([[:space:]]|$)' <<<"$cmd" \
    && ask 'Refreshing visual baselines: only for diffs the owner reviewed and approved (DEC-18, docs/ci-tier-model.md).'
  grep -Eq '\bgit\b[^;&|]*\bpush\b[^;&|]*([[:space:]]-f\b|--force)' <<<"$cmd" \
    && ask 'Force push: only on a branch this session created, never on someone else’s branch.'
  exit 0
fi

if [[ "$tool" =~ ^(Edit|Write|MultiEdit|NotebookEdit)$ ]]; then
  file=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
  case "$file" in
    *-snapshots/*) ask 'Editing a visual baseline: only an owner-approved diff (DEC-18).' ;;
    */lighthouserc.cjs) ask 'Lighthouse budgets: no loosening without the owner’s OK.' ;;
    */sonar-project.properties) ask 'Sonar scope and rules: no loosening without the owner’s OK.' ;;
  esac
fi
exit 0
