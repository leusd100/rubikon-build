import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  customProperties, motionDeclarations, normalizeMotion, resolveVars, stripComments, timeLiterals,
} from '../../scripts/motion/css-motion.mjs';
import { diffLists, motionKeys } from '../../scripts/motion/motion-diff.mjs';

// Motion v1 · M1-1: the tokens move 553 literal times out of the stylesheets without changing a value. These tests pin the
// parser that proves it: the declarations of transition*/animation*, the custom properties that supply them, and the
// normal form two spellings of one value share (`.3s` and `300ms`, `cubic-bezier(.30, .7,.2,1)` and its tidy twin).

describe('stripComments', () => {
  it('drops comments, Cyrillic ones included, and keeps a comment-like sequence inside a string', () => {
    const css = '/* Рух: хореографія */ a { content: "/* not a comment */"; /* x */ color: red; }';
    const stripped = stripComments(css);

    expect(stripped).not.toMatch(/Рух|хореографія|\bx\b/);
    expect(stripped).toContain('"/* not a comment */"');
    expect(stripped).toContain('color: red');
  });

  it('drops an unterminated comment to the end of the file', () => {
    expect(stripComments('a { b: c; } /* never closed').trim()).toBe('a { b: c; }');
  });
});

describe('motionDeclarations', () => {
  it('returns the transition of a rule nested in @media and @supports, with the enclosing preludes', () => {
    const css = `
      @media (min-width: 761px) {
        @supports (selector(:has(*))) {
          .card:hover { transition: opacity .3s ease; }
        }
      }`;
    const [only, ...rest] = motionDeclarations(css);

    expect(rest).toEqual([]);
    expect(only).toMatchObject({ selector: '.card:hover', property: 'transition', value: 'opacity .3s ease' });
    expect(only.atRule).toContain('(min-width: 761px)');
    expect(only.atRule).toBe('@media (min-width: 761px) | @supports (selector(:has(*)))');
  });

  it('returns nothing from @keyframes, and does not lose the rules that follow it', () => {
    const css = `
      @keyframes x { from { opacity: 0; } to { opacity: 1; animation-delay: 5s; transition: opacity 9s; } }
      @-webkit-keyframes y { to { transition: opacity 8s; } }
      .after { animation: x 700ms ease; }`;

    expect(motionDeclarations(css)).toEqual([
      { selector: '.after', property: 'animation', value: 'x 700ms ease', atRule: null },
    ]);
  });

  it('takes every transition*/animation* longhand, in the order of the file, and nothing else', () => {
    const css = `
      .a { color: red; transition-property: opacity; transition-duration: .2s; Transition-Delay: 40ms; }
      .b { animation-timing-function: ease; animation-fill-mode: both; transitional: nope; will-change: transform; }`;

    expect(motionDeclarations(css).map(({ selector, property }) => `${selector} ${property}`)).toEqual([
      '.a transition-property', '.a transition-duration', '.a transition-delay', '.b animation-timing-function', '.b animation-fill-mode',
    ]);
  });

  it('reads a last declaration without a semicolon, !important, and a multi-line selector list', () => {
    const css = `
      main[data-x="1"] .a,
      main[data-x="1"] .b {
        transition: opacity .3s
          ease !important
      }`;

    expect(motionDeclarations(css)).toEqual([
      { selector: 'main[data-x="1"] .a, main[data-x="1"] .b', property: 'transition', value: 'opacity .3s ease !important', atRule: null },
    ]);
  });

  it('is not misled by braces, semicolons and comment markers inside strings, urls and parentheses', () => {
    const css = `
      /* transition: opacity 1s; */
      .a::before { content: "}{;/*"; background: url(data:image/svg+xml;utf8,<svg/>) ; transition: opacity .2s; }
      .b { transition: transform .3s cubic-bezier(.3, .7, .2, 1); }`;

    expect(motionDeclarations(css).map(({ selector, value }) => [selector, value])).toEqual([
      ['.a::before', 'opacity .2s'],
      ['.b', 'transform .3s cubic-bezier(.3, .7, .2, 1)'],
    ]);
  });

  it('follows native CSS nesting: a conditional group inside a rule keeps the rule\'s selector', () => {
    const css = `
      .card { transition: opacity .3s;
        @media (hover: hover) { transition: opacity .2s; }
        @container sheet (max-width: 480px) { transition: none; }
        &:hover { transition: opacity .1s; }
        .inner { animation: a 1s; } }`;

    expect(motionDeclarations(css).map(({ selector, value, atRule }) => [selector, value, atRule])).toEqual([
      ['.card', 'opacity .3s', null],
      ['.card', 'opacity .2s', '@media (hover: hover)'],
      ['.card', 'none', null],
      ['.card:hover', 'opacity .1s', null],
      ['.card .inner', 'a 1s', null],
    ]);
  });

  it('skips @font-face, @property and @page, and reads through @layer and @container', () => {
    const css = `
      @import 'tailwindcss';
      @font-face { font-family: X; src: url(x.woff2); }
      @property --split { syntax: '<percentage>'; inherits: false; initial-value: 62%; }
      @layer base { .a { transition: opacity .2s; } }
      @container sheet (max-width: 480px) { .b { transition: opacity .3s; } }`;

    expect(motionDeclarations(css).map(({ selector, atRule }) => [selector, atRule])).toEqual([['.a', null], ['.b', null]]);
  });
});

describe('customProperties', () => {
  it('collects every value of every --* in the order of the file, comments and keyframes excluded', () => {
    const css = `
      :root { --motion-micro: 200ms; --ease: cubic-bezier(.2, .7,
        .1, 1); /* --gone: 1s; */ }
      @media (max-width: 760px) { :root { --motion-rise: 10px; } }
      :root { --motion-rise: 16px; --motion-micro: 200ms; }
      @keyframes k { to { --inside: 1; } }`;
    const props = customProperties(css);

    expect(props.get('--motion-micro')).toEqual(['200ms', '200ms']);
    expect(props.get('--motion-rise')).toEqual(['10px', '16px']);
    expect(props.get('--ease')).toEqual(['cubic-bezier(.2, .7, .1, 1)']);
    expect(props.has('--gone')).toBe(false);
    expect(props.has('--inside')).toBe(false);
  });

  it('keeps the case of a name and a value that holds braces', () => {
    const props = customProperties(':root { --Foo: {a:b}; --foo: 1 }');

    expect(props.get('--Foo')).toEqual(['{a:b}']);
    expect(props.get('--foo')).toEqual(['1']);
  });
});

describe('resolveVars', () => {
  it('substitutes variables recursively and takes the fallback of an unknown one', () => {
    expect(resolveVars('transform var(--a) var(--b, 20ms)', new Map([['--a', 'var(--c)'], ['--c', '700ms']])))
      .toBe('transform 700ms 20ms');
  });

  it('leaves a runtime index (an unknown variable with a plain-number fallback) alone and resolves the rest', () => {
    expect(resolveVars('calc(var(--i, 0) * var(--s))', new Map([['--s', '22ms']]))).toBe('calc(var(--i, 0) * 22ms)');
    expect(resolveVars('calc(var(--step, 5) * 700ms + var(--d, 0) * 180ms)', new Map()))
      .toBe('calc(var(--step, 5) * 700ms + var(--d, 0) * 180ms)');
  });

  it('leaves an unknown variable without a fallback as it is', () => {
    expect(resolveVars('opacity var(--m-reveal) var(--sheet-plot)', new Map([['--x', '1s']])))
      .toBe('opacity var(--m-reveal) var(--sheet-plot)');
  });

  it('reads a fallback that holds parentheses and another variable', () => {
    const defs = new Map([['--ease', 'cubic-bezier(.3, .7, .2, 1)'], ['--ui', '360ms']]);

    expect(resolveVars('transform var(--m-draw, cubic-bezier(.3, .7, .2, 1)) var(--nope, var(--ui))', defs))
      .toBe('transform cubic-bezier(.3, .7, .2, 1) 360ms');
    expect(resolveVars('var(--x, var(--ease))', defs)).toBe('cubic-bezier(.3, .7, .2, 1)');
  });

  it('does not loop on a variable that names itself', () => {
    expect(resolveVars('opacity var(--a)', new Map([['--a', 'var(--b)'], ['--b', 'var(--a)']]))).toMatch(/^opacity /);
  });
});

describe('normalizeMotion', () => {
  it('writes times in ms and a cubic-bezier as plain numbers without spaces', () => {
    expect(normalizeMotion('opacity .3s cubic-bezier(.30, .7,.2,1) 1.4s')).toBe('opacity 300ms cubic-bezier(0.3,0.7,0.2,1) 1400ms');
  });

  it('gives .3s and 300ms, 1.4s and 1400ms, -0.4s and -400ms one form', () => {
    expect(normalizeMotion('.3s')).toBe(normalizeMotion('300ms'));
    expect(normalizeMotion('1.4s')).toBe('1400ms');
    expect(normalizeMotion('-0.4s')).toBe('-400ms');
    expect(normalizeMotion('0.07s')).toBe('70ms');
    expect(normalizeMotion('0s')).toBe('0ms');
  });

  it('keeps the reduced-motion .01ms as 0.01ms and does not take a time out of a name', () => {
    expect(normalizeMotion('.01ms')).toBe('0.01ms');
    expect(normalizeMotion('fade-2s .5s')).toBe('fade-2s 500ms');
    expect(normalizeMotion('hv2-step-1s 1S')).toBe('hv2-step-1s 1000ms');
  });

  it('lowercases, folds whitespace and keeps list commas as ", "', () => {
    expect(normalizeMotion('  Opacity   .3S ,\n transform  .2s  ')).toBe('opacity 300ms, transform 200ms');
    expect(normalizeMotion('calc( var(--i,0) * 22ms )')).toBe('calc(var(--i, 0) * 22ms)');
  });

  it('keeps a curve it cannot read as numbers', () => {
    expect(normalizeMotion('cubic-bezier(var(--a), 0, 1,  1)')).toBe('cubic-bezier(var(--a),0,1,1)');
  });
});

describe('timeLiterals', () => {
  it('lists the times in a value, apart from 0 and the .01ms of reduced motion', () => {
    expect(timeLiterals('opacity .01ms, transform 0s 120ms')).toEqual(['120ms']);
  });

  it('lists them as written, one per occurrence, inside calc() and var() fallbacks too', () => {
    expect(timeLiterals('transform .3s cubic-bezier(.3, .7, .2, 1) calc(var(--i, 0) * 22ms), opacity var(--m, .36s) 0.01ms 0ms'))
      .toEqual(['.3s', '22ms', '.36s']);
    expect(timeLiterals('opacity var(--motion-ui) var(--ease-premium)')).toEqual([]);
  });
});

describe('motionKeys', () => {
  const defs = new Map([['--motion-micro', '200ms'], ['--ease-plot', 'cubic-bezier(.55, 0, .25, 1)']]);

  it('writes one key per declaration: prelude, selector, property and the resolved, normalised value', () => {
    const css = `
      .a { transition: opacity var(--motion-micro) var(--ease-plot); }
      @media (min-width: 761px) { .a { animation: x 1.4s; } }`;

    expect(motionKeys(css, defs)).toEqual([
      '.a | transition | opacity 200ms cubic-bezier(0.55,0,0.25,1)',
      '@media (min-width: 761px) | .a | animation | x 1400ms',
    ]);
  });

  it('gives the literal and its token the same key', () => {
    expect(motionKeys('.a { transition: opacity .2s cubic-bezier(.55,0,.25,1); }', new Map()))
      .toEqual(motionKeys('.a { transition: opacity var(--motion-micro) var(--ease-plot); }', defs));
  });
});

describe('diffLists', () => {
  it('finds nothing in equal lists', () => {
    expect(diffLists(['a', 'b'], ['a', 'b'])).toEqual({ count: 0, hunks: [] });
  });

  it('pairs a changed entry as one difference and reports what left and what came', () => {
    const { count, hunks } = diffLists(['a', 'b', 'c'], ['a', 'B', 'c']);

    expect(count).toBe(1);
    expect(hunks).toEqual([{ removed: ['b'], added: ['B'] }]);
  });

  it('reports an entry only on one side, and a whole list against an empty one', () => {
    expect(diffLists(['a', 'b'], ['a'])).toEqual({ count: 1, hunks: [{ removed: ['b'], added: [] }] });
    expect(diffLists([], ['x', 'y'])).toEqual({ count: 2, hunks: [{ removed: [], added: ['x', 'y'] }] });
  });

  it('sees a reordered pair', () => {
    expect(diffLists(['a', 'b'], ['b', 'a']).count).toBeGreaterThan(0);
  });
});

describe('motion-diff CLI', () => {
  const cli = fileURLToPath(new URL('../../scripts/motion/motion-diff.mjs', import.meta.url));
  const git = (cwd: string, ...args: string[]) => {
    const run = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
  };
  const run = (cwd: string, ...args: string[]) => spawnSync('node', [cli, ...args], { cwd, encoding: 'utf8' });

  it('says 0 differences for a literal moved into a token, and exits 1 under --expect-none for a changed time', () => {
    const repo = mkdtempSync(join(tmpdir(), 'motion-diff-'));
    try {
      mkdirSync(join(repo, 'app/components'), { recursive: true });
      writeFileSync(join(repo, 'app/globals.css'), ':root { --motion-micro: 200ms; }\n');
      writeFileSync(join(repo, 'app/theme.css'), ':root { --bg: #fff; }\n');
      writeFileSync(join(repo, 'app/components/Ключ.css'), '/* Рух */\n.a { transition: opacity .2s; }\n.b { transition: transform .3s; }\n');
      writeFileSync(join(repo, 'app/components/still.css'), '.c { color: red; }\n');
      git(repo, 'init', '-q', '-b', 'main');
      git(repo, 'add', '-A');
      git(repo, 'commit', '-q', '-m', 'base');

      writeFileSync(join(repo, 'app/components/Ключ.css'),
        '/* Рух */\n:root { --k-for-b: .3s; }\n.a { transition: opacity var(--motion-micro); }\n.b { transition: transform var(--k-for-b); }\n');
      const same = run(repo, '--base', 'HEAD', '--expect-none');
      expect(same.stderr).toBe('');
      expect(same.stdout).toMatch(/^0 відмінностей у 4 файлах/m);
      expect(same.status).toBe(0);

      writeFileSync(join(repo, 'app/components/Ключ.css'), '.a { transition: opacity .25s; }\n.b { transition: transform .3s; }\n');
      writeFileSync(join(repo, 'app/components/new.css'), '.n { animation: x 1s; }\n');
      const changed = run(repo, '--base', 'HEAD', '--expect-none');
      expect(changed.status).toBe(1);
      expect(changed.stdout).toContain('app/components/Ключ.css');
      expect(changed.stdout).toContain('- .a | transition | opacity 200ms');
      expect(changed.stdout).toContain('+ .a | transition | opacity 250ms');
      expect(changed.stdout).toContain('app/components/new.css');
      expect(changed.stdout).toMatch(/^2 відмінності у 5 файлах/m);
      expect(run(repo, '--base', 'HEAD').status).toBe(0);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('exits 2 and names the problem when the base ref does not exist', () => {
    const repo = mkdtempSync(join(tmpdir(), 'motion-diff-'));
    try {
      git(repo, 'init', '-q', '-b', 'main');
      const result = run(repo, '--base', 'no-such-ref');
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('no-such-ref');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
