import { spawnSync } from 'node:child_process';

const enabled = (name) => process.env[name] === 'true';
const tests = new Set();

if (enabled('WIDE_VISUAL')) {
  tests.add('tests/e2e/visual.spec.ts');
  tests.add('tests/e2e/brand-logo-visual.spec.ts');
  tests.add('tests/e2e/configurator-visual.spec.ts');
  tests.add('tests/e2e/configurator-3d-visual.spec.ts');
  tests.add('tests/e2e/grain-planner-visual.spec.ts');
} else {
  if (enabled('BRAND_VISUAL')) tests.add('tests/e2e/brand-logo-visual.spec.ts');
  if (enabled('CONFIGURATOR')) {
    tests.add('tests/e2e/configurator-visual.spec.ts');
    tests.add('tests/e2e/configurator-3d-visual.spec.ts');
  }
  if (enabled('PLANNER')) tests.add('tests/e2e/grain-planner-visual.spec.ts');
}

if (tests.size === 0) {
  console.log('No visual suites selected.');
  process.exit(0);
}

console.log(`Visual suites:\n${[...tests].map((test) => `- ${test}`).join('\n')}`);
const result = spawnSync(
  'pnpm',
  ['exec', 'playwright', 'test', '--project=visual-chromium', ...tests],
  { stdio: 'inherit', env: process.env },
);

process.exit(result.status ?? 1);
