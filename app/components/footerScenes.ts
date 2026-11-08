// The footer's last word on three pages (owner 08.11, «Один раз і застигає»): the page's own scene plays once on the
// embossed RUBIKON as the footer comes up, about five seconds, and leaves its trace — rain beads that catch the light, a
// weld seam cooled to copper, letters cast in concrete. Only where the scene means something on the word itself; the
// other pages keep the light alone (FooterSignatureLife.tsx). Nothing covers the word or hangs over it. The scenes draw
// into two canvases, behind the word (concrete, so the relief and the light stay on top of it) and in front of it.

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
  /** True once nothing is left to move: the loop stops and the last frame stays as the footer's still */
  done: (time: number) => boolean;
  /** Where the welding arc is, in viewBox units, while it burns: the signature's light stands there */
  arc?: [number, number] | null;
  /** The light's place in canvas px, given each frame: what the trace catches (rain beads) */
  lamp?: [number, number] | null;
};

const INK = '#BDB7AC';
const COPPER = '#B76432';
const HOT = '#FFECCD';
const SPRAY = '#E2DCD0';

// Decoration, so a plain linear generator, as liveScenes.ts: nothing here is a secret (Sonar S2245)
let seed = 23;
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const gauss = () => (random() + random() + random() + random() - 2) / 2;

type Bit = { x: number; y: number; vx: number; vy: number; age: number; life: number };

const stroke = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, width: number, colour: string, alpha: number) => {
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

/** How long each scene acts before it settles, s */
export const RAIN_FOR = 5;
export const WELD_FOR = 5;
export const POUR_FOR = 4.5;

/** Roofing: a short rain on the letters' tops; the beads it leaves glint when the light passes */
export function rain(g: WordGeometry): FooterScene {
  const drops: (Bit & { length: number })[] = [], spray: Bit[] = [], runs: (Bit & { falling: boolean })[] = [];
  const beads: { x: number; y: number; r: number }[] = [];
  const scene: FooterScene = {
    front(c, dt, time) {
      // up in .4 s, steady, then easing off over the last 1.2 s
      const rate = time < .4 ? time / .4 : Math.max(0, Math.min(1, (RAIN_FOR - time) / 1.2));
      for (let i = 0; i < 3; i++) if (random() < rate) drops.push({ x: random() * (g.width + 120), y: -20, vx: -90, vy: 620 + random() * 160, age: 0, life: 3, length: 10 + random() * 18 });
      update(drops, dt, 0, (drop) => {
        stroke(c, drop.x, drop.y, drop.x + drop.length * .15, drop.y - drop.length, .9, INK, .3);
        const top = g.surface(drop.x);
        if (drop.y < top) return drop.y < g.height;
        if (top >= g.height) return false;
        for (let i = 0; i < 3; i++) spray.push({ x: drop.x, y: top, vx: gauss() * 60, vy: -40 - random() * 70, age: 0, life: .3 });
        if (random() < .25) runs.push({ x: drop.x, y: top, vx: (random() < .5 ? -1 : 1) * (30 + random() * 30), vy: 0, age: 0, life: 1.6, falling: false });
        if (beads.length < 170 && random() < .45) beads.push({ x: drop.x + gauss() * 2, y: top - .8, r: .7 + random() * .9 });
        return false;
      });
      update(spray, dt, 520, (bit, px, py) => {
        stroke(c, px, py, bit.x, bit.y, .8, SPRAY, .7);
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
        stroke(c, px, py, run.x, run.y + (run.falling ? 4 : 0), 1.6, run.falling ? INK : SPRAY, .85);
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
    done: (time) => time > RAIN_FOR + .4 && !drops.length && !spray.length && !runs.length,
  };
  return scene;
}

/** Metal: one weld along the top of the word; the arc carries the light, and the seam cools to a copper line */
export function weld(g: WordGeometry): FooterScene {
  const sparks: (Bit & { landed: boolean })[] = [], seam: { x: number; y: number; at: number }[] = [];
  let x = 0, burst = 1, lastX = -9, burning = true;
  const scene: FooterScene = {
    arc: null,
    front(c, dt, time) {
      if (burning) {
        x += (dt * g.width) / WELD_FOR;
        while (g.surface(x) >= g.height && x < g.width) x += 2;
        if (x >= g.width) burning = false;
      }
      if (burning) {
        const y = g.surface(x) - 1;
        scene.arc = [521 + x / g.scale, 140 + (y - 6 - g.wordTop) / g.scale];
        if (random() < .06) burst = .3 + random() * 1.1;
        for (let i = Math.round((6 + random() * 10) * burst); i > 0; i--) {
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
      } else scene.arc = null;
      update(sparks, dt, 620, (spark, px, py) => {
        const top = g.surface(spark.x);
        if (spark.vy > 0 && spark.y > top && !spark.landed) {
          spark.y = top;
          spark.vy *= -.3;
          spark.vx *= .6;
          spark.landed = true;
          spark.life = Math.min(spark.life, spark.age + .25);
        }
        const age = spark.age / spark.life;
        let colour = COPPER;
        if (age < .22) colour = HOT;
        else if (age < .4) colour = INK;
        stroke(c, px, py, spark.x, spark.y, 1.5 - age * .8, colour, (1 - age * age) * .95);
        return spark.y < g.height + 4;
      });
      // white, red, copper, then a quiet copper bead
      for (let i = 1; i < seam.length; i++) {
        const a = seam[i - 1], b = seam[i];
        if (b.x - a.x > 5 || Math.abs(b.y - a.y) > 3) continue;
        const age = time - b.at;
        let colour = COPPER;
        if (age < .35) colour = HOT;
        else if (age < 1.2) colour = '#E0703A';
        stroke(c, a.x, a.y, b.x, b.y, age < 1.2 ? 2.2 : 1.6, colour, age < 1.2 ? 1 : Math.max(.55, 1 - (age - 1.2) * .25));
      }
    },
    // the seam goes on cooling for 1.6 s after the arc is out
    done: (time) => !burning && !sparks.length && seam.every((point) => time - point.at > 2.8),
  };
  return scene;
}

/** Concrete: the letters are a form, poured once from above; they stay cast, behind the relief and its light */
export function pour(g: WordGeometry): FooterScene {
  return {
    back(c, _dt, time) {
      const fill = Math.min(1, time / POUR_FOR), level = g.height - fill * (g.height - g.wordTop);
      if (!g.word) return;
      c.save();
      c.clip(g.word);
      const tone = c.createLinearGradient(0, g.wordTop, 0, g.height);
      tone.addColorStop(0, '#6E6B65');
      tone.addColorStop(1, '#4E4C47');
      c.globalAlpha = .95;
      c.fillStyle = tone;
      c.fillRect(0, level, g.width, g.height - level);
      // the aggregate: fixed specks, so the still face does not shimmer
      c.globalAlpha = .35;
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
          stroke(c, x + gauss() * 2, y, x + gauss() * 2, y + 14, 3, '#77736C', .85);
        }
      }
    },
    done: (time) => time > POUR_FOR,
  };
}

/** The page a scene belongs to: its <main> class (DirectionPageConfig.pageClassName) */
export const FOOTER_SCENES: Record<string, (g: WordGeometry) => FooterScene> = {
  'roofing-page': rain,
  'metal-page': weld,
  'concrete-page': pour,
};
