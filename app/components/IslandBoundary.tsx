'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * An optional interactive block (HOME's X-Ray, the /angary configurator) is an enhancement of a page that has already
 * been read, never a dependency of it. When its own code fails — most often its chunk: Workers Assets keeps only the
 * current deploy, so a page opened before a new one asks for a file that is gone (CC-02, 29.10: the page reloaded
 * itself and then put «Щось пішло не так» over its text, its form and its contacts) — only this block gives way to its
 * fallback, which the server rendered and so needs no code of the island. No reload: a visitor half-way through the
 * form keeps what they typed.
 */
export class IslandBoundary extends Component<
  { name: string; fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in production too: the one place a broken island shows up for diagnosis
    console.error(`[island:${this.props.name}] failed, showing its fallback`, error, info.componentStack);
  }

  render() {
    // No <Suspense> here on purpose: around a client island it makes the server stream the island out of order (a
    // <template> filled by script), so without JavaScript the X-Ray and the configurator's step panels were missing
    // (29.10: pr-critical:158, home-proof-contour «without JavaScript», angary-interactive:974). The price: a failure
    // during hydration re-renders the page on the client — the same page with this fallback, its DOM state reset
    if (!this.state.failed) return this.props.children;
    return <div className="island-fallback" data-island-fallback={this.props.name}>{this.props.fallback}</div>;
  }
}
