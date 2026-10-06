import { describe, expect, it } from 'vitest';
import { homeProofContour } from '../../app/data/homeProofContour';
import { homeProofDetailSpots, homeProofFrame, memberAt } from '../../app/data/homeProofFrame';
import { approx, homeProofMarks, homeProofMeasures, plusMinus } from '../../app/data/homeProofMeasures';

// HOME's right-hand layers (04.10). Two different kinds of drawing sit on the one real photo, and these tests keep them
// apart:
//   the SCHEME (app/data/homeProofFrame.ts) — illustrative, a frame of this object's type fitted to the drawn silhouette:
//     it must stay inside that silhouette, under the rakes, on the same photo, and speak in words only — no marks,
//     sizes, places or firms from any drawing;
//   the FIGURES (app/data/homeProofMeasures.ts) — measured, scale-free: each one keeps its register record's value, and
//     its words come from that value through one formatter, always with «≈» and «±».

type Pt = readonly [number, number];
const NBSP = ' ';
/** The frozen register's records each figure rests on (PHOTO_GEOMETRY_REGISTER_CA_v1.0_FROZEN): kept here, not in the
 *  shipped data. PG011 is not among them: it is the eaves' height-difference test bound, not a ridge offset, so the
 *  page states no «ridge in the middle» (review, 04.10) */
const REGISTER = {
  slope: { records: ['PG006'], value: 10.52, u: 0.6 },
  gates: { records: ['PG012', 'PG013', 'PG014', 'PG015', 'PG016', 'PG017', 'PG018', 'PG019'] },
  proportion: { records: ['PG003'], ridge: 0.3154, u: 0.0029 },
} as const;
/** The laptop crop always keeps the photo's rows 84–644 (home-v2.css): the scheme and the load end above 644, and the
 *  snow's comb starts below 84 */
const FIRST_ROW = 84;
const LAST_ROW = 644;
/** A phone's close-up of the gable (home-v2.css, ≤ 760 px): the photo's columns 245–1504 and rows 90–736 */
const PHONE_COLUMNS = [245, 1504] as const;
const PHONE_FIRST_ROW = 90;

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
/** An open line's y at x (image y grows down) */
const polylineY = (line: readonly Pt[], x: number) => {
  const index = Math.max(1, line.findIndex(([at]) => at >= x));
  const [a, b] = [line[index - 1], line[index]];
  return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
};

/** Where two lines cross (each through two points) */
function crossing([[x1, y1], [x2, y2]]: readonly Pt[], [[x3, y3], [x4, y4]]: readonly Pt[]): Pt {
  const det = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  const [a, b] = [x1 * y2 - y1 * x2, x3 * y4 - y3 * x4];
  return [(a * (x3 - x4) - (x1 - x2) * b) / det, (a * (y3 - y4) - (y1 - y2) * b) / det];
}
/** How far a point stands off the line through two others */
const offLine = ([x, y]: Pt, [ax, ay]: Pt, [bx, by]: Pt) => Math.abs((x - ax) * (by - ay) - (y - ay) * (bx - ax)) / Math.hypot(bx - ax, by - ay);
const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];

describe('homeProofFrame — the scheme', () => {
  const { members, nodes, walls, tags, label, windLabel, load, wind } = homeProofFrame;

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
    // …and nothing below the rows a laptop keeps
    const all = [
      ...members.flatMap((member) => member.points), ...load.legs.flat(), ...load.links.flatMap((link) => link.points), ...load.ground.flat(),
      ...wind.gusts.flat(), ...wind.gustsWide.flat(), ...wind.lift.flat(), ...wind.links.flatMap((link) => link.points), ...wind.legs.flat(),
      ...wind.reactions.flat(),
    ];
    expect(Math.max(...all.map(([, y]) => y))).toBeLessThan(LAST_ROW - 4);
  });

  it('marks what stands behind the gable’s plane (drawn in copper, fainter with depth), and no support the type does not have', () => {
    expect(members.filter((member) => member.hidden).length).toBeGreaterThan(30);
    for (const member of members) {
      if (member.depth === 0 || member.group === 'footing') expect(member.hidden, member.group).toBeUndefined();
    }
    // the trusses behind the gable are hidden lines whole, chords and posts
    for (const member of members.filter((entry) => entry.group === 'truss' && entry.depth > 0)) expect(member.hidden).toBe(true);
    expect(members.map((member) => member.group as string)).not.toContain('support');
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

  it('runs a purlin from every node of the gable’s truss, bay by bay, straight back to the long wall’s vanishing point', () => {
    // The depth direction: where the long wall's base and top meet (the photo's own perspective)
    const [baseNear, baseFar, topFar, topNear] = walls.long;
    const vanishing = crossing([baseNear, baseFar], [topNear, topFar]);
    const purlins = members.filter((member) => member.group === 'purlin');
    expect(purlins).toHaveLength(nodes.length * 3);
    const fronts = purlins.filter((member) => member.depth === 0);
    // one from every node, starting on it (review, 04.10: they started off the nodes, a chord's depth away)
    expect(fronts.map((member) => member.points[0])).toEqual(nodes);
    for (const front of fronts) {
      const start = front.points[0];
      // each bay's piece starts where the one in front of it ends…
      const chain = [front];
      for (const depth of [1, 2] as const) {
        const next = purlins.filter((member) => member.depth === depth && same(member.points[0], chain.at(-1)!.points.at(-1)!));
        expect(next, `${start} ${depth}`).toHaveLength(1);
        chain.push(next[0]);
      }
      // …and every point of the chain lies on the line from its node to the vanishing point (tenths of a pixel), going
      // toward it
      const points = chain.flatMap((member) => member.points);
      for (const point of points) expect(offLine(point, start, vanishing), `${start}: ${point}`).toBeLessThan(0.15);
      const distances = points.map(([x, y]) => Math.hypot(x - vanishing[0], y - vanishing[1]));
      expect(distances).toEqual(distances.toSorted((a, b) => b - a));
    }
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
    const words = [...tags.map((tag) => tag.text), label, windLabel];
    for (const text of words) {
      expect(text, text).not.toMatch(/\d|Ф\s?\d|ВВ\d|КМ|АС\b|АР\b/);
      // no place (a settlement's or a street's abbreviation, a district) and no firm
      expect(text, text).not.toMatch(/(?:^|\s)[см]\.\s|вул\.|обл\.|район|склад|ТОВ|ФОП/i);
    }
    // the central row of columns and the aerated-concrete walls are the owner's memory of this building (04.10)
    expect(tags.map((tag) => tag.text)).toEqual(['Ферма', 'Прогони й в’язі', 'Центральний ряд колон', 'Стіни — газобетон', 'Фундаменти — умовно']);
    expect(label).toContain('центральний ряд колон');
    expect(label).toContain('такого типу, як на цьому об’єкті');
    expect(label).toContain('фундаменти — умовно');
    expect(label).toContain('Не креслення цього ангара');
    // the first version's middle support under the ridge was an adaptation, not the type (review, 04.10)
    expect(label).not.toMatch(/опор/);
    // with «Вітер» on, the scheme's name adds the wind's way in words, link by link as the legend writes it: the wall it
    // presses, the roof it lifts, the truss, the other wall and the column, the footings, the ground
    for (const words of ['Вітер тисне на бічну стіну', 'підіймає покрівлю', 'ферма передає його на другу стіну й колону', 'на фундаменти й ґрунт']) {
      expect(windLabel).toContain(words);
    }
    for (const tag of tags) expect(inSilhouette(tag.anchor) || baseY(tag.anchor[0]) < tag.anchor[1], tag.id).toBe(true);
  });

  it('sets its names in the frame’s free room: the truss’s in the sky over the right rake, the purlins’ and the walls’ on the right wall’s face, the column’s in the right gate’s opening, the footings’ on the ground under the base, each led from a member of its own', () => {
    const tag = (id: string) => tags.find((entry) => entry.id === id)!;
    // Where each stands and which way it runs from there (review, 05.10: the purlins' name off the sky, where it met the
    // slope's figure on a laptop, onto the right wall's face; the walls' and the column's lower, apart on a tablet)
    expect(Object.fromEntries(tags.map(({ id, at, align }) => [id, { at, align }]))).toEqual({
      truss: { at: [1352, 214], align: 'start' },
      bracing: { at: [1430, 398], align: 'end' },
      column: { at: [1042, 528], align: 'start' },
      wall: { at: [1430, 470], align: 'end' },
      footing: { at: [1446, 620], align: 'end' },
    });
    // the truss's over the right rake, right of the apex
    expect(tag('truss').at[0]).toBeGreaterThan(apex[0]);
    expect(tag('truss').at[1]).toBeLessThan(rakeY(tag('truss').at[0]));
    // the purlins' and the walls' on the right wall's face: right of the right gate, below every member that crosses the
    // face behind the gable (the depth bays' chords and wall tops end above row 360), above the base, ending short of the
    // right wall's section, the purlins' over the walls'
    const [, , gateHeadFar] = walls.holes[1];
    const deepest = Math.max(...members.filter((member) => member.depth > 0 && member.group !== 'footing' && member.group !== 'column').flatMap((member) => member.points.filter(([x]) => x > gateHeadFar[0]).map(([, y]) => y)));
    for (const id of ['bracing', 'wall']) {
      const [x, y] = tag(id).at;
      expect(x, id).toBeLessThan(walls.cuts[1][2][0]);
      expect(y, id).toBeGreaterThan(deepest + 20);
      expect(y, id).toBeLessThan(baseY(x) - 40);
    }
    expect(tag('wall').at[1] - tag('bracing').at[1]).toBeGreaterThanOrEqual(60);
    expect(tag('footing').at[1]).toBeGreaterThan(baseY(tag('footing').at[0]));
    // The right gate's opening holds no member of the gable's plane: the column's name starts at its left jamb, between
    // its head and its foot, and runs into it
    const [footNear, footFar, headFar, headNear] = walls.holes[1];
    const [x, y] = tag('column').at;
    const jambX = footNear[0] + ((headNear[0] - footNear[0]) * (y - footNear[1])) / (headNear[1] - footNear[1]);
    expect(Math.abs(x - jambX)).toBeLessThan(15);
    expect(y).toBeGreaterThan(Math.max(headNear[1], headFar[1]));
    expect(y).toBeLessThan(Math.min(footNear[1], footFar[1]));
    const inOpening = members.filter((member) => member.depth === 0 && member.points.some((point) => insidePolygon(point, walls.holes[1]) && distanceToPolygon(point, walls.holes[1]) > 2));
    expect(inOpening).toEqual([]);
    // the truss's leader starts on a node of the truss; the purlins' on the first bay's bracing, along its bottom chord
    expect(nodes.some((node) => same(node, tag('truss').anchor))).toBe(true);
    const onSegment = ([x, y]: Pt, [a, b]: readonly [Pt, Pt]) => {
      const t = ((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
      return t >= 0 && t <= 1 && Math.hypot(x - (a[0] + t * (b[0] - a[0])), y - (a[1] + t * (b[1] - a[1]))) < 0.5;
    };
    const bracing = members.filter((member) => member.group === 'bracing').flatMap((member) => member.points.slice(1).map((point, index): readonly [Pt, Pt] => [member.points[index], point]));
    expect(bracing.some((segment) => onSegment(tag('bracing').anchor, segment))).toBe(true);
    // the column's on the central column, the footings' on a footing in section
    const inside = (point: Pt, group: string) => members.some((member) => member.group === group && member.closed && insidePolygon(point, member.points));
    expect(inside(tag('column').anchor, 'column')).toBe(true);
    expect(inside(tag('footing').anchor, 'footing')).toBe(true);
  });

  it('runs the load from the ridge down both walls and the central column to below the ground', () => {
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

  it('blows the wind onto the right wall and lifts it off the roof, then takes it through the frame to the ground at every footing', () => {
    const { gusts, lift, links, legs, reactions } = wind;
    // The windward wall: the gable's right edge, from its base up to its top
    const [foot, top] = [walls.gable[1], walls.gable[2]];
    const faceX = (y: number) => foot[0] + ((top[0] - foot[0]) * (y - foot[1])) / (top[1] - foot[1]);
    expect(gusts.length).toBeGreaterThanOrEqual(3);
    for (const [from, to] of gusts) {
      // each blows onto the wall from the right, its head just off the face, the whole of it on the wall's height
      expect(to[0], String(to)).toBeLessThan(from[0]);
      expect(to[0] - faceX(to[1]), String(to)).toBeGreaterThan(0);
      expect(to[0] - faceX(to[1]), String(to)).toBeLessThan(8);
      expect(to[1]).toBeLessThan(foot[1]);
      expect(to[1]).toBeGreaterThan(top[1]);
    }
    // …16–26 px long, longer higher up, as wind grows with height — short enough that the tails stay in a phone's
    // close-up (review, 04.10: they ran off its right edge)
    const byHeight = gusts.toSorted((a, b) => b[1][1] - a[1][1]).map(([from, to]) => Math.hypot(from[0] - to[0], from[1] - to[1]));
    expect(byHeight).toEqual(byHeight.toSorted((a, b) => a - b));
    expect(byHeight[0]).toBeLessThan(byHeight.at(-1)!);
    for (const length of byHeight) {
      expect(length).toBeGreaterThanOrEqual(16);
      expect(length).toBeLessThanOrEqual(26);
    }
    // …and a long set where the frame has room for it (home-v2.css shows it above 760 px, the short one at or below):
    // one each on the same line onto the same head, 26–48 px long — tails 30–52 px off the wall — longer higher up, the
    // tails inside the photo, whose full width a laptop's crop keeps
    const { gustsWide } = wind;
    expect(gustsWide).toHaveLength(gusts.length);
    for (const [index, [from, to]] of gustsWide.entries()) {
      const [shortFrom, shortTo] = gusts[index];
      expect(to, String(to)).toEqual(shortTo);
      expect(offLine(shortFrom, to, from), String(from)).toBeLessThan(0.1);
      expect(from[0], String(from)).toBeGreaterThan(shortFrom[0]);
      expect(from[0], String(from)).toBeLessThanOrEqual(homeProofContour.photo.width);
    }
    const wideByHeight = gustsWide.toSorted((a, b) => b[1][1] - a[1][1]).map(([from, to]) => Math.hypot(from[0] - to[0], from[1] - to[1]));
    expect(wideByHeight).toEqual(wideByHeight.toSorted((a, b) => a - b));
    expect(wideByHeight[0]).toBeLessThan(wideByHeight.at(-1)!);
    for (const length of wideByHeight) {
      expect(length).toBeGreaterThanOrEqual(26);
      expect(length).toBeLessThanOrEqual(48);
    }
    // The lift: straight up off the roof, from just over it, on both slopes
    for (const [from, to] of lift) {
      expect(to[0]).toBe(from[0]);
      expect(to[1]).toBeLessThan(from[1]);
      expect(from[1]).toBeLessThan(rakeY(from[0]));
      expect(rakeY(from[0]) - from[1]).toBeLessThan(10);
      expect(to[1]).toBeGreaterThan(FIRST_ROW);
    }
    expect(lift.some(([from]) => from[0] < apex[0])).toBe(true);
    expect(lift.some(([from]) => from[0] > apex[0])).toBe(true);
    // Its way: the wall, the truss across, the other wall and the column, the footings — every link a member's line
    expect([...new Set(links.map((link) => link.link))]).toEqual([2, 3, 4, 5]);
    // two legs from one point on the windward wall, through the truss, down to below the ground at the column and at the
    // far wall
    expect(legs).toHaveLength(2);
    for (const leg of legs) {
      expect(same(leg[0], legs[0][0])).toBe(true);
      expect(Math.abs(leg[0][0] - faceX(leg[0][1]))).toBeLessThan(15);
      const end = leg.at(-1)!;
      expect(end[1]).toBeGreaterThan(baseY(end[0]));
    }
    const ends = legs.map((leg) => leg.at(-1)![0]).toSorted((a, b) => a - b);
    expect(ends[0]).toBeLessThan(400);
    expect(Math.abs(ends[1] - apex[0])).toBeLessThan(10);
    // The ground's answer: one inside each footing's section, tail and head, against the wind (to the right) — not on
    // the gravel beside it (review, 04.10)
    const pads = members.filter((member) => member.group === 'footing' && member.closed);
    expect(reactions).toHaveLength(pads.length);
    for (const [index, pad] of pads.entries()) {
      const within = reactions.filter(([from, to]) => insidePolygon(from, pad.points) && insidePolygon(to, pad.points));
      expect(within, `pad ${index}`).toHaveLength(1);
      const [[from, to]] = within;
      expect(to[0]).toBeGreaterThan(from[0]);
    }
    // All of it in a phone's close-up (its columns 245–1504, below its first row) and above the last row a laptop keeps
    const all = [...gusts.flat(), ...lift.flat(), ...links.flatMap((link) => link.points), ...legs.flat(), ...reactions.flat()];
    for (const [x, y] of all) {
      expect(x, `${x} ${y}`).toBeGreaterThanOrEqual(PHONE_COLUMNS[0]);
      expect(x, `${x} ${y}`).toBeLessThanOrEqual(PHONE_COLUMNS[1]);
      expect(y, `${x} ${y}`).toBeGreaterThan(PHONE_FIRST_ROW);
      expect(y, `${x} ${y}`).toBeLessThan(LAST_ROW);
    }
  });

  // Owner, 05.10: the snow reaches the frame at its nodes, through the purlins — an arrow over every top-chord node inside
  // the eaves, one on the ridge
  it('spreads the snow as a drawing writes a load: a comb of equal arrows over the top chord\'s nodes, one on the ridge, their tails on one line', () => {
    const { arrows, comb, roof } = load;
    // The strip's top edge (left eave, ridge, right eave) is the edge the load layer draws the snow settling on
    const edge = roof.slice(0, 3);
    const xs = arrows.map(([from]) => from[0]);
    expect(xs).toEqual(homeProofFrame.nodes.slice(1, -1).map(([x]) => x));
    expect(xs).toContain(homeProofFrame.nodes.find(([, y]) => y === Math.min(...homeProofFrame.nodes.map(([, ny]) => ny)))![0]);
    // one length, each straight down (the points are rounded to tenths of a pixel)
    const [length, gap] = [arrows[0][1][1] - arrows[0][0][1], polylineY(edge, xs[0]) - arrows[0][1][1]];
    for (const [from, to] of arrows) {
      expect(to[0], String(from)).toBe(from[0]);
      expect(to[1] - from[1], String(from)).toBeCloseTo(length, 1);
      // each head stands the same small way over the strip, inside its eaves
      expect(polylineY(edge, to[0]) - to[1], String(from)).toBeCloseTo(gap, 0);
    }
    expect(length).toBeGreaterThan(0);
    expect(gap).toBeGreaterThan(0);
    expect(xs[0]).toBeGreaterThan(edge[0][0]);
    expect(xs.at(-1)!).toBeLessThan(edge[2][0]);
    // one line from the first tail to the last, bent over the ridge, through every tail between
    expect(comb[0]).toEqual(arrows[0][0]);
    expect(comb.at(-1)).toEqual(arrows.at(-1)![0]);
    expect(comb).toHaveLength(3);
    expect(comb[1][0]).toBe(edge[1][0]);
    for (const [from] of arrows) expect(Math.abs(polylineY(comb, from[0]) - from[1]), String(from)).toBeLessThan(0.1);
    // …all of it below the rows a laptop crops off the sky
    for (const [, y] of [...comb, ...arrows.flat()]) expect(y).toBeGreaterThan(FIRST_ROW);
  });
});

describe('homeProofMeasures — the figures', () => {
  const byId = (id: string) => homeProofMeasures.find((measure) => measure.id === id)!;

  it('formats every figure one way: a sign, a no-break space, a decimal comma', () => {
    expect(approx(10.52)).toBe(`≈${NBSP}10,5`);
    expect(plusMinus(0.6)).toBe(`±${NBSP}0,6`);
    expect(approx(1 / 0.3154)).toBe(`≈${NBSP}3,2`);
  });

  it('keeps each figure’s register value and makes its words from it, the uncertainty in the figure itself', () => {
    expect(homeProofMeasures.map((measure) => measure.id)).toEqual(Object.keys(REGISTER));
    expect(byId('slope')).toMatchObject({ value: REGISTER.slope.value, u: REGISTER.slope.u });
    // one profile figure, its ± in the title and the chip — on every layer and on a phone
    expect(byId('slope').title).toBe(`Схил даху ${approx(10.52)}° ${plusMinus(0.6)}°`);
    expect(byId('slope').chip).toBe(`Схил ${approx(10.52)}° ${plusMinus(0.6)}°`);
    for (const text of [byId('slope').title, byId('slope').detail, byId('slope').spoken]) expect(text).not.toMatch(/обидва|скати/);
    expect(byId('proportion').value).toBeCloseTo(1 / REGISTER.proportion.ridge, 6);
    expect(byId('proportion').u).toBeCloseTo(REGISTER.proportion.u / REGISTER.proportion.ridge ** 2, 6);
    expect(byId('proportion').title).toBe(`Ширина торця ${approx(1 / 0.3154)} висоти`);
    expect(REGISTER.gates.records).toHaveLength(8);
    // No figure says the ridge is in the middle: the frozen shell assumes it, nobody measured it
    for (const measure of homeProofMeasures) expect(`${measure.title} ${measure.detail} ${measure.spoken}`).not.toMatch(/гребінь посередині|зсув/i);
  });

  it('writes no figure without its sign, no size and no register id', () => {
    for (const measure of homeProofMeasures) {
      for (const text of [measure.title, measure.detail, measure.chip ?? '']) {
        for (const match of text.matchAll(/\d+(?:,\d+)?/g)) {
          expect(text.slice(0, match.index), `${measure.id}: ${text}`).toMatch(/[≈±] $/);
        }
        expect(text).not.toMatch(/\d\.\d|PG\d|</);
        expect(text).not.toMatch(/\d\s*(?:мм|см|м|км|м²|кг|т)(?![а-яіїєґʼ’])|метр|відмітк/iu);
      }
      // what a screen reader hears says the figures in words, with the same signs' meaning
      for (const match of measure.spoken.matchAll(/\d+(?:,\d+)?/g)) {
        expect(measure.spoken.slice(0, match.index), measure.spoken).toMatch(/(?:приблизно|похибка) $/);
      }
    }
  });

  it('sets each figure in free room: the slope’s in the sky over the right rake on the scheme, the gates’ inside the right gate’s opening in «Контур», under its head’s «=» marks and clear of both jambs', () => {
    // Where each stands and which way it runs from there (review, 04.10: the slope's clear of the copper outline and the
    // purlins; the gates' backing covered the right jamb)
    expect(Object.fromEntries(homeProofMeasures.map(({ id, at, align, atContour, alignContour, onFrame }) => [id, { at, align, atContour, alignContour, onFrame }]))).toEqual({
      slope: { at: [1240, 128], align: 'end', atContour: [1318, 330], alignContour: 'middle', onFrame: true },
      gates: { at: [1135, 422], align: 'middle', atContour: [1135, 486], alignContour: 'middle', onFrame: false },
      proportion: { at: [1180, 614], align: 'middle', atContour: undefined, alignContour: undefined, onFrame: false },
    });
    // the slope's, right of the apex and over the drawn right rake
    const slope = byId('slope').at;
    expect(slope[0]).toBeGreaterThan(apex[0]);
    expect(slope[1]).toBeLessThan(rakeY(slope[0]));
    // the gates', in the right gate's opening, below its head's «=» marks and between their columns, as far from either
    // jamb (within a pixel)
    const [x, y] = byId('gates').atContour!;
    const [footNear, footFar, headFar, headNear] = homeProofFrame.walls.holes[1];
    expect(insidePolygon([x, y], homeProofFrame.walls.holes[1])).toBe(true);
    const jamb = (foot: Pt, head: Pt) => foot[0] + ((head[0] - foot[0]) * (y - foot[1])) / (head[1] - foot[1]);
    expect(Math.abs((x - jamb(footNear, headNear)) - (jamb(footFar, headFar) - x))).toBeLessThan(2);
    const marks = homeProofMarks.gates.slice(4, 6).flat();
    expect(x).toBeGreaterThan(Math.min(...marks.map(([markX]) => markX)));
    expect(x).toBeLessThan(Math.max(...marks.map(([markX]) => markX)));
    expect(y).toBeGreaterThan(Math.max(...marks.map(([, markY]) => markY)));
  });

  it('draws the ridge’s height to the drawn apex and the slope’s arc on the drawn right rake', () => {
    expect(homeProofMarks.height[1]).toEqual(apex);
    expect(homeProofMarks.slope.level[0]).toEqual(rightFoot);
    // the right rake is solid (measured): the slope is read on it, not on the dashed left one
    expect(homeProofContour.lines.find((entry) => entry.id === 'gable-rake-right')!.approximate).toBe(false);
  });
});

// «Жива схема» (owner, 05.10): what a pointer is over is named in words — never a size — from the scheme's own shapes,
// with the nearby node drawn as a detail, and nothing off the building
describe('memberAt', () => {
  it('names the member or the part under a point, in words', () => {
    const cases: [readonly [number, number], string][] = [
      [[1200, 216.3], 'Верхній пояс ферми'],
      [[1006, 450], 'Колона центрального ряду'],
      [[1100, 480], 'Ворота'],
      [[1007, 590], 'Фундамент — умовно'],
      [[1134, 250], 'Стійка ферми'],
      [[700, 160], 'Покрівля по прогонах'],
      [[600, 300], 'Стіна з газобетонних блоків'],
      [[290, 400], 'Стіна в розрізі — газобетон'],
      [[150, 480], 'Бічна стіна — газобетон'],
    ];
    for (const [at, name] of cases) expect(memberAt(at)?.name, at.join()).toBe(name);
  });
  it('says no figure, and nothing off the building', () => {
    for (let x = 0; x < 1536; x += 37) {
      for (let y = 0; y < 788; y += 29) expect(memberAt([x, y])?.name ?? '', `${x},${y}`).not.toMatch(/\d/);
    }
    expect(memberAt([850, 650])).toBeNull();
    expect(memberAt([1520, 60])).toBeNull();
  });
  it('points to the node drawn as a detail where one is near', () => {
    for (const { id, ring } of homeProofDetailSpots) expect(memberAt(ring)?.node, id).toBe(id);
  });
});
