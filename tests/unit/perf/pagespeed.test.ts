import { describe, expect, it } from 'vitest';
import { collectRuns, extractRun, median, medianRun, summaryMarkdown } from '../../../scripts/perf/pagespeed.mjs';
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

  it('says how many independent analyses each median rests on and lists the cached ones it left out', () => {
    const markdown = summaryMarkdown({
      ...report,
      requestedRuns: 3,
      results: { ...report.results, desktop: { ...report.results.desktop, repeats: ['run 3: still the analysis of 2026-10-02T07:47:26.860Z after 3 retries'] } },
    });

    expect(markdown).toContain('median of independent analyses per form factor: mobile 3, desktop 1 of 3 requested');
    expect(markdown).toContain('**Cached analyses not counted**');
    expect(markdown).toContain('- desktop: run 3: still the analysis of 2026-10-02T07:47:26.860Z after 3 retries');
  });
});

describe('collectRuns', () => {
  const analysis = (fetchTime: string) => ({
    lighthouseResult: { fetchTime, lighthouseVersion: '13.5.0', categories: { performance: { score: 0.87 } }, audits: {} },
  });
  // Answers the calls in order; the last item keeps answering once the list runs out.
  const answers = (...items: Array<object | Error>) => {
    let index = 0;
    return async () => {
      const item = items[Math.min(index, items.length - 1)];
      index += 1;
      if (item instanceof Error) throw item;
      return item;
    };
  };
  const recordWaits = () => {
    const waits: number[] = [];
    return { waits, wait: async (ms: number) => { waits.push(ms); } };
  };

  it('counts every distinct analysis without waiting', async () => {
    const { waits, wait } = recordWaits();
    const result = await collectRuns({ runs: 3, call: answers(analysis('A'), analysis('B'), analysis('C')), wait, label: 'mobile' });

    expect(result.runs.map((run) => run.fetchTime)).toEqual(['A', 'B', 'C']);
    expect(result.bodies).toHaveLength(3);
    expect(result.repeats).toEqual([]);
    expect(waits).toEqual([]);
  });

  it('waits and asks again when PSI returns an analysis it already served', async () => {
    // Production on 2026-10-02: the calls after the first came back with the first call's analysis.
    const { waits, wait } = recordWaits();
    const result = await collectRuns({
      runs: 3,
      call: answers(analysis('A'), analysis('A'), analysis('B'), analysis('A'), analysis('C')),
      wait,
      label: 'mobile',
    });

    expect(result.runs.map((run) => run.fetchTime)).toEqual(['A', 'B', 'C']);
    expect(waits).toEqual([30_000, 30_000]);
  });

  it('reports a run that only ever gets a repeat instead of counting the same analysis twice', async () => {
    const { waits, wait } = recordWaits();
    const result = await collectRuns({ runs: 2, call: answers(analysis('A')), wait, label: 'desktop' });

    expect(result.runs).toHaveLength(1);
    expect(result.repeats).toEqual(['run 2: still the analysis of A after 3 retries']);
    expect(waits).toEqual([30_000, 30_000, 30_000]);
  });

  it('records a failed call and goes on with the next run', async () => {
    const { wait } = recordWaits();
    const result = await collectRuns({ runs: 2, call: answers(new Error('HTTP 500 INTERNAL'), analysis('A')), wait, label: 'mobile' });

    expect(result.failures).toEqual(['run 1: HTTP 500 INTERNAL']);
    expect(result.runs.map((run) => run.fetchTime)).toEqual(['A']);
  });
});
