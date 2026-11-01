#!/usr/bin/env node
// The scenes on the pages' paper blocks (app/components/page-materials.css): each direction told by its own subject, in the
// language of the falling grain, thousands of short strokes in tone with a little copper. Seeded, so a run is repeatable.
// One SVG for each side, grouped by colour, width and opacity, which is what keeps them near the grain's weight. Drawn in a
// browser only for the point-in-shape test of the mark. Run by hand after changing a scene:
// node scripts/generate-material-scenes.mjs
import { writeFile } from 'node:fs/promises';
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
    const r = rng(7), ox = 510, oy = 44, g = 620, floor = 372;
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

  const pour = (s) => {
    const r = rng(11), sx = 540, left = 250, right = 760, bottom = 420, level = (x) => 214 + Math.sin(x * .021) * 3 + Math.exp(-((x - sx) ** 2) / 1500) * -26;
    for (let i = 0; i < 420; i++) { const y = r() * level(sx); stone(s, r, sx + gauss(r) * (12 + y * .05), y, 1.1 + r() * 2.3, ink, .55 + r() * .4); }
    const bars = []; for (let x = left + 46; x < right; x += 76) for (const y of [292, 362]) bars.push([x, y]);
    for (let i = 0; i < 1800; i++) {
      const x = left + r() * (right - left), lv = level(x), d = Math.pow(r(), 1.5), y = lv + d * (bottom - lv), size = .8 + r() * r() * 4.6;
      if (bars.some(([bx, by]) => Math.hypot(x - bx, y - by) < 10.5 + size)) continue;
      stone(s, r, x, y, size, r() < .03 ? copper : ink, (.82 - d * .62) * (.5 + r() * .5) * Math.min(1, (x - left) / 50));
    }
    s.extra.push(`<g stroke="${copper}" stroke-width="1.8">${bars.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5"/>`).join('')}</g>`);
  };

  const snow = (s) => {
    const r = rng(5), px = 560, py = 150, ey = 330, ex = 250, roof = (x) => (x < px ? py + (px - x) / (px - ex) * (ey - py) : py + (x - px) / (px - ex) * (ey - py));
    for (let i = 0; i < 620; i++) { const x = r() * 760, y = r() * 330; if (y > roof(x) - 3) continue; const q = .7 + r() * 1.2; s.line(x, y, x - .4, y + q * 1.1, q, r() < .05 ? copper : ink, Math.min(1, (x - 170) / 200) * (.3 + r() * .55)); }
    for (let i = 0; i < 2000; i++) {
      const x = ex + r() * (760 - ex), lee = x > px ? 1.5 : 1, depth = (8 + 13 * Math.sin(Math.min(1, Math.abs(x - px) / 310) * 3.14)) * lee, d = Math.pow(r(), 1.8), y = roof(x) - d * depth;
      s.line(x, y, x + .7, y + .3, .9 + r() * .9, ink, (.96 - d * .5) * Math.min(1, (x - ex) / 90));
    }
  };

  const rain = (s) => {
    const r = rng(13), slope = (x) => 96 + (760 - x) * .38, eave = 270, a = .26;
    for (let i = 0; i < 780; i++) { const x = 120 + r() * 700, y = r() * 300, l = 12 + r() * 26; if (y + l > slope(x - a * l)) continue; s.line(x, y, x - a * l, y + l, .9, ink, Math.min(1, (x - 200) / 170) * (.18 + r() * .5)); }
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

  const order = (s) => {
    const r = rng(3), columns = [430, 520, 610, 700];
    for (let i = 0; i < 2100; i++) {
      const gx = columns[i % 4] + ((i >> 2) % 9 - 4) * 8.4, gy = 44 + ((i >> 6) % 34) * 10.4, sx = 190 + r() * 420, sy = 20 + r() * 380, p = r(), k = p * p * (3 - 2 * p);
      const x = sx + (gx - sx) * k, y = sy + (gy - sy) * k, q = (1 - k) * r() * 6.3, l = 3 + (1 - k) * 2;
      s.line(x, y, x + Math.sin(q) * l, y + Math.cos(q) * l, 1.15, ink, Math.min(1, (x - 170) / 150) * (.28 + k * .62));
    }
    s.extra.push(`<path stroke="${copper}" stroke-width="2" d="M330 225C372 170 392 230 430 222H700"/><g fill="${copper}">${columns.map((x) => `<circle cx="${x}" cy="222" r="4.4"/>`).join('')}</g>`);
  };

  const mark = (s) => {
    const r = rng(17), k = .76, ox = 540, oy = 16, top = new Path2D('M0 0H182C240 0 278 34 278 85C278 139 240 173 186 173H74V130H181C210 130 227 113 227 87C227 59 209 44 181 44H39Z'), leg = new Path2D('M0 130H139L278 280H208L115 181H52V280H0Z'), c = document.createElement('canvas').getContext('2d');
    const inside = (x, y) => c.isPointInPath(top, (x - ox) / k, (y - oy) / k) || c.isPointInPath(leg, (x - ox) / k, (y - oy) / k);
    for (let i = 0; i < 7000; i++) {
      const x = 280 + r() * 480, y = r() * 270; if (inside(x, y)) continue;
      const near = [[3, 0], [-3, 0], [0, 3], [0, -3], [7, 0], [-7, 0], [0, 7], [0, -7]].some(([dx, dy]) => inside(x + dx, y + dy));
      if (!near && r() > .42) continue;
      const q = r() * 6.3, l = .6 + r() * 1.5;
      s.line(x, y, x + Math.cos(q) * l, y + Math.sin(q) * l, .95, ink, Math.min(1, (x - 280) / 130) * Math.min(1, (270 - y) / 50) * (near ? 1 : .26 + r() * .4));
    }
    s.extra.push(`<path fill="${copper}" fill-opacity=".9" transform="translate(${ox} ${oy}) scale(${k})" d="M79 190H117L203 280H161Z"/>`);
  };

  const five = (s) => {
    const r = rng(29), xs = [326, 434, 542, 650, 742], base = 380;
    for (let i = 0; i < 620; i++) { const y = r() * base, x = xs[0] + gauss(r) * (6 + y * .02), q = r() * 6.3; s.line(x, y, x + Math.cos(q) * 1.8, y + Math.sin(q) * 1.8, 1.8, r() < .06 ? copper : ink, .3 + r() * .6); }
    for (let i = 0; i < 460; i++) { const y = r() * base, x = xs[1] + gauss(r) * (4 + y * .09), l = 4 + r() * 10; s.line(x, y, x + gauss(r) * 2, y + l, .9, r() < .7 ? copper : ink, .3 + r() * .65); }
    for (let i = 0; i < 460; i++) { const y = r() * base; stone(s, r, xs[2] + gauss(r) * (7 + y * .03), y, 1 + r() * 3.3, ink, .35 + r() * .55); }
    for (let i = 0; i < 400; i++) { const y = r() * base, x = xs[3] + gauss(r) * 22; s.line(x, y, x + .5, y + 1.4, 1.7, ink, .22 + r() * .6); }
    for (let i = 0; i < 300; i++) { const y = r() * base, x = xs[4] + gauss(r) * 8, l = 9 + r() * 20; s.line(x, y, x - l * .1, y + l, .9, ink, .25 + r() * .55); }
  };

  return Object.fromEntries(Object.entries({ sparks, pour, snow, rain, order, mark, five }).map(([name, draw]) => { const s = scene(); draw(s); return [name, s.toSvg()]; }));
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
}
await browser.close();
