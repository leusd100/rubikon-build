#!/usr/bin/env node
// The materials behind the page blocks (app/components/page-materials.css): one period of each repeating surface, lit from
// the top right, with the light kept in the alpha channel so a tile works on any ground of its side (dark or paper).
// Drawn in a browser canvas from a height field; the fade into nothing is a CSS gradient, not part of the picture, which is
// why a material costs a few kilobytes. Run by hand after changing a surface: node scripts/generate-material-tiles.mjs
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const OUT = new URL('../public/media/materials/', import.meta.url);

const render = () => {
  const LIGHT = [.52, -.62, .59];
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  /** Value noise that wraps every px × py cells, so a tile's edges meet */
  const noise = (x, y, px, py) => {
    const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
    const at = (m, n) => hash(((m % px) + px) % px, ((n % py) + py) % py);
    return (at(i, j) * (1 - a) + at(i + 1, j) * a) * (1 - b) + (at(i, j + 1) * (1 - a) + at(i + 1, j + 1) * a) * b;
  };
  const export_ = (w, h, data) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
    return canvas;
  };
  /** One tile of height field `height`, in CSS px, drawn at `scale`: light edges in white, shadow in black, on either side */
  const shade = (height, cssW, cssH, { scale = 2, ground = 'dark', k = 1, spec = .6, tone = 0, hole = null }) => {
    const w = Math.round(cssW * scale), h = Math.round(cssH * scale);
    const n = Math.hypot(...LIGHT), [lx, ly, lz] = LIGHT.map((v) => v / n);
    const hn = Math.hypot(lx, ly, lz + 1), hx = lx / hn, hy = ly / hn, hz = (lz + 1) / hn;
    const data = new Uint8ClampedArray(w * h * 4);
    const step = 1 / scale;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const X = (x + .5) * step, Y = (y + .5) * step;
        const dx = (height(X + step, Y) - height(X - step, Y)) * scale / 2, dy = (height(X, Y + step) - height(X, Y - step)) * scale / 2;
        const m = Math.hypot(dx, dy, 1), nx = -dx / m, ny = -dy / m, nz = 1 / m;
        const v = (nx * lx + ny * ly + nz * lz - lz) * k + (Math.max(0, nx * hx + ny * hy + nz * hz) ** 60 - hz ** 60) * spec;
        const o = (y * w + x) * 4;
        const up = Math.max(0, v), down = Math.max(0, -v), pit = hole ? hole(X, Y) : 0;
        if (ground === 'dark') {
          if (pit > 0) { data[o + 3] = 255 * Math.min(1, pit * .9 + down); continue; }
          const lit = up + tone;
          if (lit >= down) { data[o] = 245; data[o + 1] = 242; data[o + 2] = 235; data[o + 3] = 255 * Math.min(1, lit - down * .5); } else data[o + 3] = 255 * Math.min(.95, (down - lit) * 1.2);
        } else if (up >= down) { data[o] = 255; data[o + 1] = 254; data[o + 2] = 250; data[o + 3] = 255 * Math.min(.95, up * 1.5); } else { data[o] = 92; data[o + 1] = 80; data[o + 2] = 62; data[o + 3] = 255 * Math.min(.6, down * .85); }
      }
    }
    return export_(w, h, data);
  };

  /** The nearest lattice point of a staggered grid: a surface of round features */
  const staggered = (p) => { const q = p * .866; return (x, y) => { const j = Math.round(y / q), o = j % 2 ? p / 2 : 0, i = Math.round((x - o) / p); return Math.hypot(x - (i * p + o), y - j * q); }; };
  const perf = (p, r, depth) => { const near = staggered(p); return { height: (x, y) => -smooth(r + 1.6, r - 1.6, near(x, y)) * depth, hole: (x, y) => smooth(r - .4, r - 2.2, near(x, y)) }; };
  const tread = (c, half, r, up) => (x, y) => {
    const i = Math.round(x / c), j = Math.round(y / c), px = x - i * c, py = y - j * c, s = (i + j) % 2 ? 1 : -1;
    const u = (px + s * py) * .7071, v = (px - s * py) * .7071, d = Math.hypot(Math.max(0, Math.abs(u) - half), v);
    return up * Math.sqrt(Math.max(0, 1 - (d / r) ** 2));
  };
  const concrete = (amp) => {
    const pw = 320, ph = 160, nx = 16, ny = 8;
    const ties = (x, y) => { const i = Math.floor(x / pw), j = Math.floor(y / ph); return Math.min(...[.25, .75].map((c) => Math.hypot(x - (i + c) * pw, y - (j + .5) * ph))); };
    const fbm = (x, y) => [[1, .55], [2, .28], [4, .17]].reduce((sum, [f, a]) => sum + noise(x * f, y * f, nx * f, ny * f) * a, 0);
    return {
      hole: (x, y) => smooth(8, 6, ties(x, y)),
      height: (x, y) => {
        const X = ((x % (2 * pw)) + 2 * pw) % (2 * pw), Y = ((y % (2 * ph)) + 2 * ph) % (2 * ph);
        const tx = X % pw, ty = Y % ph, joint = Math.min(smooth(0, 2.2, tx), smooth(pw, pw - 2.2, tx), smooth(0, 2.2, ty), smooth(ph, ph - 2.2, ty));
        const grain = fbm(X / 40, Y / 40) * amp + fbm(X / 4, Y / 4) * amp * .22, panel = hash(Math.floor(X / pw), Math.floor(Y / ph)) * amp * .7;
        return grain + panel + joint * 3 - smooth(13, 9, ties(X, Y)) * 6;
      },
    };
  };
  const trapezoid = (p, rib, slope, up) => (x) => { const t = ((x % p) + p) % p; return smooth(0, slope, t) * (1 - smooth(rib + slope, rib + 2 * slope, t)) * up; };
  const rib = (p) => (x) => Math.sin(x / p * 2 * Math.PI);
  const panel = (p, ribs) => { const r = rib(p / ribs); return (x) => { const t = ((x % p) + p) % p, g = smooth(0, 3, t) * (1 - smooth(p - 3, p, t)); return r(x) * .42 * g + g * 6; }; };
  const bolts = (sw, p) => (x, y) => { const j = Math.round(y / p), i = Math.round(x / sw); return Math.min(...[-9, 9].map((o) => Math.hypot(x - (i * sw + o), y - j * p))); };

  const tiles = {
    'perforated-dark': (() => { const a = perf(28, 9, 7); return shade(a.height, 28, 48.5, { k: 1.5, spec: .8, tone: .075, hole: a.hole }); })(),
    'tread-dark': shade(tread(46, 13, 5.4, 6.5), 92, 92, { k: 1.45, spec: 1.1, tone: .06 }),
    'knurl-dark': shade((x, y) => (Math.abs(Math.sin((x + y) / 16 * Math.PI)) + Math.abs(Math.sin((x - y) / 16 * Math.PI))) * 2.1, 16, 16, { k: .7, spec: .35, tone: .05 }),
    'panel-dark': shade(panel(210, 30), 210, 2, { k: 1.3, spec: .8, tone: .06 }),
    'sheet-dark': shade(trapezoid(124, 52, 13, 26), 124, 2, { k: .95, spec: .5, tone: .05 }),
    'silo-dark': (() => { const near = bolts(230, 30); return shade((x, y) => Math.sin(y / 30 * 2 * Math.PI) * 2.1 + smooth(4.5, 2, near(x, y)) * 2.2, 230, 30, { k: .8, spec: .22, tone: .05 }); })(),
    'concrete-dark': (() => { const a = concrete(5); return shade(a.height, 640, 320, { scale: 1, k: .95, spec: .12, tone: .085, hole: a.hole }); })(),
    'concrete-paper': (() => { const a = concrete(5); return shade(a.height, 640, 320, { scale: 1, ground: 'paper', k: .6, spec: .08 }); })(),
    'tread-paper': shade(tread(46, 12, 5, 4.5), 92, 92, { ground: 'paper', k: 1, spec: .2 }),
    'panel-paper': shade((x) => rib(9)(x) * .75, 9, 2, { ground: 'paper', k: 1.1, spec: .1 }),
    'sheet-paper': shade(trapezoid(124, 52, 3.2, 2.6), 124, 2, { ground: 'paper', k: 1.15, spec: .12 }),
    'dots-paper': (() => { const near = staggered(28); return shade((x, y) => { const d = near(x, y); return smooth(8, 3.4, d) * 4.2; }, 28, 48.5, { ground: 'paper', k: .7, spec: .22 }); })(),
  };
  // Brushed steel does not repeat: long streaks and one band of sheen, drawn once. The sheen is why it cannot be a tile.
  const brushed = (() => {
    const w = 1000, h = 640, data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const streak = (noise(x / 260, y * 1.6, 1e4, 1e4) - .5) * .9 + (noise(x / 90, y * 3.1, 1e4, 1e4) - .5) * .5;
        const sheen = Math.exp(-(((x * .8 + y * 1.1 - 900) / 190) ** 2));
        const o = (y * w + x) * 4;
        data[o] = 245; data[o + 1] = 242; data[o + 2] = 235; data[o + 3] = 255 * Math.max(0, .05 + .17 * sheen + streak * (.06 + .12 * sheen));
      }
    }
    return export_(w, h, data);
  })();
  tiles['brushed-dark'] = brushed;
  // Concrete is noise, which a lossy alpha channel cannot hold in few bytes: it lies opaque on its ground instead, and the
  // CSS gradient over it fades to the block's colour all the same
  const opaque = (canvas, ground) => {
    const flat = document.createElement('canvas');
    flat.width = canvas.width; flat.height = canvas.height;
    const context = flat.getContext('2d');
    context.fillStyle = ground; context.fillRect(0, 0, flat.width, flat.height); context.drawImage(canvas, 0, 0);
    return flat;
  };
  tiles['concrete-dark'] = opaque(tiles['concrete-dark'], '#171918');
  tiles['concrete-paper'] = opaque(tiles['concrete-paper'], '#F0ECE5');
  return Object.fromEntries(Object.entries(tiles).map(([name, canvas]) => {
    // the small tiles lossless, so their edges still meet; the large surfaces lossy
    const quality = { 'concrete-dark': .42, 'concrete-paper': .8, 'brushed-dark': .4 }[name] ?? 1;
    return [name, { data: canvas.toDataURL('image/webp', quality), w: canvas.width, h: canvas.height }];
  }));
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const tiles = await page.evaluate(render);
await browser.close();
for (const [name, { data, w, h }] of Object.entries(tiles)) {
  const file = new URL(`${name}.webp`, OUT);
  await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
  console.log(`${name}.webp ${w}×${h} ${((await stat(file)).size / 1024).toFixed(1)} KB`);
}
