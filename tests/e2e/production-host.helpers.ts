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
  await context.route((url) => url.origin === PRODUCTION_ORIGIN, async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${local}${url.pathname}${url.search}`, maxRedirects: 0 });
    const headers = response.headers();
    if (headers.location?.startsWith(local)) headers.location = PRODUCTION_ORIGIN + headers.location.slice(local.length);
    await route.fulfill({ response, headers });
  });
}
