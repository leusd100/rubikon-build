import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FOOTER_SCENE_PAGES } from '../../app/components/FooterSignatureLife';
import { ARC_STEP, FOOTER_SCENES, IN_TURN, MISSING_FOR, QUIET, TURN, beam, five, flats, frames, grain, inTurn, masonry, missing, rain, weld, type FooterScene, type WordGeometry } from '../../app/components/footerScenes';

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

/** A 2D context that takes every call, draws nothing and counts the strokes and fills. Plain properties, not a proxy that
    makes a function per call: the scenes make tens of thousands of calls, and under coverage a proxy timed the suite out */
function stubContext() {
  const gradient = { addColorStop: () => undefined };
  const counter = { calls: 0 };
  const count = () => {
    counter.calls++;
  };
  const context = {
    createLinearGradient: () => gradient, createRadialGradient: () => gradient,
    beginPath: count, moveTo: count, lineTo: count, closePath: count, stroke: count, fill: count, fillRect: count,
    arc: count, ellipse: count, save: count, restore: count, translate: count, setLineDash: count, clip: count,
  } as unknown as CanvasRenderingContext2D;
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
    it(`${page}: runs for a minute without piling up what it draws`, () => {
      const { perSecond } = run(make(geometry), 60);
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

  // 10.11: each move of the light re-runs the lighting filter over the whole word, on the CPU in Safari (~190 % at steps of 2)
  it('the light follows the arc in steps of ARC_STEP units, not every frame', () => {
    const { arcs } = run(weld(geometry), 40);
    const steps = arcs.slice(1).map((arc, i) => Math.max(Math.abs(arc![0] - arcs[i]![0]), Math.abs(arc![1] - arcs[i]![1])));
    const moves = steps.filter((step) => step > 0);
    expect(moves.length).toBeGreaterThan(100);
    expect(Math.min(...moves)).toBeGreaterThanOrEqual(ARC_STEP);
    // at the weld's pace (70 px/s, here 56 units a second, with the jumps over the gaps): ~15 moves a second; steps of 2 made 20
    expect(moves.length / 40).toBeLessThan(17);
  });

  it('the lamp\'s filter covers the letters and the blur\'s reach, not the 180 % of height it once lit for nothing', () => {
    const source = readFileSync('app/components/FooterSignature.tsx', 'utf8');
    const filter = /<filter id="footer-signature-lamp-light"([^>]*)>/.exec(source)![1];
    const attribute = (name: string) => Number.parseFloat(new RegExp(`\\b${name}="(-?[\\d.]+)%"`).exec(filter)![1]);
    expect(attribute('height')).toBeLessThanOrEqual(112);
    expect(attribute('width')).toBeLessThanOrEqual(110);
    // and still past the blur (stdDeviation 1.3, three of it ≈ 4 units) on the O, the narrowest path it lights (x 1089–1191, 102 units)
    expect(-attribute('x') / 100 * 102).toBeGreaterThanOrEqual(4);
  });

  // review 09.11: particles were added per frame, so a 120 Hz screen had twice the rain and sparks of a 60 Hz one
  for (const name of ['rain', 'weld', 'grain', 'five'] as const) {
    it(`${name}: as much on the screen at 120 frames a second as at 60`, () => {
      const perFrame = (fps: number) => {
        const scene = SCENE_BY_NAME[name](geometry), { context, counter } = stubContext();
        let time = 0, calls = 0;
        // a long window: the weld's bursts are random, and a short one compares two different spells of them
        for (let frame = 0; frame < fps * 40; frame++) {
          time += 1 / fps;
          const before = counter.calls;
          scene.back?.(context, 1 / fps, time);
          scene.front?.(context, 1 / fps, time);
          if (frame >= fps * 20) calls += counter.calls - before;
        }
        return calls / (fps * 20);
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

  // independent review 09.11, owner «приглуш»: copper is the call colour, so the large decorative copper stays quiet
  it('fills its large copper shapes at no more than the quiet share, the masonry\'s lower course a little above it', () => {
    const fills: { style: string; alpha: number }[] = [];
    const state = { fillStyle: '', globalAlpha: 1 };
    const gradient = { addColorStop: () => undefined };
    const context = new Proxy(state, {
      get: (target, key) => {
        if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
        if (key === 'fill' || key === 'fillRect') return () => fills.push({ style: String(target.fillStyle), alpha: target.globalAlpha });
        return () => undefined;
      },
      set: (target, key, value) => {
        if (key === 'fillStyle' || key === 'globalAlpha') Object.assign(target, { [key]: value });
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    for (const make of [beam, frames, masonry]) {
      const scene = make(geometry);
      let time = 0;
      for (let frame = 0; frame < 60 * 30; frame++) {
        time += 1 / 60;
        scene.back?.(context, 1 / 60, time);
        scene.front?.(context, 1 / 60, time);
      }
    }
    const loudest = (colour: string) => Math.max(0, ...fills.filter((fill) => fill.style.toUpperCase() === colour).map((fill) => fill.alpha));
    expect(loudest('#B76432')).toBeLessThanOrEqual(QUIET);
    expect(loudest('#9C5A34')).toBeLessThanOrEqual(.75);
    expect(loudest('#B76432')).toBeGreaterThan(0);
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
