// Computed motion — proves that a refactor changed no motion value the browser computes. Loads the nine public pages in two
// builds, at 390 and 1440 px, scrolls each to the end, and compares the computed `transition-*` and `animation-*` of every
// element (and of its ::before and ::after) in DOM order.
//
//   node scripts/motion/computed-motion.mjs --base <url> --head <url> [options]
//
// --base <url>     the build to compare with (its origin, e.g. http://127.0.0.1:4383)
// --head <url>     the build under test (e.g. http://127.0.0.1:4382)
// --pages <list>   comma-separated paths instead of the nine public pages (e.g. /,/pro-nas)
// --widths <list>  comma-separated viewport widths instead of 390,1440
// --run-for <ms>   fake time advanced after every scroll step (default 1200)
// --show <n>       differing rows printed per page and width (default 20)
// Exit 0: no difference. Exit 1: at least one difference (the first rows are printed). Exit 2: a page could not be loaded.
// A page error (an uncaught exception in the page) is printed per side; one the head build throws and the base build does not
// is a difference too.
//
// Method. Both builds must walk the same timeline: a node-drawing tour or a 260 ms hold is driven by timers, and a run
// that lets the page's clock flow in real time would move them between two runs of the same build. So every page gets
// Playwright's `page.clock` before it navigates: `install()` at a fixed time, then `pauseAt()`, so no timer fires until
// the script says so. The script then scrolls in steps of 0.8 of the window; after each step it waits 150 ms of real
// time (frames render, the IntersectionObserver delivers, React commits) and calls `clock.runFor(--run-for)`, so every
// timer, `requestAnimationFrame` callback and `Date.now()` the page sees is a function of the step count alone. After the
// last step it settles for SETTLE_ROUNDS more rounds of the same two calls. Run base and head against the same build
// (`--base X --head X`) to see the method hold: it prints no difference.
//
// What is read. For every element in DOM order (and its ::before and ::after) `transition-property`, `-duration`, `-delay`,
// `-timing-function` and `animation-name`, `-duration`, `-delay`, `-timing-function`, `-iteration-count`. An element whose
// nine values are the defaults (`all 0s 0s ease`, `none 0s 0s ease 1`) makes no row, so a row on one side only is a
// difference too. `reducedMotion` is `no-preference`, so the reveals are on.
//
// What is not read. A rule behind `:hover`, `:focus-visible`, `:active`, `[open]` or a checked radio is not the computed
// style of anything at rest; scripts/motion/motion-diff.mjs compares those declarations, resolved and normalised, instead.
// Third-party requests are aborted (no analytics, no Turnstile), and the same on both sides.
import { chromium } from '@playwright/test';

const PAGES = [
  '/', '/napryamky', '/angary', '/zernoskhovyshcha', '/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty',
  '/yak-pratsyuiemo', '/pro-nas',
];
const WIDTHS = [390, 1440];
const HEIGHT = 900;
const STEP = 0.8; // of the window's height
const SETTLE_ROUNDS = 3;
const FRAME_WAIT_MS = 150; // real time: frames render and the observers deliver before the fake clock moves
const MAX_STEPS = 60;
const T0 = new Date('2026-01-01T12:00:00.000Z');

/** @returns {{ base: string, head: string, pages: string[], widths: number[], runFor: number, show: number }} */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const given = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    if (!key?.startsWith('--') || argv[i + 1] === undefined) fail(`Unexpected argument: ${key ?? ''}`);
    given[key.slice(2)] = argv[i + 1];
  }
  for (const key of Object.keys(given)) if (!['base', 'head', 'pages', 'widths', 'run-for', 'show'].includes(key)) fail(`Unknown option --${key}`);
  if (!given.base || !given.head) fail('Usage: node scripts/motion/computed-motion.mjs --base <url> --head <url> [--pages /,/pro-nas] [--widths 390,1440] [--run-for 1200] [--show 20]');
  const number = (value, name, fallback) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) fail(`--${name} must be a positive number`);
    return parsed;
  };
  return {
    base: new URL(given.base).origin,
    head: new URL(given.head).origin,
    pages: given.pages ? given.pages.split(',').map((page) => page.trim()).filter(Boolean) : PAGES,
    widths: given.widths ? given.widths.split(',').map((width) => number(width, 'widths', 0)) : WIDTHS,
    runFor: number(given['run-for'], 'run-for', 1200),
    show: number(given.show, 'show', 20),
  };
}

/** @param {string} message @returns {never} */
function fail(message) {
  console.error(message);
  process.exit(2);
}

/** Runs in the page: one row per element or pseudo-element with a non-default motion, keyed by its place in the DOM */
function collectRows() {
  const PROPERTIES = [
    'transition-property', 'transition-duration', 'transition-delay', 'transition-timing-function',
    'animation-name', 'animation-duration', 'animation-delay', 'animation-timing-function', 'animation-iteration-count',
  ];
  const DEFAULT = 'all|0s|0s|ease|none|0s|0s|ease|1';
  const rows = [];
  let elements = 0;
  const label = (element) => {
    const id = element.id ? `#${element.id}` : '';
    const classes = typeof element.className === 'string' ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 3) : [];
    return `${element.localName}${id}${classes.map((name) => `.${name}`).join('')}`;
  };
  const read = (element, pseudo) => {
    const style = getComputedStyle(element, pseudo);
    return PROPERTIES.map((property) => style.getPropertyValue(property).trim());
  };
  for (const element of document.querySelectorAll('*')) {
    const index = elements++;
    for (const pseudo of [null, '::before', '::after']) {
      const values = read(element, pseudo);
      if (values.join('|') === DEFAULT) continue;
      rows.push({
        key: `${index}${pseudo ?? ''}`,
        row: `${index} ${label(element)}${pseudo ?? ''} | transition: ${values.slice(0, 4).join(' ; ')} | animation: ${values.slice(4).join(' ; ')}`,
      });
    }
  }
  return { elements, rows };
}

/** @param {import('@playwright/test').Page} page */
async function scrollThrough(page, runFor) {
  const tick = async () => {
    await page.waitForTimeout(FRAME_WAIT_MS);
    await page.clock.runFor(runFor);
  };
  await tick();
  let steps = 0;
  for (let y = 0; steps < MAX_STEPS; steps += 1) {
    const { max, inner } = await page.evaluate(() => ({
      max: document.documentElement.scrollHeight - window.innerHeight,
      inner: window.innerHeight,
    }));
    if (y >= max) break;
    y = Math.min(y + Math.round(inner * STEP), max);
    await page.evaluate((top) => window.scrollTo({ top, left: 0, behavior: 'instant' }), y);
    await tick();
  }
  for (let round = 0; round < SETTLE_ROUNDS; round += 1) await tick();
  return steps;
}

/**
 * One build, one page, one width.
 * @param {import('@playwright/test').Browser} browser
 */
async function run(browser, origin, path, width, runFor) {
  const context = await browser.newContext({
    viewport: { width, height: HEIGHT },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    colorScheme: 'light',
    locale: 'uk-UA',
    timezoneId: 'Europe/Kyiv',
    serviceWorkers: 'block',
  });
  try {
    // Only this build's own origin: no third party answers differently on one side
    await context.route((url) => url.origin !== origin && url.protocol.startsWith('http'), (route) => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.install({ time: T0 });
    await page.clock.pauseAt(new Date(T0.getTime() + 1000));
    const response = await page.goto(`${origin}${path}`, { waitUntil: 'load' });
    if (!response || !response.ok()) throw new Error(`${origin}${path}: HTTP ${response?.status() ?? 'none'}`);
    const steps = await scrollThrough(page, runFor);
    const { elements, rows } = await page.evaluate(collectRows);
    return { elements, rows, steps, errors };
  } finally {
    await context.close();
  }
}

/** The messages of `list` that `other` does not hold as often (a multiset difference), in order */
function onlyIn(list, other) {
  const left = new Map();
  for (const message of other) left.set(message, (left.get(message) ?? 0) + 1);
  return list.filter((message) => {
    const count = left.get(message) ?? 0;
    if (count > 0) left.set(message, count - 1);
    return count === 0;
  });
}

/** The first `show` differing rows between two row lists, matched by key */
function differences(base, head, show) {
  const baseByKey = new Map(base.map(({ key, row }) => [key, row]));
  const headByKey = new Map(head.map(({ key, row }) => [key, row]));
  const keys = [...new Set([...base.map(({ key }) => key), ...head.map(({ key }) => key)])]
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));
  const lines = [];
  let count = 0;
  for (const key of keys) {
    const before = baseByKey.get(key);
    const after = headByKey.get(key);
    if (before === after) continue;
    count += 1;
    if (lines.length < show * 2) lines.push(`    base: ${before ?? '(no motion)'}`, `    head: ${after ?? '(no motion)'}`);
  }
  return { count, lines };
}

async function main() {
  const { base, head, pages, widths, runFor, show } = parseArgs(process.argv.slice(2));
  const browser = await chromium.launch({ channel: 'chrome' });
  let different = 0;
  let compared = 0;
  const started = Date.now();
  try {
    for (const path of pages) {
      for (const width of widths) {
        let baseRun;
        let headRun;
        try {
          baseRun = await run(browser, base, path, width, runFor);
          headRun = await run(browser, head, path, width, runFor);
        } catch (error) {
          console.error(`ERROR ${path} @ ${width}: ${error instanceof Error ? error.message : error}`);
          process.exitCode = 2;
          return;
        }
        compared += 1;
        const shape = `${baseRun.elements}/${headRun.elements} elements, ${baseRun.rows.length}/${headRun.rows.length} motion rows, ${baseRun.steps}/${headRun.steps} scroll steps`;
        const { count, lines } = differences(baseRun.rows, headRun.rows, show);
        const sameDom = baseRun.elements === headRun.elements;
        const headOnlyErrors = onlyIn(headRun.errors, baseRun.errors);
        const errorLines = [
          ...baseRun.errors.slice(0, show).map((message) => `    base page error: ${message.slice(0, 200)}`),
          ...headRun.errors.slice(0, show).map((message) => `    head page error: ${message.slice(0, 200)}`),
        ];
        if (count === 0 && sameDom && headOnlyErrors.length === 0) {
          console.log(`same  ${path} @ ${width}: ${shape}${errorLines.length ? `; page errors ${baseRun.errors.length}/${headRun.errors.length}, none new in head` : ''}`);
          for (const line of errorLines) console.log(line);
          continue;
        }
        different += 1;
        console.log(`DIFF  ${path} @ ${width}: ${shape}${sameDom ? '' : ' — the DOM differs'}; ${count} differing rows${headOnlyErrors.length ? `; ${headOnlyErrors.length} page errors only in head` : ''}`);
        for (const line of lines) console.log(line);
        if (count > show) console.log(`    … ${count - show} more`);
        for (const line of errorLines) console.log(line);
      }
    }
  } finally {
    await browser.close();
  }
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`\n${compared} page × width compared in ${seconds} s: ${different === 0 ? 'no difference' : `${different} with a difference`} (base ${base}, head ${head})`);
  process.exitCode = different === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
