import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendRecord,
  buildRecord,
  parseArgs,
  parseHistory,
  summarizeLighthouse,
  summarizeTests,
  summaryMarkdown,
} from '../../scripts/ci/nightly-history.mjs';

const lighthouseRun = (lcp: number, score = 0.9) => ({
  finalDisplayedUrl: 'https://127.0.0.1:4174/angary',
  lighthouseVersion: '12.6.1',
  categories: { performance: { score }, accessibility: { score: 1 }, 'best-practices': { score: 0.96 }, seo: { score: 1 } },
  audits: {
    'first-contentful-paint': { numericValue: 1800.4 },
    'largest-contentful-paint': { numericValue: lcp },
    'total-blocking-time': { numericValue: 60 },
    'speed-index': { numericValue: 2100 },
    'cumulative-layout-shift': { numericValue: 0.01234 },
    'total-byte-weight': { numericValue: 770_000 },
    'network-requests': { details: { items: [{ resourceType: 'Font', protocol: 'h2' }, { resourceType: 'Document', protocol: 'h2' }] } },
  },
});

const night = (run: number, overrides: Record<string, unknown> = {}) => ({
  date: `2026-11-${String(run).padStart(2, '0')}`,
  run,
  sha: 'abcdef1234567890',
  event: 'schedule',
  result: { build: 'success', e2e: 'success', visual: 'success', lighthouse: 'success' },
  tests: { passed: 2000, failed: 0, flaky: 0, skipped: 40, minutes: 80, failedTests: [], flakyTests: [] },
  lighthouse: {},
  ...overrides,
});

describe('summarizeLighthouse', () => {
  it('keeps each metric’s median, the aggregation the budgets assert on, and every run’s LCP', () => {
    const summary = summarizeLighthouse([lighthouseRun(3100.4), lighthouseRun(3000.2), lighthouseRun(9000)]);

    expect(summary).toMatchObject({ runs: 3, lcp: 3100, fcp: 1800, tbt: 60, score: 0.9, a11y: 1, bestPractices: 0.96, seo: 1 });
    expect(summary?.lcpRuns).toEqual([3100, 3000, 9000]);
    expect(summary?.cls).toBe(0.0123);
  });

  it('records the document’s protocol: a number compares only with one measured the same way', () => {
    expect(summarizeLighthouse([lighthouseRun(3000)])?.protocol).toBe('h2');
  });

  it('says nothing when there are no reports, so a crashed profile is a gap and not a zero', () => {
    expect(summarizeLighthouse([])).toBeNull();
  });
});

describe('summarizeTests', () => {
  it('counts from the report’s stats and names what failed or passed only on retry, however deep the suite', () => {
    const summary = summarizeTests({
      stats: { expected: 10, unexpected: 1, flaky: 1, skipped: 2, duration: 90_000 },
      suites: [{
        specs: [{ file: 'a.spec.ts', line: 3, title: 'fails', tests: [{ projectName: 'desktop-chromium', status: 'unexpected' }] }],
        suites: [{
          specs: [
            { file: 'b.spec.ts', line: 7, title: 'retried', tests: [{ projectName: 'mobile-chromium', status: 'flaky' }] },
            { file: 'c.spec.ts', line: 9, title: 'fine', tests: [{ projectName: 'mobile-chromium', status: 'expected' }] },
          ],
        }],
      }],
    });

    expect(summary).toMatchObject({ passed: 10, failed: 1, flaky: 1, skipped: 2, minutes: 1.5 });
    expect(summary.failedTests).toEqual(['[desktop-chromium] a.spec.ts:3 fails']);
    expect(summary.flakyTests).toEqual(['[mobile-chromium] b.spec.ts:7 retried']);
  });
});

describe('the history', () => {
  it('keeps old lines as written and lets a rerun replace its own night', () => {
    const history = [night(1), night(2)];

    expect(appendRecord(history, night(3)).map((entry) => entry.run)).toEqual([1, 2, 3]);
    expect(appendRecord(history, night(2, { date: 'rerun' }))).toEqual([night(1), night(2, { date: 'rerun' })]);
  });

  it('reads a file back line by line and ignores the trailing newline', () => {
    expect(parseHistory(`${JSON.stringify(night(1))}\n${JSON.stringify(night(2))}\n`).map((entry: { run: number }) => entry.run)).toEqual([1, 2]);
  });

  it('takes a night’s facts from the workflow’s environment', () => {
    const record = buildRecord({
      env: {
        NIGHT_DATE: '2026-11-01', GITHUB_RUN_ID: '42', GITHUB_SHA: 'abc', GITHUB_EVENT_NAME: 'schedule',
        RESULT_BUILD: 'success', RESULT_E2E: 'failure', RESULT_VISUAL: 'success', RESULT_LIGHTHOUSE: 'success', RESULT_REPORT: 'success',
      },
    });

    expect(record).toMatchObject({ date: '2026-11-01', run: 42, sha: 'abc', tests: null, lighthouse: {} });
    expect(record.result.e2e).toBe('failure');
  });
});

describe('summaryMarkdown', () => {
  const standard = { score: 0.89, lcp: 3100 };

  it('shows the newest night first and only the last fourteen, naming the size of the whole history', () => {
    const history = Array.from({ length: 20 }, (_, index) => night(index + 1));
    const markdown = summaryMarkdown(history);

    expect(markdown).toContain('last 14 of 20 nights');
    expect(markdown.indexOf('2026-11-20')).toBeLessThan(markdown.indexOf('2026-11-19'));
    expect(markdown).not.toContain('2026-11-06');
  });

  it('names the job that broke the night and shows a page’s score with its LCP', () => {
    const markdown = summaryMarkdown([night(1, {
      result: { build: 'success', e2e: 'success', visual: 'success', lighthouse: 'failure' },
      lighthouse: { standard },
    })]);

    expect(markdown).toContain('lighthouse: failure');
    expect(markdown).toContain('89 · 3.10 s');
  });

  it('names a report job that failed on its own', () => {
    const markdown = summaryMarkdown([night(1, {
      result: { build: 'success', e2e: 'success', visual: 'success', lighthouse: 'success', report: 'failure' },
    })]);

    expect(markdown).toContain('report: failure');
  });

  it('draws a profile that crashed without numbers as a gap', () => {
    const markdown = summaryMarkdown([night(1, { lighthouse: { standard: { score: null, lcp: null } } })]);

    expect(markdown).not.toContain('0 · 0.00 s');
  });

  it('draws what did not run as a gap, never as a zero', () => {
    const row = summaryMarkdown([night(1, { tests: null })]).split('\n').find((line) => line.startsWith('| 2026-11-01'));

    expect(row).not.toContain('| 0 |');
    expect(row).toContain('—');
  });

  it('adds up tests that keep failing or passing only on retry, the worst first', () => {
    const unstable = (run: number, failedTests: string[], flakyTests: string[]) => night(run, {
      tests: { passed: 1, failed: failedTests.length, flaky: flakyTests.length, skipped: 0, minutes: 1, failedTests, flakyTests },
    });
    const markdown = summaryMarkdown([unstable(1, ['once'], ['twice']), unstable(2, [], ['twice'])]);

    expect(markdown.indexOf('2 × twice')).toBeLessThan(markdown.indexOf('1 × once'));
    expect(summaryMarkdown([night(1)])).not.toContain('passed only on retry');
  });
});

describe('parseArgs', () => {
  it('reads a command and its flags, and refuses what cannot run', () => {
    expect(parseArgs(['tests', '--report', 'r.json', '--out', 'o.json'])).toEqual({ command: 'tests', report: 'r.json', out: 'o.json' });
    expect(() => parseArgs(['delete', '--out', 'o.json'])).toThrow('Commands');
    expect(() => parseArgs(['tests', '--report', 'r.json'])).toThrow('--out is required');
    expect(() => parseArgs(['tests', '--out'])).toThrow('Missing value');
  });
});

describe('the script as the workflow runs it', () => {
  const script = fileURLToPath(new URL('../../scripts/ci/nightly-history.mjs', import.meta.url));
  const run = (args: string[], env: Record<string, string> = {}) => {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '', ...env } });
    expect(result.status, result.stderr).toBe(0);
    return result.stdout;
  };

  it('turns tonight’s reports into a line appended to the file carried from last night', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nightly-history-'));
    try {
      const reports = join(dir, 'lhci');
      const metrics = join(dir, 'metrics');
      const history = join(dir, 'history.ndjson');
      mkdirSync(reports);
      writeFileSync(join(reports, 'lhr-1.json'), JSON.stringify(lighthouseRun(3000)));
      writeFileSync(join(reports, 'assertion-results.json'), '[]');
      writeFileSync(join(dir, 'report.json'), JSON.stringify({ stats: { expected: 5 } }));
      writeFileSync(history, `${JSON.stringify(night(1))}\n`);

      run(['lighthouse', '--profile', 'standard', '--dir', reports, '--out', join(metrics, 'lighthouse-standard.json')]);
      run(['lighthouse', '--profile', 'grain', '--dir', join(dir, 'missing'), '--out', join(metrics, 'lighthouse-grain.json')]);
      run(['tests', '--report', join(dir, 'report.json'), '--out', join(metrics, 'tests.json')]);
      const summary = run(['record', '--metrics', metrics, '--history', history, '--out', history], {
        NIGHT_DATE: '2026-11-02', GITHUB_RUN_ID: '2', GITHUB_SHA: 'abcdef12', GITHUB_EVENT_NAME: 'workflow_dispatch',
        RESULT_BUILD: 'success', RESULT_E2E: 'success', RESULT_VISUAL: 'success', RESULT_LIGHTHOUSE: 'success',
      });

      const nights = parseHistory(readFileSync(history, 'utf8'));
      expect(nights.map((entry: { run: number }) => entry.run)).toEqual([1, 2]);
      expect(nights[1].lighthouse.standard).toMatchObject({ lcp: 3000, protocol: 'h2' });
      expect(nights[1].lighthouse.grain).toBeUndefined();
      expect(nights[1].tests).toMatchObject({ passed: 5, failedTests: [] });
      expect(summary).toContain('last 2 of 2 nights');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('starts a history when there is none yet', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nightly-history-'));
    try {
      const history = join(dir, 'new', 'history.ndjson');
      run(['record', '--metrics', join(dir, 'none'), '--out', history], {
        NIGHT_DATE: '2026-11-02', GITHUB_RUN_ID: '2', GITHUB_SHA: 'abcdef12', GITHUB_EVENT_NAME: 'schedule',
        RESULT_BUILD: 'failure', RESULT_E2E: 'skipped', RESULT_VISUAL: 'skipped', RESULT_LIGHTHOUSE: 'skipped',
      });

      expect(parseHistory(readFileSync(history, 'utf8'))).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
