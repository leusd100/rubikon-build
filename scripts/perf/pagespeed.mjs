// PageSpeed Insights monitor — N runs per form factor against a live URL, medians, raw JSON, Markdown summary.
//
//   PAGESPEED_API_KEY=… node scripts/perf/pagespeed.mjs --url https://rubikonbuild.com/ --runs 3 --out psi-results
//
// Reporting only: scores never change the exit code. It exits non-zero only when it could not measure at all
// (every call for a form factor failed). The API key travels in the X-goog-api-key header, never in a URL, so
// it cannot leak through request URLs, error messages or logs.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const FORM_FACTORS = /** @type {const} */ (['mobile', 'desktop']);
const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/** @typedef {{ score: number | null, fcp: number | null, lcp: number | null, tbt: number | null, cls: number | null,
 *   si: number | null, ttfb: number | null, bytes: number | null, lcpElement: string | null,
 *   lighthouseVersion: string | null, fetchTime: string | null, fieldData: boolean }} PsiRun */

const numeric = (audits, id) => {
  const value = audits?.[id]?.numericValue;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

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
  return {
    score: typeof score === 'number' ? Math.round(score * 100) : null,
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
    // CrUX field data is present only when Google has enough real Chrome traffic for the URL or origin.
    fieldData: Boolean(psi?.loadingExperience?.metrics || psi?.originLoadingExperience?.metrics),
  };
}

/** Median of the non-null values; null when there are none. */
export function median(values) {
  const sorted = values.filter((value) => typeof value === 'number').sort((a, b) => a - b);
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
const escapeCell = (text) => String(text).replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 90);

/**
 * @param {{ url: string, sha?: string | null, startedAt: string,
 *   results: Record<string, { runs: PsiRun[], failures: string[] }> }} report
 */
export function summaryMarkdown({ url, sha, startedAt, results }) {
  const allRuns = Object.values(results).flatMap((result) => result.runs);
  const versions = [...new Set(allRuns.map((run) => run.lighthouseVersion).filter(Boolean))].join(', ') || '—';
  const runsPer = Math.max(0, ...Object.values(results).map((result) => result.runs.length));
  const field = allRuns.some((run) => run.fieldData) ? 'available — see the PSI UI' : 'not available (not enough CrUX traffic)';
  const lines = [
    `### PageSpeed Insights — ${url}`,
    '',
    `Commit \`${sha ? sha.slice(0, 7) : 'n/a'}\` · ${startedAt} · Lighthouse ${versions} · median of ${runsPer} run(s) per form factor · lab data`,
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
  lines.push('', '| Run | LCP element |', '|---|---|');
  for (const formFactor of FORM_FACTORS) {
    (results[formFactor]?.runs ?? []).forEach((run, index) => lines.push(`| ${formFactor} #${index + 1} | \`${escapeCell(run.lcpElement ?? '—')}\` |`));
  }
  const failures = FORM_FACTORS.flatMap((formFactor) => (results[formFactor]?.failures ?? []).map((failure) => `- ${formFactor}: ${failure}`));
  if (failures.length) lines.push('', '**Failed calls**', ...failures);
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

function parseArgs(argv) {
  const args = { url: 'https://rubikonbuild.com/', runs: 3, out: 'psi-results' };
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (flag === '--url') args.url = value;
    else if (flag === '--runs') args.runs = Math.min(5, Math.max(1, Number.parseInt(value, 10) || 3));
    else if (flag === '--out') args.out = value;
    else throw new Error(`Unknown argument ${flag}`);
  }
  if (!/^https:\/\//.test(args.url)) throw new Error('--url must be an https:// URL');
  return args;
}

async function main() {
  const { url, runs, out } = parseArgs(process.argv.slice(2));
  const apiKey = process.env.PAGESPEED_API_KEY;
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!apiKey) {
    const message = '### PageSpeed Insights\n\nSkipped: the `PAGESPEED_API_KEY` secret is not configured. Anonymous PSI quota is shared and exhausted (HTTP 429), so runs need a key.\n';
    console.log(message);
    if (summaryFile) appendFileSync(summaryFile, message);
    return;
  }

  mkdirSync(out, { recursive: true });
  const startedAt = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const results = {};
  for (const strategy of FORM_FACTORS) {
    results[strategy] = { runs: [], failures: [] };
    // Sequential on purpose: parallel PSI calls against the same URL compete for the same origin.
    for (let run = 1; run <= runs; run += 1) {
      try {
        const body = await withRetries(() => callPsi({ url, strategy, apiKey }));
        writeFileSync(join(out, `psi-${strategy}-${run}.json`), JSON.stringify(body));
        results[strategy].runs.push(extractRun(body));
        console.log(`${strategy} #${run}: performance ${results[strategy].runs.at(-1).score}`);
      } catch (error) {
        results[strategy].failures.push(`run ${run}: ${error instanceof Error ? error.message : String(error)}`);
        console.log(`${strategy} #${run}: failed`);
      }
    }
  }

  const report = { url, sha: process.env.GITHUB_SHA ?? null, startedAt, results };
  const markdown = summaryMarkdown(report);
  writeFileSync(join(out, 'summary.md'), markdown);
  writeFileSync(join(out, 'summary.json'), JSON.stringify({
    ...report,
    median: Object.fromEntries(FORM_FACTORS.map((formFactor) => [formFactor, medianRun(results[formFactor].runs)])),
  }, null, 2));
  if (summaryFile) appendFileSync(summaryFile, markdown);
  console.log(markdown);

  if (FORM_FACTORS.some((formFactor) => results[formFactor].runs.length === 0)) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
