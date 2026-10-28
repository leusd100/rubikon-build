import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// .claude/hooks/guard-owner-actions.sh (logic in guard_owner_actions.py): the PreToolUse guard for what only the owner
// approves (CLAUDE.md → «Лише з OK власника»). It never blocks outright — AGENTS.md lets the owner request a merge or a deploy
// explicitly — it answers "ask", so a person confirms with the reason in front of them; everything else goes through.
const hook = fileURLToPath(new URL('../../.claude/hooks/guard-owner-actions.sh', import.meta.url));
const repo = fileURLToPath(new URL('../..', import.meta.url));
let onMain = '';
let onBranch = '';

// A checkout on `branch`, with a commit: on an unborn branch there is nothing to push, and git cannot name HEAD yet.
function checkoutOn(branch: string) {
  const dir = mkdtempSync(join(tmpdir(), `guard-on-${branch.replace(/\W/g, '-')}-`));
  execFileSync('git', ['init', '-q', '-b', branch, dir]);
  execFileSync('git', ['-C', dir, '-c', 'user.email=guard@test', '-c', 'user.name=guard', 'commit', '-q', '--allow-empty', '-m', 'init']);
  return dir;
}

// Not the repository itself: CI checks it out on main for a push to main and detached for a pull request.
beforeAll(() => {
  onMain = checkoutOn('main');
  onBranch = checkoutOn('fix/guard-test');
});
afterAll(() => {
  rmSync(onMain, { recursive: true, force: true });
  rmSync(onBranch, { recursive: true, force: true });
});

function decide(input: object, env: NodeJS.ProcessEnv = process.env) {
  const run = spawnSync('bash', [hook], { input: JSON.stringify(input), encoding: 'utf8', env });
  if (run.status !== 0) throw new Error(`hook exited ${run.status}: ${run.stderr}`);
  return run.stdout.includes('"permissionDecision": "ask"') || run.stdout.includes('"permissionDecision":"ask"') ? 'ask' : 'allow';
}
const bash = (command: string, cwd = repo) => decide({ tool_name: 'Bash', tool_input: { command }, cwd });
const edit = (file_path: string) => decide({ tool_name: 'Edit', tool_input: { file_path }, cwd: repo });

describe('guard-owner-actions hook', () => {
  it.each([
    'git push origin main',
    'git -C . push origin HEAD:main',
    'cd x && git push -u origin refs/heads/main',
    'git push origin +main',
    'git push origin "main"',
    "git push origin 'HEAD:main'",
    '(git push origin main)',
    'git push origin main>/dev/null',
    'git push \\\n  origin HEAD:main',
    'git push --all origin',
    'git push --mirror origin',
    'git commit -m "wip" && git push origin main',
    "git commit -F - <<'EOF'\nmsg\nEOF\ngit push origin HEAD:main",
    "git commit -F - <<'EOF' && git push origin HEAD:main\nmsg\nEOF",
    "cat <<EOF && gh pr merge 257 --squash\nbody\nEOF",
    'echo "don\'t" && git push origin main && echo \'ok\'',
    'git commit -m "рев\'ю" && git push origin HEAD:main && echo \'ok\'',
    'bash -c "git push origin main"',
    'eval "gh pr merge 12"',
    'timeout 60 bash -c "gh pr merge 12 --squash"',
    'gh pr merge 257 --squash',
    "gh api graphql -f query='mutation{mergePullRequest(input:{pullRequestId:\"x\"}){clientMutationId}}'",
    'gh api -X POST repos/leusd100/rubikon-build/merges -f base=main -f head=x',
    'gh api -X PUT repos/leusd100/rubikon-build/pulls/258/merge',
    'gh api repos/leusd100/rubikon-build/rulesets -f name=x',
    'gh api -X DELETE repos/leusd100/rubikon-build/branches/main/protection',
    'pnpm exec wrangler deploy',
    'npx wrangler versions deploy',
    'wrangler secret put TELEGRAM_BOT_TOKEN',
    'wrangler d1 execute rubikon-leads --remote --file=migrations/x.sql',
    'npx @vinext/cloudflare deploy',
    'pnpm exec vinext deploy',
    'pnpm exec playwright test tests/e2e/visual.spec.ts --update-snapshots=all',
    'pnpm test:visual:update',
    'pnpm exec playwright test -u',
    "sed -i 's/6_100/7_000/' lighthouserc.cjs",
    'echo "sonar.exclusions=**" >> sonar-project.properties',
    'cp test-results/x/actual.png tests/e2e/visual.spec.ts-snapshots/home-hero-375-linux.png',
    "perl -pi -e 's/ask/allow/' .claude/hooks/guard_owner_actions.py",
    'rm .claude/settings.json',
    'git push --force-with-lease origin claude/x',
    'git push origin +claude/x',
    'git push -fu origin claude/x',
  ])('asks a person before %s', (command) => {
    expect(bash(command)).toBe('ask');
  });

  it.each(['git push', 'git push origin HEAD', 'git push -u origin HEAD'])('asks before %s on main, not on a branch', (command) => {
    expect(bash(command, onMain)).toBe('ask');
    expect(bash(command, onBranch)).toBe('allow');
  });

  it.each([
    'git push -u origin claude/rubikon-orchestration-setup-shu64g',
    'git push -u origin fix/main-menu',
    'git fetch origin main && git merge origin/main',
    'git checkout -B x origin/main',
    'wrangler d1 execute rubikon-leads --local --file=migrations/x.sql',
    'wrangler secret list',
    'gh ruleset list',
    'gh api repos/leusd100/rubikon-build/rulesets',
    'gh pr create --head fix/merge-x --draft --title x --body y',
    'pnpm exec playwright test tests/e2e/pr-critical.spec.ts --project=desktop-chromium',
    'pnpm lint && pnpm typecheck && pnpm test:unit',
    // Prose is not a command (27.10: a commit message that listed «gh pr merge» was stopped)
    'git commit -q -m "chore: guard asks before push у main, gh pr merge, wrangler deploy"',
    "git commit -m 'docs: never git push origin main'",
    "git commit -F - <<'EOF'\nci: gh pr merge and git push origin main are guarded\nEOF",
    'T="Co-Authored-By: x\ngh pr merge" && git add . && git commit -q -m "a b\n\n$T"',
    'git commit -m "рев\'ю правок" && git push -u origin claude/x',
    'cat lighthouserc.cjs && grep -n minScore lighthouserc.cjs',
    'cp lighthouserc.cjs /tmp/lighthouserc.backup.cjs',
  ])('lets %s through', (command) => {
    expect(bash(command)).toBe('allow');
  });

  it('asks before an edit to a baseline, the budgets, the Sonar scope or the guard itself, and lets other edits through', () => {
    expect(edit('/repo/tests/e2e/visual.spec.ts-snapshots/home-hero-375-linux.png')).toBe('ask');
    expect(edit('/repo/lighthouserc.cjs')).toBe('ask');
    expect(edit('/repo/sonar-project.properties')).toBe('ask');
    expect(edit('/repo/.claude/settings.json')).toBe('ask');
    expect(edit('/repo/.claude/hooks/guard_owner_actions.py')).toBe('ask');
    expect(edit('/repo/app/page.tsx')).toBe('allow');
    expect(decide({ tool_name: 'Read', tool_input: { file_path: '/repo/lighthouserc.cjs' } })).toBe('allow');
  });

  it('without a working Python, asks before anything that looks like an owner action instead of letting it through', () => {
    const env = { ...process.env, GUARD_PYTHON: '/nonexistent/python3' };
    expect(decide({ tool_name: 'Bash', tool_input: { command: 'git push origin main' } }, env)).toBe('ask');
    expect(decide({ tool_name: 'Bash', tool_input: { command: 'pnpm lint' } }, env)).toBe('allow');
  });
});
