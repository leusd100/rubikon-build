import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { directionHeroImageAssets } from '../../app/data/directionHeroImageManifest';
import { directionHeroTraces, directionsSequenceTraces, hangarSheetTrace } from '../../app/data/directionHeroTraceManifest';
import { directionsHeroSequenceAssets } from '../../app/data/directionsHeroSequenceManifest';
import { homeProofCase } from '../../app/data/homeProof';

// The hero trace (owner, 20.11, prototype B): every direction's first view draws its photo's own lines. The page lays the
// drawing on the photo by giving it the photo's size, fit and position, so a drawing must have its art's exact size —
// a 1536 × 1024 one on a 784 × 1024 window would lie off the photo.

const svgOf = (src: string) => readFileSync(path.join(process.cwd(), 'public', src), 'utf8');
const sizeOf = (svg: string) => {
  const match = /<svg[^>]*viewBox="0 0 (\d+) (\d+)"[^>]*width="(\d+)" height="(\d+)"/.exec(svg);
  return match ? { viewBox: [Number(match[1]), Number(match[2])], size: [Number(match[3]), Number(match[4])] } : null;
};

describe('direction hero traces', () => {
  it('give every direction hero a trace of each crop it shows', () => {
    for (const [name, asset] of Object.entries(directionHeroImageAssets)) {
      expect(asset.trace, name).toBe(directionHeroTraces[name]);
      expect(Boolean(asset.trace?.phoneCrop), `${name}: a phone crop has its own trace`).toBe(Boolean('phoneCrop' in asset && asset.phoneCrop));
    }
  });

  it.each(Object.entries(directionHeroTraces))('%s: each drawing has its art\'s size, its hash, and draws itself', (_name, trace) => {
    const crops: [string | undefined, number, number][] = [[trace.landscape, 1536, 1024], [trace.portrait, 784, 1024], [trace.phoneCrop, 784, 844]];
    for (const [src, width, height] of crops) if (src) expectDrawing(src, width, height);
  });
});

// The same drawing on /napryamky (owner, 20.11: «так само застосуємо»): each slide, in each theme, gets the drawing of
// each crop the page shows — the art (1536 × 1024 or 1881 × 836), its 3 : 4 portrait crop, the phone's 3 : 2 window.
describe('/napryamky slide traces', () => {
  it.each(directionsHeroSequenceAssets.flatMap((asset) => (['daylight', 'dark'] as const).map((theme) => [`${theme}/${asset.id}`, asset[theme]] as const)))(
    '%s: a drawing of each crop, in that crop\'s frame',
    (key, art) => {
      const trace = directionsSequenceTraces[key];
      expect(trace, key).toBeDefined();
      expectDrawing(trace.landscape, art.width, art.height);
      expectDrawing(trace.portrait, Math.min(art.width, Math.round(art.height * 3 / 4)), art.height);
      expectDrawing(trace.mobile, 960, 640);
    },
  );

  it('has no drawing for a slide the sequence does not show', () => {
    expect(Object.keys(directionsSequenceTraces).sort()).toEqual(
      directionsHeroSequenceAssets.flatMap((asset) => [`daylight/${asset.id}`, `dark/${asset.id}`]).sort());
  });
});

describe('/angary built hangar trace', () => {
  it('is drawn in the frame of the photo its sheet shows', () => {
    expect(homeProofCase).not.toBeNull();
    expectDrawing(hangarSheetTrace, homeProofCase!.photo.width, homeProofCase!.photo.height);
  });
});

function expectDrawing(src: string, width: number, height: number) {
  const svg = svgOf(src);
  expect(sizeOf(svg), src).toEqual({ viewBox: [width, height], size: [width, height] });
  // content-hashed, as the immutable cache policy assumes of /media-responsive
  expect(src).toContain(`.${createHash('sha256').update(readFileSync(path.join(process.cwd(), 'public', src))).digest('hex').slice(0, 8)}.svg`);
  const lines = svg.match(/<path /g)?.length ?? 0;
  expect(lines, src).toBeGreaterThan(60);
  expect(lines, src).toBeLessThanOrEqual(202);
  expect(svg.match(/class="g"/g)?.length, `${src}: the copper perspective lines`).toBeGreaterThanOrEqual(1);
  // the drawing animates itself, and holds still under reduced motion
  expect(svg).toContain('@keyframes d');
  expect(svg).toMatch(/@media \(prefers-reduced-motion:reduce\)\{path\{animation:none/);
  // a phone fetches a few kilobytes, not a second photo
  expect(Buffer.byteLength(svg), src).toBeLessThan(20 * 1024);
  // every line stays inside its art (a sketch's overshoot aside) and starts before the veil lifts (1.75 s)
  for (const [, x1, y1, x2, y2, at] of svg.matchAll(/d="M(-?\d+) (-?\d+)L(-?\d+) (-?\d+)" pathLength="1" style="animation-delay:([\d.]+)s"/g)) {
    if (Number(at) > 0.2) for (const [x, y] of [[x1, y1], [x2, y2]]) {
      expect(Number(x), src).toBeGreaterThan(-width * 0.05);
      expect(Number(x), src).toBeLessThan(width * 1.05);
      expect(Number(y), src).toBeGreaterThan(-height * 0.05);
      expect(Number(y), src).toBeLessThan(height * 1.05);
    }
    expect(Number(at), src).toBeLessThan(1.75);
  }
}
