import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  customProperties, customPropertyDeclarations, motionDeclarations, normalizeMotion, resolveVars, stripComments, timeLiterals,
} from '../../scripts/motion/css-motion.mjs';
import { diffLists, fileDefs, globalCollisions, motionKeys, sharedDefs } from '../../scripts/motion/motion-diff.mjs';

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

describe('customPropertyDeclarations', () => {
  it('lists every declaration with the selector of its rule and the @media/@supports prelude around it', () => {
    const css = `
      :root { --a: 1s; --b: 2s; }
      @media (max-width: 760px) { :root { --a: 3s; } }
      .x { --c: 4s; }`;

    expect(customPropertyDeclarations(css)).toEqual([
      { name: '--a', value: '1s', selector: ':root', atRule: null },
      { name: '--b', value: '2s', selector: ':root', atRule: null },
      { name: '--a', value: '3s', selector: ':root', atRule: '@media (max-width: 760px)' },
      { name: '--c', value: '4s', selector: '.x', atRule: null },
    ]);
  });
});

describe('sharedDefs: what a variable may resolve to', () => {
  it('keeps a custom property with exactly one value across the sheets and drops one with several', () => {
    const defs = sharedDefs([':root { --one: 1s; --two: 2s; --twice: 3s; --twice: 4s; }', ':root { --two: 5s; }']);

    expect(defs).toEqual(new Map([['--one', '1s']]));
  });

  it('takes a choreography name (--<prefix>-for|at|curve-…) only from a top-level :root rule', () => {
    const defs = sharedDefs([`
      :root { --rm-for-ok: .3s; --rm-at-ok: 40ms; --rm-curve-ok: cubic-bezier(.3, .7, .2, 1); --rm-for-both: .3s; }
      .other { --rm-for-scoped: .3s; --rm-for-both: .5s; }
      @media (min-width: 761px) { :root { --rm-for-media: .3s; } }
      @supports (selector(:has(*))) { :root { --rm-at-supports: 40ms; } }
      :root:not([data-x]) { --rm-for-narrowed: .3s; }`]);

    expect([...defs.keys()]).toEqual(['--rm-for-ok', '--rm-at-ok', '--rm-curve-ok']);
  });

  it('leaves the scope rule to choreography names: any other single-valued name resolves wherever it is declared', () => {
    const defs = sharedDefs(['.other { --region-reveal: .36s; } @media (min-width: 761px) { :root { --m-draw: 900ms; --ft-k: 1; } }']);

    expect([...defs.keys()]).toEqual(['--region-reveal', '--m-draw', '--ft-k']);
  });

  it('does not take a name that only looks like a choreography one', () => {
    const defs = sharedDefs(['.a { --rm-for: .3s; --for-rm-x: .3s; --rm-sub-for-x: .3s; }']);

    expect([...defs.keys()]).toEqual(['--rm-for', '--for-rm-x', '--rm-sub-for-x']);
  });
});

describe('fileDefs: the shared definitions as one file sees them', () => {
  const shared = new Map([['--motion-micro', '200ms'], ['--motion-ui', '360ms']]);

  it('lets the file\'s own single value override a shared one, without touching the shared map', () => {
    const defs = fileDefs(shared, ':root { --motion-ui: 400ms; --rm-for-x: .3s; }');

    expect(defs.get('--motion-ui')).toBe('400ms');
    expect(defs.get('--rm-for-x')).toBe('.3s');
    expect(defs.get('--motion-micro')).toBe('200ms');
    expect(shared.get('--motion-ui')).toBe('360ms');
    expect(shared.has('--rm-for-x')).toBe(false);
  });

  it('drops a name the file declares twice, so it cannot fall back to the shared value', () => {
    const defs = fileDefs(shared, ':root { --motion-micro: 210ms; } @media (max-width: 760px) { :root { --motion-micro: 500ms; } }');

    expect(defs.has('--motion-micro')).toBe(false);
    expect(defs.get('--motion-ui')).toBe('360ms');
  });

  it('applies the scope rule to a shared choreography name, and leaves any other name its single-value rule', () => {
    expect(fileDefs(new Map([['--rm-for-x', '.3s']]), '.other { --rm-for-x: .5s; }').has('--rm-for-x')).toBe(false);
    expect(fileDefs(shared, '.other { --motion-ui: 500ms; }').get('--motion-ui')).toBe('500ms');
  });
});

describe('motionKeys: a variable that may not resolve keeps its var()', () => {
  const key = (css: string) => motionKeys(css, fileDefs(new Map(), css));
  const literal = key('.a { transition: opacity .3s; }');

  it('resolves a choreography name declared once in :root to the same key as its literal', () => {
    expect(key(':root { --x-for-a: .3s; } .a { transition: opacity var(--x-for-a); }')).toEqual(literal);
  });

  it.each([
    ['a rule other than :root', '.other { --x-for-a: .3s; } .a { transition: opacity var(--x-for-a); }'],
    ['a media query', '@media (min-width: 761px) { :root { --x-for-a: .3s; } } .a { transition: opacity var(--x-for-a); }'],
    ['a name declared twice', ':root { --x-for-a: .3s; --x-for-a: .5s; } .a { transition: opacity var(--x-for-a); }'],
    ['a misspelt name', ':root { --x-for-a: .3s; } .a { transition: opacity var(--x-for-b); }'],
  ])('keeps the var() of %s, so it differs from the literal', (_, css) => {
    expect(key(css)).not.toEqual(literal);
    expect(key(css)[0]).toMatch(/var\(--x-for-[ab]\)/);
  });
});

describe('globalCollisions: :root is one scope for every stylesheet', () => {
  const sheet = (name: string, value: string) => `:root { ${name}: ${value}; }`;
  const uses = (selector: string, name: string) => `${selector} { transition: opacity var(${name}); }`;
  const files = (...entries: [string, string][]) => new Map(entries.map(([file, css]) => [`app/${file}.css`, css]));
  const base = files(['a', '.a { transition: opacity .3s; }'], ['b', '.b { transition: opacity .5s; }']);

  it('reports a name two files declare with different values and a motion declaration resolves through', () => {
    const head = files(
      ['a', `${sheet('--x-for-a', '.3s')}\n${uses('.a', '--x-for-a')}`],
      ['b', `${sheet('--x-for-a', '.5s')}\n${uses('.b', '--x-for-a')}`],
    );

    expect(globalCollisions(base, head)).toEqual([{
      name: '--x-for-a',
      declarations: [{ file: 'app/a.css', value: '.3s' }, { file: 'app/b.css', value: '.5s' }],
    }]);
  });

  it('is silent when the files declare the same value, however it is spelt', () => {
    const head = files(
      ['a', `${sheet('--x-for-a', '.3s')}\n${uses('.a', '--x-for-a')}`],
      ['b', `${sheet('--x-for-a', '300ms')}\n${uses('.b', '--x-for-a')}`],
    );

    expect(globalCollisions(base, head)).toEqual([]);
  });

  it('is silent about a name no motion declaration resolves through', () => {
    const head = files(['a', `${sheet('--x-for-a', '.3s')}\n.a { color: red; }`], ['b', `${sheet('--x-for-a', '.5s')}\n${uses('.b', '--x-for-b')}`]);

    expect(globalCollisions(base, head)).toEqual([]);
  });

  it('follows a name through the definitions of other variables', () => {
    const head = files(
      ['a', `${sheet('--x-for-a', 'var(--x-for-r)')}${sheet('--x-for-r', '.3s')}\n${uses('.a', '--x-for-a')}`],
      ['b', `${sheet('--x-for-r', '.5s')}\n.b { color: red; }`],
    );

    expect(globalCollisions(base, head).map(({ name }) => name)).toEqual(['--x-for-r']);
  });

  it('reports a shared token another file declares again with another value', () => {
    const tokens = (css: string, ...more: [string, string][]) => files(['globals', css], ...more);
    const before = tokens(sheet('--motion-micro', '200ms'), ['a', '.a { transition: opacity 200ms; }']);
    const after = tokens(sheet('--motion-micro', '200ms'), ['a', `${sheet('--motion-micro', '500ms')}\n${uses('.a', '--motion-micro')}`]);

    expect(globalCollisions(before, after).map(({ name }) => name)).toEqual(['--motion-micro']);
  });

  it('leaves a collision that is already in the base alone, and reports it when the values change', () => {
    const colliding = (a: string, b: string) => files(
      ['a', `${sheet('--ft-k', a)}\n${uses('.a', '--ft-k')}`],
      ['b', `${sheet('--ft-k', b)}\n${uses('.b', '--ft-k')}`],
    );

    expect(globalCollisions(colliding('1s', '2s'), colliding('1s', '2s'))).toEqual([]);
    expect(globalCollisions(colliding('1s', '2s'), colliding('1s', '3s')).map(({ name }) => name)).toEqual(['--ft-k']);
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
  const sandboxes: string[] = [];
  const sandbox = () => {
    const dir = mkdtempSync(join(tmpdir(), 'motion-diff-'));
    sandboxes.push(dir);
    return dir;
  };
  const write = (repo: string, files: Record<string, string>) => {
    for (const [file, css] of Object.entries(files)) {
      mkdirSync(join(repo, file, '..'), { recursive: true });
      writeFileSync(join(repo, file), css);
    }
  };
  /** A repository whose first commit holds `base`; `head` is then written over the working tree */
  const repoOf = (base: Record<string, string>, head: Record<string, string>) => {
    const repo = sandbox();
    write(repo, base);
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'base');
    write(repo, head);
    return repo;
  };
  afterEach(() => {
    for (const dir of sandboxes.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('says 0 differences for a literal moved into a token, and exits 1 under --expect-none for a changed time', () => {
    const repo = repoOf({
      'app/globals.css': ':root { --motion-micro: 200ms; }\n',
      'app/theme.css': ':root { --bg: #fff; }\n',
      'app/components/Ключ.css': '/* Рух */\n.a { transition: opacity .2s; }\n.b { transition: transform .3s; }\n',
      'app/components/still.css': '.c { color: red; }\n',
    }, {
      'app/components/Ключ.css': '/* Рух */\n:root { --k-for-b: .3s; }\n.a { transition: opacity var(--motion-micro); }\n.b { transition: transform var(--k-for-b); }\n',
    });
    const same = run(repo, '--base', 'HEAD', '--expect-none');
    expect(same.stderr).toBe('');
    expect(same.stdout).toMatch(/^0 відмінностей у 4 файлах/m);
    expect(same.status).toBe(0);

    write(repo, {
      'app/components/Ключ.css': '.a { transition: opacity .25s; }\n.b { transition: transform .3s; }\n',
      'app/components/new.css': '.n { animation: x 1s; }\n',
    });
    const changed = run(repo, '--base', 'HEAD', '--expect-none');
    expect(changed.status).toBe(1);
    expect(changed.stdout).toContain('app/components/Ключ.css');
    expect(changed.stdout).toContain('- .a | transition | opacity 200ms');
    expect(changed.stdout).toContain('+ .a | transition | opacity 250ms');
    expect(changed.stdout).toContain('app/components/new.css');
    expect(changed.stdout).toMatch(/^2 відмінності у 5 файлах/m);
    expect(run(repo, '--base', 'HEAD').status).toBe(0);
  });

  it('exits 2 and names the problem when the base ref does not exist', () => {
    const repo = sandbox();
    git(repo, 'init', '-q', '-b', 'main');
    const result = run(repo, '--base', 'no-such-ref');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('no-such-ref');
  });

  it('runs main when it is started through a symlinked path', () => {
    const repo = sandbox();
    git(repo, 'init', '-q', '-b', 'main');
    const link = join(sandbox(), 'scripts');
    symlinkSync(fileURLToPath(new URL('../../scripts/', import.meta.url)), link);
    const result = spawnSync('node', [join(link, 'motion/motion-diff.mjs'), '--base', 'no-such-ref', '--expect-none'], { cwd: repo, encoding: 'utf8' });

    expect(result.stderr).toContain('no-such-ref');
    expect(result.status).toBe(2);
  });

  it('reports a name two files declare in :root with different values, though each file alone resolves it to its literal', () => {
    const repo = repoOf({
      'app/a.css': '.a { transition: opacity .3s; }\n',
      'app/b.css': '.b { transition: opacity .5s; }\n',
    }, {
      'app/a.css': ':root { --x-for-a: .3s; }\n.a { transition: opacity var(--x-for-a); }\n',
      'app/b.css': ':root { --x-for-a: .5s; }\n.b { transition: opacity var(--x-for-a); }\n',
    });
    const result = run(repo, '--base', 'HEAD', '--expect-none');

    expect(result.stdout).toContain('--x-for-a: app/a.css = .3s, app/b.css = .5s');
    expect(result.stdout).toMatch(/^1 відмінність у 2 файлах/m);
    expect(result.status).toBe(1);
    expect(run(repo, '--base', 'HEAD').status).toBe(0);
  });

  it('does not report a collision the base already has', () => {
    const colliding = (a: string, b: string) => ({
      'app/a.css': `:root { --ft-k: ${a}; }\n.a { transition: opacity var(--ft-k); }\n`,
      'app/b.css': `:root { --ft-k: ${b}; }\n.b { transition: opacity var(--ft-k); }\n`,
    });
    const repo = repoOf(colliding('1s', '2s'), colliding('1s', '2s'));
    const result = run(repo, '--base', 'HEAD', '--expect-none');

    expect(result.stdout).toMatch(/^0 відмінностей у 2 файлах/m);
    expect(result.status).toBe(0);
  });

  it.each([
    ['a rule other than :root', '.other { --x-for-a: .3s; }'],
    ['a media query', '@media (min-width: 761px) { :root { --x-for-a: .3s; } }'],
  ])('does not resolve a choreography name declared in %s', (_, declaration) => {
    const repo = repoOf(
      { 'app/a.css': '.a { transition: opacity .3s; }\n' },
      { 'app/a.css': `${declaration}\n.a { transition: opacity var(--x-for-a); }\n` },
    );
    const result = run(repo, '--base', 'HEAD', '--expect-none');

    expect(result.stdout).toContain('- .a | transition | opacity 300ms');
    expect(result.stdout).toContain('+ .a | transition | opacity var(--x-for-a)');
    expect(result.status).toBe(1);
  });

  it('does not let a name a file declares twice fall back to the shared value', () => {
    const repo = repoOf({
      'app/globals.css': ':root { --motion-micro: 200ms; }\n',
      'app/a.css': '.a { transition: opacity 200ms; }\n',
    }, {
      'app/a.css': ':root { --motion-micro: 210ms; }\n@media (max-width: 760px) { :root { --motion-micro: 500ms; } }\n.a { transition: opacity var(--motion-micro); }\n',
    });
    const result = run(repo, '--base', 'HEAD', '--expect-none');

    expect(result.stdout).toContain('+ .a | transition | opacity var(--motion-micro)');
    expect(result.status).toBe(1);
  });

  it('reports a misspelt variable name', () => {
    const repo = repoOf(
      { 'app/a.css': '.a { transition: opacity .3s; }\n' },
      { 'app/a.css': ':root { --x-for-row: .3s; }\n.a { transition: opacity var(--x-for-rwo); }\n' },
    );
    const result = run(repo, '--base', 'HEAD', '--expect-none');

    expect(result.stdout).toContain('+ .a | transition | opacity var(--x-for-rwo)');
    expect(result.status).toBe(1);
  });
});
