import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const [baseSha, headSha] = process.argv.slice(2);
if (!baseSha || !headSha) {
  throw new Error('Usage: node scripts/ci/classify-changes.mjs <base-sha> <head-sha>');
}

const files = execFileSync('git', ['diff', '--name-only', `${baseSha}...${headSha}`], {
  encoding: 'utf8',
}).trim().split('\n').filter(Boolean);

const exact = (paths) => (file) => paths.includes(file);
const prefix = (paths) => (file) => paths.some((path) => file.startsWith(path));
const matches = (...rules) => files.some((file) => rules.some((rule) => rule(file)));

const infrastructure = matches(
  exact(['package.json', 'pnpm-lock.yaml', 'playwright.config.ts', 'tsconfig.json', 'vitest.config.ts']),
  prefix(['.github/actions/', '.github/workflows/', 'scripts/ci/']),
);

const planner = infrastructure || matches(
  prefix([
    'app/components/grain-planner/',
    'app/components/planner/',
    'app/lib/planner/',
    'app/zernoskhovyshcha/',
    'app/planner-preview/',
    'tests/e2e/grain-',
    'tests/unit/planner/',
  ]),
  exact(['app/data/grainPage.ts', 'app/data/grainPlannerPresentation.ts']),
);

const inquiry = infrastructure || matches(
  prefix(['app/components/inquiry/', 'app/lib/inquiry/']),
  exact([
    'app/components/InquirySection.tsx',
    'app/components/ProjectInquiryForm.tsx',
    'tests/e2e/form.spec.ts',
    'tests/e2e/consent.spec.ts',
  ]),
);

const leads = infrastructure || matches(
  prefix(['app/api/leads/', 'drizzle/', 'migrations/']),
  exact(['tests/unit/leads-route.test.ts']),
);

const configurator = infrastructure || matches(
  prefix([
    'app/components/configurator/',
    'app/lib/configurator/',
    'app/configurator-preview/',
    'tests/e2e/configurator-',
    'tests/unit/configurator/',
  ]),
);

const topLevelSharedComponent = (file) => {
  if (!file.startsWith('app/components/')) return false;
  return !file.slice('app/components/'.length).includes('/');
};

const wideVisual = infrastructure || matches(
  exact(['app/globals.css', 'app/layout.tsx', 'app/page.tsx', 'app/icon.svg']),
  prefix(['app/data/', 'public/media', 'tests/e2e/visual.spec.ts']),
  topLevelSharedComponent,
);

const brandVisual = infrastructure || matches(
  prefix(['public/brand/', 'tests/e2e/brand-logo-visual.spec.ts']),
  exact(['app/components/SiteChrome.tsx', 'app/icon.svg', 'public/favicon.svg']),
);

const visual = wideVisual || brandVisual || planner || configurator || matches(
  (file) => file.endsWith('.css'),
  prefix(['tests/e2e/brand-logo-visual.spec.ts-snapshots/']),
);

const outputs = {
  planner,
  inquiry,
  leads,
  configurator,
  visual,
  wide_visual: wideVisual,
  brand_visual: brandVisual,
  risk_any: planner || inquiry || leads || configurator || visual,
};

const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join('\n');
console.log(`Changed files:\n${files.map((file) => `- ${file}`).join('\n') || '- none'}`);
console.log(`Classification:\n${lines}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `${lines}\n`);
}
