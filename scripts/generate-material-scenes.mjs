#!/usr/bin/env node
// The scenes on the pages' paper blocks (app/components/page-materials.css): each direction told by its own subject, in the
// language of the falling grain, thousands of short strokes in tone with a little copper. Seeded, so a run is repeatable.
// One SVG for each side, grouped by colour, width and opacity, which is what keeps them near the grain's weight. Drawn in a
// browser only for the point-in-shape test of the mark. Run by hand after changing a scene:
// node scripts/generate-material-scenes.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const OUT = new URL('../public/media/materials/', import.meta.url);
const SIDES = { dark: ['#F5F2EB', '#C98A5E'], paper: ['#25282A', '#A0522A'] };

const render = (ink, copper) => {
  const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = (r) => (r() + r() + r() + r() - 2) / 2;
  const clamp = (a) => Math.max(.2, Math.min(1, Math.round(a * 5) / 5));
  const fixed = (n) => String(Math.round(n * 10) / 10).replace(/^(-?)0\./, '$1.');
  const bin = (w) => [.8, 1.2, 1.8, 2.6, 3.6, 5, 7].reduce((best, step) => (Math.abs(step - w) < Math.abs(best - w) ? step : best));

  const scene = () => {
    const groups = new Map();
    const extra = [];
    const add = (colour, width, alpha, d) => { if (alpha < .1) return; const key = `${colour}|${bin(width)}|${clamp(alpha)}`; groups.set(key, (groups.get(key) ?? '') + d); };
    const line = (x0, y0, x1, y1, width, colour, alpha) => add(colour, width, alpha, `M${fixed(x0)} ${fixed(y0)}l${fixed(x1 - x0) || '.1'} ${fixed(y1 - y0)}`);
    const curve = (points, width, colour, alpha) => add(colour, width, alpha, points.map(([x, y], i) => (i ? `L${fixed(x)} ${fixed(y)}` : `M${fixed(x)} ${fixed(y)}`)).join(''));
    const toSvg = () => {
      const paths = [...groups].map(([key, d]) => { const [colour, width, alpha] = key.split('|'); return `<path stroke="${colour}" stroke-width="${width}"${alpha === '1' ? '' : ` stroke-opacity="${alpha}"`} d="${d}"/>`; });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="430" viewBox="0 0 760 430" fill="none" stroke-linecap="round">${paths.join('')}${extra.join('')}</svg>`;
    };
    return { line, curve, extra, toSvg };
  };
  const stone = (s, r, x, y, size, colour, alpha) => { const q = r() * 6.3, l = size * .35; s.line(x - Math.cos(q) * l, y - Math.sin(q) * l, x + Math.cos(q) * l, y + Math.sin(q) * l, size * 1.3, colour, alpha); };

  const sparks = (s) => {
    const r = rng(7), ox = 460, oy = 44, g = 620, floor = 372;
    for (let i = 0; i < 1150; i++) {
      const a = 1.57 + gauss(r) * 1.9, v = 90 + r() * r() * 420, vx = Math.cos(a) * v, vy = Math.sin(a) * v - 60, t = r() * r() * 1.05 + .02, dt = .022 + r() * .03;
      let x = ox + vx * t, y = oy + vy * t + .5 * g * t * t, x2 = ox + vx * (t + dt), y2 = oy + vy * (t + dt) + .5 * g * (t + dt) * (t + dt);
      if (y > floor) { const k = .3 + r() * .25; y = floor - (y - floor) * k; y2 = floor - (y2 - floor) * k; x += (x - ox) * .05; x2 += (x2 - ox) * .05; }
      if (y < -6) continue;
      const age = Math.min(1, t / .9);
      s.line(x, y, x2, y2, .7 + (1 - age) * 1.1, age > .28 || r() < .12 ? copper : ink, Math.max(.16, .95 - age * .72));
    }
    for (let i = 0; i < 70; i++) { // the long arcs that give the shower its shape
      const a = 1.57 + gauss(r) * 1.5, v = 170 + r() * 330, vx = Math.cos(a) * v, vy = Math.sin(a) * v - 90, points = [], t0 = .02 + r() * .1, t1 = t0 + .22 + r() * .4;
      for (let t = t0; t < t1; t += .03) { const x = ox + vx * t, y = oy + vy * t + .5 * g * t * t; if (y > floor) break; points.push([x, y]); }
      if (points.length > 1) s.curve(points, .8, r() < .7 ? copper : ink, .34 + r() * .3);
    }
    for (let i = 0; i < 260; i++) { const x = ox + gauss(r) * 230, y = floor + 3 + r() * r() * 26; s.line(x, y, x + 1 + r() * 2.4, y, 1, r() < .55 ? copper : ink, .22 + r() * .4 * (1 - Math.abs(x - ox) / 330)); }
    for (let i = 0; i < 130; i++) { const a = r() * 6.28, q = r() * r() * 16, l = 3 + r() * 9; s.line(ox + Math.cos(a) * q, oy + Math.sin(a) * q, ox + Math.cos(a) * (q + l), oy + Math.sin(a) * (q + l), 1, ink, .9); }
  };

  // A section through a foundation: the bucket, the formwork with its brace, the stirrups of the cage, and the concrete coming up
  // around them. The stream itself is live (liveScenes.ts): with `stream` false this is the picture under it
  const pour = (stream) => (s) => {
    const r = rng(11), sx = 470, left = 196, right = 744, bottom = 420, level = (x) => 214 + Math.sin(x * .021) * 3 + Math.exp(-((x - sx) ** 2) / 1500) * -22;
    if (stream) for (let i = 0; i < 300; i++) { const y = 78 + r() * (level(sx) - 78); stone(s, r, sx + gauss(r) * 9, y, 1.1 + r() * 2.3, ink, .55 + r() * .4); }
    for (let i = 0; i < 1500; i++) {
      const x = left + r() * (right - left), lv = level(x), d = Math.pow(r(), 1.5), y = lv + d * (bottom - lv), size = .8 + r() * r() * 4.6;
      stone(s, r, x, y, size, r() < .03 ? copper : ink, (.82 - d * .62) * (.5 + r() * .5));
    }
    const cage = [240, 365, 490, 615].map((x) => `<rect x="${x}" y="256" width="74" height="112" rx="5"/>`).join('');
    s.extra.push(`<path fill="${ink}" fill-opacity=".92" d="M405-6H535V22L492 66V78H448V66L405 22Z"/><path fill="${copper}" d="M448 70h44v8h-44z"/>`
      + `<path fill="${ink}" fill-opacity=".86" d="M178 170h14v240h-14zM748 170h14v240h-14z"/><path stroke="${ink}" stroke-opacity=".6" stroke-width="3" d="M178 230L128 330M128 330H178"/>`
      + `<g stroke="${copper}" stroke-width="1.7">${cage}<path d="M212 268H728M212 356H728"/></g>`);
  };

  const rain = (s) => {
    const r = rng(13), slope = (x) => 96 + (760 - x) * .33, eave = 170, a = .26;
    for (let i = 0; i < 780; i++) { const x = 40 + r() * 780, y = r() * 300, l = 12 + r() * 26; if (y + l > slope(x - a * l)) continue; s.line(x, y, x - a * l, y + l, .9, ink, Math.min(1, x / 150) * (.18 + r() * .5)); }
    for (let n = 0; n < 150; n++) { // beads running down the sheet, sparse high up, gathering towards the eave
      const u = Math.pow(r(), 1.5), x = eave + u * (760 - eave), near = 1 - u, l = 4 + near * 22 + r() * 9, off = -r() * 3.5;
      s.line(x, slope(x) + off, x - l, slope(x - l) + off, .8 + near * 1.3, ink, .3 + near * .62);
    }
    for (let i = 0; i < 620; i++) { // the drops striking it: the slope is only where the rain stops
      const x = eave + r() * (760 - eave), y = slope(x), q = .3 + r() * 2.5, k = 2 + r() * r() * 13;
      s.line(x, y - 1, x + Math.cos(q) * k, y - 1 - Math.sin(q) * k, .75, ink, .28 + r() * .5);
    }
    for (let i = 0; i < 44; i++) { const y = slope(eave) + i * 8.4 + r() * 6, x = eave - 3 + gauss(r) * 2.4, size = 1.2 + r() * .9; s.line(x, y, x, y + 3 + size, size, i % 6 === 2 ? copper : ink, Math.max(.1, .92 - i * .018)); }
  };

  // Portal frames going away in tone, sheet behind sheet, as the deck does
  const bays = (s) => {
    const vx = 490, vy = 220;
    for (let i = 6; i >= 0; i--) {
      const k = Math.pow(.74, i), w = 530 * k, h = 256 * k, e = 100 * k, t = 17 * k, x = vx - w / 2, y = vy + h * .52, top = y - h, eave = y - h + e;
      const f = (n) => fixed(n);
      s.extra.push(`<path fill="${i === 3 ? copper : ink}" fill-opacity="${i === 3 ? .95 : Math.max(.1, .94 - i * .13).toFixed(2)}" d="M${f(x)} ${f(y)}V${f(eave)}L${vx} ${f(top)}L${f(x + w)} ${f(eave)}V${f(y)}H${f(x + w - t)}V${f(eave + t * .5)}L${vx} ${f(top + t * 1.25)}L${f(x + t)} ${f(eave + t * .5)}V${f(y)}Z"/>`);
    }
  };

  // A stack of I-beams end on, in order. The last one comes down on its slings, live (liveScenes.ts)
  const beams = (s) => {
    const r = rng(41), w = 50, h = 58, web = 7, flange = 9;
    const shape = (x, y) => `M${x} ${y}h${w}v${flange}H${x + w / 2 + web / 2}V${y + h - flange}H${x + w}v${flange}H${x}v${-flange}H${x + w / 2 - web / 2}V${y + flange}H${x}Z`;
    for (let row = 0; row < 3; row++) {
      const y = 239 - row * (h + 3), count = 11 - row;
      for (let i = 0; i < count; i++) {
        const x = 776 - (i + 1) * (w + 4) + (row % 2 ? 27 : 0), alpha = Math.min(1, (.5 + r() * .45) * Math.min(1, (x - 130) / 120));
        if (alpha > .02) s.extra.push(`<path fill="${ink}" fill-opacity="${alpha.toFixed(2)}" d="${shape(x, y)}"/>`);
      }
    }
  };

  // Two streams into one, as the page's own «два покоління — одна відповідальність»
  const merge = (s) => {
    const r = rng(53), end = [430, 214], at = (a, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * b[0] + t * t * end[0], (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * b[1] + t * t * end[1]];
    for (const [a, b, colour] of [[[236, -14], [294, 170], ink], [[628, -14], [570, 170], copper]]) {
      for (let i = 0; i < 620; i++) { const t = r(), [x, y] = at(a, b, t), w = 22 - t * 12, q = r() * 6.3, X = x + gauss(r) * w, Y = y + gauss(r) * w * .4; s.line(X, Y, X + Math.cos(q) * 2, Y + Math.sin(q) * 2, 1.7, colour, .4 + r() * .55); }
    }
    for (let i = 0; i < 560; i++) { const t = r(), y = 214 + t * 170, x = 430 + gauss(r) * (9 + t * 6), q = r() * 6.3; s.line(x, y, x + Math.cos(q) * 2, y + Math.sin(q) * 2, 1.9, r() < .5 ? copper : ink, (.5 + r() * .5) * (1 - t * .3)); }
  };

  // The roof alone: what the live rain falls on (liveScenes.ts)
  const roof = (s) => {
    const r = rng(14), slope = (x) => 96 + (760 - x) * .33, eave = 170;
    for (let n = 0; n < 150; n++) {
      const u = Math.pow(r(), 1.5), x = eave + u * (760 - eave), near = 1 - u, l = 4 + near * 22 + r() * 9, off = -r() * 3.5;
      s.line(x, slope(x) + off, x - l, slope(x - l) + off, .8 + near * 1.3, ink, .3 + near * .62);
    }
  };

  const five = (s) => {
    const r = rng(29), xs = [190, 300, 410, 520, 630], base = 380;
    for (let i = 0; i < 620; i++) { const y = r() * base, x = xs[0] + gauss(r) * (6 + y * .02), q = r() * 6.3; s.line(x, y, x + Math.cos(q) * 1.8, y + Math.sin(q) * 1.8, 1.8, r() < .06 ? copper : ink, .3 + r() * .6); }
    for (let i = 0; i < 460; i++) { const y = r() * base, x = xs[1] + gauss(r) * (4 + y * .09), l = 4 + r() * 10; s.line(x, y, x + gauss(r) * 2, y + l, .9, r() < .7 ? copper : ink, .3 + r() * .65); }
    for (let i = 0; i < 460; i++) { const y = r() * base; stone(s, r, xs[2] + gauss(r) * (7 + y * .03), y, 1 + r() * 3.3, ink, .35 + r() * .55); }
    for (let i = 0; i < 400; i++) { const y = r() * base, x = xs[3] + gauss(r) * 22; s.line(x, y, x + .5, y + 1.4, 1.7, ink, .22 + r() * .6); }
    for (let i = 0; i < 300; i++) { const y = r() * base, x = xs[4] + gauss(r) * 8, l = 9 + r() * 20; s.line(x, y, x - l * .1, y + l, .9, ink, .25 + r() * .55); }
  };

  return Object.fromEntries(Object.entries({ sparks, pour: pour(true), 'pour-form': pour(false), bays, rain, roof, beams, merge, five }).map(([name, draw]) => { const s = scene(); draw(s); return [name, s.toSvg()]; }));
};

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [side, colours] of Object.entries(SIDES)) {
  const scenes = await page.evaluate(`(${render})(${JSON.stringify(colours[0])}, ${JSON.stringify(colours[1])})`);
  for (const [name, svg] of Object.entries(scenes)) {
    if (name === 'five' && side === 'paper') continue; // the hub's block is dark in both themes
    await writeFile(new URL(`scene-${name}-${side}.svg`, OUT), svg);
    console.log(`scene-${name}-${side}.svg ${(svg.length / 1024).toFixed(1)} KB`);
  }
  // The grain's heap without its stream: the live one falls in that place. The grains above the heap around the stream go
  const grain = await readFile(new URL(`grainfall-${side}.svg`, OUT), 'utf8');
  await writeFile(new URL(`scene-heap-${side}.svg`, OUT), grain.replace(/M(\d+\.?\d*) (\d+\.?\d*)l[-\d.]+[ -][-\d.]+/g, (grainStroke, x, y) => (Number(y) < 430 && Number(x) > 500 && Number(x) < 620 ? '' : grainStroke)));
}
await browser.close();
