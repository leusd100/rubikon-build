import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// W3-01 (25.10): the design tokens of app/globals.css :root and app/theme.css, declared with the values in use, and the
// rules that took them. The visible steps change the values (W3-02 type and labels, W3-03 rhythm, W3-06 buttons); these
// checks keep the names honest in the meantime: a misspelt token has no fallback, so its rule would silently lose
// the value.

const app = path.join(process.cwd(), 'app');
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const cssFiles: string[] = [];
const walk = (dir: string) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.css')) cssFiles.push(full);
  }
};
walk(app);
const css = Object.fromEntries(cssFiles.map((file) => [path.relative(app, file), strip(readFileSync(file, 'utf8'))]));
const globals = css['globals.css'];
const theme = css['theme.css'];
const rootBlock = globals.match(/\n:root \{([^}]*)\}/)![1];
const declared = new Set([...`${globals}\n${theme}`.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name));

const FAMILIES = /^--(type|rhythm|space|card|button|motion|ease|header)-/;

describe('design tokens (W3-01)', () => {
  it('declares the role tokens the visible steps build on', () => {
    for (const name of ['--header-h', '--type-h1', '--type-display-home', '--type-h2', '--type-h2-compact', '--type-h2-minor',
      '--type-h3', '--type-label-ui-size', '--type-action-size', '--type-label-tech-size', '--rhythm-label', '--rhythm-lead',
      '--rhythm-cta', '--card-pad', '--card-gap', '--button-h-l', '--button-h-m', '--space-1', '--space-10', '--motion-micro', '--motion-reveal',
      '--motion-draw', '--motion-draw-long', '--motion-media-fade', '--ease-plot', '--ease-standard']) {
      expect(rootBlock, name).toMatch(new RegExp(`${name}:`));
    }
    expect(rootBlock).toMatch(/--header-h: 101px;/);
    expect(rootBlock).toMatch(/--button-h-l: 56px;/);
    expect(rootBlock).toMatch(/--button-h-m: 48px;/);
    // The spacing scale: 4 px steps up to 24, then 32 / 40 / 48 / 64
    expect([...rootBlock.matchAll(/--space-(\d+): (\d+)px;/g)].map(([, step, px]) => [Number(step), Number(px)]))
      .toEqual([[1, 4], [2, 8], [3, 12], [4, 16], [5, 20], [6, 24], [7, 32], [8, 40], [9, 48], [10, 64]]);
  });

  it('keeps the type roles in rem, so a larger browser text size reaches them', () => {
    for (const [, name, value] of globals.matchAll(/(--type-(?:h1|display-home|h2|h2-compact|h2-minor|h3|[\w-]+-size)): ([^;]+);/g)) {
      expect(value, name).not.toMatch(/\d(px)\b/);
    }
  });

  it('resolves every token of the families a rule names', () => {
    const missing: string[] = [];
    for (const [file, text] of Object.entries(css)) {
      for (const [, name] of text.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
        if (FAMILIES.test(name) && !declared.has(name)) missing.push(`${file}: ${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('names the header height once: no 101px literal outside the token', () => {
    const literal = Object.entries(css).filter(([, text]) => /(?<![\w.-])101px/.test(text.replace(/--header-h: 101px;/, '')));
    expect(literal.map(([file]) => file)).toEqual([]);
  });

  it('removed the dead type tokens and the losing .related-directions-title', () => {
    expect(globals).not.toMatch(/--(text-(xs|sm|md|lg)|title-page|title-section|hero-title|hero-title-home)\b/);
    expect(globals).not.toMatch(/(^|\n)\.related-directions-title \{/);
    expect(css['components/directions/direction-template.css']).toMatch(/\.related-directions-section \.related-directions-title \{/);
  });

  it('keeps the load colours one pair for both modes, used by HOME and the frame tour', () => {
    const light = theme.match(/\n:root \{([^}]*)\}/)![1];
    expect(light).toMatch(/--color-load: #5AA8FF;/);
    expect(light).toMatch(/--color-wind: #4FD8C8;/);
    expect(theme.replace(light, '')).not.toMatch(/--color-(load|wind):/);
    expect(css['home-v2.css']).toMatch(/--hv2-load: var\(--color-load\);/);
    expect(css['components/angary/frame-tour.css']).toMatch(/--ft-snow: var\(--color-load\); --ft-wind: var\(--color-wind\);/);
  });
});
