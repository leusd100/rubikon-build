import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FOOTER_SCENE_PAGES } from '../../app/components/FooterSignatureLife';
import { FOOTER_SCENES, weld, type FooterScene, type WordGeometry } from '../../app/components/footerScenes';

// The footer scenes run continuously while the footer is on the screen (owner 09.11): each must go on for minutes without
// failing or slowing down, and the welding arc must carry the light along the word and start again. Canvas calls go to a
// stub that counts them, so a scene that piles up what it draws shows as a growing count.

/** A 2D context that takes every call, draws nothing and counts the strokes and fills */
function stubContext() {
  const gradient = { addColorStop: () => undefined };
  const counter = { calls: 0 };
  const context = new Proxy({}, {
    get: (_target, key) => {
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
      return () => {
        counter.calls++;
      };
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { context, counter };
}

/** A word 1000 px wide: letters 40 px tall with gaps, as the signature has between its letters */
const geometry: WordGeometry = {
  width: 1000,
  height: 160,
  scale: 1000 / 802,
  wordTop: 120,
  surface: (x) => (Math.floor(x / 125) % 2 === 0 || x % 125 > 20 ? 120 : 160),
  word: null,
};

/** Runs a scene for `seconds` at 60 frames a second; the canvas calls of each second, and the arc of every frame */
function run(scene: FooterScene, seconds: number) {
  const { context, counter } = stubContext();
  const perSecond: number[] = [], arcs: ([number, number] | null)[] = [];
  let time = 0;
  for (let second = 0; second < seconds; second++) {
    const before = counter.calls;
    for (let frame = 0; frame < 60; frame++) {
      time += 1 / 60;
      scene.back?.(context, 1 / 60, time);
      scene.front?.(context, 1 / 60, time);
      arcs.push(scene.arc ? [scene.arc[0], scene.arc[1]] : null);
    }
    perSecond.push(counter.calls - before);
  }
  return { perSecond, arcs };
}

describe('footer scenes: continuous', () => {
  for (const [page, make] of Object.entries(FOOTER_SCENES)) {
    it(`${page}: runs for two minutes without piling up what it draws`, () => {
      const { perSecond } = run(make(geometry), 120);
      // the last ten seconds draw no more than twice the busiest of seconds 10–20: a steady state, not a growing heap
      const settled = Math.max(...perSecond.slice(10, 20)), late = Math.max(...perSecond.slice(-10));
      expect(late).toBeLessThanOrEqual(Math.max(settled * 2, 50));
    });
  }

  it('the weld runs left to right along the word, carrying the light, and starts again from the left', () => {
    const { arcs } = run(weld(geometry), 40);
    expect(arcs.every((arc) => arc !== null)).toBe(true);
    const xs = arcs.map((arc) => arc![0]);
    // in the signature's own units (viewBox x 521–1323)
    expect(Math.min(...xs)).toBeLessThan(560);
    expect(Math.max(...xs)).toBeGreaterThan(1280);
    const restarts = xs.filter((x, i) => i > 0 && x < xs[i - 1] - 400).length;
    expect(restarts).toBeGreaterThanOrEqual(1);
  });

  it('knows the same pages as the footer that asks for them, and the stylesheet makes room on each', () => {
    expect(Object.keys(FOOTER_SCENES).sort()).toEqual([...FOOTER_SCENE_PAGES].sort());
    const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
    const room = /body:has\(main:is\(([^)]*)\)\) \.footer-signature-stage \{ margin-top/.exec(css);
    expect(room, 'the rule that lowers the word on a page with a scene').not.toBeNull();
    expect(room![1].split(',').map((name) => name.trim().replace(/^\./, '')).sort()).toEqual([...FOOTER_SCENE_PAGES].sort());
  });
});
