import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The phone project ignores the specs that skip every test on it at file level, so `--shard` splits only tests that run
// (CI-06, playwright.config.ts). A file belongs on that list only while its skip covers the whole file: narrowed to a
// describe or a test, a test added outside it would be meant for phones and the ignored file would drop it silently.
// Both directions are held here — every listed spec has the file-level skip, and every spec with one is listed.
const E2E_DIR = new URL('../e2e/', import.meta.url);
const config = readFileSync(new URL('../../playwright.config.ts', import.meta.url), 'utf8');

const specs = readdirSync(E2E_DIR)
  .filter((file) => file.endsWith('.spec.ts'))
  .sort()
  .map((file) => ({ file, source: readFileSync(new URL(file, E2E_DIR), 'utf8') }));

// A top-level `test.skip(({ isMobile }) => isMobile, …)`, or `test.skip(isMobile, …)` among the statements of a
// top-level `beforeEach` (its body is indented, and its closing `});` at column 0 ends the match)
const PHONE_SKIP = /^test\.skip\(\(\{ isMobile \}\) => isMobile,|^test\.beforeEach\(async \(\{[^}\n]*\bisMobile\b[^}\n]*\}\) => \{\n(?:(?: {2}.*)?\n)*? {2}test\.skip\(isMobile,/m;
const DESKTOP_SKIP = /^test\.skip\(\(\{ isMobile \}\) => !isMobile,/m;

const phoneSkippedSpecs = [...(/const phoneSkippedSpecs = \[([^\]]*)\]/.exec(config)?.[1] ?? '').matchAll(/'([^']+)'/g)]
  .map((match) => match[1])
  .sort();

describe('e2e specs skipped by a whole project are ignored by it', () => {
  it('finds the list in playwright.config.ts and the phone project uses it', () => {
    expect(phoneSkippedSpecs.length).toBeGreaterThan(0);
    expect(config).toMatch(/name: 'mobile-chromium',\n\s+testIgnore: \[\/form\\\.spec\\\.ts\|visual\\\.spec\\\.ts\/, \.\.\.phoneSkippedSpecs\]/);
  });

  it('the phone project ignores exactly the specs that skip every test on phones at file level', () => {
    expect(phoneSkippedSpecs).toEqual(specs.filter(({ source }) => PHONE_SKIP.test(source)).map(({ file }) => file));
  });

  it('the desktop project ignores exactly the specs that skip every test off phones at file level', () => {
    const desktopIgnore = /name: 'desktop-chromium',[^}]*?testIgnore: \/([^\n]*)\/,/.exec(config)?.[1] ?? '';
    const ignored = specs.filter(({ file }) => new RegExp(desktopIgnore).test(file) && !/visual\.spec\.ts$/.test(file)).map(({ file }) => file);
    expect(ignored).toEqual(specs.filter(({ source }) => DESKTOP_SKIP.test(source)).map(({ file }) => file));
    expect(ignored).toEqual(['grain-planner-mobile.spec.ts']);
  });
});
