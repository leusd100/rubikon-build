import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const MAX_RESPONSIVE_HERO_BYTES = 5_000_000;

// Phones get a still instead of video (HOME ≤760 px, /pro-nas ≤600 px), so only the tablet montages are served.
const responsiveHeroVideos = [
  ['Home tablet', '../../public/media/about/home-tablet-montage-v3.mp4'],
  ['About tablet', '../../public/media/about/about-tablet-montage-v2.mp4'],
] as const;

// HomeV2HeroMedia on desktop: each clip restarts at 0, is shown for clipDurationMs (2500) and keeps playing through the
// 800 ms cross-fade, at playbackRate 1 (the 0.85 slow-down is in the re-timed files, -v3 and since 21.11 -v4) — so 2.5 + 0.8 = 3.3 s of each file is
// ever on screen.
const DESKTOP_SHOWN_SOURCE_SECONDS = 2.5 + 0.8;
const MAX_DESKTOP_CLIP_BYTES = 1_750_000;

const homeDesktopClips = [
  '../../public/media/about/straight-line-14377591-v4.mp4',
  '../../public/media/about/blueprint-v4.mp4',
  '../../public/media/about/drilling-29913842-v4.mp4',
  '../../public/media/about/welding-v4.mp4',
  '../../public/media/about/structure-v4.mp4',
] as const;

/** Movie duration in seconds from the MP4 `mvhd` box (version 0 or 1). */
function mp4DurationSeconds(path: string): number {
  const bytes = readFileSync(new URL(path, import.meta.url));
  const at = bytes.indexOf('mvhd');
  if (at < 0) throw new Error(`no mvhd box in ${path}`);
  const version = bytes[at + 4];
  if (version === 1) {
    const timescale = bytes.readUInt32BE(at + 4 + 4 + 16);
    return Number(bytes.readBigUInt64BE(at + 4 + 4 + 20)) / timescale;
  }
  const timescale = bytes.readUInt32BE(at + 4 + 4 + 8);
  return bytes.readUInt32BE(at + 4 + 4 + 12) / timescale;
}

describe('Responsive hero media', () => {
  it.each(responsiveHeroVideos)('%s video stays within its 5 MB asset budget', (_, path) => {
    const size = statSync(new URL(path, import.meta.url)).size;

    expect(size).toBeLessThanOrEqual(MAX_RESPONSIVE_HERO_BYTES);
  });
});

describe('Home desktop hero clips (v4)', () => {
  it.each(homeDesktopClips)('%s outlasts the part of it the montage shows', (path) => {
    expect(mp4DurationSeconds(path)).toBeGreaterThan(DESKTOP_SHOWN_SOURCE_SECONDS);
  });

  it.each(homeDesktopClips)('%s stays within its 1.75 MB budget', (path) => {
    expect(statSync(new URL(path, import.meta.url)).size).toBeLessThanOrEqual(MAX_DESKTOP_CLIP_BYTES);
  });
});
