'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { TURNSTILE_ACTION, TURNSTILE_SCRIPT_URL, turnstileSiteKeyFor } from '../../lib/inquiry/turnstile';

type TurnstileRenderOptions = {
  sitekey: string;
  action: string;
  execution: 'execute';
  appearance: 'interaction-only';
  size: 'flexible';
  theme: 'light';
  language: string;
  'refresh-expired': 'manual';
  callback: (token: string) => void;
  'error-callback': () => boolean;
  'expired-callback': () => void;
  'timeout-callback': () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Mirrored on the container as data-turnstile-state — for tests, never shown as text. */
export type TurnstileState = 'idle' | 'loading' | 'ready' | 'verifying' | 'error';

const SCRIPT_LOAD_TIMEOUT_MS = 15_000;
// Long enough for a visitor to finish an interactive challenge; Turnstile's own
// timeout-callback normally ends a stalled one first.
const TOKEN_TIMEOUT_MS = 120_000;

let scriptPromise: Promise<TurnstileApi> | null = null;

/** One script per page, loaded on demand. A failed load is forgotten so a later submit can retry. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    const timer = window.setTimeout(() => fail(), SCRIPT_LOAD_TIMEOUT_MS);
    function fail() {
      window.clearTimeout(timer);
      script.remove();
      scriptPromise = null;
      reject(new Error('turnstile unavailable'));
    }
    script.addEventListener('load', () => {
      window.clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile);
      else fail();
    });
    script.addEventListener('error', fail);
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type PendingToken = { resolve: (token: string) => void; reject: (error: Error) => void; timer: number };

/**
 * Cloudflare Turnstile in Managed mode, rendered `interaction-only` with `execution: 'execute'`:
 * nothing is shown and no challenge runs until the visitor submits; the widget becomes visible
 * only if Cloudflare asks for an interaction. Every token is fetched fresh at submit and used
 * once, so expiry can only happen mid-challenge — `reset()` after each attempt readies the next.
 */
export function useTurnstile(containerRef: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<TurnstileState>('idle');
  // True only while Cloudflare shows an interactive challenge — the container is otherwise empty
  // of anything with a size, so the form's layout never changes on the common path.
  const [challengeVisible, setChallengeVisible] = useState(false);
  const widgetIdRef = useRef<string | null>(null);
  const apiRef = useRef<TurnstileApi | null>(null);
  const pendingRef = useRef<PendingToken | null>(null);
  const preparingRef = useRef<Promise<void> | null>(null);
  // True once the widget has handed out a token (or failed) — it must be reset before it can
  // execute again, or execute() would have nothing to do and never call back.
  const spentRef = useRef(false);

  const settle = useCallback((outcome: { token: string } | { error: string }) => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    window.clearTimeout(pending.timer);
    if ('token' in outcome) pending.resolve(outcome.token);
    else pending.reject(new Error(outcome.error));
  }, []);

  const prepare = useCallback((): Promise<void> => {
    if (widgetIdRef.current) return Promise.resolve();
    preparingRef.current ??= (async () => {
      setState('loading');
      try {
        const api = await loadTurnstile();
        const container = containerRef.current;
        const sitekey = turnstileSiteKeyFor(window.location.hostname);
        if (!container || !sitekey) throw new Error('turnstile not configured');
        const widgetId = api.render(container, {
          sitekey,
          action: TURNSTILE_ACTION,
          execution: 'execute',
          appearance: 'interaction-only',
          size: 'flexible',
          theme: 'light',
          language: 'uk',
          'refresh-expired': 'manual',
          callback: (token) => settle({ token }),
          // Returning true tells Turnstile the error is handled here, so it does not throw.
          'error-callback': () => {
            settle({ error: 'challenge error' });
            return true;
          },
          'expired-callback': () => settle({ error: 'token expired' }),
          'timeout-callback': () => settle({ error: 'challenge timed out' }),
        });
        if (!widgetId) throw new Error('turnstile render failed');
        apiRef.current = api;
        widgetIdRef.current = widgetId;
        setState('ready');
      } catch (error) {
        setState('error');
        throw error;
      } finally {
        preparingRef.current = null;
      }
    })();
    return preparingRef.current;
  }, [containerRef, settle]);

  /** Runs the challenge and resolves with a fresh single-use token, or rejects. */
  const getToken = useCallback(async (): Promise<string> => {
    await prepare();
    const api = apiRef.current;
    const widgetId = widgetIdRef.current;
    if (!api || !widgetId) throw new Error('turnstile not ready');
    settle({ error: 'superseded' });
    if (spentRef.current) api.reset(widgetId);
    spentRef.current = true;
    setState('verifying');
    const token = new Promise<string>((resolve, reject) => {
      const timer = window.setTimeout(() => settle({ error: 'token timeout' }), TOKEN_TIMEOUT_MS);
      pendingRef.current = { resolve, reject, timer };
    });
    try {
      api.execute(widgetId);
      const value = await token;
      setState('ready');
      return value;
    } catch (error) {
      setState('error');
      throw error;
    }
  }, [prepare, settle]);

  /** Clears the used or failed token so the next submit runs a fresh challenge. */
  const reset = useCallback(() => {
    settle({ error: 'reset' });
    const api = apiRef.current;
    const widgetId = widgetIdRef.current;
    if (!api || !widgetId) {
      setState('idle');
      return;
    }
    try {
      api.reset(widgetId);
      spentRef.current = false;
      setState('ready');
    } catch {
      setState('error');
    }
  }, [settle]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setChallengeVisible(container.offsetHeight > 0));
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => () => {
    settle({ error: 'unmounted' });
    const api = apiRef.current;
    const widgetId = widgetIdRef.current;
    widgetIdRef.current = null;
    apiRef.current = null;
    spentRef.current = false;
    if (api && widgetId) {
      try {
        api.remove(widgetId);
      } catch {
        // The widget is already gone with its container.
      }
    }
  }, [settle]);

  return { state, challengeVisible, prepare, getToken, reset };
}
