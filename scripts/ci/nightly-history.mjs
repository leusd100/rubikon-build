// Nightly history — one line per night, so the site's state can be read over months and not only from the latest run.
//
//   node scripts/ci/nightly-history.mjs lighthouse --profile standard --dir .lighthouseci --out nightly-metrics/lighthouse-standard.json
//   node scripts/ci/nightly-history.mjs tests --report nightly-tests.json --out nightly-metrics/tests.json
//   node scripts/ci/nightly-history.mjs record --metrics nightly-metrics --history history/nightly-history.ndjson --out history/nightly-history.ndjson
//
// Before this, a green night left no number at all: Lighthouse reports were kept only on failure, and a failed run's
// artifact expired after 14 days, so 45 of 57 nights to 31.10.2026 had nothing but the budget line they broke. The file
// is carried from one night's artifact to the next (.github/workflows/nightly-full-qa.yml), which needs no write access
// to the repository and outlives GitHub's 90-day artifact limit.
//
// Reporting only: nothing here changes the night's verdict, which stays with the budgets in lighthouserc.cjs and the
// `report` job. Only Node's built-ins, so the `history` job needs no install.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { median } from '../perf/pagespeed.mjs';

const CATEGORIES = { accessibility: 'a11y', 'best-practices': 'bestPractices', seo: 'seo' };
const METRICS = {
  fcp: 'first-contentful-paint',
  lcp: 'largest-contentful-paint',
  tbt: 'total-blocking-time',
  si: 'speed-index',
  cls: 'cumulative-layout-shift',
  bytes: 'total-byte-weight',
};
const PROFILES = { home: 'HOME', standard: '/angary', grain: '/zernoskhovyshcha' };
const SUMMARY_NIGHTS = 14;

const rounded = (value, digits = 0) => (value === null ? null : Number(value.toFixed(digits)));

/**
 * What one profile's Lighthouse runs say: each metric's median, the aggregation the budgets assert on, plus every run's
 * LCP, because a spread between runs is itself a finding. `protocol` is recorded since a number only compares with
 * another measured the same way: Lighthouse's model reads HTTP/1.1 and HTTP/2 differently.
 */
export function summarizeLighthouse(reports) {
  if (!reports.length) return null;
  const audit = (report, id) => report.audits?.[id]?.numericValue ?? null;
  const metrics = Object.fromEntries(Object.entries(METRICS).map(([key, id]) => [key, median(reports.map((report) => audit(report, id)))]));
  const categories = Object.fromEntries(Object.entries(CATEGORIES).map(([id, key]) => [key, median(reports.map((report) => report.categories?.[id]?.score ?? null))]));
  const documentRequest = reports[0].audits?.['network-requests']?.details?.items?.find((item) => item.resourceType === 'Document');
  return {
    url: reports[0].finalDisplayedUrl ?? null,
    lighthouseVersion: reports[0].lighthouseVersion ?? null,
    protocol: documentRequest?.protocol ?? null,
    runs: reports.length,
    score: median(reports.map((report) => report.categories?.performance?.score ?? null)),
    ...categories,
    fcp: rounded(metrics.fcp),
    lcp: rounded(metrics.lcp),
    tbt: rounded(metrics.tbt),
    si: rounded(metrics.si),
    cls: rounded(metrics.cls, 4),
    bytes: rounded(metrics.bytes),
    lcpRuns: reports.map((report) => rounded(audit(report, METRICS.lcp))),
  };
}

function* specsOf(suite) {
  yield* suite.specs ?? [];
  for (const child of suite.suites ?? []) yield* specsOf(child);
}

/** Counts from Playwright's JSON report, and the tests that failed or passed only on retry: those are the trend to watch. */
export function summarizeTests(report) {
  const { expected = 0, unexpected = 0, flaky = 0, skipped = 0, duration = null } = report.stats ?? {};
  const failedTests = [];
  const flakyTests = [];
  for (const suite of report.suites ?? []) {
    for (const spec of specsOf(suite)) {
      for (const test of spec.tests ?? []) {
        const list = test.status === 'unexpected' ? failedTests : test.status === 'flaky' ? flakyTests : null;
        list?.push(`[${test.projectName}] ${spec.file}:${spec.line} ${spec.title}`);
      }
    }
  }
  return { passed: expected, failed: unexpected, flaky, skipped, minutes: duration === null ? null : rounded(duration / 60_000, 1), failedTests, flakyTests };
}

/** One night. A piece that did not run tonight stays null, which a table shows as a gap and not as a zero. */
export function buildRecord({ env, tests = null, lighthouse = {} }) {
  return {
    date: env.NIGHT_DATE,
    run: Number(env.GITHUB_RUN_ID),
    sha: env.GITHUB_SHA,
    event: env.GITHUB_EVENT_NAME,
    result: { build: env.RESULT_BUILD, e2e: env.RESULT_E2E, visual: env.RESULT_VISUAL, lighthouse: env.RESULT_LIGHTHOUSE },
    tests,
    lighthouse,
  };
}

export const parseHistory = (text) => text.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));

/** Old lines stay as they were written; a rerun of a run replaces its own line and does not add a second. */
export function appendRecord(history, record) {
  return [...history.filter((night) => night.run !== record.run), record];
}

const cell = (profile) => (profile ? `${Math.round(profile.score * 100)} · ${(profile.lcp / 1000).toFixed(2)} s` : '—');

export function summaryMarkdown(history) {
  const nights = history.slice(-SUMMARY_NIGHTS).reverse();
  const lines = [
    `### Nightly history — last ${nights.length} of ${history.length} nights`,
    '',
    'Performance · LCP per page. The full history is the `nightly-history` artifact, one JSON line per night.',
    '',
    `| Night | Commit | Result | Passed | Failed | Flaky | ${Object.values(PROFILES).join(' | ')} |`,
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const night of nights) {
    const failing = Object.entries(night.result).filter(([, result]) => result !== 'success').map(([job, result]) => `${job}: ${result}`);
    lines.push(`| ${[
      night.date,
      `\`${night.sha.slice(0, 8)}\``,
      failing.length ? failing.join(', ') : 'pass',
      night.tests?.passed ?? '—',
      night.tests?.failed ?? '—',
      night.tests?.flaky ?? '—',
      ...Object.keys(PROFILES).map((profile) => cell(night.lighthouse?.[profile])),
    ].join(' | ')} |`);
  }
  const unstable = nights.flatMap((night) => [...(night.tests?.failedTests ?? []), ...(night.tests?.flakyTests ?? [])]);
  if (unstable.length) {
    const counts = new Map();
    for (const test of unstable) counts.set(test, (counts.get(test) ?? 0) + 1);
    lines.push('', '**Failed or passed only on retry in these nights**', '');
    for (const [test, count] of [...counts].sort((a, b) => b[1] - a[1])) lines.push(`- ${count} × ${test}`);
  }
  return `${lines.join('\n')}\n`;
}

export function parseArgs(argv) {
  const [command, ...flags] = argv;
  const args = { command };
  for (let index = 0; index < flags.length; index += 2) {
    const [flag, value] = [flags[index], flags[index + 1]];
    if (!flag.startsWith('--') || !value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    args[flag.slice(2)] = value;
  }
  if (!['lighthouse', 'tests', 'record'].includes(command)) throw new Error('Commands: lighthouse, tests, record');
  if (!args.out) throw new Error('--out is required');
  return args;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value)}\n`);
}

function lighthouseCommand({ profile, dir, out }) {
  if (!PROFILES[profile]) throw new Error(`Unknown profile ${profile}`);
  const names = existsSync(dir) ? readdirSync(dir).filter((name) => /^lhr-.*\.json$/.test(name)) : [];
  const summary = summarizeLighthouse(names.map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8'))));
  // A profile that crashed before its first report is a gap in the table; the job's own failure already reports it
  if (summary) writeJson(out, summary);
  else console.log(`No Lighthouse reports in ${dir}; nothing recorded for ${profile}.`);
}

function recordCommand({ metrics, history, out }) {
  const read = (name) => {
    const path = join(metrics, name);
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
  };
  const lighthouse = {};
  for (const profile of Object.keys(PROFILES)) {
    const summary = read(`lighthouse-${profile}.json`);
    if (summary) lighthouse[profile] = summary;
  }
  const tests = read('tests.json');
  const record = buildRecord({ env: process.env, tests, lighthouse });
  const previous = history && existsSync(history) ? parseHistory(readFileSync(history, 'utf8')) : [];
  const next = appendRecord(previous, record);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${next.map((night) => JSON.stringify(night)).join('\n')}\n`);
  const markdown = summaryMarkdown(next);
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === 'lighthouse') lighthouseCommand(args);
  else if (args.command === 'tests') writeJson(args.out, summarizeTests(JSON.parse(readFileSync(args.report, 'utf8'))));
  else recordCommand(args);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
