import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8');

describe('approved RUBIKON BUILD brand assets', () => {
  it('uses one outlined horizontal logo in both shared site-chrome locations', () => {
    const siteChrome = read('app/components/SiteChrome.tsx');

    expect(siteChrome).toContain('src="/brand/rubikon-build-horizontal-dark.svg"');
    expect(siteChrome).toContain('width={1270}');
    expect(siteChrome).toContain('height={272}');
    expect(siteChrome).toContain('alt={`${company.name} — будівництво та інженерні рішення`}');
    expect(siteChrome.match(/<Brand \/>/g)).toHaveLength(2);
  });

  it('ships dark/light lockups and a compact R without an explicit circle', () => {
    const assets = [
      'rubikon-build-horizontal-dark',
      'rubikon-build-horizontal-light',
      'rubikon-mark-dark',
      'rubikon-mark-light',
    ];

    for (const asset of assets) {
      expect(existsSync(path.join(root, `public/brand/${asset}.svg`))).toBe(true);
      expect(existsSync(path.join(root, `public/brand/${asset}.png`))).toBe(true);
    }

    const mark = read('public/brand/rubikon-mark-dark.svg');
    expect(mark).toContain('viewBox="0 0 320 280"');
    expect(mark).not.toContain('<circle');
    expect(mark).not.toContain('<text');
  });

  it('keeps the prior assets available during migration', () => {
    for (const asset of [
      'rubikon-build-dark.svg',
      'rubikon-build-light.svg',
      'rubikon-build-black.svg',
      'rubikon-build-white.svg',
      'rubikon-mark-copper.svg',
      'rubikon-mark-black.svg',
      'rubikon-mark-white.svg',
    ]) {
      expect(existsSync(path.join(root, 'public/brand', asset))).toBe(true);
    }
  });

  it('points metadata and the manifest at the new cache generation', () => {
    const layout = read('app/layout.tsx');
    const manifest = read('public/site.webmanifest');

    expect(layout).not.toContain('frame-01');
    expect(manifest).not.toContain('frame-01');
    expect(layout.match(/rubikon-02/g)?.length).toBeGreaterThanOrEqual(6);
    expect(manifest.match(/rubikon-02/g)).toHaveLength(3);
  });

  it('exports every expected native favicon size', () => {
    const expectedSizes = new Map([
      ['public/favicon-16x16.png', 16],
      ['public/favicon-32x32.png', 32],
      ['public/favicon-48x48.png', 48],
      ['public/apple-touch-icon.png', 180],
      ['public/icon-192x192.png', 192],
      ['public/icon-512x512.png', 512],
      ['public/icon-maskable-512x512.png', 512],
    ]);

    for (const [relativePath, size] of expectedSizes) {
      const png = readFileSync(path.join(root, relativePath));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(size);
      expect(png.readUInt32BE(20)).toBe(size);
    }
  });
});
