import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// app/theme.css holds the colour roles: Light on :root, Dark on :root[data-theme="dark"], and the same Dark set
// again for System without JavaScript (@media prefers-color-scheme, :root:not([data-theme])). CSS cannot share one
// block between the two selectors, so this keeps the copy honest.

const root = fileURLToPath(new URL('../../', import.meta.url));
const css = readFileSync(path.join(root, 'app/theme.css'), 'utf8');

function declarations(selectorPattern: RegExp) {
  const match = css.match(selectorPattern);
  if (!match) throw new Error(`block not found: ${selectorPattern}`);
  return Object.fromEntries(
    [...match[1].matchAll(/(--[\w-]+|color-scheme)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );
}

const light = declarations(/\n:root \{([^}]*)\}/);
const dark = declarations(/:root\[data-theme="dark"\] \{([^}]*)\}/);
const noScriptDark = declarations(/:root:not\(\[data-theme\]\) \{([^}]*)\}/);

const HEX = /^#[0-9a-f]{6}$/i;

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('colour roles (app/theme.css)', () => {
  it('repeats the Dark set verbatim for System without JavaScript', () => {
    expect(noScriptDark).toEqual(dark);
  });

  it('only redefines roles that Light defines, and sets the native colour scheme per mode', () => {
    for (const name of Object.keys(dark)) expect(light, name).toHaveProperty(name);
    expect(light['color-scheme']).toBe('light');
    expect(dark['color-scheme']).toBe('dark');
  });

  it('defines the minimum role set the brief names', () => {
    for (const name of ['--color-bg', '--color-surface', '--color-surface-alt', '--color-surface-elevated', '--color-text',
      '--color-text-secondary', '--color-text-muted', '--color-border', '--color-border-control', '--color-dark', '--color-dark-text',
      '--color-accent', '--color-accent-strong', '--color-accent-hover', '--color-accent-on-dark', '--color-focus',
      '--color-success', '--color-warning', '--color-error']) {
      expect(light, name).toHaveProperty(name);
    }
  });

  // Every text role against every content surface of its own mode (resolved: Dark falls back to Light for a role it
  // does not redefine, e.g. --color-dark-text).
  it.each(['light', 'dark'] as const)('%s: text, copper text, status and focus reach AA on every surface', (mode) => {
    const roles = mode === 'light' ? light : { ...light, ...dark };
    const surfaces = ['--color-bg', '--color-surface', '--color-surface-alt', '--color-surface-elevated', '--color-field'];
    for (const surface of surfaces) {
      for (const [text, min] of [['--color-text', 7], ['--color-text-secondary', 4.5], ['--color-text-muted', 4.5],
        ['--color-accent-strong', 4.5], ['--color-success', 4.5], ['--color-warning', 4.5], ['--color-error', 4.5],
        ['--color-focus', 3], ['--color-border-control', 3], ['--color-accent', 3]] as const) {
        expect(roles[text], text).toMatch(HEX);
        expect(contrast(roles[text], roles[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(min);
      }
    }
    expect(contrast(roles['--color-on-action'], roles['--color-action']), 'action label').toBeGreaterThanOrEqual(4.5);
    expect(contrast(roles['--color-on-action'], roles['--color-action-hover']), 'action label, hover').toBeGreaterThanOrEqual(4.5);
    for (const [text, surface] of [['--color-dark-text', '--color-dark'], ['--color-dark-text-secondary', '--color-dark-surface'],
      ['--color-dark-text-muted', '--color-dark-surface'], ['--color-accent-on-dark', '--color-dark-surface']] as const) {
      expect(contrast(roles[text], roles[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
