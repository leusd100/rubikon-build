import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { CSP_DIRECTIVES, buildContentSecurityPolicy } from '../../../app/lib/security/csp';
import { proxy } from '../../../proxy';

const ROOT = join(__dirname, '..', '..', '..');
const production = buildContentSecurityPolicy({ development: false });
const directive = (policy: string, name: string) =>
  policy.split(';').map((part) => part.trim()).find((part) => part.split(' ')[0] === name)?.split(' ').slice(1) ?? [];

describe('canonical Content-Security-Policy', () => {
  it('is exactly the policy production served before consolidation', () => {
    expect(production).toBe(
      "default-src 'self'; "
      + "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com; "
      + "style-src 'self' 'unsafe-inline'; "
      + "img-src 'self' data: blob: https://www.google-analytics.com https://*.google-analytics.com; "
      + "media-src 'self'; font-src 'self' data:; "
      + "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com; "
      + "frame-src 'self' https://challenges.cloudflare.com; "
      + "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests",
    );
  });

  it('keeps Cloudflare Turnstile working: its script and its challenge iframe', () => {
    expect(directive(production, 'script-src')).toContain('https://challenges.cloudflare.com');
    expect(directive(production, 'frame-src')).toContain('https://challenges.cloudflare.com');
  });

  it('adds no broad sources: no bare scheme, no *, no wildcard beyond the existing Google Analytics one', () => {
    const sources = Object.values(CSP_DIRECTIVES).flat();

    for (const source of sources) {
      expect(source).not.toMatch(/^(https?:|\*|'unsafe-eval'|'unsafe-hashes'|'wasm-unsafe-eval')$/);
    }
    expect(sources.filter((source) => source.includes('*'))).toEqual(['https://*.google-analytics.com', 'https://*.google-analytics.com']);
    expect(production).not.toContain('cloudflare.com/*');
    expect(production).not.toMatch(/\*\.cloudflare/);
  });

  it('keeps the protective directives locked down', () => {
    expect(directive(production, 'object-src')).toEqual(["'none'"]);
    expect(directive(production, 'base-uri')).toEqual(["'self'"]);
    expect(directive(production, 'form-action')).toEqual(["'self'"]);
    expect(directive(production, 'frame-ancestors')).toEqual(["'self'"]);
    expect(production.endsWith('; upgrade-insecure-requests')).toBe(true);
  });

  it('only drops upgrade-insecure-requests in development, where the dev server is plain http', () => {
    expect(buildContentSecurityPolicy({ development: true })).toBe(production.replace('; upgrade-insecure-requests', ''));
  });
});

describe('single source of truth', () => {
  it('proxy.ts sends exactly the canonical policy', () => {
    const response = proxy(new NextRequest('https://rubikonbuild.com/angary'));

    expect(response.headers.get('Content-Security-Policy')).toBe(buildContentSecurityPolicy({ development: process.env.NODE_ENV === 'development' }));
  });

  it('no other file in the app, proxy, worker or config declares its own policy', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx|js|mjs|cjs)$/.test(name)) files.push(path);
      }
    };
    walk(join(ROOT, 'app'));
    walk(join(ROOT, 'worker'));
    files.push(...['proxy.ts', 'next.config.ts', 'worker.ts', 'vite.config.ts'].map((name) => join(ROOT, name)));

    const declaring = files
      // A policy (directives) or a header set to one — a comment that merely names the header does not count.
      .filter((path) => /default-src|script-src|['"]Content-Security-Policy['"]\s*[,:]/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(ROOT, path))
      .sort();
    expect(declaring).toEqual(['app/lib/security/csp.ts', 'proxy.ts']);
    expect(readFileSync(join(ROOT, 'proxy.ts'), 'utf8')).not.toMatch(/default-src|script-src/);
  });
});
