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
    // …and on a short laptop window it steps down to the minor level, not to a size of its own (34 px before): both rules
    // in configurator-sheet.css, the compact one first — they are equally specific, and configurator.css's order against
    // that file is not promised, so configurator.css sets no size for the band's title
    const sheetCss = css['components/configurator/configurator-sheet.css'];
    const compactAt = sheetCss.search(/\n\.hangar-configurator-embedded \.hc-hero h2 \{ font-size: var\(--type-h2-compact\); \}/);
    const shortLaptopAt = sheetCss.search(/@media \(min-width: 1024px\) and \(max-height: 760px\) \{/);
    expect(compactAt).toBeGreaterThan(-1);
    expect(shortLaptopAt).toBeGreaterThan(compactAt);
    const shortLaptop = sheetCss.slice(shortLaptopAt).match(/\{([\s\S]*?)\n\}/)![1];
    expect(shortLaptop).toMatch(/\.hangar-configurator-embedded \.hc-hero :is\(h1, h2\) \{ font-size: var\(--type-h2-minor\);/);
    expect(css['configurator-preview/configurator.css']).not.toMatch(/\.hangar-configurator-embedded \.hc-hero (h2|:is\(h1, h2\)) \{[^}]*font-size/);
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
    // a person's role over the name is the UI label at every width (a phone had its own .09em)
    expect(globals).toMatch(/\.person-info > span \{[^}]*font-size: var\(--type-label-ui-size\); font-weight: var\(--type-label-ui-weight\);[^}]*letter-spacing: var\(--type-label-ui-track\)/);
    expect(globals).not.toMatch(/\.person-info > span \{[^}]*letter-spacing: \.09em/);
    // the consent sentence keeps its own sentence case
    expect(globals).toMatch(/\.inquiry-consent > span \{[^}]*text-transform: none !important/);
  });

  it('keeps the floor: fields 16 px at every width, the crumbs and eyebrow of a phone hero on the UI label', () => {
    expect(globals).toMatch(/\.inquiry-form input, \.inquiry-form select, \.inquiry-form textarea \{[^}]*font: 500 16px\/1\.4/);
    expect(css['phone-hero.css']).not.toMatch(/\.breadcrumb \{[^}]*font-size/);
    expect(css['phone-hero.css']).not.toMatch(/\.eyebrow \{[^}]*font-size/);
    expect(css['pro-nas/about.css']).not.toMatch(/\.about-subhero \.(breadcrumb|eyebrow) \{[^}]*font-size/);
    // Nothing under 11 px (the size of a font or font-size declaration, 10.5 px too) but what is known:
    // - an SVG drawing's own text (a selector ending on `text`, the frame tour's .ft-node-number) and the sheet field's
    //   marks (sheet-field.css);
    // - the /yak matrix's marks (10.5 px) and coordinator (10 px) under 375 px wide: in 12 / 11 px «Координуємо» runs up
    //   to 9 px into the next column's mark at 320–346 px (the comprehensive format, its groups open) — checked below;
    // - the form error's «!» (a glyph in its 14 px disc, W3-07);
    // - the header, menu and cookie bar (PDO-47, not this step).
    const small = /font(?:-size)?:\s*(?:[\w-]+\s+)*?(?:\d|10)(?:\.\d+)?px/;
    const known = /(?:^|[\s>,(])text$|\.ft-node-number$|\.pd-|\.dkey|hv2-detail-(label|part)|^\.rm-mark::before$|^\.rm-coordinator$|header-contact|messenger-link|logo-lab|cookie|mobile-menu|theme-options|inquiry-field-error::before/;
    for (const [file, text] of Object.entries(css)) {
      if (/r3f-spike|planner|logo|sheet-field/.test(file)) continue;
      for (const [, selector, body] of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!small.test(body) || known.test(selector.trim())) continue;
        expect(`${file}: ${selector.trim()} { ${body.trim().slice(0, 100)}`).toBe('');
      }
    }
    // …the matrix's two are the narrowest phones' only: from 375 px they are at the floor of a drawing-like table
    const matrix = css['components/process/resp-matrix.css'];
    expect(matrix.match(/@media \(max-width: 860px\) \{[\s\S]*?\n\}/)![0]).toMatch(/\.rm-mark::before \{[^}]*font-size: 10\.5px/);
    const from375 = matrix.match(/@media \(min-width: 375px\) and \(max-width: 860px\) \{([\s\S]*?)\n\}/)![1];
    expect(from375).toMatch(/\.rm-mark::before \{ font-size: 12px; \}/);
    expect(from375).toMatch(/\.rm-coordinator \{ font-size: 11px; \}/);
  });
});

// W3-03 (25.10, PDO-21, PDO-22 A, PDO-15, PDO-62; OD-PX-17 A): the rhythm of a section's entry and of the sections
describe('section rhythm (W3-03)', () => {
  const phoneRoot = globals.match(/@media \(max-width: 760px\) \{\n {2}:root \{([^}]*)\}/)![1];
  const value = (block: string, name: string) => block.match(new RegExp(`${name}: ([^;]+);`))?.[1];
  // the rules of a file outside any @media block, and the declarations of every rule that names a selector
  const rules = (text: string, selector: RegExp) => [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, sel]) => selector.test(sel)).map(([, , body]) => body);

  it('enters a section at label → H2 20 / 16, H2 → lead 24 / 20, header → content 40 / 32', () => {
    expect([value(rootBlock, '--rhythm-label'), value(rootBlock, '--rhythm-lead'), value(rootBlock, '--rhythm-header')]).toEqual(['var(--space-5)', 'var(--space-6)', 'var(--space-8)']);
    expect([value(phoneRoot, '--rhythm-label'), value(phoneRoot, '--rhythm-lead'), value(phoneRoot, '--rhythm-header')]).toEqual(['var(--space-4)', 'var(--space-5)', 'var(--space-7)']);
    expect(globals).toMatch(/\n\.section-header \{[^}]*gap: var\(--rhythm-lead\); margin-bottom: var\(--rhythm-header\); padding-bottom: var\(--rhythm-lead\);/);
    expect(globals).toMatch(/\n\.section-header-copy \.eyebrow \{ margin-bottom: var\(--rhythm-label\); \}/);
    expect(globals).toMatch(/\n\.page-heading \{ margin-bottom: var\(--rhythm-header\); \}/);
    // no rule fights the shared values: the old phone header values, the /napryamky list's and the team's own margins,
    // HOME's and the grain process band's phone headers
    expect(globals).not.toMatch(/\.section-header \{[^}]*(margin-bottom: 42px|gap: 26px)/);
    expect(globals).not.toMatch(/\.directions-index \.page-heading|\n\.team-heading \{/);
    expect(css['home-v2.css']).not.toMatch(/\.hv2-directions \.section-header \{/);
    expect(css['zernoskhovyshcha/grain-editorial.css']).not.toMatch(/\.grain-process-band \.section-header \{/);
  });

  it('drops the header’s rule where the content opens with its own, and only with :has()', () => {
    const one = globals.match(/\n\.section-header:has\(\+ :is\(([^)]*)\)\) \{ padding-bottom: 0; border-bottom: 0; \}/);
    expect(one?.[1].split(', ')).toEqual(['.cost-list', '.gc', '.about-cap', '.about-principles-grid', '.dfmt-grid', '.proc-resp-switch', '.dxi', '.direction-grid']);
    // the /napryamky list is ruled only between its rows: the header's rule is its top
    expect(one?.[1]).not.toMatch(/dcat/);
    // two have that edge only up to a width: the grain situations' card frames on a phone (from 761 px they are open
    // columns) and the /yak cost factors' drawing frame up to 1050 px (wider, the columns open with its caption)
    expect(globals).toMatch(/\n@media \(max-width: 760px\) \{ \.section-header:has\(\+ \.gs-list\) \{ padding-bottom: 0; border-bottom: 0; \} \}/);
    expect(globals).toMatch(/\n@media \(max-width: 1050px\) \{ \.section-header:has\(\+ \.proc-factors\) \{ padding-bottom: 0; border-bottom: 0; \} \}/);
    expect(globals.match(/\.section-header:has\([^{]*(gs-list|proc-factors)/g)).toHaveLength(2);
  });

  it('has one phone scale, 72 / 56, set in one place', () => {
    expect([value(phoneRoot, '--section-space'), value(phoneRoot, '--section-space-compact')]).toEqual(['72px', '56px']);
    for (const [file, text] of Object.entries(css)) {
      if (file === 'globals.css') continue;
      // a page may set its tablet values (/angary 761–1023 px), never the phone's
      for (const block of text.split(/@media \(max-width: 760px\)/).slice(1)) {
        expect(`${file}: ${/--section-space(-compact)?:/.test(block.slice(0, block.indexOf('\n}')))}`).toBe(`${file}: false`);
      }
    }
    expect(css['yak-pratsyuiemo/delivery.css']).not.toMatch(/--section-space/);
    // the grain bands are compact from 761 px only: a documented exception for the page's height budget
    const grain = css['zernoskhovyshcha/grain-editorial.css'];
    expect(rules(grain.replace(/@media \(min-width: 761px\) \{[^{}]*\{[^{}]*\} \}/g, ''), /\.grain-page/).filter((body) => /--section-space-compact/.test(body))).toEqual([]);
    expect(grain.match(/@media \(min-width: 761px\) \{ \.grain-page[^{]*\{ padding-block: var\(--section-space-compact\); \} \}/g)).toHaveLength(5);
  });

  it('joins two neighbours of one tone at the compact space on both sides, and leaves the grain bands their own rhythm', () => {
    expect(rules(globals, /\.cost-section:has\(\+ \.faq-section\)/)).toEqual([' padding-bottom: var(--section-space-compact); ']);
    expect(rules(globals, /\.cost-section \+ \.faq-section/)).toEqual([' padding-top: var(--section-space-compact); ']);
    // the grain complex → its situations and the FAQ → «Пов’язані» are grain's seams only: compact from 761 px with every
    // grain band, 72 on both sides on a phone («смуги зерна лишаються 72», OD-PX-17 A)
    expect(globals).not.toMatch(/\.gc-band(:has\(| \+)|\.faq-section(:has\(\+ \.related| \+ \.related)/);
  });
});
