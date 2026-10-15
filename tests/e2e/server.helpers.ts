import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * A GET to the test server on a connection of its own. Every API request of a worker (`request`, `page.request`) goes
 * through Playwright's one process-wide keep-alive pool, which ignores the `Keep-Alive: timeout=5` the server announces,
 * while Node 24's server closes a socket left idle for 6 s (keepAliveTimeout 5 s + keepAliveTimeoutBuffer 1 s). A GET
 * sent on the pooled socket in the moment it closes ends in «socket hang up» (Main Regression 38713909898, 15.10:
 * grain-page.spec.ts:156, 6 s after the same worker's request at :79). `Connection: close` keeps every such request off
 * the pool, so none is ever sent on a socket the server is closing; a reset on a fresh connection still fails the test.
 */
export function getFromServer(request: APIRequestContext, url: string): Promise<APIResponse> {
  return request.get(url, { headers: { connection: 'close' } });
}
