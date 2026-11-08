import { describe, expect, it } from 'vitest';
import { FOOTER_SCENE_PAGES } from '../../app/components/FooterSignatureLife';
import { FOOTER_SCENES, POUR_FOR, RAIN_FOR, WELD_FOR, pour, rain, weld, type FooterScene, type WordGeometry } from '../../app/components/footerScenes';

// The footer scenes play once and stop at their trace (owner 08.11, «Один раз і застигає»): each one is done within a
// few seconds of its own length, and the welding arc carries the light only while it burns. Canvas calls go to a stub.

/** A 2D context that takes every call and draws nothing */
function stubContext() {
  const gradient = { addColorStop: () => undefined };
  return new Proxy({}, {
    get: (_target, key) => {
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
      return () => undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
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

function run(scene: FooterScene, seconds: number) {
  const context = stubContext();
  const arcs: (readonly [number, number] | null)[] = [];
  let time = 0;
  for (let step = 0; step < seconds * 60; step++) {
    time += 1 / 60;
    scene.back?.(context, 1 / 60, time);
    scene.front?.(context, 1 / 60, time);
    arcs.push(scene.arc ? [...scene.arc] : null);
    if (scene.done(time)) return { time, arcs };
  }
  return { time: Infinity, arcs };
}

describe('footer scenes: once, then the trace', () => {
  it('the rain stops a little after its five seconds', () => {
    const { time } = run(rain(geometry), 20);
    expect(time).toBeGreaterThan(RAIN_FOR);
    expect(time).toBeLessThan(RAIN_FOR + 2);
  });

  it('the weld crosses the word once, the light at the arc, then the seam cools and it is done', () => {
    const { time, arcs } = run(weld(geometry), 20);
    expect(time).toBeLessThan(WELD_FOR + 4);
    const burning = arcs.filter((arc): arc is [number, number] => arc !== null);
    expect(burning.length).toBeGreaterThan(WELD_FOR * 60 * .8);
    // left to right along the word, in the signature's own units (viewBox x 521–1323)
    expect(burning[0][0]).toBeLessThan(560);
    expect(burning.at(-1)![0]).toBeGreaterThan(1280);
    for (let i = 1; i < burning.length; i++) expect(burning[i][0]).toBeGreaterThanOrEqual(burning[i - 1][0]);
    expect(arcs.at(-1)).toBeNull();
  });

  it('the pour fills the letters in its own time and stays', () => {
    const { time } = run(pour(geometry), 20);
    expect(time).toBeGreaterThan(POUR_FOR);
    expect(time).toBeLessThan(POUR_FOR + .1);
  });

  it('knows the same three pages as the footer that asks for them', () => {
    expect(Object.keys(FOOTER_SCENES).sort()).toEqual([...FOOTER_SCENE_PAGES].sort());
  });
});
