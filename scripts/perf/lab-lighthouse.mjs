// Local Lighthouse lab runs against a production build — the medians a change is judged by before it ships.
//
//   node scripts/perf/lhci-server.mjs --port 4174 &          # the build as visitors get it (brotli), see that file
//   node scripts/perf/lab-lighthouse.mjs --url http://127.0.0.1:4174/ --runs 5 --throttling devtools
//
// --throttling simulate (default): Lighthouse's own model, as `pnpm test:lighthouse` and Nightly use it.
// --throttling devtools: the network and CPU really slowed to DebugBear's "Mobile" profile (150 ms RTT, 1.6 Mbit/s, CPU
// ×4, 412 × 660 at DPR 2.625). On main 9079f47 it gave HOME's mobile LCP 3574 ms where DebugBear's production median was
// 3568 ms (docs/performance/debugbear-2026-10-27/) — but by different parts: here the first byte takes ~20 ms and the
// image's download ~3.2 s (one HTTP/1.1 server, no CDN, no HTTP/3 priorities), there 554 ms and 2.8 s. Compare a change
// against main on this machine; do not read it as production. TBT reads lower than DebugBear's (368 vs 620 ms).
//
// Prints each run and the medians; with --out, writes every Lighthouse JSON there. Chrome: CHROME_PATH, else
// Playwright's Chromium (in cloud sessions the SessionStart hook points PLAYWRIGHT_BROWSERS_PATH at it).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
// Lighthouse comes with @lhci/cli (the version Nightly runs); no dependency of its own
const lighthousePath = createRequire(require.resolve('@lhci/cli/package.json')).resolve('lighthouse');

const DEBUGBEAR_MOBILE = {
  throttlingMethod: 'devtools',
  throttling: { requestLatencyMs: 150, downloadThroughputKbps: 1638, uploadThroughputKbps: 1638, cpuSlowdownMultiplier: 4 },
  formFactor: 'mobile',
  screenEmulation: { mobile: true, width: 412, height: 660, deviceScaleFactor: 2.625, disabled: false },
};

export function parseArgs(argv) {
  const args = { url: 'http://127.0.0.1:4174/', runs: 5, throttling: 'simulate', out: null };
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (flag === '--url') args.url = value;
    else if (flag === '--runs') args.runs = Number(value);
    else if (flag === '--throttling') args.throttling = value;
    else if (flag === '--out') args.out = value;
    else throw new Error(`Unknown argument ${flag}`);
  }
  if (!Number.isInteger(args.runs) || args.runs < 1 || args.runs > 15) throw new Error('--runs must be an integer from 1 to 15');
  if (!['simulate', 'devtools'].includes(args.throttling)) throw new Error('--throttling must be simulate or devtools');
  return args;
}

/** Middle value (lower middle for an even count, so it is always a value that was measured) */
export const median = (values) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) / 2)];

/** What one run says: the lab metrics, the LCP's parts, and where the main thread went */
export function summarizeRun(lhr) {
  const audits = lhr.audits;
  const value = (id) => audits[id]?.numericValue ?? null;
  // Lighthouse 12 (this repo's) calls the parts phases; 13 (DebugBear's export) calls them subparts
  const lcpInsight = audits['lcp-phases-insight'] ?? audits['lcp-breakdown-insight'];
  const lcpParts = (lcpInsight?.details?.items ?? []).find((item) => item.type === 'table')?.items ?? [];
  const mainThread = Object.fromEntries((audits['mainthread-work-breakdown']?.details?.items ?? []).map((item) => [item.group, Math.round(item.duration)]));
  return {
    score: lhr.categories.performance.score,
    fcp: Math.round(value('first-contentful-paint')),
    lcp: Math.round(value('largest-contentful-paint')),
    tbt: Math.round(value('total-blocking-time')),
    si: Math.round(value('speed-index')),
    cls: value('cumulative-layout-shift'),
    bytes: Math.round(value('total-byte-weight')),
    lcpParts: Object.fromEntries(lcpParts.map((part) => [part.phase ?? part.subpart, Math.round(part.duration)])),
    styleLayout: mainThread.styleLayout ?? null,
    scriptEvaluation: mainThread.scriptEvaluation ?? null,
    longTasks: (audits['long-tasks']?.details?.items ?? []).slice(0, 6)
      .map((task) => `${String(task.url).split('/').pop() || 'document'} ${Math.round(task.duration)} ms @ ${Math.round(task.startTime)}`),
  };
}

async function main() {
  const { url, runs, throttling, out } = parseArgs(process.argv.slice(2));
  const lighthouse = (await import(pathToFileURL(lighthousePath).href)).default;
  const chromeLauncher = createRequire(lighthousePath)('chrome-launcher');
  const chromePath = process.env.CHROME_PATH || require('@playwright/test').chromium.executablePath();
  if (out) mkdirSync(out, { recursive: true });

  const results = [];
  for (let run = 1; run <= runs; run += 1) {
    const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'] });
    try {
      const config = throttling === 'devtools' ? { extends: 'lighthouse:default', settings: DEBUGBEAR_MOBILE } : undefined;
      const { lhr } = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'] }, config);
      if (out) writeFileSync(join(out, `lighthouse-${throttling}-${run}.json`), JSON.stringify(lhr));
      const summary = summarizeRun(lhr);
      results.push(summary);
      console.log(`#${run} score ${summary.score} LCP ${summary.lcp} FCP ${summary.fcp} TBT ${summary.tbt} style+layout ${summary.styleLayout} LCP parts ${JSON.stringify(summary.lcpParts)}`);
    } finally {
      await chrome.kill();
    }
  }
  const keys = ['score', 'fcp', 'lcp', 'tbt', 'si', 'cls', 'bytes', 'styleLayout', 'scriptEvaluation'];
  const medians = Object.fromEntries(keys.map((key) => [key, median(results.map((result) => result[key]))]));
  console.log(`\nMedian of ${runs} (${throttling}, ${url}): ${JSON.stringify(medians)}`);
  const middle = results.find((result) => result.tbt === medians.tbt) ?? results[0];
  console.log(`Long tasks in the median-TBT run: ${middle.longTasks.join(' | ')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
