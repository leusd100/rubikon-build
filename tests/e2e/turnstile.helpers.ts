import type { Page } from '@playwright/test';

/**
 * A controlled stand-in for Cloudflare's Turnstile api.js, so no E2E test depends on the live
 * Cloudflare endpoint. It implements the part of window.turnstile the inquiry form uses
 * (render / execute / reset / remove) and the callbacks it registers.
 *
 * - pass:        execute() calls back with a fresh token (stub-token-1, stub-token-2, …)
 * - error:       execute() fires error-callback
 * - expire:      execute() fires expired-callback
 * - interactive: execute() shows a 65px challenge box; solveTurnstile() then issues the token
 * - hang:        execute() never answers (the form stays in its submitting state)
 * - unavailable: the script request itself fails, as when a blocker or network drops it
 */
export type TurnstileStubMode = 'pass' | 'error' | 'expire' | 'interactive' | 'hang' | 'unavailable';

export type TurnstileStubLog = {
  renders: Array<Record<string, unknown>>;
  executes: number;
  resets: number;
  tokens: string[];
};

const STUB_SCRIPT = `(() => {
  const state = window.__turnstileStub;
  const widgets = new Map();
  let next = 0;
  window.turnstile = {
    render(container, options) {
      const id = 'stub-widget-' + (++next);
      const { callback, ...rest } = options;
      state.log.renders.push(Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')));
      widgets.set(id, { container, options });
      return id;
    },
    execute(id) {
      const widget = widgets.get(id);
      state.log.executes += 1;
      const issue = () => {
        const token = 'stub-token-' + (state.log.tokens.length + 1);
        state.log.tokens.push(token);
        widget.options.callback(token);
      };
      if (state.mode === 'pass') setTimeout(issue, 20);
      else if (state.mode === 'error') setTimeout(() => widget.options['error-callback'](), 20);
      else if (state.mode === 'expire') setTimeout(() => widget.options['expired-callback'](), 20);
      else if (state.mode === 'interactive') {
        const box = document.createElement('div');
        box.className = 'turnstile-stub-challenge';
        box.style.cssText = 'width:100%;min-width:300px;height:65px;background:#fafafa;border:1px solid #e0e0e0';
        widget.container.appendChild(box);
        state.solve = () => { box.remove(); issue(); };
      }
    },
    reset(id) {
      state.log.resets += 1;
      widgets.get(id)?.container.querySelector('.turnstile-stub-challenge')?.remove();
    },
    remove(id) { widgets.delete(id); },
  };
})();`;

// Node-side copy of each page's mode: the script route must decide without asking the page.
const modes = new WeakMap<Page, TurnstileStubMode>();

export async function stubTurnstile(page: Page, mode: TurnstileStubMode = 'pass') {
  modes.set(page, mode);
  await page.addInitScript((initialMode) => {
    (window as unknown as { __turnstileStub: unknown }).__turnstileStub = {
      mode: initialMode,
      log: { renders: [], executes: 0, resets: 0, tokens: [] },
    };
  }, mode);
  await page.route('https://challenges.cloudflare.com/**', async (route) => {
    if (modes.get(page) === 'unavailable') return route.abort('failed');
    return route.fulfill({ contentType: 'text/javascript', body: STUB_SCRIPT });
  });
}

export async function setTurnstileMode(page: Page, mode: TurnstileStubMode) {
  modes.set(page, mode);
  // Before the first navigation there is no page state yet; the route already reads the Node side.
  await page.evaluate((next) => {
    const stub = (window as unknown as { __turnstileStub?: { mode: string } }).__turnstileStub;
    if (stub) stub.mode = next;
  }, mode);
}

export async function solveTurnstile(page: Page) {
  await page.evaluate(() => (window as unknown as { __turnstileStub: { solve: () => void } }).__turnstileStub.solve());
}

export function turnstileLog(page: Page): Promise<TurnstileStubLog> {
  return page.evaluate(() => (window as unknown as { __turnstileStub: { log: TurnstileStubLog } }).__turnstileStub.log);
}
