// The scenes on the paper blocks, alive (owner 02.11: «живі іскри топ»). Each is a little physics drawn into one canvas under
// the block's text, in the block's own 760 × 430 box (page-materials.css), the same subjects as the still SVGs that stay
// behind for reduced motion, a phone and a page without script. No files and no video: a clip with transparency needs one
// format for each browser and costs megabytes, and these colours follow the theme.

export type Inks = { ink: string; copper: string; dark: boolean };
export type Scene = { still?: string; step: (c: CanvasRenderingContext2D, dt: number, time: number, inks: Inks) => void };
type Bit = { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; hit?: boolean };

// Decoration, so a plain linear generator: nothing here is a secret
let seed = 9;
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const gauss = () => (random() + random() + random() + random() - 2) / 2;
const stroke = (c: CanvasRenderingContext2D, [x0, y0, x1, y1]: number[], width: number, colour: string, alpha: number) => {
  c.globalAlpha = Math.max(0, Math.min(1, alpha));
  c.strokeStyle = colour;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
};
const update = (bits: Bit[], dt: number, gravity: number, each: (bit: Bit, px: number, py: number) => boolean) => {
  for (let i = bits.length - 1; i >= 0; i--) {
    const bit = bits[i], px = bit.x, py = bit.y;
    bit.age += dt;
    bit.vy += gravity * dt;
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    if (bit.age >= bit.life || !each(bit, px, py)) bits.splice(i, 1);
  }
};

function sparks(): Scene {
  const bits: Bit[] = [], x0 = 460, y0 = 44, floor = 372;
  let burst = 1;
  return {
    step(c, dt, _time, { ink, copper, dark }) {
      const hot = dark ? '#FFECCD' : ink;
      const sparkColour = (age: number) => {
        if (age < .22) return hot;
        return age < .4 && dark ? ink : copper;
      };
      if (random() < .06) burst = .3 + random() * 1.1;
      for (let i = Math.round((10 + random() * 16) * burst); i > 0; i--) {
        const angle = 1.57 + gauss() * 1.9, speed = 90 + random() * random() * 420;
        bits.push({ x: x0, y: y0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60, age: 0, life: .35 + random() * .95, size: 1 });
      }
      update(bits, dt, 620, (bit, px, py) => {
        if (bit.y > floor && !bit.hit) { bit.y = floor; bit.vy *= -.32; bit.vx *= .6; bit.hit = true; bit.life = Math.min(bit.life, bit.age + .25); }
        const age = bit.age / bit.life;
        stroke(c, [px, py, bit.x, bit.y], 1.6 - age * .9, sparkColour(age), (1 - age * age) * .95);
        return bit.y < floor + 3;
      });
      const radius = (18 + random() * 16 * burst) * (dark ? 2.4 : 1.1), glow = c.createRadialGradient(x0, y0, 0, x0, y0, radius);
      glow.addColorStop(0, hot);
      glow.addColorStop(.3, copper);
      glow.addColorStop(1, 'transparent');
      c.globalAlpha = dark ? .9 : .45;
      c.fillStyle = glow;
      c.fillRect(x0 - radius, y0 - radius, radius * 2, radius * 2);
    },
  };
}

/** A stream landing in what the still picture already holds: the grain's heap, the concrete in its form */
function stream(x0: number, floor: number, spread: number, size: number, count: number): Scene {
  const bits: Bit[] = [];
  return {
    step(c, dt, _time, { ink, copper }) {
      for (let i = 0; i < count; i++) bits.push({ x: x0 + gauss() * spread, y: -6 - random() * 30, vx: gauss() * 5, vy: 120 + random() * 60, age: 0, life: 3, size: size * (.6 + random() * .8) });
      update(bits, dt, 520, (bit, px, py) => {
        stroke(c, [px, py, bit.x, bit.y], bit.size, random() < .05 ? copper : ink, .85);
        return bit.y < floor;
      });
    },
  };
}

function rain(): Scene {
  const drops: Bit[] = [], splash: Bit[] = [], beads: Bit[] = [], fall: Bit[] = [], slope = (x: number) => 96 + (760 - x) * .33, eave = 170;
  return {
    still: '--scene-roof',
    step(c, dt, _time, { ink, copper }) {
      for (let i = 0; i < 3; i++) drops.push({ x: 40 + random() * 850, y: -30, vx: -150, vy: 580 + random() * 160, age: 0, life: 2, size: 12 + random() * 22 });
      update(drops, dt, 0, (bit) => {
        const x = bit.x, y = bit.y;
        stroke(c, [x, y, x + bit.size * .26, y - bit.size], .9, ink, Math.min(1, x / 150) * .55);
        if (x < eave - 2 || y < slope(x)) return y < 430;
        for (let i = 0; i < 3; i++) splash.push({ x, y, vx: gauss() * 70, vy: -30 - random() * 70, age: 0, life: .2 + random() * .2, size: 1 });
        if (random() < .35) beads.push({ x, y, vx: -100 - random() * 60, vy: 0, age: 0, life: 9, size: 1.2 });
        return false;
      });
      update(splash, dt, 500, (bit, px, py) => { stroke(c, [px, py, bit.x, bit.y], .8, ink, .7); return true; });
      update(beads, dt, 0, (bit, px, py) => {
        bit.y = slope(bit.x) - 1;
        stroke(c, [px, py, bit.x, bit.y], 1.6, ink, .8);
        if (bit.x > eave) return true;
        fall.push({ x: eave - 2, y: slope(eave), vx: 0, vy: 30, age: 0, life: 1.4, size: 1.6 });
        return false;
      });
      update(fall, dt, 620, (bit, px, py) => { stroke(c, [px, py, bit.x, bit.y + 3], bit.size, random() < .1 ? copper : ink, .9 - bit.age * .3); return bit.y < 430; });
    },
  };
}

/** A frame travels out of the depth of the bays towards the visitor */
function frames(): Scene {
  const vx = 490, vy = 220, loop = 6;
  return {
    step(c, _dt, time, { copper }) {
      const t = (time / loop) % 1, k = Math.pow(.74, 6 * (1 - t)), w = 530 * k, h = 256 * k, e = 100 * k, width = 17 * k, x = vx - w / 2, y = vy + h * .52, top = y - h, eave = top + e;
      c.globalAlpha = Math.sin(t * Math.PI) * .75;
      c.fillStyle = copper;
      c.beginPath();
      c.moveTo(x, y); c.lineTo(x, eave); c.lineTo(vx, top); c.lineTo(x + w, eave); c.lineTo(x + w, y); c.lineTo(x + w - width, y);
      c.lineTo(x + w - width, eave + width * .5); c.lineTo(vx, top + width * 1.25); c.lineTo(x + width, eave + width * .5); c.lineTo(x + width, y);
      c.closePath();
      c.fill();
    },
  };
}

/** The last beam of the stack, coming down on its slings and swaying a little */
function beam(): Scene {
  const w = 50, h = 58, web = 7, flange = 9, x0 = 317, top = 26, rest = 120;
  return {
    step(c, _dt, time, { copper }) {
      // it settles on the stack's lower row, beside the top one, and rises again; the sway dies as it comes to rest
      const down = (1 - Math.cos(time * .5)) / 2, x = x0 + Math.sin(time * .9) * 7 * (1 - down), y = top + (rest - top) * down, hook = x0 + 25;
      c.fillStyle = copper;
      c.strokeStyle = copper;
      c.globalAlpha = 1;
      c.beginPath();
      c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w, y + flange); c.lineTo(x + w / 2 + web / 2, y + flange); c.lineTo(x + w / 2 + web / 2, y + h - flange); c.lineTo(x + w, y + h - flange);
      c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.lineTo(x, y + h - flange); c.lineTo(x + w / 2 - web / 2, y + h - flange); c.lineTo(x + w / 2 - web / 2, y + flange); c.lineTo(x, y + flange);
      c.closePath();
      c.fill();
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x + 3, y); c.lineTo(x + 25, y - 30); c.lineTo(x + 47, y); c.moveTo(x + 25, y - 30); c.lineTo(hook, -6);
      c.stroke();
    },
  };
}

/** Two streams into one */
function streams(): Scene {
  const end = [430, 214], paths = [[[236, -14], [294, 170]], [[628, -14], [570, 170]]];
  const bits = Array.from({ length: 900 }, (_, i) => ({ side: i % 3, t: random(), jitter: gauss(), speed: .22 + random() * .12 }));
  const at = (a: number[], b: number[], t: number) => [(1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * b[0] + t * t * end[0], (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * b[1] + t * t * end[1]];
  return {
    step(c, dt, _time, { ink, copper }) {
      for (const bit of bits) {
        bit.t = (bit.t + bit.speed * dt) % 1;
        if (bit.side < 2) {
          const [x, y] = at(paths[bit.side][0], paths[bit.side][1], bit.t), w = 22 - bit.t * 12, X = x + bit.jitter * w, Y = y + bit.jitter * w * .3;
          stroke(c, [X, Y, X + 1.5, Y + 2], 1.7, bit.side ? copper : ink, .8);
        } else {
          const y = 214 + bit.t * 170, x = 430 + bit.jitter * (9 + bit.t * 6);
          stroke(c, [x, y, x + .6, y + 2.4], 1.9, bit.jitter > 0 ? copper : ink, .9 - bit.t * .3);
        }
      }
    },
  };
}

/** The hub: all five directions, each falling its own way */
function five(): Scene {
  const xs = [190, 300, 410, 520, 630], base = 380, bits: (Bit & { kind: number })[] = [];
  return {
    step(c, dt, _time, { ink, copper }) {
      for (let kind = 0; kind < 5; kind++) {
        if (random() < [.9, .7, .7, .7, .5][kind]) bits.push({ kind, x: xs[kind] + gauss() * [12, 10, 13, 34, 11][kind], y: -8, vx: kind === 3 ? gauss() * 12 : 0, vy: [150, 240, 170, 46, 560][kind] * (.8 + random() * .4), age: 0, life: 12, size: 1 });
      }
      update(bits as Bit[], dt, 0, (bit, px, py) => {
        const { kind } = bit as Bit & { kind: number };
        if (kind === 1) stroke(c, [px, py, bit.x, bit.y + 8], .9, copper, .85);
        else if (kind === 4) stroke(c, [px, py, bit.x, bit.y + 22], .9, ink, .7);
        else stroke(c, [px, py, bit.x + .4, bit.y + 1.6], kind === 2 ? 2.6 : 1.8, ink, kind === 3 ? .75 : .85);
        return bit.y < base;
      });
    },
  };
}

export const SCENES: Record<string, { make: () => Scene; replaces?: string }> = {
  '.metal-page > .cost-section': { make: sparks, replaces: '--scene' },
  '.concrete-page > .cost-section': { make: () => stream(470, 190, 12, 3.2, 3) },
  '.grain-page > .cost-section': { make: () => stream(327, 150, 11, 2, 3) },
  '.angary-page > .angary-cost': { make: frames },
  '.roofing-page > .direction-entry': { make: rain },
  '.process-page > .proc-terms': { make: beam },
  '.about-page > .team-about': { make: streams, replaces: '--scene' },
  '.directions-page > .dhow': { make: five, replaces: '--material' },
};
