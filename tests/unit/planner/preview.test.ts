import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { releaseFlags } from '../../../app/data/releaseFlags';
import robots from '../../../app/robots';
import sitemap from '../../../app/sitemap';

const PREVIEW = '/planner-preview';

describe('/planner-preview stays a private review surface', () => {
  it('is disallowed in robots.txt', () => {
    const rules = robots().rules;
    const disallow = (Array.isArray(rules) ? rules : [rules]).flatMap((rule) => rule.disallow ?? []);
    expect(disallow).toContain(PREVIEW);
  });

  it('is not in the sitemap', () => {
    expect(sitemap().map((entry) => entry.url).some((url) => url.includes(PREVIEW))).toBe(false);
  });

  it('declares noindex, nofollow metadata', () => {
    const page = readFileSync(join(process.cwd(), 'app', 'planner-preview', 'page.tsx'), 'utf8');
    expect(page).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  });

  it('does not switch /zernoskhovyshcha to the planner yet', () => {
    expect(releaseFlags.grainPlannerOnZernoskhovyshcha).toBe(false);
  });

  it('loads the grain stylesheets on /zernoskhovyshcha exactly when the flag is on', () => {
    const route = readFileSync(join(process.cwd(), 'app', 'zernoskhovyshcha', 'page.tsx'), 'utf8');
    const imports = ['grain-planner', 'grain-editorial'].map((name) => new RegExp(`^import '\\./${name}\\.css';$`, 'm').test(route));
    const on = releaseFlags.grainPlannerOnZernoskhovyshcha;
    expect(imports).toEqual([on, on]);
  });

  it('loads both grain stylesheets on the preview', () => {
    const page = readFileSync(join(process.cwd(), 'app', 'planner-preview', 'page.tsx'), 'utf8');
    for (const name of ['grain-planner', 'grain-editorial']) expect(page).toMatch(new RegExp(`^import '\\.\\./zernoskhovyshcha/${name}\\.css';$`, 'm'));
  });
});
