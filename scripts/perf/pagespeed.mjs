// PageSpeed Insights monitor — N independent analyses per form factor against a live URL, medians, raw JSON, Markdown
// summary.
//
//   PAGESPEED_API_KEY=… node scripts/perf/pagespeed.mjs --url https://rubikonbuild.com/ --runs 3 --out psi-results
//
// Reporting only: scores never change the exit code. It exits non-zero only when it could not measure at all
// (every call for a form factor failed). The API key travels in the X-goog-api-key header, never in a URL, so
// it cannot leak through request URLs, error messages or logs.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const FORM_FACTORS = /** @type {const} */ (['mobile', 'desktop']);
const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/** @typedef {{ score: number | null, fcp: number | null, lcp: number | null, tbt: number | null, cls: number | null,
 *   si: number | null, ttfb: number | null, bytes: number | null, lcpElement: string | null,
 *   lighthouseVersion: string | null, fetchTime: string | null, fieldData: boolean,
 *   observedFcp: number | null, observedLcp: number | null,
 *   labProfile: object | null, fieldMetrics: Record<string, string[]>, requestCount: number | null }} PsiRun */

const numeric = (audits, id) => {
  const value = audits?.[id]?.numericValue;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const finite = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Empty metric maps and placeholder objects do not represent CrUX measurements. */
function availableFieldMetrics(experience) {
  return Object.entries(experience?.metrics ?? {})
    .filter(([, metric]) => finite(metric?.percentile) !== null)
    .map(([name]) => name);
}

/** First DOM node snippet found anywhere in an audit's details (the LCP element's shape differs by version). */
function firstNodeSnippet(details) {
  if (!details || typeof details !== 'object') return null;
  if (details.type === 'node' && typeof details.snippet === 'string') return details.snippet;
  for (const value of Object.values(details)) {
    const list = Array.isArray(value) ? value : [value];
    for (const item of list) {
      const found = firstNodeSnippet(item);
      if (found) return found;
    }
  }
  return null;
}

/**
 * The metrics of one PSI v5 response. Lighthouse 12 names the LCP element audit
 * `largest-contentful-paint-element`; Lighthouse 13 folds it into `lcp-breakdown-insight`.
 * @returns {PsiRun}
 */
export function extractRun(psi) {
  const lhr = psi?.lighthouseResult ?? {};
  const audits = lhr.audits ?? {};
  const score = lhr.categories?.performance?.score;
  const observed = audits.metrics?.details?.items?.[0];
  const fieldMetrics = {
    url: availableFieldMetrics(psi?.loadingExperience),
    origin: availableFieldMetrics(psi?.originLoadingExperience),
  };
  return {
    score: finite(score) !== null && score >= 0 && score <= 1 ? Math.round(score * 100) : null,
    fcp: numeric(audits, 'first-contentful-paint'),
    lcp: numeric(audits, 'largest-contentful-paint'),
    tbt: numeric(audits, 'total-blocking-time'),
    cls: numeric(audits, 'cumulative-layout-shift'),
    si: numeric(audits, 'speed-index'),
    ttfb: numeric(audits, 'server-response-time'),
    bytes: numeric(audits, 'total-byte-weight'),
    lcpElement: firstNodeSnippet(audits['largest-contentful-paint-element']?.details)
      ?? firstNodeSnippet(audits['lcp-breakdown-insight']?.details),
    lighthouseVersion: lhr.lighthouseVersion ?? null,
    fetchTime: lhr.fetchTime ?? null,
    // These clocks are recorded separately: observed timings must not be added to simulated lab metrics.
    observedFcp: finite(observed?.observedFirstContentfulPaint),
    observedLcp: finite(observed?.observedLargestContentfulPaint),
    labProfile: lhr.configSettings ? {
      formFactor: lhr.configSettings.formFactor ?? null,
      throttlingMethod: lhr.configSettings.throttlingMethod ?? null,
      throttling: lhr.configSettings.throttling ?? null,
      screenEmulation: lhr.configSettings.screenEmulation ?? null,
    } : null,
    requestCount: Array.isArray(audits['network-requests']?.details?.items)
      ? audits['network-requests'].details.items.length : null,
    fieldMetrics,
    fieldData: fieldMetrics.url.length > 0 || fieldMetrics.origin.length > 0,
  };
}

/** Median of the non-null values; null when there are none. */
export function median(values) {
  const sorted = values.filter((value) => finite(value) !== null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Each metric's own median across runs (not the run with the median score). */
export function medianRun(runs) {
  const keys = ['score', 'fcp', 'lcp', 'tbt', 'cls', 'si', 'ttfb', 'bytes'];
  return Object.fromEntries(keys.map((key) => [key, median(runs.map((run) => run[key]))]));
}

const seconds = (ms) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`);
const millis = (ms) => (ms === null ? '—' : `${Math.round(ms)} ms`);
const shift = (value) => (value === null ? '—' : value.toFixed(3));
const megabytes = (bytes) => (bytes === null ? '—' : `${(bytes / 1_000_000).toFixed(2)} MB`);
const scoreCell = (score) => (score === null ? '—' : String(Math.round(score)));
const row = (label, m) => `| ${label} | ${scoreCell(m.score)} | ${seconds(m.fcp)} | ${seconds(m.lcp)} | ${millis(m.tbt)} | ${shift(m.cls)} | ${seconds(m.si)} | ${millis(m.ttfb)} | ${megabytes(m.bytes)} |`;
const HEADER = '| | Performance | FCP | LCP | TBT | CLS | Speed Index | TTFB | Weight |\n|---|---|---|---|---|---|---|---|---|';
// For a value shown inside a `code` span in a table cell: backslashes first (so an input `\|` cannot turn into an
// unescaped pipe), then pipes; backticks would close the code span, so they become a lookalike quote.
const escapeCell = (text) => String(text)
  .replace(/\s+/g, ' ')
  .slice(0, 90)
  .replace(/\\/g, '\\\\')
  .replace(/\|/g, '\\|')
  .replace(/`/g, 'ˋ');

/**
 * @param {{ url: string, sha?: string | null, startedAt: string, requestedRuns?: number,
 *   results: Record<string, { runs: PsiRun[], failures: string[], repeats?: string[] }> }} report
 */
export function summaryMarkdown({ url, sha, startedAt, requestedRuns, results }) {
  const allRuns = Object.values(results).flatMap((result) => result.runs);
  const versions = [...new Set(allRuns.map((run) => run.lighthouseVersion).filter(Boolean))].join(', ') || '—';
  // How many independent analyses each median really rests on — PSI can hand back a cached one (see collectRuns).
  const counts = FORM_FACTORS.filter((formFactor) => results[formFactor])
    .map((formFactor) => `${formFactor} ${results[formFactor].runs.length}`).join(', ');
  const requested = requestedRuns ? ` of ${requestedRuns} requested` : '';
  const field = allRuns.some((run) => run.fieldData)
    ? 'some URL/origin metrics available — inspect raw JSON for metric and scope; this does not establish a CWV pass'
    : 'not available in these responses; this is not a CWV failure';
  const lines = [
    `### PageSpeed Insights — ${url}`,
    '',
    `Workflow commit \`${sha ? sha.slice(0, 7) : 'n/a'}\` (deployed commit not verified) · ${startedAt} · Lighthouse ${versions} · median of independent analyses per form factor: ${counts}${requested} · lab data`,
    `Field data (CrUX): ${field}`,
    '',
    HEADER,
  ];
  for (const formFactor of FORM_FACTORS) {
    const result = results[formFactor];
    if (!result) continue;
    lines.push(result.runs.length ? row(`**${formFactor[0].toUpperCase()}${formFactor.slice(1)}**`, medianRun(result.runs)) : `| **${formFactor}** | no successful run | | | | | | | |`);
  }
  lines.push('', '<details><summary>Individual runs</summary>', '', HEADER);
  for (const formFactor of FORM_FACTORS) {
    (results[formFactor]?.runs ?? []).forEach((run, index) => lines.push(row(`${formFactor} #${index + 1}`, run)));
  }
  lines.push('', '| Run | Fetch time (UTC) | Observed FCP | Observed LCP | Requests | Lab profile | CrUX metrics (scope) |',
    '|---|---|---|---|---|---|---|');
  for (const formFactor of FORM_FACTORS) {
    (results[formFactor]?.runs ?? []).forEach((run, index) => {
      const profile = run.labProfile;
      const fields = Object.entries(run.fieldMetrics ?? {}).filter(([, names]) => names.length)
        .map(([scope, names]) => `${scope}: ${names.join(', ')}`).join('; ') || 'none returned';
      lines.push(`| ${formFactor} #${index + 1} | ${escapeCell(run.fetchTime ?? '—')} | ${seconds(run.observedFcp ?? null)} | ${seconds(run.observedLcp ?? null)} | ${run.requestCount ?? '—'} | ${escapeCell(profile ? JSON.stringify(profile) : 'not returned')} | ${escapeCell(fields)} |`);
    });
  }
  lines.push('', 'Observed timings use the recorded trace clock. The headline table uses the Lighthouse lab metrics, which may be simulated. Full throttling/viewport settings and URL/origin field metric availability are in summary.json and raw PSI reports. TBT is not field INP.');
  lines.push('', '| Run | LCP element |', '|---|---|');
  for (const formFactor of FORM_FACTORS) {
    (results[formFactor]?.runs ?? []).forEach((run, index) => lines.push(`| ${formFactor} #${index + 1} | \`${escapeCell(run.lcpElement ?? '—')}\` |`));
  }
  const failures = FORM_FACTORS.flatMap((formFactor) => (results[formFactor]?.failures ?? []).map((failure) => `- ${formFactor}: ${failure}`));
  if (failures.length) lines.push('', '**Failed calls**', ...failures);
  const repeats = FORM_FACTORS.flatMap((formFactor) => (results[formFactor]?.repeats ?? []).map((repeat) => `- ${formFactor}: ${repeat}`));
  if (repeats.length) lines.push('', '**Cached analyses not counted** (PSI returned an analysis it had already served)', ...repeats);
  lines.push('', '</details>', '', '_Reporting only — scores never fail this workflow. Lab scores vary by a few points between runs; compare medians._', '');
  return lines.join('\n');
}

async function callPsi({ url, strategy, apiKey }) {
  const query = new URLSearchParams({ url, strategy, category: 'performance' });
  const response = await fetch(`${PSI_ENDPOINT}?${query}`, {
    headers: { 'X-goog-api-key': apiKey },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.lighthouseResult) {
    // Only Google's status and message — the key is in a header and never part of what we print.
    throw new Error(`HTTP ${response.status}${body?.error?.status ? ` ${body.error.status}` : ''}${body?.error?.message ? `: ${String(body.error.message).slice(0, 160)}` : ''}`);
  }
  return body;
}

async function withRetries(task, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 5_000 * attempt));
    }
  }
  throw lastError;
}

const REPEAT_RETRIES = 3;
const REPEAT_WAIT_MS = 30_000;

/**
 * Collects up to `runs` independent analyses for one form factor. PSI answers a repeated request for the same URL with
 * an analysis it already served: on 2026-10-02 three mobile calls in a row returned one analysis (one fetchTime), and
 * desktop #3 returned desktop #1. So a result counts only when its Lighthouse fetchTime is new; a repeat waits and asks
 * again (REPEAT_RETRIES times), and a run that only ever gets repeats is reported, not counted.
 * @param {{ runs: number, call: () => Promise<object>, wait?: (ms: number) => Promise<void>,
 *   log?: (line: string) => void, label: string }} options
 * @returns {Promise<{ runs: PsiRun[], bodies: object[], failures: string[], repeats: string[] }>}
 */
export async function collectRuns({ runs, call, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), log = () => {}, label }) {
  /** @type {{ runs: PsiRun[], bodies: object[], failures: string[], repeats: string[] }} */
  const result = { runs: [], bodies: [], failures: [], repeats: [] };
  const seen = new Set();
  for (let run = 1; run <= runs; run += 1) {
    for (let attempt = 0; attempt <= REPEAT_RETRIES; attempt += 1) {
      if (attempt > 0) await wait(REPEAT_WAIT_MS);
      let body;
      try {
        body = await call();
      } catch (error) {
        result.failures.push(`run ${run}: ${error instanceof Error ? error.message : String(error)}`);
        log(`${label} #${run}: failed`);
        break;
      }
      const analysis = extractRun(body);
      if (body?.lighthouseResult?.runtimeError || analysis.score === null
        || analysis.fcp === null || analysis.lcp === null || !analysis.fetchTime
        || !Number.isFinite(Date.parse(analysis.fetchTime))) {
        result.failures.push(`run ${run}: no usable, timestamped Lighthouse performance analysis`);
        log(`${label} #${run}: invalid Lighthouse analysis, not counted`);
        break;
      }
      if (!seen.has(analysis.fetchTime)) {
        seen.add(analysis.fetchTime);
        result.runs.push(analysis);
        result.bodies.push(body);
        log(`${label} #${run}: performance ${analysis.score}`);
        break;
      }
      if (attempt < REPEAT_RETRIES) {
        log(`${label} #${run}: cached analysis of ${analysis.fetchTime}, asking again in ${REPEAT_WAIT_MS / 1000} s`);
      } else {
        result.repeats.push(`run ${run}: still the analysis of ${analysis.fetchTime} after ${REPEAT_RETRIES} retries`);
        log(`${label} #${run}: cached analysis of ${analysis.fetchTime}, not counted`);
      }
    }
  }
  return result;
}

export function parseArgs(argv) {
  const args = { url: 'https://rubikonbuild.com/', runs: 3, out: 'psi-results', strategy: 'both' };
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (flag === '--url') args.url = value;
    else if (flag === '--runs') {
      const count = Number(value);
      if (!Number.isInteger(count) || count < 1 || count > 5) throw new Error('--runs must be an integer from 1 to 5');
      args.runs = count;
    }
    else if (flag === '--out') args.out = value;
    else if (flag === '--strategy') args.strategy = value;
    else throw new Error(`Unknown argument ${flag}`);
  }
  try {
    const url = new URL(args.url);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
  } catch { throw new Error('--url must be an https:// URL without embedded credentials'); }
  if (!['both', ...FORM_FACTORS].includes(args.strategy)) throw new Error('--strategy must be mobile, desktop, or both');
  return args;
}

async function main() {
  const { url, runs, out, strategy } = parseArgs(process.argv.slice(2));
  const strategies = strategy === 'both' ? FORM_FACTORS : [strategy];
  const apiKey = process.env.PAGESPEED_API_KEY;
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!apiKey) {
    const message = '### PageSpeed Insights\n\nSkipped: the `PAGESPEED_API_KEY` secret is not configured. No anonymous requests were made.\n';
    console.log(message);
    if (summaryFile) appendFileSync(summaryFile, message);
    return;
  }

  mkdirSync(out, { recursive: true });
  const startedAt = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const results = {};
  for (const strategy of strategies) {
    // Sequential on purpose: parallel PSI calls against the same URL compete for the same origin.
    const { bodies, ...collected } = await collectRuns({
      runs,
      call: () => withRetries(() => callPsi({ url, strategy, apiKey })),
      log: (line) => console.log(line),
      label: strategy,
    });
    bodies.forEach((body, index) => writeFileSync(join(out, `psi-${strategy}-${index + 1}.json`), JSON.stringify(body)));
    results[strategy] = collected;
  }

  const report = { url, sha: process.env.GITHUB_SHA ?? null, startedAt, requestedRuns: runs, results };
  const markdown = summaryMarkdown(report);
  writeFileSync(join(out, 'summary.md'), markdown);
  writeFileSync(join(out, 'summary.json'), JSON.stringify({
    ...report,
    median: Object.fromEntries(strategies.map((formFactor) => [formFactor, medianRun(results[formFactor].runs)])),
  }, null, 2));
  if (summaryFile) appendFileSync(summaryFile, markdown);
  console.log(markdown);

  if (strategies.some((formFactor) => results[formFactor].runs.length === 0)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
