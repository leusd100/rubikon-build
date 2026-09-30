import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

/** The label that freezes a design/* pull request's look: from then on its visual regression runs and blocks. */
export const VISUAL_FREEZE_LABEL = 'visual-freeze';

/** @param {string[]} files */
export function classifyChanges(files) {
  const exact = (paths) => (file) => paths.includes(file);
  const prefix = (paths) => (file) => paths.some((path) => file.startsWith(path));
  const matches = (...rules) => files.some((file) => rules.some((rule) => rule(file)));

  const infrastructure = matches(
    exact(['package.json', 'pnpm-lock.yaml', 'playwright.config.ts', 'tsconfig.json', 'vitest.config.ts', 'vite.config.ts', 'worker.ts', 'wrangler.jsonc',
      'app/lib/consent.ts', 'app/lib/attribution.ts', 'app/lib/security/csp.ts']),
    prefix(['.github/actions/', '.github/workflows/', 'scripts/ci/', 'worker/', 'server/', 'app/hooks/', 'app/lib/security/']),
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
    // The grain page's height budget (tests/e2e/grain-page.spec.ts) is measured on a page built from the shared
    // stylesheet and root layout, so a change to either can break it — HOME slice 01 did, and it merged green.
    exact(['app/data/grainPage.ts', 'app/data/grainPlannerPresentation.ts', 'app/globals.css', 'app/layout.tsx']),
  );

  const inquiry = infrastructure || matches(
    prefix(['app/components/inquiry/', 'app/lib/inquiry/']),
    exact([
      'app/components/ConversationSection.tsx',
      'app/data/conversation.ts',
      'app/conversation.css',
      'app/components/ProjectInquiryForm.tsx',
      'tests/e2e/form.spec.ts',
      'tests/e2e/consent.spec.ts',
      'tests/e2e/analytics-consent.spec.ts',
      'app/components/AnalyticsConsent.tsx',
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
      'app/angary/',
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
    (file) => file.endsWith('.css'),
    (file) => file.startsWith('tests/e2e/hero-video'),
  );

  const brandVisual = infrastructure || matches(
    prefix(['public/brand/', 'tests/e2e/brand-logo-visual.spec.ts']),
    exact(['app/components/SiteChrome.tsx', 'app/icon.svg', 'public/favicon.svg']),
  );

  const visual = wideVisual || brandVisual || planner || configurator || matches(
    (file) => file.endsWith('.css'),
    prefix(['tests/e2e/brand-logo-visual.spec.ts-snapshots/']),
  );

  return {
    planner,
    inquiry,
    leads,
    configurator,
    visual,
    wide_visual: wideVisual,
    brand_visual: brandVisual,
    risk_any: planner || inquiry || leads || configurator || visual,
  };

}

/**
 * The pull request's visual mode (docs/ci-tier-model.md → Design iteration and visual freeze):
 *   prototype — a design/* branch without the visual-freeze label: screenshot suites are deferred;
 *   freeze    — a design/* branch with the label: screenshot suites run and block, as the paths select them;
 *   standard  — any other branch: unchanged.
 * @param {{ headRef?: string, labels?: string[] }} pullRequest
 * @returns {'prototype' | 'freeze' | 'standard'}
 */
export function visualMode({ headRef = '', labels = [] }) {
  if (!headRef.startsWith('design/')) return 'standard';
  return labels.includes(VISUAL_FREEZE_LABEL) ? 'freeze' : 'prototype';
}

/**
 * Applies the visual mode to a path classification. Prototype mode defers only the screenshot suites: hero playback
 * (behaviour, not pixels) and every functional area stay exactly as the paths select them.
 * @param {ReturnType<typeof classifyChanges>} outputs
 * @param {'prototype' | 'freeze' | 'standard'} mode
 */
export function withVisualMode(outputs, mode) {
  const deferred = mode === 'prototype' && outputs.visual;
  return {
    ...outputs,
    hero_playback: outputs.wide_visual,
    visual: outputs.visual && !deferred,
    visual_deferred: deferred,
    visual_mode: mode,
  };
}

/** @param {string | undefined} json */
function parseLabels(json) {
  try {
    const labels = JSON.parse(json || '[]');
    return Array.isArray(labels) ? labels.filter((label) => typeof label === 'string') : [];
  } catch {
    return [];
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [baseSha, headSha] = process.argv.slice(2);
  if (!baseSha || !headSha) {
    throw new Error('Usage: node scripts/ci/classify-changes.mjs <base-sha> <head-sha>');
  }

  const files = execFileSync('git', ['diff', '--name-only', `${baseSha}...${headSha}`], {
    encoding: 'utf8',
  }).trim().split('\n').filter(Boolean);

  // Branch and labels arrive through the environment (never interpolated into the shell): HEAD_REF, LABELS (JSON array)
  const mode = visualMode({ headRef: process.env.HEAD_REF, labels: parseLabels(process.env.LABELS) });
  const outputs = withVisualMode(classifyChanges(files), mode);
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join('\n');
  console.log(`Changed files:\n${files.map((file) => `- ${file}`).join('\n') || '- none'}`);
  console.log(`Classification:\n${lines}`);

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${lines}\n`);
  }
  if (outputs.visual_deferred) {
    console.log(`::notice title=Visual regression deferred::design/* exploration — add the ${VISUAL_FREEZE_LABEL} label once the owner approves the look`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const visual = outputs.visual_deferred ? `deferred until the \`${VISUAL_FREEZE_LABEL}\` label` : outputs.visual ? 'selected, blocking' : 'not selected by the paths';
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Visual mode: **${mode}** — visual regression ${visual}.\n`);
  }
}
