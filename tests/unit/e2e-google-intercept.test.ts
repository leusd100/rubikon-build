import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// A spec that grants Analytics makes the page load gtag.js, and no test may reach Google from its test host: GA4 counted
// 544 of its 595 sessions (15.08–25.09) from 127.0.0.1. Every such spec answers Google itself through a regex route,
// as consent.spec.ts does. A Playwright glob is not enough: '**/googletagmanager.com/**' needs a '/' right before the
// host, so it never matches https://www.googletagmanager.com/gtag/js and the real script loaded anyway.
const E2E_DIR = new URL('../e2e/', import.meta.url);
const GOOGLE_URLS = [
  'https://www.googletagmanager.com/gtag/js?id=G-WYRXJV71WG',
  'https://www.google-analytics.com/g/collect?v=2&tid=G-WYRXJV71WG',
  'https://region1.google-analytics.com/g/collect?v=2&tid=G-WYRXJV71WG',
  'https://stats.g.doubleclick.net/g/collect?v=2&tid=G-WYRXJV71WG',
  'https://www.google.com/ccm/collect?tid=G-WYRXJV71WG',
];

const specs = readdirSync(E2E_DIR)
  .filter((file) => file.endsWith('.spec.ts'))
  .sort()
  .map((file) => ({ file, source: readFileSync(new URL(file, E2E_DIR), 'utf8') }));

const grantsAnalytics = (source: string) => /'granted'|Прийняти все/.test(source);

/** The first argument of every `.route(…)` call: a regex literal (class-aware, so `[^/]` stays inside) or a string */
function routePatterns(source: string) {
  const call = /\.route\(\s*(?:\/((?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\[\n])+)\/([a-z]*)|(['"`])((?:\\.|(?!\3)[^\\\n])*)\3)/g;
  return [...source.matchAll(call)].map((match) => match[1] !== undefined
    ? { regex: new RegExp(match[1], match[2]) }
    : { glob: match[4] });
}

describe('e2e specs never reach Google', () => {
  const granting = specs.filter(({ source }) => grantsAnalytics(source)).map(({ file }) => file);

  it('finds the specs that grant Analytics', () => {
    expect(granting).toEqual(expect.arrayContaining([
      'analytics-consent.spec.ts', 'analytics-contract.spec.ts', 'consent.spec.ts', 'first-contact.spec.ts', 'form.spec.ts', 'ux-conversion-phase2.spec.ts',
    ]));
  });

  it.each(granting)('%s answers every Google request with a regex route, or denies all outbound through stubGoogle', (file) => {
    const { source } = specs.find((spec) => spec.file === file)!;
    const regexes = routePatterns(source).flatMap((pattern) => pattern.regex ?? []);
    const routed = regexes.some((regex) => GOOGLE_URLS.every((url) => regex.test(url)));
    // google.helpers' stubGoogle routes every request off the app's origin (its own shape is held below)
    const stubbed = /import\s*\{[^}]*\bstubGoogle\b[^}]*\}\s*from\s*'\.\/google\.helpers'/.test(source) && /\bstubGoogle\(\s*context\b/.test(source);
    expect(routed || stubbed, `${file}: no route matches ${GOOGLE_URLS.join(', ')}, and no stubGoogle(context, …)`).toBe(true);
  });

  it('stubGoogle denies all outbound: one context route for every request off the app\'s origin, never passed on to the network, and a stub tag with no transport of its own', () => {
    const helpers = readFileSync(new URL('google.helpers.ts', E2E_DIR), 'utf8');
    expect(helpers).toMatch(/context\.route\(\(url\) => url\.origin !== appOrigin,/);
    expect(helpers).not.toMatch(/route\.(?:fetch|continue|fallback)\(/);
    const stub = /const GTAG_STUB = `([\s\S]*?)`;/.exec(helpers)?.[1] ?? '';
    expect(stub).toContain('queue.push = function');
    expect(stub).not.toMatch(/fetch|XMLHttpRequest|sendBeacon|Image|createElement|\.src\b|WebSocket|EventSource|import\(/);
  });

  it('no spec routes Google through a glob', () => {
    const globs = specs.flatMap(({ file, source }) => routePatterns(source)
      .flatMap((pattern) => pattern.glob !== undefined && /google|doubleclick/i.test(pattern.glob) ? [`${file}: '${pattern.glob}'`] : []));
    expect(globs).toEqual([]);
  });
});
