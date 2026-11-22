import type { BrowserContext, TestInfo } from '@playwright/test';

/**
 * The production GA4 tag only runs on the canonical host (app/lib/analyticsHost.ts, DEC-06), so a test of what the site
 * hands gtag has to be a page whose `location.hostname` is rubikonbuild.com — never the live site. The browser opens
 * https://rubikonbuild.com, and every request to that origin is fetched by Playwright, outside the browser, from the
 * local test server and handed back: the page, its chunks, media and `/api/leads` are the local build, the hostname the
 * code sees is production. The server still sees a local request (127.0.0.1), so its own host rules (Turnstile, D1)
 * stay the local ones. Nothing in this goes to the network; a redirect that names the local origin is mapped back.
 *
 * Use it with `test.use({ baseURL: PRODUCTION_ORIGIN })` and `serveProductionHostLocally(context, testInfo)` before the
 * first navigation. Off this origin the same tests prove the opposite: no tag and no event (analytics-contract.spec.ts).
 */
export const PRODUCTION_ORIGIN = 'https://rubikonbuild.com';

/** The local test server this run's project points at (playwright.config.ts), not the overridden test baseURL. */
export function localOrigin(testInfo: TestInfo): string {
  const configured = testInfo.project.use.baseURL;
  if (!configured) throw new Error('playwright.config.ts gives the project no baseURL');
  return new URL(configured).origin;
}

export async function serveProductionHostLocally(context: BrowserContext, testInfo: TestInfo) {
  const local = localOrigin(testInfo);
  // A dev build's HMR socket (and any other socket) would be opened to the real host: no route intercepts a WebSocket
  await context.routeWebSocket((url) => url.origin === PRODUCTION_ORIGIN.replace(/^http/, 'ws'), (socket) => socket.close());
  await context.route((url) => url.origin === PRODUCTION_ORIGIN, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    // route.fetch goes through Playwright's one process-wide keep-alive pool, and Node closes a socket idle for 6 s: a
    // request sent on it in that moment dies with ECONNRESET (seen 22.11 on a stylesheet; the same cause as «socket hang
    // up», server.helpers.ts). `Connection: close` keeps every proxied request on a connection of its own, and a reset on
    // a fresh connection still fails the test. Not maxRetries: it would replay a POST. Chromium hands a route no Cookie
    // header, so the site's own cookies do not reach the server here; no server code reads them.
    const response = await route.fetch({
      url: `${local}${url.pathname}${url.search}`,
      maxRedirects: 0,
      headers: { ...request.headers(), connection: 'close' },
    });
    const headers = response.headers();
    if (headers.location?.startsWith(local)) headers.location = PRODUCTION_ORIGIN + headers.location.slice(local.length);
    await route.fulfill({ response, headers });
  });
}
