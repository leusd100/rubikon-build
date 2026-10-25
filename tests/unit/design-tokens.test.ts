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

// W3-02 (25.10, PDO-60 T4, PDO-16, PDO-63; OD-PX-16 a): the values the visible pass gave the roles
describe('type scale and labels (W3-02)', () => {
  const phoneRoot = globals.match(/@media \(max-width: 760px\) \{\n {2}:root \{([^}]*)\}/)![1];
  const value = (block: string, name: string) => block.match(new RegExp(`${name}: ([^;]+);`))?.[1];

  it('has three H2 levels and one display H3: 64.8 / 51.84 / 36 and 28 px at 1440', () => {
    expect(value(rootBlock, '--type-h2')).toBe('clamp(2.375rem, 4.5vw, 4.5rem)');
    expect(value(rootBlock, '--type-h2-compact')).toBe('clamp(2.25rem, 3.6vw, 3.25rem)');
    expect(value(rootBlock, '--type-h2-minor')).toBe('clamp(1.75rem, 2.5vw, 2.25rem)');
    expect(value(rootBlock, '--type-h3')).toBe('clamp(1.5rem, 1.95vw, 1.75rem)');
    // a phone: the compact level is the section size, the minor one step under it, the H3 24 px
    expect(value(phoneRoot, '--type-h2-compact')).toBe('var(--type-h2)');
    expect(value(phoneRoot, '--type-h2-minor')).toBe('clamp(1.625rem, 7vw, 1.75rem)');
    expect(value(phoneRoot, '--type-h3')).toBe('1.5rem');
  });

  it('puts the titles beside a figure or a form on the compact level, and the closing ones on the minor', () => {
    expect(globals).toMatch(/\.direction-editorial-copy h2 \{[^}]*font: 400 var\(--type-h2-compact\)/);
    expect(globals).toMatch(/\.about-story-copy h2 \{[^}]*font-size: var\(--type-h2-compact\)/);
    expect(css['pro-nas/about.css']).toMatch(/\.about-story-copy h2 \{[^}]*font: 400 var\(--type-h2-compact\)/);
    expect(css['conversation.css']).toMatch(/\.conversation h2 \{[^}]*font: 400 var\(--type-h2-compact\)/);
    expect(css['configurator-preview/configurator.css']).toMatch(/\.hangar-configurator-embedded \.hc-hero h2 \{ font-size: var\(--type-h2-compact\); \}/);
    expect(css['components/directions/direction-template.css']).toMatch(/\.related-directions-title \{[^}]*font: 400 var\(--type-h2-minor\)/);
    expect(css['components/directions/direction-template.css']).toMatch(/\.direction-entry-list h3 \{[^}]*font: 400 var\(--type-h3\)/);
    expect(css['home-v2.css']).toMatch(/\.hv2-evidence-lead h3 \{[^}]*font: 400 var\(--type-h3\)/);
    expect(css['napryamky/directions.css']).toMatch(/\.dhow-formats h3 \{[^}]*font: 400 var\(--type-h3\)/);
    // the grain band's own 34–48 px clamp is gone: the band takes the node's compact level
    expect(css['zernoskhovyshcha/grain-editorial.css']).not.toMatch(/grain-implementation-band \.direction-editorial-copy h2 \{ font-size/);
  });

  it('gives the three labels their values: UI 800 12 / .10em, action 800 13 / .06em, technical 700 12 / .08em', () => {
    expect([value(rootBlock, '--type-label-ui-weight'), value(rootBlock, '--type-label-ui-size'), value(rootBlock, '--type-label-ui-track')]).toEqual(['800', '.75rem', '.1em']);
    expect([value(rootBlock, '--type-action-weight'), value(rootBlock, '--type-action-size'), value(rootBlock, '--type-action-track')]).toEqual(['800', '.8125rem', '.06em']);
    expect([value(rootBlock, '--type-label-tech-weight'), value(rootBlock, '--type-label-tech-size'), value(rootBlock, '--type-label-tech-track')]).toEqual(['700', '.75rem', '.08em']);
  });

  it('sets the kickers in Manrope on the UI label and the form labels on the action', () => {
    expect(css['conversation.css']).toMatch(/\.conversation-kicker \{[^}]*font: var\(--type-label-ui-weight\) var\(--type-label-ui-size\)\/1\.2 var\(--font-manrope\)/);
    expect(globals).toMatch(/\.inquiry-form-kicker \{[^}]*font: var\(--type-label-ui-weight\) var\(--type-label-ui-size\)\/1 var\(--font-manrope\)/);
    expect(globals).toMatch(/\.inquiry-form-section-title \{[^}]*color: var\(--color-accent-strong\); font: var\(--type-label-ui-weight\)/);
    expect(css['home-v2.css']).toMatch(/\.hv2-kicker \{[^}]*var\(--type-label-ui-size\)\/1\.2 var\(--font-manrope\)/);
    expect(globals).toMatch(/\.inquiry-form label > span, \.inquiry-choice legend \{[^}]*font-size: var\(--type-action-size\)/);
    // the consent sentence keeps its own sentence case
    expect(globals).toMatch(/\.inquiry-consent > span \{[^}]*text-transform: none !important/);
  });

  it('keeps the floor: fields 16 px at every width, the crumbs and eyebrow of a phone hero on the UI label', () => {
    expect(globals).toMatch(/\.inquiry-form input, \.inquiry-form select, \.inquiry-form textarea \{[^}]*font: 500 16px\/1\.4/);
    expect(css['phone-hero.css']).not.toMatch(/\.breadcrumb \{[^}]*font-size/);
    expect(css['phone-hero.css']).not.toMatch(/\.eyebrow \{[^}]*font-size/);
    expect(css['pro-nas/about.css']).not.toMatch(/\.about-subhero \.(breadcrumb|eyebrow) \{[^}]*font-size/);
    for (const [file, text] of Object.entries(css)) {
      if (/r3f-spike|planner|logo/.test(file)) continue;
      // Nothing under 11 px but what is known: an SVG drawing's own text and the sheet field's marks, the configurator
      // sheet's quiet sizes line (its configurator-3d shots), the matrix's coordinator under 375 px, the form error's
      // «!» (a glyph in its 14 px disc, W3-07), and the header, menu and cookie bar (PDO-47, not this step)
      for (const [rule] of text.matchAll(/[^{}]+\{[^}]*\b(?:9(?:\.\d)?|10)px\b[^}]*\}/g)) {
        if (/text\b|\.pd-|\.dkey|hv2-detail-(label|part)|sheet-field|hc-preview-sheet \.hc-three-overlay dt|\.rm-coordinator \{ font-size: 10px|header-contact|messenger-link span|logo-lab|cookie|mobile-menu|theme-options|inquiry-field-error::before/.test(rule)) continue;
        if (!/font(-size)?:[^;]*\b(?:9(?:\.\d)?|10)px/.test(rule)) continue;
        expect(`${file}: ${rule.trim().slice(0, 120)}`).toBe('');
      }
    }
  });
});
