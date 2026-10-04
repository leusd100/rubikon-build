import { describe, expect, it } from 'vitest';
import { homeProofContour } from '../../app/data/homeProofContour';
import { homeProofFrame } from '../../app/data/homeProofFrame';
import { approx, below, homeProofMarks, homeProofMeasures, plusMinus } from '../../app/data/homeProofMeasures';

// HOME's right-hand layers (04.10). Two different kinds of drawing sit on the one real photo, and these tests keep them
// apart:
//   the SCHEME (app/data/homeProofFrame.ts) — illustrative, a frame of this object's type fitted to the drawn silhouette:
//     it must stay inside that silhouette, under the rakes, on the same photo, and speak in words only — no marks,
//     sizes, places or firms from any drawing;
//   the FIGURES (app/data/homeProofMeasures.ts) — measured, scale-free: each one keeps its register record and value,
//     and its words come from that value through one formatter, always with «≈», «±» or «<».

type Pt = readonly [number, number];
const NBSP = ' ';

const line = (id: string) => homeProofContour.lines.find((entry) => entry.id === id)!.points;
const apex = line('gable-rake-right')[0];
const rightFoot = line('gable-rake-right')[1];
const leftFoot = line('gable-rake-left')[2];
/** The drawn rakes' y at x (image y grows down) */
const rakeY = (x: number) => {
  const [a, b] = x <= apex[0] ? [leftFoot, apex] : [apex, rightFoot];
  return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
};
/** The base the footings hang under: the gable's base line, and the long wall's to its left */
const baseY = (x: number) => {
  const [right, left] = line('gable-base');
  const far = homeProofFrame.silhouette[1][3];
  const [a, b] = x >= left[0] ? [left, right] : [far, left];
  return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
};

function insidePolygon([x, y]: Pt, polygon: readonly Pt[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function distanceToPolygon([x, y]: Pt, polygon: readonly Pt[]) {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [ax, ay] = polygon[j];
    const [bx, by] = polygon[i];
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
    best = Math.min(best, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
  }
  return best;
}
const inSilhouette = (point: Pt) =>
  homeProofFrame.silhouette.some((outline) => insidePolygon(point, outline) || distanceToPolygon(point, outline) <= 1.5);

describe('homeProofFrame — the scheme', () => {
  const { members, nodes, walls, tags, label, load } = homeProofFrame;

  it('is drawn on the contour’s own photo and says it is illustrative', () => {
    expect(homeProofFrame.photoSha256).toBe(homeProofContour.photo.sha256);
    expect(homeProofFrame.status).toBe('illustrative');
  });

  it('clips to the gable the page draws: its first outline is the contour’s outline, point for point', () => {
    const outline = homeProofContour.lines.filter((entry) => entry.kind === 'outline').flatMap((entry) => entry.points);
    for (const point of homeProofFrame.silhouette[0]) {
      expect(outline.some(([x, y]) => x === point[0] && y === point[1]), String(point)).toBe(true);
    }
  });

  it('keeps every member inside the drawn silhouette, and the footings in a band under the base', () => {
    for (const member of members) {
      for (const point of member.points) {
        if (member.group === 'footing') {
          const depth = point[1] - baseY(point[0]);
          expect(depth, `footing ${point}`).toBeGreaterThan(0);
          expect(depth, `footing ${point}`).toBeLessThan(110);
        } else {
          expect(inSilhouette(point), `${member.group} ${point}`).toBe(true);
        }
      }
    }
    for (const point of [...nodes, ...walls.gable, ...walls.long]) expect(inSilhouette(point), String(point)).toBe(true);
  });

  it('hangs the gable’s truss under the drawn rakes, its ridge under the drawn apex', () => {
    const front = members.filter((member) => member.depth === 0 && (member.group === 'truss' || member.group === 'web'));
    expect(front.length).toBeGreaterThan(30);
    for (const member of front) {
      for (const [x, y] of member.points) expect(y, `${x}`).toBeGreaterThanOrEqual(rakeY(x) - 0.5);
    }
    const ridge = members.find((member) => member.group === 'truss' && member.depth === 0 && member.points.length === 3)!.points[1];
    expect(Math.abs(ridge[0] - apex[0])).toBeLessThan(1);
    // A vertical at every panel point and one diagonal per panel: the type, eight panels a half
    expect(members.filter((member) => member.group === 'web' && member.depth === 0)).toHaveLength(31);
  });

  it('cuts both gates out of the hatched wall exactly where the contour draws them', () => {
    for (const [index, id] of (['gate-left', 'gate-right'] as const).entries()) {
      const gate = line(id);
      for (const point of walls.holes[index]) {
        expect(Math.min(...gate.map(([x, y]) => Math.hypot(x - point[0], y - point[1]))), `${id} ${point}`).toBeLessThan(0.5);
      }
    }
  });

  it('names its parts in words only — no marks, sizes, places or firms from any drawing', () => {
    const words = [...tags.map((tag) => tag.text), label];
    for (const text of words) {
      expect(text, text).not.toMatch(/\d|Ф\s?\d|ВВ\d|КМ|АС\b|АР\b/);
      // no place (a settlement's or a street's abbreviation, a district) and no firm
      expect(text, text).not.toMatch(/(?:^|\s)[см]\.\s|вул\.|обл\.|район|склад|ТОВ|ФОП/i);
      expect(text, text).not.toMatch(/колон/i);
    }
    expect(tags.map((tag) => tag.text)).toEqual(['Ферма', 'Прогони й в’язі', 'Несуча стіна', 'Середня опора', 'Фундаменти — умовно']);
    expect(label).toContain('такого типу, як на цьому об’єкті');
    expect(label).toContain('Не креслення цього ангара');
    for (const tag of tags) expect(inSilhouette(tag.anchor) || baseY(tag.anchor[0]) < tag.anchor[1], tag.id).toBe(true);
  });

  it('runs the load from the ridge down three legs to below the ground', () => {
    expect(load.legs).toHaveLength(3);
    for (const leg of load.legs) {
      expect(Math.hypot(leg[0][0] - load.legs[0][0][0], leg[0][1] - load.legs[0][0][1])).toBeLessThan(0.5);
      const end = leg.at(-1)!;
      expect(end[1]).toBeGreaterThan(baseY(end[0]));
    }
    expect(new Set(load.links.map((link) => link.link))).toEqual(new Set([3, 4, 5]));
    // the snow falls in the sky, above the drawn roof
    for (const [from, to] of load.arrows) {
      expect(from[1]).toBeLessThan(rakeY(from[0]));
      expect(to[1]).toBeLessThan(rakeY(to[0]));
    }
  });
});

describe('homeProofMeasures — the figures', () => {
  const byId = (id: string) => homeProofMeasures.find((measure) => measure.id === id)!;

  it('formats every figure one way: a sign, a no-break space, a decimal comma', () => {
    expect(approx(10.52)).toBe(`≈${NBSP}10,5`);
    expect(plusMinus(0.6)).toBe(`±${NBSP}0,6`);
    expect(below(0.006)).toBe(`<${NBSP}1${NBSP}%`);
    expect(approx(1 / 0.3154)).toBe(`≈${NBSP}3,2`);
  });

  it('keeps each figure’s register record and value, never rendered, and makes its words from them', () => {
    expect(byId('slope')).toMatchObject({ source: ['PG006'], value: 10.52, u: 0.6 });
    expect(byId('slope').title).toBe(`Схил даху ${approx(10.52)}°`);
    expect(byId('slope').detail).toContain(`${plusMinus(0.6)}°`);
    expect(byId('ridge')).toMatchObject({ source: ['PG011'], value: 0.006 });
    expect(byId('ridge').detail).toContain(below(0.006));
    expect(byId('proportion')).toMatchObject({ source: ['PG003'] });
    expect(byId('proportion').value).toBeCloseTo(1 / 0.3154, 6);
    expect(byId('proportion').title).toBe(`Ширина торця ${approx(1 / 0.3154)} висоти`);
    expect(byId('gates').source).toEqual(['PG012', 'PG013', 'PG014', 'PG015', 'PG016', 'PG017', 'PG018', 'PG019']);
  });

  it('writes no figure without its sign, no size and no register id', () => {
    for (const measure of homeProofMeasures) {
      for (const text of [measure.title, measure.detail, measure.chip ?? '']) {
        for (const match of text.matchAll(/\d+(?:,\d+)?/g)) {
          expect(text.slice(0, match.index), `${measure.id}: ${text}`).toMatch(/[≈±<] $/);
        }
        expect(text).not.toMatch(/\d\.\d|PG\d/);
        expect(text).not.toMatch(/\d\s*(?:мм|см|м|км|м²|кг|т)(?![а-яіїєґʼ’])|метр|відмітк/iu);
      }
      // what a screen reader hears says the figures in words, with the same signs' meaning
      for (const match of measure.spoken.matchAll(/\d+(?:,\d+)?/g)) {
        expect(measure.spoken.slice(0, match.index), measure.spoken).toMatch(/(?:приблизно|похибка|менше) $/);
      }
    }
  });

  it('draws the ridge’s axis through the drawn apex and the slope’s arc on the drawn right rake', () => {
    expect(homeProofMarks.height[1]).toEqual(apex);
    expect(homeProofMarks.slope.level[0]).toEqual(rightFoot);
    // the right rake is solid (measured): the slope is read on it, not on the dashed left one
    expect(homeProofContour.lines.find((entry) => entry.id === 'gable-rake-right')!.approximate).toBe(false);
  });
});
