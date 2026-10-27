import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// .claude/hooks/guard-owner-actions.sh: the PreToolUse guard for what only the owner approves (CLAUDE.md → «Лише з OK
// власника»). Exit 2 blocks; a JSON "ask" decision sends the call to a person; anything else lets it through.
const hook = fileURLToPath(new URL('../../.claude/hooks/guard-owner-actions.sh', import.meta.url));

function decide(input: object) {
  const run = spawnSync('bash', [hook], { input: JSON.stringify(input), encoding: 'utf8' });
  if (run.status === 2) return 'block';
  if (run.status !== 0) throw new Error(`hook failed (${run.status}): ${run.stderr}`);
  return run.stdout.includes('"permissionDecision": "ask"') ? 'ask' : 'allow';
}
const bash = (command: string) => decide({ tool_name: 'Bash', tool_input: { command } });
const edit = (file_path: string) => decide({ tool_name: 'Edit', tool_input: { file_path } });

describe('guard-owner-actions hook', () => {
  it.each([
    'git push origin main',
    'git -C . push origin HEAD:main',
    'cd x && git push -u origin refs/heads/main',
    'git push origin +main',
    'git push origin "main"',
    "git push origin 'HEAD:main'",
    'git commit -m "wip" && git push origin main',
    "git commit -F - <<'EOF'\nmsg\nEOF\ngit push origin HEAD:main",
    'gh pr merge 257 --squash',
    'pnpm exec wrangler deploy',
    'npx wrangler versions deploy',
    'wrangler secret put TELEGRAM_BOT_TOKEN',
    'wrangler d1 execute rubikon-leads --remote --file=migrations/x.sql',
    'gh api repos/leusd100/rubikon-build/rulesets',
  ])('blocks %s', (command) => {
    expect(bash(command)).toBe('block');
  });

  it.each([
    'pnpm exec playwright test tests/e2e/visual.spec.ts --update-snapshots=all',
    'pnpm test:visual:update',
    'git push --force-with-lease origin claude/x',
  ])('asks a person before %s', (command) => {
    expect(bash(command)).toBe('ask');
  });

  it.each([
    'git push -u origin claude/rubikon-orchestration-setup-shu64g',
    'git push -u origin fix/main-menu',
    'git fetch origin main && git merge origin/main',
    'git checkout -B x origin/main',
    'wrangler d1 execute rubikon-leads --local --file=migrations/x.sql',
    'pnpm exec playwright test tests/e2e/pr-critical.spec.ts --project=desktop-chromium',
    'pnpm lint && pnpm typecheck && pnpm test:unit',
    // Prose is not a command (27.10: a commit message that listed «gh pr merge» was blocked)
    'git commit -q -m "chore: guard blocks push у main, gh pr merge, wrangler deploy"',
    "git commit -m 'docs: never git push origin main'",
    "git commit -F - <<'EOF'\nci: gh pr merge and git push origin main are blocked\nEOF",
    'T="Co-Authored-By: x\ngh pr merge" && git add . && git commit -q -m "a b\n\n$T"',
  ])('lets %s through', (command) => {
    expect(bash(command)).toBe('allow');
  });

  it('asks before an edit to a baseline, the Lighthouse budgets or the Sonar scope, and lets other edits through', () => {
    expect(edit('/repo/tests/e2e/visual.spec.ts-snapshots/home-hero-375-linux.png')).toBe('ask');
    expect(edit('/repo/lighthouserc.cjs')).toBe('ask');
    expect(edit('/repo/sonar-project.properties')).toBe('ask');
    expect(edit('/repo/app/page.tsx')).toBe('allow');
    expect(decide({ tool_name: 'Read', tool_input: { file_path: '/repo/lighthouserc.cjs' } })).toBe('allow');
  });
});
