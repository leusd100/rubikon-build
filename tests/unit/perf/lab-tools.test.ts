import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { median, parseArgs, summarizeRun } from '../../../scripts/perf/lab-lighthouse.mjs';
import { analyzeTrace, parseArgs as parseTraceArgs } from '../../../scripts/perf/trace-style-layout.mjs';

// A real Lighthouse 13 report: DebugBear's last mobile run of HOME before the subscription ended
const debugBearHome = JSON.parse(gunzipSync(readFileSync(new URL(
  '../../../docs/performance/debugbear-2026-10-27/lighthouse/home-mobile-latest-2026-10-27-90706982.json.gz', import.meta.url,
))).toString());

describe('lab-lighthouse', () => {
  it('reads the metrics and the LCP parts of a Lighthouse 13 report', () => {
    const run = summarizeRun(debugBearHome);
    expect(run).toMatchObject({ lcp: 3568, score: 0.72 });
    expect(run.lcpParts).toEqual({ timeToFirstByte: 554, resourceLoadDelay: 125, resourceLoadDuration: 2841, elementRenderDelay: 48 });
  });

  it('reads the LCP parts of a Lighthouse 12 report, which calls them phases', () => {
    const lighthouse12 = { categories: { performance: { score: 0.76 } }, audits: {
      'largest-contentful-paint': { numericValue: 3574.4 },
      'lcp-phases-insight': { details: { items: [{ type: 'table', items: [
        { phase: 'timeToFirstByte', duration: 18.2 }, { phase: 'resourceLoadDuration', duration: 3196.4 },
      ] }] } },
    } };
    const run = summarizeRun(lighthouse12);
    expect(run.lcp).toBe(3574);
    expect(run.lcpParts).toEqual({ timeToFirstByte: 18, resourceLoadDuration: 3196 });
  });

  it('takes a measured value as the median, the lower middle of an even count', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([5, 1, 3, 2])).toBe(2);
  });

  it('rejects run counts and throttling it does not know', () => {
    expect(parseArgs(['--runs', '3', '--throttling', 'devtools'])).toMatchObject({ runs: 3, throttling: 'devtools' });
    expect(() => parseArgs(['--runs', '0'])).toThrow('--runs');
    expect(() => parseArgs(['--throttling', 'fast'])).toThrow('--throttling');
    expect(() => parseArgs(['--url'])).toThrow('Missing value');
  });
});

describe('trace-style-layout', () => {
  const task = (ts: number, dur: number, tid = 1) => ({ name: 'RunTask', pid: 1, tid, ts, dur });
  const style = (ts: number, dur: number, elementCount: number, stackTrace?: object[]) => ({
    name: 'UpdateLayoutTree', pid: 1, tid: 1, ts, dur, args: { elementCount, beginData: stackTrace ? { stackTrace } : {} },
  });
  const forcedAt = [{ url: 'https://example.test/_next/static/chunks/ProofContour-x.js', lineNumber: 1, columnNumber: 37868, functionName: '' }];

  it('splits style and layout into forced and natural, keeps the main thread only, and sums blocking time', () => {
    const result = analyzeTrace([
      task(1_000_000, 120_000), task(2_000_000, 40_000), task(1_000_000, 10_000, 2),
      style(1_010_000, 50_000, 480),
      style(1_070_000, 20_000, 600, forcedAt),
      { name: 'Layout', pid: 1, tid: 1, ts: 1_095_000, dur: 2_000, args: { beginData: { stackTrace: forcedAt, dirtyObjects: 12 } } },
      style(1_200_000, 30_000, 900, undefined),
      { ...style(1_300_000, 99_000, 1), tid: 2 },
    ]);
    expect(result.total).toBeCloseTo(102);
    expect(result.forced).toBeCloseTo(22);
    expect(result.blocking).toBeCloseTo(70);
    expect(result.forcedBy[0]).toEqual(['style ProofContour-x.js:1:37868', 20]);
    expect(result.recalcs.map((recalc) => [recalc.at, recalc.kind, recalc.elements, recalc.forced])).toEqual([
      [10, 'style', 480, false], [70, 'style', 600, true], [200, 'style', 900, false],
    ]);
  });

  it('takes --invalidation as a switch and rejects unknown flags', () => {
    expect(parseTraceArgs(['--invalidation', '--runs', '2'])).toMatchObject({ invalidation: true, runs: 2 });
    expect(() => parseTraceArgs(['--bogus', 'x'])).toThrow('Unknown argument');
  });
});
