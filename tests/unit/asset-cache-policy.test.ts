import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  IMMUTABLE_CACHE_CONTROL,
  isImmutableAssetPathname,
  withImmutableCacheControl,
} from '../../worker/cache-policy';

describe('immutable asset cache policy', () => {
  it('keeps every responsive media filename tied to its encoded content', () => {
    const directory = path.join(process.cwd(), 'public/media-responsive');
    const files = readdirSync(directory);

    expect(files.length).toBeGreaterThan(0);

    for (const filename of files) {
      const filenameHash = filename.match(/\.([0-9a-f]{8})\.webp$/)?.[1];
      const contentHash = createHash('sha256')
        .update(readFileSync(path.join(directory, filename)))
        .digest('hex')
        .slice(0, 8);

      expect(filenameHash, filename).toBe(contentHash);
    }
  });

  it.each([
    '/_next/static/chunks/app-a1B2c3D4.js',
    '/_next/static/css/index.BpY8H61J.css',
    '/_next/static/_vinext_fonts/manrope-abcd1234/font-1234abcd.woff2',
    '/media-responsive/founder-480w.b8e54c4b.webp',
  ])('recognises version-safe asset path %s', (pathname) => {
    expect(isImmutableAssetPathname(pathname)).toBe(true);
  });

  it.each([
    '/',
    '/angary',
    '/media/hero-steel-frame.mp4',
    '/media/hero-steel-frame.webp',
    '/media-responsive/founder-480w.webp',
    '/media-responsive/founder-480w.not-a-hash.webp',
  ])('does not classify mutable or document path %s as immutable', (pathname) => {
    expect(isImmutableAssetPathname(pathname)).toBe(false);
  });

  it('replaces the browser cache policy on a successful asset response', () => {
    const response = withImmutableCacheControl(
      new Response('asset', {
        headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
      }),
    );

    expect(response.headers.get('Cache-Control')).toBe(
      IMMUTABLE_CACHE_CONTROL,
    );
    expect(response.status).toBe(200);
  });

  it('upgrades a matching 304 so existing browser entries become fresh', () => {
    const response = withImmutableCacheControl(
      new Response(null, {
        status: 304,
        headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
      }),
    );

    expect(response.headers.get('Cache-Control')).toBe(
      IMMUTABLE_CACHE_CONTROL,
    );
    expect(response.status).toBe(304);
  });

  it('does not make missing assets cacheable', () => {
    const missing = new Response('missing', {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
    });

    expect(withImmutableCacheControl(missing)).toBe(missing);
  });
});
