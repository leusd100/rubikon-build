import type { BrowserContext, Page } from '@playwright/test';

// Layer A of the analytics contract (Wave 01, 16.10): the application's side of it, tested without Google. A versioned
// stand-in for https://www.googletagmanager.com/gtag/js drains window.dataLayer and keeps receiving pushes as the real
// tag consumes its command queue, and records every command. It creates no request, image, beacon, iframe or script.
// What Google's own tag then sends, and where (its sampled diagnostics /td and /a included), is the live tag's contract
// — analytics-consent.spec.ts — not this one.
export const GTAG_STUB_VERSION = 'rubikon-gtag-stub/1';

const GTAG_STUB = `(() => {
  const queue = (window.dataLayer = window.dataLayer || []);
  const log = (window.__gtagStub = { version: '${GTAG_STUB_VERSION}', commands: [] });
  const take = (entry) => {
    const isArguments = Object.prototype.toString.call(entry) === '[object Arguments]';
    const args = Array.prototype.slice.call(entry).map((value) => (value instanceof Date ? '<Date>' : value));
    log.commands.push({ isArguments, args: JSON.parse(JSON.stringify(args)) });
  };
  for (let i = 0; i < queue.length; i += 1) take(queue[i]);
  const push = queue.push;
  queue.push = function (...entries) { entries.forEach(take); return push.apply(queue, entries); };
})();`;

export type OutboundRequest = { host: string; path: string; type: string; method: string };
export type GtagCommand = { isArguments: boolean; args: unknown[] };

/**
 * Deny-all outbound for one browser context: every request off the app's own origin is recorded and never reaches the
 * network. gtag.js gets the stub above (each load counted); any other Google request is answered 204, anything else aborted.
 */
export async function stubGoogle(context: BrowserContext, appOrigin: string) {
  const requests: OutboundRequest[] = [];
  let gtagLoads = 0;
  await context.route((url) => url.origin !== appOrigin, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js') {
      gtagLoads += 1;
      return route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: GTAG_STUB });
    }
    requests.push({ host: url.hostname, path: url.pathname, type: request.resourceType(), method: request.method() });
    return /google|doubleclick/.test(url.hostname) ? route.fulfill({ status: 204, body: '' }) : route.abort('blockedbyclient');
  });
  return { requests, gtagLoads: () => gtagLoads };
}

/** Every command the page has handed gtag so far, in order; null before the tag has loaded */
export const gtagCommands = (page: Page) => page.evaluate(
  () => (window as unknown as { __gtagStub?: { commands: GtagCommand[] } }).__gtagStub?.commands ?? null,
);
