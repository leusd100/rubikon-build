import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FOOTER_SCENE_PAGES } from '../../app/components/FooterSignatureLife';
import { FOOTER_SCENES, IN_TURN, MISSING_FOR, TURN, five, flats, grain, inTurn, masonry, missing, rain, weld, type FooterScene, type WordGeometry } from '../../app/components/footerScenes';

const SCENE_BY_NAME = { rain, weld, grain, five };

// The footer scenes run continuously while the footer is on the screen (owner 09.11): each must go on for minutes without
// failing or slowing down, and the welding arc must carry the light along the word and start again. Canvas calls go to a
// stub that counts them, so a scene that piles up what it draws shows as a growing count.

// Node has no Path2D or DOMMatrix: the 404 letter builds paths, which the stub context then takes like any other call
class StubPath {
  addPath() {
    return undefined;
  }
}
globalThis.Path2D ??= StubPath as unknown as typeof Path2D;
globalThis.DOMMatrix ??= class {} as unknown as typeof DOMMatrix;

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

  // review 09.11: particles were added per frame, so a 120 Hz screen had twice the rain and sparks of a 60 Hz one
  for (const name of ['rain', 'weld', 'grain', 'five'] as const) {
    it(`${name}: as much on the screen at 120 frames a second as at 60`, () => {
      const perFrame = (fps: number) => {
        const scene = SCENE_BY_NAME[name](geometry), { context, counter } = stubContext();
        let time = 0, calls = 0;
        // a long window: the weld's bursts are random, and a short one compares two different spells of them
        for (let frame = 0; frame < fps * 60; frame++) {
          time += 1 / fps;
          const before = counter.calls;
          scene.back?.(context, 1 / fps, time);
          scene.front?.(context, 1 / fps, time);
          if (frame >= fps * 20) calls += counter.calls - before;
        }
        return calls / (fps * 40);
      };
      const at60 = perFrame(60), at120 = perFrame(120);
      expect(at120 / at60).toBeGreaterThan(.75);
      expect(at120 / at60).toBeLessThan(1.33);
    });
  }

  it('about: the masonry is laid on the flat stretches of the letters\' tops, and only there', () => {
    // the stub word: flat tops at 120 px, broken by a 20 px gap every 250 px
    const spans = flats(geometry, 22 * geometry.scale);
    expect(spans.length).toBeGreaterThanOrEqual(4);
    for (const [from, to, top] of spans) {
      expect(top).toBe(120);
      expect(to - from).toBeGreaterThanOrEqual(22 * geometry.scale);
    }
    const { perSecond } = run(masonry(geometry), 20);
    expect(Math.max(...perSecond)).toBeGreaterThan(0);
    expect(FOOTER_SCENES['.about-page']).toBe(masonry);
    expect(IN_TURN).toContain(masonry);
  });

  it('the home page plays every direction in turn, fading between them', () => {
    const scene = inTurn(geometry), { context } = stubContext();
    const seen: number[] = [];
    let time = 0;
    for (let frame = 0; frame < TURN * IN_TURN.length * 60; frame++) {
      time += 1 / 60;
      scene.back?.(context, 1 / 60, time);
      scene.front?.(context, 1 / 60, time);
      seen.push(scene.opacity!);
    }
    // faded out at each turn's edges, fully there in its middle
    for (let turn = 0; turn < IN_TURN.length; turn++) {
      expect(seen[turn * TURN * 60 + 1], `turn ${turn} begins faded`).toBeLessThan(.1);
      expect(seen[turn * TURN * 60 + TURN * 30], `turn ${turn} middle`).toBe(1);
    }
    expect(IN_TURN).toHaveLength(8);
  });

  it('404: the letter comes down, stands, and the go starts again', () => {
    const { arcs } = run(missing({ ...geometry, word: null }), MISSING_FOR * 2);
    expect(arcs.every((arc) => arc === null)).toBe(true);
  });

  it('knows the same pages as the footer that asks for them, and the stylesheet makes room on each', () => {
    expect(Object.keys(FOOTER_SCENES).sort()).toEqual([...FOOTER_SCENE_PAGES].sort());
    const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
    const room = /body:has\(main:is\((.*?)\)\) \.footer-signature-stage \{ margin-top/.exec(css);
    expect(room, 'the rule that lowers the word on a page with a scene').not.toBeNull();
    expect(room![1].split(',').map((key) => key.trim()).sort()).toEqual([...FOOTER_SCENE_PAGES].sort());
  });
});
