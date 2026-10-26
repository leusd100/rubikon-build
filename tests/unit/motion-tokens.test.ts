import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { customPropertyDeclarations, motionDeclarations, timeLiterals } from '../../scripts/motion/css-motion.mjs';

// Motion v1 (M1-1): a transition or an animation takes its time and its curve from a token, never from a literal. The
// tokens live in app/globals.css :root; each stylesheet's own choreography (its times, delays and curves that no token
// covers) is a block of `--<prefix>-for|at|curve-*` variables at the top of that file. This guard holds the line while the
// files move over, group by group (Tasks A3–A8 of the plan): a file in PENDING still carries literals and is exempt from
// «keeps numbers out»; a task that migrates its files removes them from the list, and from then on they are checked.
// scripts/motion/motion-diff.mjs proves the move changed no value; this file proves it stays moved.
//
// Scope: the transition*/animation* declarations of the app's CSS files, and the custom properties of the token
// (`--motion|ease|duration-*`) and choreography (`--<prefix>-for|at|curve-*`) families they take their values from. Out of
// scope: an intermediate custom property of any other name (`--x: .3s` read by `transition: opacity var(--x)`), and the
// inline styles of TSX.

const app = path.join(process.cwd(), 'app');
const files: string[] = [];
const walk = (dir: string) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.css')) files.push(full);
  }
};
walk(app);
const sheets: Record<string, string> = Object.fromEntries(
  files.map((file) => [path.relative(app, file).split(path.sep).join('/'), readFileSync(file, 'utf8')]),
);
const names = Object.keys(sheets).sort();

/** The files (relative to app/) that still hold literal times or curves in a transition or an animation */
const PENDING: readonly string[] = [
  'components/configurator/general-view.css',
  'globals.css',
  'components/configurator/configurator-sheet.css',
  'configurator-preview/configurator.css',
  'components/configurator/configurator-controls.css',
];

/** A choreography variable: a file's own time, delay or curve — `--rm-for-row`, `--ft-at-step`, `--fd-curve-draw` */
const CHOREOGRAPHY = /^--[a-z0-9]+-(?:for|at|curve)-/;
/** A variable a motion declaration may take: a token (`--motion-*`, `--ease-*`, `--duration-*`) or a choreography variable */
const MOTION_VARIABLE = /^--(?:(?:motion|ease|duration)-|[a-z0-9]+-(?:for|at|curve)-)/;

/** The token families: a declaration of one of these names belongs in globals.css :root and nowhere else */
const TOKEN_FAMILY = /^--(?:motion|ease|duration)-/;

const isChoreography = (name: string) => CHOREOGRAPHY.test(name);
const propertyDeclarations = (file: string) => customPropertyDeclarations(sheets[file]);
const hasLiteral = (value: string) => timeLiterals(value).length > 0 || value.includes('cubic-bezier(');
const variablesIn = (value: string) => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map(([, name]) => name);
const row = (file: string, { selector, property, value }: { selector: string; property: string; value: string }) =>
  `${file} | ${selector} | ${property} | ${value}`;

/** What globals.css :root must declare, once each, with these exact values */
const TOKENS: Record<string, string> = {
  '--motion-micro': '200ms',
  '--motion-ui': '360ms',
  '--motion-enter': '700ms',
  '--motion-draw': '900ms',
  '--motion-draw-long': '1400ms',
  '--motion-media-fade': '800ms',
  '--motion-stagger': '80ms',
  '--motion-rise': '16px',
  '--ease-premium': 'cubic-bezier(.2, .7, .1, 1)',
  '--ease-plot': 'cubic-bezier(.55, 0, .25, 1)',
  '--ease-standard': 'cubic-bezier(.4, 0, .2, 1)',
  '--ease-signature': 'cubic-bezier(.3, 1.5, .5, 1)',
  '--duration-fast': 'var(--motion-micro)',
  '--duration-medium': 'var(--motion-ui)',
};

describe('Motion v1 tokens (M1-1)', () => {
  it('declares the Motion v1 tokens', () => {
    const declared = propertyDeclarations('globals.css');
    const topLevel = (name: string) => declared.filter((entry) => entry.name === name && entry.selector === ':root' && entry.atRule === null);

    for (const [name, value] of Object.entries(TOKENS)) {
      expect(topLevel(name).map((entry) => entry.value), name).toEqual([value]);
    }
    // The phone rise: 10 px up to 760 px, in the file's one phone :root override
    expect(
      declared.filter((entry) => entry.name === '--motion-rise' && entry.atRule !== null).map(({ selector, atRule, value }) => ({ selector, atRule, value })),
    ).toEqual([{ selector: ':root', atRule: '@media (max-width: 760px)', value: '10px' }]);
    // --motion-reveal (420ms) was declared and used by nothing: gone, and it stays gone
    for (const file of names) {
      expect(propertyDeclarations(file).filter((entry) => entry.name === '--motion-reveal'), file).toEqual([]);
      expect(sheets[file], file).not.toMatch(/var\(\s*--motion-reveal\b/);
    }
  });

  it('keeps numbers out of transitions and animations', () => {
    const literals: string[] = [];
    for (const file of names.filter((name) => !PENDING.includes(name))) {
      for (const declaration of motionDeclarations(sheets[file])) {
        if (hasLiteral(declaration.value)) literals.push(row(file, declaration));
      }
    }
    expect(literals).toEqual([]);
  });

  it('keeps PENDING exact: each file listed exists, is listed once, and still carries a literal', () => {
    expect(new Set(PENDING).size, 'duplicates').toBe(PENDING.length);
    const unknown = PENDING.filter((file) => !(file in sheets));
    expect(unknown, 'not a stylesheet under app/').toEqual([]);
    const clean = PENDING.filter((file) => !motionDeclarations(sheets[file]).some(({ value }) => hasLiteral(value)));
    expect(clean, 'no literal left: take it off PENDING').toEqual([]);
    const missed = names.filter((file) => !PENDING.includes(file) && motionDeclarations(sheets[file]).some(({ value }) => hasLiteral(value)));
    expect(missed, 'a literal outside PENDING').toEqual([]);
  });

  it('resolves every motion variable in its own file or the tokens', () => {
    // A token (`--motion-*`, `--ease-*`, `--duration-*`) may come from the file or from globals.css / theme.css; a
    // choreography variable only from its own file, so a name declared in globals.css is usable from globals.css alone
    const tokens = new Set(['globals.css', 'theme.css'].flatMap((file) => propertyDeclarations(file).map(({ name }) => name)));
    const unresolved: string[] = [];
    for (const file of names) {
      const own = new Set(propertyDeclarations(file).map(({ name }) => name));
      for (const declaration of motionDeclarations(sheets[file])) {
        for (const name of variablesIn(declaration.value)) {
          const known = isChoreography(name) ? own.has(name) : own.has(name) || tokens.has(name);
          if (MOTION_VARIABLE.test(name) && !known) unresolved.push(`${row(file, declaration)} | ${name}`);
        }
      }
    }
    expect(unresolved).toEqual([]);
  });

  it('declares the motion family only as the Motion v1 tokens', () => {
    // One name, one place: a `--motion-*` / `--ease-*` / `--duration-*` declared again in another file, in a media query or
    // under a new name would shadow a token or pass a number round the guard (`.x { --motion-local: .3s }`)
    const place = (file: string, atRule: string | null, selector: string, name: string, value: string) =>
      `${file} | ${atRule ? `${atRule} | ` : ''}${selector} | ${name}: ${value}`;
    const allowed = new Set([
      ...Object.entries(TOKENS).map(([name, value]) => place('globals.css', null, ':root', name, value)),
      place('globals.css', '@media (max-width: 760px)', ':root', '--motion-rise', '10px'),
    ]);
    const seen = new Set<string>();
    const stray: string[] = [];
    for (const file of names) {
      for (const { name, value, selector, atRule } of propertyDeclarations(file)) {
        if (!TOKEN_FAMILY.test(name)) continue;
        const key = place(file, atRule, selector, name, value);
        if (allowed.has(key) && !seen.has(key)) seen.add(key);
        else stray.push(key);
      }
    }
    expect(stray).toEqual([]);
  });

  it('declares each choreography variable once', () => {
    const repeated: string[] = [];
    for (const file of names) {
      const counts = new Map<string, number>();
      for (const { name } of propertyDeclarations(file)) if (isChoreography(name)) counts.set(name, (counts.get(name) ?? 0) + 1);
      for (const [name, count] of counts) if (count !== 1) repeated.push(`${file} | ${name} | ${count} declarations`);
    }
    expect(repeated).toEqual([]);
  });

  it('keeps each choreography variable in one file', () => {
    // :root is one scope for every stylesheet: the same name in two files would silently override each other at runtime
    const owners = new Map<string, Set<string>>();
    for (const file of names) {
      for (const { name } of propertyDeclarations(file)) {
        if (isChoreography(name)) owners.set(name, (owners.get(name) ?? new Set()).add(file));
      }
    }
    const shared = [...owners].filter(([, set]) => set.size > 1).map(([name, set]) => `${name} | ${[...set].sort().join(', ')}`);
    expect(shared).toEqual([]);
  });

  it('declares choreography variables only in a top-level :root rule', () => {
    const misplaced: string[] = [];
    for (const file of names) {
      for (const { name, value, selector, atRule } of propertyDeclarations(file)) {
        if (isChoreography(name) && (selector !== ':root' || atRule !== null)) misplaced.push(`${file} | ${atRule ? `${atRule} | ` : ''}${selector} | ${name}: ${value}`);
      }
    }
    expect(misplaced).toEqual([]);
  });

  it('gives choreography variables no fallback', () => {
    // var(--rm-for-row, 300ms) would hide a missing or misspelt declaration behind a number
    const withFallback: string[] = [];
    for (const file of names) {
      for (const declaration of motionDeclarations(sheets[file])) {
        for (const [, name] of declaration.value.matchAll(/var\(\s*(--[\w-]+)\s*,/g)) {
          if (isChoreography(name)) withFallback.push(`${row(file, declaration)} | ${name}`);
        }
      }
    }
    expect(withFallback).toEqual([]);
  });
});
