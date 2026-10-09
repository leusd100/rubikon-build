import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectVideoByteLengths } from '../../scripts/video-assets';

describe('build-time video byte lengths', () => {
  it('discovers nested MP4s, excludes other assets and updates replaced files', () => {
    const root = mkdtempSync(join(tmpdir(), 'rubikon-video-assets-'));
    try {
      mkdirSync(join(root, 'about'));
      writeFileSync(join(root, 'about', 'scene.mp4'), new Uint8Array(12));
      writeFileSync(join(root, 'hero clip.mp4'), new Uint8Array(20));
      writeFileSync(join(root, 'poster.webp'), new Uint8Array(100));
      expect(collectVideoByteLengths(root)).toEqual({
        '/media/about/scene.mp4': 12,
        '/media/hero%20clip.mp4': 20,
      });
      writeFileSync(join(root, 'about', 'scene.mp4'), new Uint8Array(30));
      expect(collectVideoByteLengths(root)['/media/about/scene.mp4']).toBe(30);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
