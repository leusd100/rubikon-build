// Where a page's style and layout time goes while it loads: a Chrome trace under DebugBear's "Mobile" profile, read for
// every style recalculation and layout of 3 ms or more, the ones JavaScript forced (and which line forced them), and the
// main thread's long-task blocking time.
//
//   node scripts/perf/lhci-server.mjs --port 4174 &
//   node scripts/perf/trace-style-layout.mjs --url http://127.0.0.1:4174/ --runs 5 [--invalidation] [--out dir]
//
// --invalidation also records what invalidated style (a far slower trace: use its causes, not its timings).
// Lesson of 27.10 (HOME, mobile): removing the forced recalculations cut "forced" 239 → 157 ms while the total style and
// layout time stayed at ~785 ms — the first recalculation after hydration is paid by whoever reads layout first. Judge a
// change by the total and by the blocking time, not by "forced".
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const CATEGORIES = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.stack', 'v8.execute', 'loading'];

export function parseArgs(argv) {
  const args = { url: 'http://127.0.0.1:4174/', runs: 3, invalidation: false, out: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--invalidation') { args.invalidation = true; continue; }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    index += 1;
    if (flag === '--url') args.url = value;
    else if (flag === '--runs') args.runs = Number(value);
    else if (flag === '--out') args.out = value;
    else throw new Error(`Unknown argument ${flag}`);
  }
  if (!Number.isInteger(args.runs) || args.runs < 1 || args.runs > 15) throw new Error('--runs must be an integer from 1 to 15');
  return args;
}

/** The renderer's main thread: the one with the most task time */
function mainThreadEvents(events) {
  const busy = new Map();
  for (const event of events) {
    if (event.name === 'RunTask' && event.dur) busy.set(`${event.pid}:${event.tid}`, (busy.get(`${event.pid}:${event.tid}`) ?? 0) + event.dur);
  }
  const [main] = [...busy.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return events.filter((event) => `${event.pid}:${event.tid}` === main);
}

/** Style and layout totals, the forced share by the line that forced it, and long-task blocking time (ms) */
export function analyzeTrace(events) {
  const main = mainThreadEvents(events);
  const start = Math.min(...main.filter((event) => event.name === 'RunTask').map((event) => event.ts));
  const forcedBy = new Map();
  const recalcs = [];
  let total = 0;
  let forced = 0;
  let blocking = 0;
  for (const event of main) {
    if (event.name === 'RunTask' && event.dur > 50_000) blocking += (event.dur - 50_000) / 1000;
    if (event.name !== 'UpdateLayoutTree' && event.name !== 'Layout') continue;
    const ms = (event.dur ?? 0) / 1000;
    total += ms;
    const frame = event.args?.beginData?.stackTrace?.[0];
    if (frame) {
      forced += ms;
      const key = `${event.name === 'Layout' ? 'layout' : 'style'} ${(frame.url ?? '').split('/').pop()}:${frame.lineNumber}:${frame.columnNumber} ${frame.functionName || ''}`.trim();
      forcedBy.set(key, (forcedBy.get(key) ?? 0) + ms);
    }
    if (ms >= 3) {
      recalcs.push({ at: Math.round((event.ts - start) / 1000), kind: event.name === 'Layout' ? 'layout' : 'style', ms: Math.round(ms * 10) / 10,
        elements: event.args?.elementCount ?? event.args?.beginData?.dirtyObjects ?? null, forced: Boolean(frame) });
    }
  }
  return { total, forced, blocking, forcedBy: [...forcedBy.entries()].sort((a, b) => b[1] - a[1]), recalcs };
}

async function main() {
  const { url, runs, invalidation, out } = parseArgs(process.argv.slice(2));
  const { chromium } = require('@playwright/test');
  if (out) mkdirSync(out, { recursive: true });
  const categories = invalidation ? [...CATEGORIES, 'disabled-by-default-devtools.timeline.invalidationTracking'] : CATEGORIES;
  const totals = [];
  for (let run = 1; run <= runs; run += 1) {
    const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
    try {
      const context = await browser.newContext({ viewport: { width: 412, height: 660 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1638 * 1024) / 8, uploadThroughput: (1638 * 1024) / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const events = [];
      cdp.on('Tracing.dataCollected', ({ value }) => events.push(...value));
      const complete = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
      await cdp.send('Tracing.start', { traceConfig: { includedCategories: categories }, transferMode: 'ReportEvents' });
      await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
      await page.waitForTimeout(6000);
      await cdp.send('Tracing.end');
      await complete;
      if (out) writeFileSync(join(out, `trace-${run}.json`), JSON.stringify({ traceEvents: events }));
      const result = analyzeTrace(events);
      totals.push(result);
      console.log(`#${run} style+layout ${result.total.toFixed(0)} ms (forced ${result.forced.toFixed(0)}), long-task blocking ${result.blocking.toFixed(0)} ms`);
      for (const [where, ms] of result.forcedBy.slice(0, 6)) console.log(`    forced ${ms.toFixed(1).padStart(6)} ms  ${where}`);
      if (run === 1) for (const recalc of result.recalcs) console.log(`    @${recalc.at} ms ${recalc.kind} ${recalc.ms} ms, ${recalc.elements ?? '?'} elements${recalc.forced ? ', forced' : ''}`);
    } finally {
      await browser.close();
    }
  }
  const median = (values) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) / 2)];
  console.log(`\nMedian of ${runs}: style+layout ${median(totals.map((t) => t.total)).toFixed(0)} ms, forced ${median(totals.map((t) => t.forced)).toFixed(0)} ms, blocking ${median(totals.map((t) => t.blocking)).toFixed(0)} ms`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
