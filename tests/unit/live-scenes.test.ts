import { describe, expect, it } from 'vitest';
import { SCENES, type Inks } from '../../app/components/liveScenes';

// The physics of the live scenes (app/components/liveScenes.ts), drawn into a stub: the rendering itself is checked in
// tests/e2e/page-sheets.spec.ts. What can only go wrong here is a scene that stops drawing or that piles up particles for as
// long as a visitor stays on the block.
const STEP = 1 / 60;
const MINUTE = 60 * 60;
const INKS: Inks[] = [
  { ink: '#F5F2EB', copper: '#C98A5E', dark: true },
  { ink: '#25282A', copper: '#A0522A', dark: false },
];

function stubContext() {
  const drawn = { strokes: 0, fills: 0, rects: 0, alphas: [] as number[] };
  const context = {
    set globalAlpha(alpha: number) { drawn.alphas.push(alpha); },
    strokeStyle: '', fillStyle: '' as unknown, lineWidth: 1,
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    stroke() { drawn.strokes += 1; },
    fill() { drawn.fills += 1; },
    fillRect() { drawn.rects += 1; },
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  return { context: context as unknown as CanvasRenderingContext2D, drawn };
}

describe('the live scenes', () => {
  it('has one for each page with a scene', () => {
    expect(Object.keys(SCENES)).toHaveLength(8);
  });

  for (const [selector, { make }] of Object.entries(SCENES)) {
    for (const inks of INKS) {
      describe(`${selector}, ${inks.dark ? 'dark' : 'paper'}`, () => {
        it('draws on every frame of a minute and holds the same load at its end', () => {
          const scene = make(), { context, drawn } = stubContext();
          let time = 0;
          const run = (frames: number) => {
            const before = drawn.strokes + drawn.fills;
            for (let i = 0; i < frames; i++) scene.step(context, STEP, time += STEP, inks);
            return (drawn.strokes + drawn.fills - before) / frames;
          };
          const settled = run(MINUTE / 2), end = run(MINUTE / 2);
          expect(settled).toBeGreaterThan(0);
          expect(end).toBeLessThanOrEqual(Math.max(settled * 1.5, 2));
          expect(end).toBeLessThan(2000);
        });

        it('keeps every alpha it asks for within what a canvas takes', () => {
          const scene = make(), { context, drawn } = stubContext();
          for (let i = 0; i < 300; i++) scene.step(context, STEP, i * STEP, inks);
          expect(drawn.alphas.every((alpha) => alpha >= 0 && alpha <= 1)).toBe(true);
        });
      });
    }
  }

  it('the scenes that redraw the whole picture say which layer they replace', () => {
    const replaced = Object.values(SCENES).map(({ replaces }) => replaces).filter(Boolean);
    expect(replaced.sort()).toEqual(['--material', '--scene', '--scene']);
  });

  it('a stream swaps its picture for the one without the stream, and the rain for the roof alone', () => {
    expect(SCENES['.concrete-page > .cost-section'].make().still).toEqual(['--scene', 'var(--scene-form)']);
    expect(SCENES['.grain-page > .cost-section'].make().still).toEqual(['--material-grain', 'var(--scene-heap)']);
    expect(SCENES['.roofing-page > .direction-entry'].make().still).toEqual(['--scene', 'var(--scene-roof)']);
  });
});
