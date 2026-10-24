import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from '../../../proxy';

// X-01 · PDO-29 (owner 24.10: OD-PX-33 (a)): the internal prototypes answer 404 on the production domain only — locally,
// in the tests and on the preview builds they open as before.

const HIDDEN = ['/planner-preview', '/configurator-preview', '/logo-variants', '/r3f-spike'];
const rewriteOf = (url: string) => proxy(new NextRequest(url)).headers.get('x-middleware-rewrite');

describe('internal prototypes on the production domain', () => {
  it('rewrites every prototype (and anything under it) to a route that does not exist, so the site\'s 404 answers', () => {
    for (const path of HIDDEN) {
      for (const url of [`https://rubikonbuild.com${path}`, `https://rubikonbuild.com${path}/`, `https://rubikonbuild.com${path}?from=test`]) {
        expect(rewriteOf(url), url).toBe('https://rubikonbuild.com/_hidden-prototype');
      }
    }
  });

  it('keeps the security headers on that answer', () => {
    const response = proxy(new NextRequest('https://rubikonbuild.com/planner-preview'));
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('leaves them open locally and on the preview builds, and leaves the public pages alone', () => {
    for (const host of ['http://127.0.0.1:3000', 'http://localhost:3000', 'https://design-grain-builder-phone-rubikon-build.leusd100.workers.dev']) {
      for (const path of HIDDEN) expect(rewriteOf(`${host}${path}`), `${host}${path}`).toBeNull();
    }
    for (const path of ['/', '/angary', '/zernoskhovyshcha', '/planner-preview-notes', '/logo']) {
      expect(rewriteOf(`https://rubikonbuild.com${path}`), path).toBeNull();
    }
  });

  it('still sends www to the bare domain first', () => {
    const response = proxy(new NextRequest('https://www.rubikonbuild.com/planner-preview'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://rubikonbuild.com/planner-preview');
  });
});
