'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * 3D is an enhancement, never a dependency. Any exception from the renderer (lost WebGL context,
 * a driver quirk, a bad geometry edge case) must degrade to the technical view rather than take
 * the configurator down with it — the controls and summary are the canonical description of the
 * configuration and must stay usable.
 */
export class ThreeErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surfaced in dev; in production this is where a monitoring hook would go. Never rethrown.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[configurator] 3D view failed, falling back to the technical view', error, info);
    }
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
