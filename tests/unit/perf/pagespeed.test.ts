import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectRuns, extractRun, median, medianRun, parseArgs, summaryMarkdown } from '../../../scripts/perf/pagespeed.mjs';
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
    expect(extractRun({ ...mobileLh12, loadingExperience: { metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2300 } } } }).fieldData).toBe(true);
    expect(extractRun({ ...mobileLh12, originLoadingExperience: { metrics: {} } }).fieldData).toBe(false);
    expect(extractRun({ ...mobileLh12, loadingExperience: { metrics: { LARGEST_CONTENTFUL_PAINT_MS: {} } } }).fieldData).toBe(false);
    const origin = extractRun({ ...mobileLh12, originLoadingExperience: { metrics: { INTERACTION_TO_NEXT_PAINT: { percentile: 150 } } } });
    expect(origin.fieldData).toBe(true);
    expect(origin.fieldMetrics).toEqual({ url: [], origin: ['INTERACTION_TO_NEXT_PAINT'] });
  });

  it('keeps observed timings and the exact lab profile separate from simulated metrics', () => {
    const configSettings = { formFactor: 'mobile', throttlingMethod: 'simulate',
      throttling: { rttMs: 150, cpuSlowdownMultiplier: 4 }, screenEmulation: { width: 412, height: 823, deviceScaleFactor: 1.75 } };
    const result = extractRun({ lighthouseResult: {
      ...mobileLh13.lighthouseResult, configSettings,
      audits: { ...mobileLh13.lighthouseResult.audits,
        metrics: { details: { items: [{ observedFirstContentfulPaint: 888, observedLargestContentfulPaint: 967 }] } },
        'network-requests': { details: { items: [{}, {}] } },
      },
    } });
    expect(result.observedFcp).toBe(888);
    expect(result.observedLcp).toBe(967);
    expect(result.lcp).toBe(extractRun(mobileLh13).lcp);
    expect(result.labProfile).toEqual(configSettings);
    expect(result.requestCount).toBe(2);
  });

  it('rejects non-finite and out-of-range scores', () => {
    for (const score of [NaN, Infinity, -0.1, 1.1]) {
      expect(extractRun({ lighthouseResult: { categories: { performance: { score } } } }).score).toBeNull();
    }
  });
});

describe('median', () => {
  it('takes each metric\'s own median and ignores missing values', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([null, 5, null])).toBe(5);
    expect(median([])).toBeNull();
    expect(median([NaN, Infinity, 2, -Infinity])).toBe(2);

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
    expect(markdown).toContain('Workflow commit `9f7e703` (deployed commit not verified)');
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
    lighthouseResult: { fetchTime: /^\d/.test(fetchTime) ? fetchTime : `2026-10-09T19:00:0${fetchTime.charCodeAt(0) - 65}.000Z`, lighthouseVersion: '13.5.0', categories: { performance: { score: 0.87 } }, audits: { 'first-contentful-paint': { numericValue: 1000 }, 'largest-contentful-paint': { numericValue: 2000 } } },
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

    expect(result.runs.map((run) => run.fetchTime)).toEqual(['2026-10-09T19:00:00.000Z', '2026-10-09T19:00:01.000Z', '2026-10-09T19:00:02.000Z']);
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

    expect(result.runs.map((run) => run.fetchTime)).toEqual(['2026-10-09T19:00:00.000Z', '2026-10-09T19:00:01.000Z', '2026-10-09T19:00:02.000Z']);
    expect(waits).toEqual([30_000, 30_000]);
  });

  it('reports a run that only ever gets a repeat instead of counting the same analysis twice', async () => {
    const { waits, wait } = recordWaits();
    const result = await collectRuns({ runs: 2, call: answers(analysis('A')), wait, label: 'desktop' });

    expect(result.runs).toHaveLength(1);
    expect(result.repeats).toEqual(['run 2: still the analysis of 2026-10-09T19:00:00.000Z after 3 retries']);
    expect(waits).toEqual([30_000, 30_000, 30_000]);
  });

  it('records a failed call and goes on with the next run', async () => {
    const { wait } = recordWaits();
    const result = await collectRuns({ runs: 2, call: answers(new Error('HTTP 500 INTERNAL'), analysis('A')), wait, label: 'mobile' });

    expect(result.failures).toEqual(['run 1: HTTP 500 INTERNAL']);
    expect(result.runs.map((run) => run.fetchTime)).toEqual(['2026-10-09T19:00:00.000Z']);
  });

  it('does not count failed Lighthouse reports or reports without a usable timestamp', async () => {
    const valid = analysis('A');
    const invalids = [
      {},
      { lighthouseResult: { ...valid.lighthouseResult, runtimeError: { code: 'NO_FCP' } } },
      { lighthouseResult: { ...valid.lighthouseResult, fetchTime: undefined } },
      { lighthouseResult: { ...valid.lighthouseResult, fetchTime: 'invalid' } },
      { lighthouseResult: { ...valid.lighthouseResult, audits: {} } },
      { lighthouseResult: { ...valid.lighthouseResult, categories: {} } },
    ];
    for (const invalid of invalids) {
      const { wait } = recordWaits();
      const result = await collectRuns({ runs: 2, call: answers(invalid, valid), wait, label: 'mobile' });
      expect(result.runs).toHaveLength(1);
      expect(result.bodies).toEqual([valid]);
      expect(result.failures).toEqual(['run 1: no usable, timestamped Lighthouse performance analysis']);
    }
  });
});

describe('parseArgs', () => {
  it('preserves the default and allows a single form factor without extra calls', () => {
    expect(parseArgs([])).toMatchObject({ runs: 3, strategy: 'both' });
    expect(parseArgs(['--strategy', 'mobile', '--runs', '1'])).toMatchObject({ runs: 1, strategy: 'mobile' });
    expect(parseArgs(['--strategy', 'desktop', '--url', 'https://rubikonbuild.com/angary'])).toMatchObject({ strategy: 'desktop', url: 'https://rubikonbuild.com/angary' });
  });
  it('rejects malformed inputs before making any requests', () => {
    for (const args of [ ['--strategy', 'phone'], ['--strategy'], ['--runs', '3x'], ['--runs', '0'], ['--runs', '6'],
      ['--runs', '--out', 'results'], ['--url', 'https://'], ['--url', 'http://rubikonbuild.com/'],
      ['--url', 'https://name:password@rubikonbuild.com/'] ]) expect(() => parseArgs(args)).toThrow();
  });
});

describe('CLI form factor selection', () => {
  it('requests and exports only the chosen strategies, keeping the six-call default', () => {
    const directory = mkdtempSync(join(tmpdir(), 'rubikon-psi-cli-'));
    // Replace fetch in the child process before loading the CLI. No network or real API key is used.
    const mockModule = `
      import { appendFileSync } from 'node:fs';
      let count = 0;
      globalThis.fetch = async (url, options) => {
        const strategy = new URL(url).searchParams.get('strategy');
        if (options.headers['X-goog-api-key'] !== 'fixture-only') throw new Error('Unexpected key');
        appendFileSync(process.env.PSI_MOCK_LOG, strategy + '\\n');
        count += 1;
        return { ok: true, json: async () => ({ lighthouseResult: {
          fetchTime: new Date(Date.UTC(2026, 9, 9, 19, 0, count)).toISOString(),
          lighthouseVersion: '13.5.0', categories: { performance: { score: 0.8 } },
          audits: { 'first-contentful-paint': { numericValue: 2000 },
            'largest-contentful-paint': { numericValue: 4000 } }
        } }) };
      };
    `;
    try {
      for (const [name, args, strategies] of [
        ['mobile', ['--strategy', 'mobile', '--runs', '1'], ['mobile']],
        ['desktop', ['--strategy', 'desktop', '--runs', '1'], ['desktop']],
        ['default', [], ['mobile', 'mobile', 'mobile', 'desktop', 'desktop', 'desktop']],
      ] as const) {
        const out = join(directory, name);
        const log = join(directory, `${name}.log`);
        const child = spawnSync(process.execPath, [
          '--import', `data:text/javascript;base64,${Buffer.from(mockModule).toString('base64')}`,
          fileURLToPath(new URL('../../../scripts/perf/pagespeed.mjs', import.meta.url)), ...args, '--out', out,
        ], { env: { ...process.env, PAGESPEED_API_KEY: 'fixture-only', PSI_MOCK_LOG: log,
          GITHUB_STEP_SUMMARY: '', GITHUB_SHA: 'fixture' }, encoding: 'utf8', timeout: 10_000 });
        expect(child.status, child.stderr).toBe(0);
        expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual(strategies);
        const summary = JSON.parse(readFileSync(join(out, 'summary.json'), 'utf8'));
        const selected = [...new Set(strategies)];
        expect(Object.keys(summary.results)).toEqual(selected);
        expect(Object.keys(summary.median)).toEqual(selected);
        expect(readdirSync(out).filter((file) => file.startsWith('psi-'))).toHaveLength(strategies.length);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
