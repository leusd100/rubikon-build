import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { customPropertyDeclarations, motionDeclarations, stripComments, timeLiterals } from '../../scripts/motion/css-motion.mjs';

// Motion v1 (M1-1): a transition or an animation takes its time and its curve from a token, never from a literal. The
// tokens live in app/globals.css :root; each stylesheet's own choreography (its times and delays that no token
// covers) is a block of `--<prefix>-for|at-*` variables at the top of that file. The guard runs over every stylesheet
// under app/: a new literal in any transition* or animation* declaration fails it, and a name outside the families fails
// it too. scripts/motion/motion-diff.mjs proves a move changed no value; this file proves it stays moved.
//
// Scope: the transition*/animation* declarations of the app's CSS files, and the custom properties of the token
// (`--motion|ease|duration-*`) and choreography (`--<prefix>-for|at-*`) families they take their values from. A
// variable of any other name that a declaration reads must be declared by some app stylesheet or be set by a component's
// inline style (INLINE below), so a misspelt name cannot silently drop a whole transition or animation. Out of scope: the
// value an intermediate custom property of another name holds (`--x: .3s` read by `transition: opacity var(--x)`), and the
// inline styles of TSX themselves.

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
/** The source of every .ts/.tsx under app/: where the inline custom properties are set */
const sources: string[] = [];
const walkSources = (dir: string) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSources(full);
    else if (/\.tsx?$/.test(entry.name)) sources.push(readFileSync(full, 'utf8'));
  }
};
walkSources(app);

/** A choreography variable: a file's own time or delay — `--rm-for-row`, `--ft-at-step`. Curves are tokens only (M1-2) */
const CHOREOGRAPHY = /^--[a-z0-9]+-(?:for|at)-/;
/** A variable a motion declaration may take: a token (`--motion-*`, `--ease-*`, `--duration-*`) or a choreography variable */
const MOTION_VARIABLE = /^--(?:(?:motion|ease|duration)-|[a-z0-9]+-(?:for|at)-)/;

/** The token families: a declaration of one of these names belongs in globals.css :root and nowhere else */
const TOKEN_FAMILY = /^--(?:motion|ease|duration)-/;

/**
 * Variables a motion declaration reads that no stylesheet declares: a component sets them in an inline style
 * (`style={{ '--n': index }}`), per element, so the CSS can only read them. Each name lists where it is set; the test
 * «lists only inline variables a component still sets» fails when no .tsx/.ts under app/ sets a name any more.
 */
const INLINE: Readonly<Record<string, string>> = {
  // the index of a part in a cascade: app/components/angary/FrameTour.tsx:673, app/components/home-v2/ProofFrame.tsx:166–223,
  // app/components/home-v2/ProofContour.tsx:586, app/components/home-v2/ProofDetails.tsx:165
  '--n': 'FrameTour.tsx, ProofFrame.tsx, ProofContour.tsx, ProofDetails.tsx',
  // the shown step's own length, read with a fallback: app/components/configurator/ConfiguratorFrameView.tsx:92
  '--dn-step-ms': 'ConfiguratorFrameView.tsx',
  // the number of parts of a detail drawing, read with a fallback: app/components/home-v2/ProofDetails.tsx:260
  '--parts': 'ProofDetails.tsx',
  // the hold of the tour's step, read with a fallback: app/components/home-v2/ProofContour.tsx:834
  '--hold': 'ProofContour.tsx',
};

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
    for (const file of names) {
      for (const declaration of motionDeclarations(sheets[file])) {
        if (hasLiteral(declaration.value)) literals.push(row(file, declaration));
      }
    }
    expect(literals).toEqual([]);
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

  it('declares every variable a transition or an animation reads', () => {
    // A misspelt name (`var(--moiton-micro)`, `var(--easing-premium)`, `var(--hv2-fro-x)`) is a custom property nobody
    // declares: the declaration is invalid at computed-value time and the whole transition or animation silently drops.
    // The test above holds the Motion v1 families (a token anywhere, a choreography name in its own file); this one holds
    // the rest: every name a motion declaration reads, with a fallback or without, is declared by some app stylesheet or
    // is one of the INLINE names a component sets on an element.
    const declared = new Set(names.flatMap((file) => propertyDeclarations(file).map(({ name }) => name)));
    const unknown: string[] = [];
    for (const file of names) {
      for (const declaration of motionDeclarations(sheets[file])) {
        for (const name of variablesIn(declaration.value)) {
          if (!declared.has(name) && !(name in INLINE)) unknown.push(`${row(file, declaration)} | ${name}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it('lists only inline variables a component still sets', () => {
    const readByMotion = new Set(names.flatMap((file) => motionDeclarations(sheets[file]).flatMap(({ value }) => variablesIn(value))));
    const declared = new Set(names.flatMap((file) => propertyDeclarations(file).map(({ name }) => name)));
    const stale: string[] = [];
    for (const name of Object.keys(INLINE)) {
      if (!sources.some((source) => source.includes(`'${name}'`))) stale.push(`${name} | no .ts/.tsx under app/ sets it`);
      if (declared.has(name)) stale.push(`${name} | a stylesheet declares it: take it off INLINE`);
      if (!readByMotion.has(name)) stale.push(`${name} | no transition or animation reads it`);
    }
    expect(stale).toEqual([]);
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

/** A transition list split on its top-level commas: `color 1s ease, opacity calc(var(--i, 0) * 1s)` is two parts */
const transitionParts = (value: string) => value.split(/,(?![^(]*\))/).map((part) => part.trim());
/** The colour family of ui-system 6.2: `stroke` and `fill` themselves, not `stroke-width` or `stroke-dashoffset` */
const COLOUR_PROPERTY = /^(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?-color|outline-color|text-decoration-color|fill|stroke|box-shadow)(?![-\w])/;
const EASE_KEYWORD = /(?<![-\w])ease(?![-\w])/;
const EASE_IN_OR_OUT = /(?<![-\w])ease-(?:in-out|out|in)(?![-\w])/;

describe('Motion v1 pace by roles (M1-2)', () => {
  it('keeps curves in the tokens', () => {
    const literals = names.flatMap((file) => {
      const count = stripComments(sheets[file]).split('cubic-bezier(').length - 1;
      return count > 0 ? [`${file}: ${count}`] : [];
    });
    expect(literals).toEqual(['globals.css: 4']);
    const curveVariables = names.flatMap((file) =>
      propertyDeclarations(file).filter((entry) => /-curve-/.test(entry.name)).map((entry) => `${file} | ${entry.name}`),
    );
    expect(curveVariables).toEqual([]);
  });

  it('uses the standard curve for colour', () => {
    const offenders = names.flatMap((file) =>
      motionDeclarations(sheets[file])
        .filter((declaration) => declaration.property === 'transition')
        .flatMap((declaration) => transitionParts(declaration.value)
          .filter((part) => COLOUR_PROPERTY.test(part) && EASE_KEYWORD.test(part))
          .map((part) => `${file} | ${declaration.selector} | ${part}`)),
    );
    expect(offenders).toEqual([]);
  });

  it('has no ease-out or ease-in-out', () => {
    const offenders = names.flatMap((file) =>
      motionDeclarations(sheets[file])
        .filter((declaration) => EASE_IN_OR_OUT.test(declaration.value))
        .map((declaration) => row(file, declaration)),
    );
    expect(offenders).toEqual([]);
  });
});
