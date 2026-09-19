import { describe, expect, it } from 'vitest';
import { extractRun, median, medianRun, summaryMarkdown } from '../../../scripts/perf/pagespeed.mjs';
import desktopLh12 from './fixtures/psi-desktop-lh12.json';
import mobileLh12 from './fixtures/psi-mobile-lh12.json';
import mobileLh13 from './fixtures/psi-mobile-lh13.json';

// Fixtures are real Lighthouse runs against https://rubikonbuild.com/ (2026-09-19), trimmed to the fields the
// monitor reads and wrapped in the PSI v5 response shape. The lh13 variant carries the LCP element the way
// Lighthouse 13 (the version PSI serves) reports it: inside lcp-breakdown-insight.

describe('extractRun', () => {
  it('reads score and lab metrics from a PSI response', () => {
    const run = extractRun(mobileLh12);

    expect(run.score).toBe(86);
    expect(run.fcp).toBeCloseTo(2769.2, 0);
    expect(run.lcp).toBeCloseTo(3178.2, 0);
    expect(run.cls).toBe(0);
    expect(run.lighthouseVersion).toBe('12.6.1');
    expect(run.fieldData).toBe(false);
  });

  it('finds the LCP element in both the Lighthouse 12 and the Lighthouse 13 shape', () => {
    expect(extractRun(mobileLh12).lcpElement).toMatch(/^<h1/);
    expect(extractRun(mobileLh13).lcpElement).toMatch(/^<h1/);
    expect(extractRun(mobileLh13).lighthouseVersion).toBe('13.4.1');
  });

  it('degrades to nulls instead of throwing on a missing or partial result', () => {
    expect(extractRun({})).toMatchObject({ score: null, lcp: null, lcpElement: null, fieldData: false });
    expect(extractRun({ lighthouseResult: { audits: { 'largest-contentful-paint': { numericValue: 'x' } } } }).lcp).toBeNull();
  });

  it('reports field data only when CrUX metrics are actually present', () => {
    expect(extractRun({ ...mobileLh12, loadingExperience: { metrics: { LARGEST_CONTENTFUL_PAINT_MS: {} } } }).fieldData).toBe(true);
    expect(extractRun({ ...mobileLh12, originLoadingExperience: { metrics: {} } }).fieldData).toBe(true);
  });
});

describe('median', () => {
  it('takes each metric\'s own median and ignores missing values', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([null, 5, null])).toBe(5);
    expect(median([])).toBeNull();

    const runs = [
      { ...extractRun(mobileLh12), score: 80, lcp: 3500 },
      { ...extractRun(mobileLh12), score: 90, lcp: 3000 },
      { ...extractRun(mobileLh12), score: 86, lcp: 4000 },
    ];
    expect(medianRun(runs)).toMatchObject({ score: 86, lcp: 3500 });
  });
});

describe('summaryMarkdown', () => {
  const report = {
    url: 'https://rubikonbuild.com/',
    sha: '9f7e7037d0a1b2c3',
    startedAt: '2026-09-19 06:20:00 UTC',
    results: {
      mobile: { runs: [extractRun(mobileLh12), extractRun(mobileLh13), extractRun(mobileLh12)], failures: [] },
      desktop: { runs: [extractRun(desktopLh12)], failures: ['run 2: HTTP 500 INTERNAL'] },
    },
  };

  it('shows a median row per form factor with the six headline metrics', () => {
    const markdown = summaryMarkdown(report);

    expect(markdown).toContain('| | Performance | FCP | LCP | TBT | CLS | Speed Index | TTFB | Weight |');
    expect(markdown).toMatch(/\| \*\*Mobile\*\* \| 86 \| 2\.8 s \| 3\.2 s \|/);
    expect(markdown).toMatch(/\| \*\*Desktop\*\* \| 99 \|/);
    expect(markdown).toContain('Commit `9f7e703`');
    expect(markdown).toContain('Field data (CrUX): not available');
  });

  it('lists every run, its LCP element and failed calls, and states it is not a gate', () => {
    const markdown = summaryMarkdown(report);

    expect(markdown).toContain('| mobile #3 |');
    expect(markdown).toContain('| mobile #1 | `<h1');
    expect(markdown).toContain('- desktop: run 2: HTTP 500 INTERNAL');
    expect(markdown).toContain('scores never fail this workflow');
  });

  it('keeps the table intact whatever the LCP element snippet contains', () => {
    const run = { ...extractRun(mobileLh12), lcpElement: '<p data-x="a\\|b`c|d">' };
    const markdown = summaryMarkdown({ ...report, results: { mobile: { runs: [run], failures: [] } } });
    const line = markdown.split('\n').find((text) => text.startsWith('| mobile #1 | `'));

    expect(line).toBe('| mobile #1 | `<p data-x="a\\\\\\|bˋc\\|d">` |');
    // Exactly the two column separators remain unescaped.
    expect(line?.replace(/\\\\/g, '').replace(/\\\|/g, '').split('|').length).toBe(4);
  });

  it('never contains anything that looks like an API key', () => {
    expect(summaryMarkdown(report)).not.toMatch(/AIza[0-9A-Za-z_-]{20,}|key=/);
  });
});
