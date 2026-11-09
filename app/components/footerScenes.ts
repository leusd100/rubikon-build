import { LETTER_O } from './footerSignatureLetters';

// The page's own scene on the footer's embossed RUBIKON (owner 08–09.11): on every page that has a live scene of its own,
// the same subject plays on the word, continuously while the footer is on the screen — rain beating on the letters' tops,
// a weld run along them, concrete poured into them, grain heaped on them, a beam lowered onto them, a portal frame coming
// through them, two courses of masonry laid on them, the five directions falling on them. «If it gets tiresome, or clients say so,
// we change it» (owner 09.11). The home page shows all eight in turn, and the 404 page lowers the word's missing O into
// place (owner 09.11, after the mock). The scenes draw into two canvases, behind the word (concrete and the frame, so the relief and
// the light stay on top) and in front of it (FooterSignatureLife.tsx runs them).

/** The word on the canvas, in CSS px: its scale against the signature's viewBox and where the letters stand */
export type WordGeometry = {
  width: number;
  height: number;
  /** viewBox unit → px */
  scale: number;
  /** the letters' top, px from the canvas top */
  wordTop: number;
  /** the top of the letters at a column, `height` where a column has none */
  surface: (x: number) => number;
  /** the letters as a path in canvas px (for a clip) */
  word: Path2D | null;
};

export type FooterScene = {
  back?: (c: CanvasRenderingContext2D, dt: number, time: number) => void;
  front?: (c: CanvasRenderingContext2D, dt: number, time: number) => void;
  /** Where the welding arc is, in viewBox units: the signature's light stands there */
  arc?: [number, number] | null;
  /** The light's place in canvas px, given each frame: what the rain's beads catch */
  lamp?: [number, number] | null;
  /** How visible the canvases are this frame (the home page fades from one scene to the next); 1 if left out */
  opacity?: number;
};

const INK = '#BDB7AC';
const COPPER = '#B76432';
/**
 * Copper is the site's action colour (the call buttons, the footer's phone and email icons): a scene's large copper shapes —
 * the beam, the frame, the masonry's lower course, the slings — stay at this much of it, so the brightest copper in the
 * footer is the contact, not the decoration (independent review 09.11; owner: «приглуш»)
 */
export const QUIET = .45;
const HOT = '#FFECCD';
const SPRAY = '#E2DCD0';
const GRAIN = '#D9C7A3';

// Decoration, so a plain linear generator, as liveScenes.ts: nothing here is a secret (Sonar S2245)
let seed = 23;
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const gauss = () => (random() + random() + random() + random() - 2) / 2;

type Bit = { x: number; y: number; vx: number; vy: number; age: number; life: number };

/** One stroke from [x0, y0] to [x1, y1] (the segment as one tuple, as liveScenes.ts: Sonar S107) */
const stroke = (c: CanvasRenderingContext2D, [x0, y0, x1, y1]: readonly number[], width: number, colour: string, alpha: number) => {
  c.globalAlpha = Math.max(0, Math.min(1, alpha));
  c.strokeStyle = colour;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
};

function update<T extends Bit>(bits: T[], dt: number, gravity: number, each: (bit: T, px: number, py: number) => boolean) {
  for (let i = bits.length - 1; i >= 0; i--) {
    const bit = bits[i], px = bit.x, py = bit.y;
    bit.age += dt;
    bit.vy += gravity * dt;
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    if (bit.age >= bit.life || !each(bit, px, py)) bits.splice(i, 1);
  }
}

/**
 * How many to add this frame for `perSecond` a second, the remainder carried to the next frame: the same rain, sparks and
 * grain at 60, 120 or 240 frames a second (review 09.11: added per frame, a 120 Hz screen had twice of each)
 */
export function counter() {
  let carry = 0;
  return (perSecond: number, dt: number) => {
    carry += perSecond * dt;
    const count = Math.floor(carry);
    carry -= count;
    return count;
  };
}

/** Polygon through points, filled */
function fillShape(c: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], colour: string, alpha: number) {
  c.globalAlpha = alpha;
  c.fillStyle = colour;
  c.beginPath();
  points.forEach(([x, y], index) => (index ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}

/** At most this many rain beads stay on the letters: the oldest dry first */
export const MOST_BEADS = 170;

/** Roofing: rain on the letters' tops — spray, runs to the edge and drips, beads that glint when the light passes */
export function rain(g: WordGeometry): FooterScene {
  const drops: (Bit & { length: number })[] = [], spray: Bit[] = [], runs: (Bit & { falling: boolean })[] = [];
  const beads: { x: number; y: number; r: number }[] = [];
  const land = (x: number, top: number) => {
    for (let i = 0; i < 3; i++) spray.push({ x, y: top, vx: gauss() * 60, vy: -40 - random() * 70, age: 0, life: .3 });
    if (random() < .25) runs.push({ x, y: top, vx: (random() < .5 ? -1 : 1) * (30 + random() * 30), vy: 0, age: 0, life: 1.6, falling: false });
    if (random() < .2) {
      beads.push({ x: x + gauss() * 2, y: top - .8, r: .7 + random() * .9 });
      if (beads.length > MOST_BEADS) beads.shift();
    }
  };
  const drip = counter();
  const scene: FooterScene = {
    front(c, dt) {
      for (let i = drip(180, dt); i > 0; i--) drops.push({ x: random() * (g.width + 120), y: -20, vx: -90, vy: 620 + random() * 160, age: 0, life: 3, length: 10 + random() * 18 });
      update(drops, dt, 0, (drop) => {
        stroke(c, [drop.x, drop.y, drop.x + drop.length * .15, drop.y - drop.length], .9, INK, .3);
        const top = g.surface(drop.x);
        if (drop.y < top) return drop.y < g.height;
        if (top < g.height) land(drop.x, top);
        return false;
      });
      update(spray, dt, 520, (bit, px, py) => {
        stroke(c, [px, py, bit.x, bit.y], .8, SPRAY, .7);
        return true;
      });
      // a run follows the top of its letter to the edge, then drips
      update(runs, dt, 0, (run, px, py) => {
        if (run.falling) run.vy += 900 * dt;
        else {
          run.y = g.surface(run.x) - .5;
          if (g.surface(run.x) > run.y + 6 || g.surface(run.x) >= g.height) {
            run.falling = true;
            run.vx = 0;
            run.vy = 40;
          }
        }
        stroke(c, [px, py, run.x, run.y + (run.falling ? 4 : 0)], 1.6, run.falling ? INK : SPRAY, .85);
        return run.y < g.height;
      });
      const [lx, ly] = scene.lamp ?? [-1e4, -1e4], reach = 150 * g.scale;
      for (const bead of beads) {
        const glint = Math.max(0, 1 - Math.hypot(bead.x - lx, bead.y - ly) / reach);
        c.globalAlpha = .22 + .78 * glint * glint;
        c.fillStyle = glint > .5 ? '#FFF6E8' : '#D8D1C4';
        c.beginPath();
        c.arc(bead.x, bead.y, bead.r + glint * .6, 0, Math.PI * 2);
        c.fill();
      }
    },
  };
  return scene;
}

/** A spark's colour as it cools: white, then the ink, then copper */
const sparkColour = (age: number) => {
  if (age < .22) return HOT;
  return age < .4 ? INK : COPPER;
};

/** How long a stretch of seam stays before it has cooled away, s */
export const SEAM_FOR = 6;

/** The seam behind the arc: white, red, copper, then it fades */
function drawSeam(c: CanvasRenderingContext2D, seam: readonly { x: number; y: number; at: number }[], time: number) {
  for (let i = 1; i < seam.length; i++) {
    const a = seam[i - 1], b = seam[i];
    if (b.x - a.x > 5 || Math.abs(b.y - a.y) > 3) continue;
    const age = time - b.at;
    let colour = COPPER;
    if (age < .35) colour = HOT;
    else if (age < 1.2) colour = '#E0703A';
    const alpha = age < 1.2 ? 1 : Math.max(0, .9 - (age - 1.2) / (SEAM_FOR - 1.2) * .9);
    stroke(c, [a.x, a.y, b.x, b.y], age < 1.2 ? 2.2 : 1.6, colour, alpha);
  }
}

/** The arc's pace along the word, px a second */
const WELD_PACE = 70;

/** Metal: a weld runs along the top of the word and starts again; the arc carries the light, the seam cools and fades */
export function weld(g: WordGeometry): FooterScene {
  const sparks: (Bit & { landed: boolean })[] = [];
  let seam: { x: number; y: number; at: number }[] = [];
  let x = 0, burst = 1, lastX = -9;
  const spit = counter();

  /** On along the letters' tops, over the gaps between them, and from the start again past the last one */
  const advance = (dt: number) => {
    x += dt * WELD_PACE;
    while (g.surface(x) >= g.height && x < g.width) x += 2;
    if (x >= g.width) {
      x = 0;
      lastX = -9;
      while (g.surface(x) >= g.height && x < g.width) x += 2;
    }
  };

  /** One frame of the arc: its sparks, the seam it lays and its glow */
  const burn = (c: CanvasRenderingContext2D, dt: number, time: number) => {
    const y = g.surface(x) - 1;
    // the light follows the arc in steps of 2 units, not every frame: each step re-runs the signature's lighting filter
    const arcX = 521 + x / g.scale, arcY = 140 + (y - 6 - g.wordTop) / g.scale;
    if (!scene.arc || Math.abs(scene.arc[0] - arcX) >= 2 || Math.abs(scene.arc[1] - arcY) >= 2) scene.arc = [arcX, arcY];
    if (random() < 3.6 * dt) burst = .3 + random() * 1.1;
    for (let i = spit((6 + random() * 10) * burst * 60, dt); i > 0; i--) {
      const angle = -1.57 + gauss() * 1.6, speed = 60 + random() * random() * 300;
      sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: .4 + random() * .9, landed: false });
    }
    if (x - lastX >= 2) {
      seam.push({ x, y: g.surface(x) - .6, at: time });
      lastX = x;
    }
    const radius = 10 + random() * 10 * burst, glow = c.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, HOT);
    glow.addColorStop(.3, COPPER);
    glow.addColorStop(1, 'rgba(183,100,50,0)');
    c.globalAlpha = .8;
    c.fillStyle = glow;
    c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };

  /** Sparks fall, land once on a letter's top, bounce a little and die */
  const fall = (c: CanvasRenderingContext2D, dt: number) => update(sparks, dt, 620, (spark, px, py) => {
    const top = g.surface(spark.x);
    if (spark.vy > 0 && spark.y > top && !spark.landed) {
      spark.y = top;
      spark.vy *= -.3;
      spark.vx *= .6;
      spark.landed = true;
      spark.life = Math.min(spark.life, spark.age + .25);
    }
    const age = spark.age / spark.life;
    stroke(c, [px, py, spark.x, spark.y], 1.5 - age * .8, sparkColour(age), (1 - age * age) * .95);
    return spark.y < g.height + 4;
  });

  const scene: FooterScene = {
    arc: null,
    front(c, dt, time) {
      advance(dt);
      burn(c, dt, time);
      fall(c, dt);
      seam = seam.filter((point) => time - point.at < SEAM_FOR);
      drawSeam(c, seam, time);
    },
  };
  return scene;
}

/** One pour, held, and the form struck, s */
export const POUR_CYCLE = 11;

/** Concrete: the letters are a form, poured from above, held, struck, and poured again — behind the relief and its light */
export function pour(g: WordGeometry): FooterScene {
  return {
    back(c, _dt, time) {
      if (!g.word) return;
      const p = time % POUR_CYCLE, fill = Math.min(1, p / 7), struck = p > 9 ? (p - 9) / 2 : 0;
      const level = g.height - fill * (g.height - g.wordTop);
      c.save();
      // even–odd, as the signature's own fill-rule: the counters of R, B and O stay open
      c.clip(g.word, 'evenodd');
      const tone = c.createLinearGradient(0, g.wordTop, 0, g.height);
      tone.addColorStop(0, '#6E6B65');
      tone.addColorStop(1, '#4E4C47');
      c.globalAlpha = .95 * (1 - struck);
      c.fillStyle = tone;
      c.fillRect(0, level, g.width, g.height - level);
      // the aggregate: fixed specks, so the still face does not shimmer
      c.globalAlpha = .35 * (1 - struck);
      c.fillStyle = '#928E86';
      for (let i = 0; i < 90; i++) c.fillRect((i * 97.3) % g.width, level + ((i * 37.7) % Math.max(1, g.height - level)), 1.4, 1.4);
      if (fill < 1) {
        c.globalAlpha = .7;
        c.fillStyle = '#A8A39A';
        c.fillRect(0, level - 1, g.width, 2);
      }
      c.restore();
      if (fill < 1) {
        const x = g.width * .655;
        for (let i = 0; i < 12; i++) {
          const y = random() * level;
          stroke(c, [x + gauss() * 2, y, x + gauss() * 2, y + 14], 3, '#77736C', .85);
        }
      }
    },
  };
}

/** Where the three streams of grain fall, as parts of the word's width */
const GRAIN_STREAMS = [.18, .5, .82];
/** Grain heaped on the letters before it slowly melts away and the heaps start again, in grains a pixel of width */
const GRAIN_FULL = 9;

/** Grain: three streams heap the grain on the letters' tops; it rolls off the edges, and when the heaps are full they fade */
export function grain(g: WordGeometry): FooterScene {
  const falling: Bit[] = [], heap = new Float32Array(Math.ceil(g.width) + 2), trickle = GRAIN_STREAMS.map(() => counter());
  let fade = 1, total = 0;
  const ground = (i: number) => g.surface(i) - heap[Math.max(0, Math.min(heap.length - 1, i))];
  /** The column a grain settles in: it rolls down while a neighbour is lower by more than the slope holds */
  const settle = (start: number) => {
    let x = start;
    for (let n = 0; n < 40; n++) {
      const left = ground(x - 1), right = ground(x + 1), here = ground(x);
      if (left > here + 1.2 && left >= right) x--;
      else if (right > here + 1.2) x++;
      else break;
    }
    return x;
  };
  return {
    front(c, dt) {
      for (const [stream, at] of GRAIN_STREAMS.entries()) for (let i = trickle[stream](120, dt); i > 0; i--) falling.push({ x: at * g.width + gauss() * 5, y: -6 - random() * 20, vx: gauss() * 3, vy: 140 + random() * 50, age: 0, life: 6 });
      update(falling, dt, 520, (bit, px, py) => {
        stroke(c, [px, py, bit.x, bit.y], 1.6, random() < .05 ? COPPER : GRAIN, .85 * fade);
        if (bit.y < ground(Math.round(bit.x))) return true;
        const x = settle(Math.round(bit.x));
        if (x >= 0 && x < heap.length && g.surface(x) < g.height) {
          heap[x] = Math.min(heap[x] + 1.2, 60);
          total++;
        }
        return false;
      });
      c.globalAlpha = .9 * fade;
      c.fillStyle = GRAIN;
      for (let x = 0; x < heap.length; x++) if (heap[x] > 0) c.fillRect(x, g.surface(x) - heap[x], 1, heap[x]);
      c.globalAlpha = .5 * fade;
      c.fillStyle = '#8E7C5C';
      for (let x = 0; x < heap.length; x += 3) if (heap[x] > 2) c.fillRect(x, g.surface(x) - heap[x] + (x * 7 % 5) + 1, 1.2, 1.2);
      if (total > g.width * GRAIN_FULL) fade = Math.max(0, fade - dt * .4);
      if (fade === 0) {
        heap.fill(0);
        total = 0;
        fade = 1;
      }
    },
  };
}

/** Process: an I-beam lowered on its slings onto the top of the word, swaying a little, and lifted again */
export function beam(g: WordGeometry): FooterScene {
  const width = 220 * g.scale, height = 40 * g.scale, web = 7 * g.scale, flange = 9 * g.scale, left = g.width * .42;
  let rest = g.height;
  for (let i = 0; i < width; i++) rest = Math.min(rest, g.surface(left + i));
  rest -= height;
  return {
    front(c, _dt, time) {
      const down = (1 - Math.cos(time * .55)) / 2, x = left + Math.sin(time * .9) * 8 * (1 - down), y = -height - 30 + (rest + height + 30) * down;
      const middle = x + width / 2;
      fillShape(c, [
        [x, y], [x + width, y], [x + width, y + flange], [middle + web / 2, y + flange], [middle + web / 2, y + height - flange], [x + width, y + height - flange],
        [x + width, y + height], [x, y + height], [x, y + height - flange], [middle - web / 2, y + height - flange], [middle - web / 2, y + flange], [x, y + flange],
      ], COPPER, QUIET);
      c.globalAlpha = QUIET;
      c.strokeStyle = COPPER;
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x + 6, y);
      c.lineTo(middle, y - 60 * g.scale);
      c.lineTo(x + width - 6, y);
      c.moveTo(middle, y - 60 * g.scale);
      c.lineTo(left + width / 2, -10);
      c.stroke();
    },
  };
}

/** Hangars: a portal frame comes out of the depth behind the word and through it, bay after bay */
export function frames(g: WordGeometry): FooterScene {
  const loop = 5;
  return {
    back(c, _dt, time) {
      const p = (time / loop) % 1, k = Math.pow(.72, 6 * (1 - p)), centre = g.width * .5, horizon = g.wordTop + 30 * g.scale;
      const w = 1100 * g.scale * k, h = 520 * g.scale * k, eaves = 180 * g.scale * k, t = 26 * g.scale * k;
      const x = centre - w / 2, y = horizon + h * .55, ridge = y - h, eave = ridge + eaves;
      fillShape(c, [
        [x, y], [x, eave], [centre, ridge], [x + w, eave], [x + w, y], [x + w - t, y],
        [x + w - t, eave + t * .5], [centre, ridge + t * 1.25], [x + t, eave + t * .5], [x + t, y],
      ], COPPER, Math.sin(p * Math.PI) * QUIET * .8);
    },
  };
}

/** Flat stretches of the letters' tops at least `wide` px across: [from, to, top], in canvas px */
export function flats(g: WordGeometry, wide: number): [number, number, number][] {
  const spans: [number, number, number][] = [];
  let start = -1, level = 0;
  for (let x = 0; x <= g.width; x++) {
    const top = g.surface(x);
    if (top < g.height && start >= 0 && Math.abs(top - level) < 1.5) continue;
    if (start >= 0 && x - start >= wide) spans.push([start, x - 1, level]);
    start = top < g.height ? x : -1;
    level = top;
  }
  return spans;
}

type Block = { x: number; y: number; w: number; course: 0 | 1; at: number };
/** A block's height, its gap, and how far apart in time two blocks are laid, s */
const COURSE = 11;
const JOINT = 1.5;
const LAY = .06;

/** One stretch of a letter's top in two courses: blocks sized to fill it, and the second bonded over the joints of the first */
function courses(g: WordGeometry, [from, to, top]: [number, number, number]): Block[] {
  const h = COURSE * g.scale, span = to - from, count = Math.max(1, Math.round(span / (26 * g.scale)));
  const w = (span - JOINT * (count - 1)) / count, blocks: Block[] = [];
  for (let i = 0; i < count; i++) blocks.push({ x: from + i * (w + JOINT), y: top - h, w, course: 0, at: 0 });
  const upper = top - 2 * h - JOINT;
  // half a block at each end, whole ones over the joints between
  blocks.push({ x: from, y: upper, w: w / 2, course: 1, at: 0 });
  for (let i = 1; i < count; i++) blocks.push({ x: from + i * (w + JOINT) - w / 2 - JOINT / 2, y: upper, w, course: 1, at: 0 });
  blocks.push({ x: from + (count - 1) * (w + JOINT) + w / 2 + JOINT / 2, y: upper, w: w / 2 - JOINT / 2, course: 1, at: 0 });
  return blocks;
}

/**
 * About: two courses laid along the letters' tops — the first in copper, the second in light, bonded over it: «Два покоління —
 * одна відповідальність» (the page's own line), the older course carrying the younger (owner 09.11, from three mocked ideas).
 * Laid left to right, the first course before the second, held, faded, and laid again.
 */
export function masonry(g: WordGeometry): FooterScene {
  const blocks = flats(g, 22 * g.scale).flatMap((span) => courses(g, span)).filter((block) => block.w >= 2);
  const first = blocks.filter((block) => !block.course).sort((p, q) => p.x - q.x);
  const second = blocks.filter((block) => block.course).sort((p, q) => p.x - q.x);
  first.forEach((block, i) => { block.at = i * LAY; });
  second.forEach((block, i) => { block.at = first.length * LAY + .4 + i * LAY; });
  const laid = Math.max(0, ...blocks.map((block) => block.at)) + .5, cycle = laid + 3.5;
  const h = COURSE * g.scale;
  return {
    front(c, _dt, time) {
      const p = time % cycle, fade = p < laid + 2.5 ? 1 : Math.max(0, 1 - (p - laid - 2.5));
      for (const block of blocks) {
        const since = p - block.at;
        if (since < 0) continue;
        // each block drops the last few pixels into its place
        const k = Math.min(1, since / .35), y = block.y - (1 - k * k) * 36, alpha = Math.min(1, k * 2) * fade;
        c.globalAlpha = alpha * (block.course ? .8 : QUIET * 1.6);
        c.fillStyle = block.course ? '#CFC6B4' : '#9C5A34';
        c.fillRect(block.x, y, block.w, h);
        c.globalAlpha = .6 * alpha;
        c.fillStyle = block.course ? '#F5F0E6' : '#C98A5E';
        c.fillRect(block.x, y, block.w, 1.5);
        c.globalAlpha = .35 * fade;
        c.fillStyle = '#000';
        c.fillRect(block.x, y + h - 1.5, block.w, 1.5);
      }
    },
  };
}

/** Directions hub: the five directions fall on five letters, each its own way */
export function five(g: WordGeometry): FooterScene {
  const at = [.08, .3, .5, .7, .92], chance = [.9, .7, .7, .7, .5], spread = [10, 8, 11, 26, 9], speed = [150, 240, 170, 60, 560];
  const bits: (Bit & { kind: number })[] = [], falls = at.map(() => counter());
  const look = (kind: number) => {
    if (kind === 1) return { colour: COPPER, tail: 6, width: 1.4 };
    if (kind === 2) return { colour: GRAIN, tail: 1.6, width: 2.4 };
    return { colour: INK, tail: kind === 4 ? 16 : 1.6, width: 1.4 };
  };
  return {
    front(c, dt) {
      for (let kind = 0; kind < 5; kind++) {
        for (let i = falls[kind](chance[kind] * 60, dt); i > 0; i--) bits.push({ kind, x: at[kind] * g.width + gauss() * spread[kind], y: -8, vx: 0, vy: speed[kind] * (.8 + random() * .4), age: 0, life: 10 });
      }
      update(bits, dt, 0, (bit, px, py) => {
        const { colour, tail, width } = look(bit.kind);
        stroke(c, [px, py, bit.x, bit.y + tail], width, colour, .85);
        return bit.y < g.surface(bit.x);
      });
    },
  };
}

/** Home: every direction in turn, TURN seconds each, faded out and in over FADE */
export const TURN = 8;
const FADE = .6;
export const IN_TURN = [rain, weld, grain, pour, beam, frames, masonry, five] as const;

export function inTurn(g: WordGeometry): FooterScene {
  let index = -1, inner: FooterScene = {}, start = 0;
  const follow = (time: number) => {
    const turn = Math.floor(time / TURN), now = turn % IN_TURN.length;
    if (now !== index) {
      index = now;
      inner = IN_TURN[now](g);
      start = turn * TURN;
    }
    const into = time - start;
    scene.opacity = Math.max(0, Math.min(1, into / FADE, (TURN - into) / FADE));
  };
  const scene: FooterScene = {
    opacity: 1,
    back(c, dt, time) {
      follow(time);
      inner.back?.(c, dt, time - start);
    },
    front(c, dt, time) {
      follow(time);
      inner.lamp = scene.lamp;
      inner.front?.(c, dt, time - start);
      scene.arc = inner.arc ?? null;
    },
  };
  return scene;
}

/** One go of the 404 scene, s: down 3.2, the slings away 0.8, standing, then the letter fades for the next go */
export const MISSING_FOR = 10;
const LOWERED_IN = 3.2;

/** 404: the O is missing from the word; it comes down on slings into its place, lands in a little dust, the slings go up,
    it stands, and fades for the next go. Where it belongs, a faint copper outline while it is not there. */
export function missing(g: WordGeometry): FooterScene {
  const dust: Bit[] = [];
  const left = (1089 - 521) * g.scale, right = (1191 - 521) * g.scale, middle = (left + right) / 2, height = 79 * g.scale;
  const letter = (dy: number) => {
    const path = new Path2D();
    path.addPath(new Path2D(LETTER_O), new DOMMatrix([g.scale, 0, 0, g.scale, -521 * g.scale, g.wordTop - 140 * g.scale + dy]));
    return path;
  };
  const place = letter(0);
  let landed = false;
  /** The slings over the letter, from its two shoulders to the hook, and the hook's line up out of the canvas */
  const slings = (c: CanvasRenderingContext2D, top: number, sway: number, alpha: number) => {
    c.globalAlpha = alpha * QUIET;
    c.strokeStyle = COPPER;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(left + sway + 8, top);
    c.lineTo(middle + sway, top - 50 * g.scale);
    c.lineTo(right + sway - 8, top);
    c.moveTo(middle + sway, top - 50 * g.scale);
    c.lineTo(middle, -10);
    c.stroke();
  };
  /** The letter as pressed into the band: dark face, light upper-left edge, shadowed lower-right */
  const draw = (c: CanvasRenderingContext2D, path: Path2D, sway: number, alpha: number) => {
    c.save();
    c.translate(sway, 0);
    c.globalAlpha = alpha;
    c.fillStyle = '#1B1D1C';
    c.fill(path, 'evenodd');
    c.lineWidth = 1.2;
    c.translate(-.8, -.8);
    c.globalAlpha = .38 * alpha;
    c.strokeStyle = '#F5F2EB';
    c.stroke(path);
    c.translate(1.6, 1.6);
    c.globalAlpha = .7 * alpha;
    c.strokeStyle = '#000';
    c.stroke(path);
    c.restore();
  };
  return {
    front(c, dt, time) {
      const p = time % MISSING_FOR, drop = g.wordTop + height + 40;
      const down = p < LOWERED_IN ? 1 - (1 - p / LOWERED_IN) ** 3 : 1;
      const sway = p < LOWERED_IN ? Math.sin(p * 2.4) * 6 * (1 - p / LOWERED_IN) : 0;
      const dy = -(1 - down) * drop, alpha = p < 8.6 ? 1 : Math.max(0, 1 - (p - 8.6) / .9);
      if (p < LOWERED_IN) landed = false;
      c.save();
      c.setLineDash([4, 4]);
      c.globalAlpha = .45 * (1 - down);
      c.strokeStyle = COPPER;
      c.lineWidth = 1;
      c.stroke(place);
      c.restore();
      c.save();
      c.translate(0, dy);
      draw(c, place, sway, alpha);
      c.restore();
      const lift = p < LOWERED_IN ? 0 : Math.min(1, (p - LOWERED_IN) / .8);
      if (lift < 1) slings(c, g.wordTop + dy - lift * 160, sway, 1 - lift);
      if (p >= LOWERED_IN && !landed) {
        landed = true;
        for (let i = 0; i < 40; i++) dust.push({ x: left + random() * (right - left), y: g.height - 2, vx: gauss() * 40, vy: -20 - random() * 50, age: 0, life: .6 + random() * .5 });
      }
      update(dust, dt, 60, (bit, px, py) => {
        stroke(c, [px, py, bit.x, bit.y], 1.4, INK, .5 * (1 - bit.age / bit.life));
        return true;
      });
    },
  };
}

/** The page a scene belongs to: a selector on its <main> (DirectionPageConfig.pageClassName, the pages' own classes, HOME's
    data-home); FooterSignatureLife looks for `main` + the key, and globals.css lifts the word on the same list */
export const FOOTER_SCENES: Record<string, (g: WordGeometry) => FooterScene> = {
  '.roofing-page': rain,
  '.metal-page': weld,
  '.concrete-page': pour,
  '.grain-page': grain,
  '.process-page': beam,
  '.angary-page': frames,
  '.about-page': masonry,
  '.directions-page': five,
  '[data-home]': inTurn,
  '.not-found-page': missing,
};
