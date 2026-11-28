import type { Page } from '@playwright/test';

/** The production build's CSP ends in upgrade-insecure-requests. Chrome and Firefox leave the plain-http local server
 * alone; WebKit asks it for https and no script, font or image loads (the first WebKit run). The site itself is served
 * over https only: WebKit is given each page without that one directive. A no-op in the other engines */
export async function allowPlainHttpInWebKit(page: Page) {
  if (page.context().browser()?.browserType().name() !== 'webkit') return;
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    const response = await route.fetch();
    const headers = { ...response.headers() };
    headers['content-security-policy'] = (headers['content-security-policy'] ?? '').replace(/;\s*upgrade-insecure-requests/, '');
    delete headers['strict-transport-security'];
    await route.fulfill({ response, headers });
  });
}
