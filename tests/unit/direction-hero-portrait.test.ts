import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { directionHeroImageAssets } from '../../app/data/directionHeroImageManifest';

// The phone file of a direction hero is the art's 784 × 1024 window at native size, cut where object-position puts the
// phone's view. The generator cuts it and the manifest positions it, so the two must agree.
const generator = readFileSync(path.join(process.cwd(), 'scripts/generate-direction-hero-images.py'), 'utf8');
const generatorPositions = Object.fromEntries(
  [...(generator.match(/DIRECTION_HERO_PORTRAIT_POSITIONS = \{([^}]*)\}/)?.[1] ?? '').matchAll(/"([\w-]+)": (\.\d+)/g)]
    .map(([, name, x]) => [name, Number(x)]),
);

function imageSize(file: string) {
  const bytes = readFileSync(path.join(process.cwd(), 'public', file));
  if (file.endsWith('.avif')) {
    const ispe = bytes.indexOf('ispe');
    return { width: bytes.readUInt32BE(ispe + 8), height: bytes.readUInt32BE(ispe + 12) };
  }
  // Lossy WebP (VP8): 14-bit width and height after the key-frame start code
  expect(bytes.toString('latin1', 12, 16), file).toBe('VP8 ');
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
}

describe('direction hero phone window', () => {
  it('is cut for every direction, at the x of its mobile object-position', () => {
    expect(generator).toMatch(/^DIRECTION_HERO_PORTRAIT_WIDTH = 784$/m);
    expect(Object.keys(generatorPositions).sort()).toEqual(Object.keys(directionHeroImageAssets).sort());
    for (const [name, asset] of Object.entries(directionHeroImageAssets)) {
      expect(asset.mobileFocalPosition, name).toBe(`${Math.round(generatorPositions[name] * 100)}% center`);
    }
  });

  it.each(Object.entries(directionHeroImageAssets))('%s ships a 784 × 1024 AVIF and WebP for both themes', (_name, asset) => {
    for (const art of [asset.portrait, asset.dark.portrait]) {
      expect(art.avif).toMatch(/-portrait-784w\.[0-9a-f]{8}\.avif$/);
      expect(art.webp).toMatch(/-portrait-784w\.[0-9a-f]{8}\.webp$/);
      expect(imageSize(art.avif), art.avif).toEqual({ width: 784, height: 1024 });
      expect(imageSize(art.webp), art.webp).toEqual({ width: 784, height: 1024 });
    }
    expect(asset.portrait.avif).toContain('direction-hero-photo-variant-');
    expect(asset.dark.portrait.avif).toContain('direction-hero-blue-hour-');
  });
});
