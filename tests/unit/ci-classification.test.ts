import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classifyChanges, VISUAL_FREEZE_LABEL, visualMode, withVisualMode } from '../../scripts/ci/classify-changes.mjs';

describe('CI change classification', () => {
  it.each(['vite.config.ts', 'worker.ts', 'worker/cache-policy.ts', 'wrangler.jsonc',
    'app/lib/security/csp.ts', 'app/lib/consent.ts', 'app/lib/attribution.ts'])(
    '%s runs all affected boundaries', (file) => {
      expect(classifyChanges([file])).toMatchObject({
        planner: true, inquiry: true, leads: true, configurator: true, wide_visual: true,
      });
    },
  );
  it.each(['app/globals.css', 'app/layout.tsx'])(
    '%s runs the planner suites: the grain page height budget is measured on a page built from it', (file) => {
      expect(classifyChanges([file])).toMatchObject({ planner: true, wide_visual: true });
    },
  );
  it('leaves the homepage component out of the planner suites', () => {
    expect(classifyChanges(['app/page.tsx'])).toMatchObject({ planner: false, wide_visual: true });
  });
  it('never selects an empty visual job for a standalone stylesheet', () => {
    expect(classifyChanges(['app/custom-page.css'])).toMatchObject({ visual: true, wide_visual: true });
  });
  it('includes consent endpoint tests and the actual angary composition', () => {
    expect(classifyChanges(['tests/e2e/analytics-consent.spec.ts']).inquiry).toBe(true);
    expect(classifyChanges(['app/angary/page.tsx']).configurator).toBe(true);
  });
  it('keeps documentation-only changes outside focused regression jobs', () => {
    expect(classifyChanges(['docs/audit.md']).risk_any).toBe(false);
  });
});

// Design iteration and visual freeze (docs/ci-tier-model.md): a design/* pull request defers only the screenshot suites
// until it carries the visual-freeze label; functional areas and hero playback are selected by the paths in every mode.
describe('visual mode', () => {
  it.each([
    ['design/yak-pratsyuiemo-v3', [], 'prototype'],
    ['design/yak-pratsyuiemo-v3', ['needs-review'], 'prototype'],
    ['design/yak-pratsyuiemo-v3', [VISUAL_FREEZE_LABEL], 'freeze'],
    ['fix/inquiry-timeout', [], 'standard'],
    ['fix/inquiry-timeout', [VISUAL_FREEZE_LABEL], 'standard'],
    ['feat/home-slice-03', [], 'standard'],
    ['ci/design-iteration-gates', [], 'standard'],
    ['redesign/home', [], 'standard'],
    ['', [], 'standard'],
  ] as const)('%s with %j is %s', (headRef, labels, mode) => {
    expect(visualMode({ headRef, labels: [...labels] })).toBe(mode);
  });

  it('prototype defers the screenshot suites and nothing else', () => {
    const changed = ['app/globals.css', 'app/components/configurator/Scene.tsx', 'app/api/leads/route.ts', 'app/components/ProjectInquiryForm.tsx'];
    expect(withVisualMode(classifyChanges(changed), 'prototype')).toMatchObject({
      visual: false, visual_deferred: true, visual_mode: 'prototype',
      hero_playback: true, planner: true, configurator: true, leads: true, inquiry: true,
    });
  });

  it.each(['freeze', 'standard'] as const)('%s runs the screenshot suites exactly as the paths select them', (mode) => {
    expect(withVisualMode(classifyChanges(['app/custom-page.css']), mode)).toMatchObject({ visual: true, visual_deferred: false, visual_mode: mode });
    expect(withVisualMode(classifyChanges(['docs/audit.md']), mode)).toMatchObject({ visual: false, visual_deferred: false });
  });

  it('never marks visual regression deferred when the paths did not select it', () => {
    expect(withVisualMode(classifyChanges(['app/yak-pratsyuiemo/page.tsx']), 'prototype')).toMatchObject({ visual: false, visual_deferred: false });
  });

  it.each(['prototype', 'freeze', 'standard'] as const)('keeps planner, configurator and leads path-selected in %s mode', (mode) => {
    const pageOnly = withVisualMode(classifyChanges(['app/yak-pratsyuiemo/page.tsx']), mode);
    expect(pageOnly).toMatchObject({ planner: false, configurator: false, leads: false, inquiry: false });
    expect(withVisualMode(classifyChanges(['app/lib/planner/model.ts']), mode).planner).toBe(true);
    expect(withVisualMode(classifyChanges(['app/lib/configurator/geometry.ts']), mode).configurator).toBe(true);
    expect(withVisualMode(classifyChanges(['app/api/leads/route.ts']), mode).leads).toBe(true);
  });
});

describe('PR gate workflow', () => {
  const workflow = readFileSync('.github/workflows/pr-gate.yml', 'utf8');
  const jobIds = [...workflow.slice(workflow.indexOf('\njobs:')).matchAll(/^ {2}([a-z][\w-]*):\s*$/gm)].map((match) => match[1]);
  const gateNeeds = workflow.match(/^ {2}pr-gate:[\s\S]*?needs: \[([^\]]+)\]/m)?.[1].split(',').map((need) => need.trim());

  it('re-evaluates when a label is added or removed', () => {
    expect(workflow).toMatch(/types: \[[^\]]*\blabeled\b[^\]]*\bunlabeled\b[^\]]*\]/);
  });

  it('hands the branch and the labels to the classifier through the environment, never the shell', () => {
    expect(workflow).toContain('HEAD_REF: ${{ github.head_ref }}');
    expect(workflow).toContain('LABELS: ${{ toJSON(github.event.pull_request.labels.*.name) }}');
    expect(workflow).not.toMatch(/run:.*\$\{\{ github\.head_ref/);
  });

  it('makes PR Gate wait for every other job and fail on any selected one that did not pass', () => {
    expect(jobIds).toEqual(expect.arrayContaining(['classify', 'fast', 'planner', 'inquiry', 'leads', 'configurator', 'hero', 'visual', 'pr-gate']));
    expect(gateNeeds?.sort()).toEqual(jobIds.filter((id) => id !== 'pr-gate').sort());
    for (const id of jobIds.filter((job) => !['classify', 'fast', 'pr-gate'].includes(job))) {
      expect(workflow, id).toContain(`\${{ needs.${id}.result }}`);
    }
  });

  it('runs hero playback on its own path-selected job and the screenshot suites only when visual is selected', () => {
    expect(workflow).toMatch(/^ {2}hero:[\s\S]*?if: needs\.classify\.outputs\.hero_playback == 'true'[\s\S]*?tests\/e2e\/hero-video\.spec\.ts/m);
    expect(workflow).toMatch(/^ {2}visual:[\s\S]*?if: needs\.classify\.outputs\.visual == 'true'/m);
    expect(workflow.slice(workflow.indexOf('\n  visual:'))).not.toContain('hero-video.spec.ts');
  });
});
