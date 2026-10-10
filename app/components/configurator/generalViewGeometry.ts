import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import { formatNumber } from '../../lib/configurator/formatNumber';
import {
  buildParametricModel, deriveBayLayout, ridgeHeightM, roofPurlinPositionsM, trussPanelNodesM,
} from '../../lib/configurator/parametricModel';
import type { CladdingSystem } from '../../lib/configurator/types';
import {
  AX, DIR, crosses, overlaps, roofHeight, roofMembersAt, union, unit, type Box, type P3, type Pt, type Segment,
} from '../angary/dimetric';
import { endWallFraming, sheetOpenings } from '../angary/endWallFraming';

// «Загальний вигляд» on /angary's configurator sheet, redrawn in the frame drawing's language (10.10, owner: «Каркас»
// «виглядає на голову вище» — the old view was semi-transparent grey cladding with dozens of profile and truss lines
// showing through, so everything blended). The clad hangar as a line drawing in the frame drawing's dimetric
// (dimetric.ts): the walls and the roof opaque, planes in the field's colour outlined in the paper's ink — the front end
// wall in the heaviest line, as «Каркас» draws its front frame — the cladding told by its own pattern, lightly: a
// profiled sheet's ribs upright on the walls and down the roof's slope, a sandwich panel's joints across the walls. No
// frame through the cladding. The building whole, however long: the dimetric halves the length, so even 120 m reads.
//
// Laid out in screen pixels for the box it is shown in (HangarGeneralView measures it): the lines, the sizes' type and
// the gaps keep one size on screen whatever the hangar's size or the sheet's, as a drafted sheet letters every drawing
// one height — and the picture keeps clear of what lies on it (the «Подивитися в 3D» chip, a phone's legend glyphs).
// Pure: the configurator's domain model in, paths and labels out.

/** What the view is laid out for: the drawing's content box in CSS px, whether its sizes are shown (the phone's mini
 *  drawing hides them), and the boxes on the picture it keeps clear of, in the content box's px */
export type GeneralViewFrame = Readonly<{ width: number; height: number; annotated: boolean; keepClear: readonly Box[] }>;

export type SizeKey = 'width' | 'length' | 'height' | 'ridge';
export type SizeLabel = { key: SizeKey; text: string; x: number; y: number; size: number };

export type GeneralView = {
  viewBox: string;
  /** The four faces the camera sees, closed, filled in the field's colour */
  planes: string;
  /** The front end wall's outline (the heaviest line), the other visible edges, and the edges of a surface out of the
   *  request (dashed) */
  front: string;
  edges: string;
  out: string;
  walls: { system: CladdingSystem; d: string } | null;
  roof: { system: CladdingSystem; d: string } | null;
  /** The gates and the door, closed rectangles: a darker leaf in an outline */
  openings: string;
  /** The frame where a surface is not clad: the front frame (heaviest), the frames behind, the thin members, bracing */
  frame: { front: string; back: string; thin: string; brace: string } | null;
  ground: string;
  hatch: string;
  /** The sizes: each one's lines (extension lines, dimension line, ticks — or the ridge's leader) and its value */
  sizes: { key: SizeKey; d: string; dot?: Pt; label: SizeLabel }[];
};

const n = (value: number) => value.toFixed(1);
const metres = (value: number) => `${formatNumber(value)} м`;

/** Where the sizes stand, in px: the dimension line off what it measures, its extension lines from a little off the
 *  object to a little past the line, the 45° ticks, the value off the line */
const DIM_GAP = 26;
const EXT_FROM = 5;
const EXT_PAST = 6;
const TICK = 5;
const LABEL_GAP = 6;
/** …and on a phone's narrow drawing, closer: there the sizes took a third of the drawing's width */
const DIM_GAP_SMALL = 18;
const LABEL_GAP_SMALL = 4;
/** The ground line runs this far past the building's ends; its hatch strokes, their spacing along it */
const GROUND_PAST = 18;
const HATCH = 5;
const HATCH_EVERY = 9;
/** The cladding's pattern stays apart on screen: a profiled sheet's ribs at least this far apart where the building's
 *  length foreshortens them, a sandwich panel's joints at least this far — schematic spacing, never a sheet's real pitch
 *  (claddingLines.ts kept to about forty along the longest side; on screen is what decides whether they read) */
const RIB_PX = 7;
const JOINT_PX = 7;
const NICE_STEPS = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12] as const;
const niceStep = (atLeast: number) => NICE_STEPS.find((step) => step >= atLeast - 1e-9) ?? NICE_STEPS.at(-1)!;
/** A sandwich panel's cover width, m (claddingLines.ts PANEL_WIDTH_M): its joints are whole panels apart */
const PANEL_M = 1;
/** Room left round the drawing in its box, px */
const PAD = 6;

/** A value's width in Manrope 600: figures ~0.6 em, the space and the comma narrower, «м» wider */
const textWidth = (text: string, size: number) => [...text].reduce((sum, ch) => {
  if (ch === ' ' || ch === ' ' || ch === ',') return sum + size * 0.3;
  if (ch === 'м') return sum + size * 0.72;
  return sum + size * 0.62;
}, 0);
/** A value's height for keeping clear: its figures' cap height and a little */
const textHeight = (size: number) => size * 0.78;

const add = ([x, y]: Pt, [dx, dy]: Pt, by = 1): Pt => [x + dx * by, y + dy * by];
const norm = ([x, y]: Pt): Pt => { const length = Math.hypot(x, y) || 1; return [x / length, y / length]; };
const pathOf = (points: readonly Pt[], close = false) => `M${points.map(([x, y]) => `${n(x)},${n(y)}`).join('L')}${close ? 'Z' : ''}`;

/** Unit directions on the sheet: along the span (x) and along the building (d) */
const UX = norm(AX);
const UD = norm(DIR);

/** Stations strictly inside (0, span), every `step` from 0 */
function stations(span: number, step: number): number[] {
  const out: number[] = [];
  for (let at = step; at < span - step / 4; at += step) out.push(Math.round(at * 1000) / 1000);
  return out;
}

/** [from, to] less the ranges taken */
function free([from, to]: readonly [number, number], taken: readonly (readonly [number, number])[]): [number, number][] {
  let ranges: [number, number][] = [[from, to]];
  for (const [a, b] of taken) {
    ranges = ranges.flatMap(([x, y]): [number, number][] => {
      if (b <= x || a >= y) return [[x, y]];
      return ([[x, Math.min(a, y)], [Math.max(b, x), y]] as [number, number][]).filter(([p, q]) => q - p > 1e-6);
    });
  }
  return ranges;
}

/** Whether a point lies inside a convex polygon (either winding) */
function inside([px, py]: Pt, polygon: readonly Pt[]) {
  let sign = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const [ax, ay] = polygon[index];
    const [bx, by] = polygon[(index + 1) % polygon.length];
    const cross = Math.sign((bx - ax) * (py - ay) - (by - ay) * (px - ax));
    if (cross === 0) continue;
    if (sign === 0) sign = cross;
    else if (cross !== sign) return false;
  }
  return true;
}

/** Whether a convex polygon and a box meet */
function polygonMeets(polygon: readonly Pt[], box: Box) {
  if (polygon.some(([x, y]) => x > box[0] && x < box[2] && y > box[1] && y < box[3])) return true;
  const corners: Pt[] = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
  if (corners.some((corner) => inside(corner, polygon))) return true;
  return polygon.some((point, index) => crosses([point, polygon[(index + 1) % polygon.length]], box));
}

const shiftBox = (box: Box, [dx, dy]: Pt): Box => [box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy];

export function generalViewGeometry(domain: HangarDomainModel, frame: GeneralViewFrame): GeneralView {
  const { widthM: W, lengthM: L, eaveHeightM: E } = domain.dimensions;
  const R = ridgeHeightM(W, E, domain.roof.pitchDeg);
  const roofZ = roofHeight(W, E, R);
  const { scope, envelope } = domain;
  const model = buildParametricModel(domain);
  // The configurator's gates and door on the near end wall, as «Каркас» and the 3D place them — none without walls
  const openings = sheetOpenings(model.openings, W, scope.walls);
  const small = frame.width < 480;
  const type = { value: small ? 13 : 15, ridge: small ? 12 : 13.5 };
  const [gap, labelGap] = small ? [DIM_GAP_SMALL, LABEL_GAP_SMALL] : [DIM_GAP, LABEL_GAP];

  // ── the layout's key points at a scale k (px a metre) and an origin O: the silhouette, the sizes' lines and values —
  //    all the fit needs; the cladding's pattern stays inside the silhouette ──
  const layoutAt = (k: number, O: Pt) => {
    const P = (point: P3): Pt => { const [u, v] = unit(point); return [O[0] + u * k, O[1] + v * k]; };
    const silhouette: Pt[] = ([[0, 0, 0], [W, 0, 0], [W, L, 0], [W, L, E], [W / 2, L, R], [0, L, E], [0, 0, E]] as P3[]).map(P);
    const ground: Pt[] = [add(P([0, 0, 0]), UX, -GROUND_PAST), P([0, 0, 0]), P([W, 0, 0]), P([W, L, 0]), add(P([W, L, 0]), UD, GROUND_PAST)];
    const sizes: { key: SizeKey; segments: Segment[]; ticks: Pt[]; label: SizeLabel; box: Box; tick: Pt; dot?: Pt }[] = [];
    if (frame.annotated) {
      /** A size measured from a to b, its dimension line off the object along `out` (a unit vector on the sheet); `tick`
       *  the 45° tick's direction in the dimension's own plane, in sheet space */
      const dimension = (key: SizeKey, a: Pt, b: Pt, out: Pt, tick3: P3, value: number) => {
        const [la, lb] = [add(a, out, gap), add(b, out, gap)];
        const along = norm([lb[0] - la[0], lb[1] - la[1]]);
        // the line's normal on the side it stands off to: its value goes there, at the line's middle
        let normal: Pt = [-along[1], along[0]];
        if (normal[0] * out[0] + normal[1] * out[1] < 0) normal = [-normal[0], -normal[1]];
        const text = metres(value);
        const [w, h] = [textWidth(text, type.value), textHeight(type.value)];
        const support = Math.abs(normal[0]) * (w / 2) + Math.abs(normal[1]) * (h / 2);
        const mid: Pt = [(la[0] + lb[0]) / 2, (la[1] + lb[1]) / 2];
        const [cx, cy] = add(mid, normal, labelGap + support);
        // The tick at 45° to the line in the dimension's own plane — the line's direction less the way it stands off: on
        // the width and the height the «/» of «Каркас»; on the length, which runs at 41° on the sheet, the same «/» lay
        // along the line and vanished (as «Каркас»'s a did, until 10.10)
        const tick = norm(unit(tick3));
        sizes.push({
          key,
          segments: [[la, lb], [add(a, out, EXT_FROM), add(a, out, gap + EXT_PAST)], [add(b, out, EXT_FROM), add(b, out, gap + EXT_PAST)]],
          ticks: [la, lb],
          tick,
          label: { key, text, x: cx, y: cy, size: type.value },
          box: [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2],
        });
      };
      // the width along the front, under it; the length along the side, out from it on the ground; the wall's height at
      // the near corner, left of it — as L, a and H on «Каркас»
      dimension('width', P([0, 0, 0]), P([W, 0, 0]), [0, 1], [1, 0, 1], W);
      dimension('length', P([W, 0, 0]), P([W, L, 0]), UX, [-1, 1, 0], L);
      dimension('height', P([0, 0, 0]), P([0, 0, E]), [-UX[0], -UX[1]], [1, 0, 1], E);
      // The ridge: a small note at the gable's apex on a short leader — up and to the left, over the near slope, clear of
      // the ridge line — the value on its shelf (10.10, owner: the old dashed chain at the corner and its dashed line from
      // the apex were «зайвий артефакт»). Of a few leaders, the first whose note keeps clear of the other sizes.
      const apex = P([W / 2, 0, R]);
      const text = metres(R);
      const [w, h] = [textWidth(text, type.ridge), textHeight(type.ridge)];
      const taken = sizes.map((size) => size.box);
      const lines = sizes.flatMap((size) => size.segments);
      const ridgeAt = ([dx, dy]: Pt) => {
        const elbow = add(apex, [dx, dy]);
        const shelfEnd = add(elbow, [-(w + 8), 0]);
        const label: SizeLabel = { key: 'ridge', text, x: (elbow[0] + shelfEnd[0]) / 2, y: elbow[1] - 3 - h / 2, size: type.ridge };
        const box: Box = [shelfEnd[0], elbow[1] - 3 - h, elbow[0], elbow[1]];
        return { label, box, segments: [[apex, elbow], [elbow, shelfEnd]] as Segment[] };
      };
      const ways: Pt[] = [[-12, -18], [-18, -28], [-26, -40], [-8, -44]];
      const ridge = ways.map(ridgeAt).find((way) => !taken.some((box) => overlaps(box, way.box)) && !lines.some((segment) => crosses(segment, way.box)))
        ?? ridgeAt(ways[0]);
      sizes.push({ key: 'ridge', segments: ridge.segments, ticks: [], tick: [0, 0], label: ridge.label, box: ridge.box, dot: apex });
    }
    const points = [...silhouette, ...ground, ...sizes.flatMap((size) => size.segments.flat())];
    const extent = union([
      union(points.map(([x, y]) => [x, y, x, y] as Box)),
      ...sizes.map((size) => size.box),
      // the ground's hatch under its line
      [ground[0][0] - HATCH, ground[0][1], ground[0][0], ground[0][1] + HATCH],
    ]);
    return { P, silhouette, ground, sizes, extent };
  };

  // ── the fit: the largest scale that holds the drawing in its box, centred; then clear of what lies on the picture ──
  const area: Box = [PAD, PAD, Math.max(frame.width - PAD, PAD + 1), Math.max(frame.height - PAD, PAD + 1)];
  const [areaW, areaH] = [area[2] - area[0], area[3] - area[1]];
  const fits = (k: number) => {
    const { extent } = layoutAt(k, [0, 0]);
    return extent[2] - extent[0] <= areaW && extent[3] - extent[1] <= areaH;
  };
  let [low, high] = [0.05, 400];
  for (let pass = 0; pass < 40; pass += 1) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  const keepClear = frame.keepClear.map((box): Box => [box[0] - 4, box[1] - 4, box[2] + 4, box[3] + 4]);
  const placeAt = (k: number) => {
    const at0 = layoutAt(k, [0, 0]);
    const { extent } = at0;
    const centred: Pt = [(area[0] + area[2]) / 2 - (extent[0] + extent[2]) / 2, (area[1] + area[3]) / 2 - (extent[1] + extent[3]) / 2];
    if (!keepClear.length) return centred;
    // the room the drawing has to move in its box, either way
    const slack = { left: centred[0] + extent[0] - area[0], right: area[2] - (centred[0] + extent[2]), up: centred[1] + extent[1] - area[1], down: area[3] - (centred[1] + extent[3]) };
    // the layout moved by O is the layout at the origin moved: tested as it is, not laid out again
    const clearAt = (O: Pt) => keepClear.every((box) => {
      const back = shiftBox(box, [-O[0], -O[1]]);
      return !polygonMeets(at0.silhouette, back)
        && !at0.sizes.some((size) => overlaps(size.box, back) || size.segments.some((segment) => crosses(segment, back)));
    });
    // the nearest place to the centre that is clear, in 4 px steps
    const moves: Pt[] = [[0, 0]];
    for (let dx = -Math.floor(slack.left / 4) * 4; dx <= slack.right; dx += 4) {
      for (let dy = -Math.floor(slack.up / 4) * 4; dy <= slack.down; dy += 4) if (dx || dy) moves.push([dx, dy]);
    }
    moves.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
    const move = moves.find((by) => clearAt(add(centred, by)));
    return move ? add(centred, move) : null;
  };
  // …a little smaller each time until it is: on a phone's 186 px high picture the chip costs it about a fifth
  let k = low;
  let O = placeAt(k);
  for (let tries = 0; !O && tries < 24; tries += 1) {
    k *= 0.97;
    O = placeAt(k);
  }
  O ??= placeAt(k) ?? [0, 0];
  const { P, ground, sizes } = layoutAt(k, O);
  const line = (...points: P3[]) => pathOf(points.map(P));

  // ── the surfaces and their edges ──
  const wallsIn = scope.walls;
  const roofIn = scope.roof;
  const faces: P3[][] = [
    [[0, 0, 0], [W, 0, 0], [W, 0, E], [W / 2, 0, R], [0, 0, E]],
    [[W, 0, 0], [W, L, 0], [W, L, E], [W, 0, E]],
    [[0, 0, E], [W / 2, 0, R], [W / 2, L, R], [0, L, E]],
    [[W / 2, 0, R], [W, 0, E], [W, L, E], [W / 2, L, R]],
  ];
  const planes = faces.map((face) => pathOf(face.map(P), true)).join('');
  // The front end wall's base and corners are the wall's; its top edges are the wall's and the roof's; the side's base
  // and far corner the wall's; the eave over the side both; the near eave, the ridge and the far gable's top the roof's.
  // An edge is drawn whole while anything it bounds is in the request, dashed once nothing is — the legend's
  // «Поза обсягом робіт» is a dashed line too (CladdingSection).
  const frontBase = line([0, 0, E], [0, 0, 0], [W, 0, 0], [W, 0, E]);
  const frontTop = line([0, 0, E], [W / 2, 0, R], [W, 0, E]);
  const sideBase = line([W, 0, 0], [W, L, 0], [W, L, E]);
  const sideEave = line([W, 0, E], [W, L, E]);
  const roofEdges = `${line([0, 0, E], [0, L, E], [W / 2, L, R], [W, L, E])}${line([W / 2, 0, R], [W / 2, L, R])}`;
  const front = wallsIn ? `${frontBase}${frontTop}` : '';
  const edges = [
    wallsIn ? sideBase : '',
    wallsIn || roofIn ? sideEave : '',
    !wallsIn && roofIn ? frontTop : '',
    roofIn ? roofEdges : '',
  ].join('');
  const out = [
    wallsIn ? '' : `${frontBase}${sideBase}`,
    wallsIn || roofIn ? '' : `${frontTop}${sideEave}`,
    roofIn ? '' : roofEdges,
  ].join('');

  // ── the cladding's pattern ──
  // ribs along the building at a step that stays RIB_PX apart where the length is halved; the front's at the same step,
  // centred on the ridge, as one sheet's ribs run round the corner
  const ribStep = niceStep(RIB_PX / (k * 0.5));
  const jointStep = Math.max(PANEL_M, Math.ceil(JOINT_PX / k / PANEL_M) * PANEL_M);
  const sideStations = stations(L, ribStep);
  const frontRibs = [W / 2, ...Array.from({ length: Math.ceil(W / 2 / ribStep) }, (_, index) => (index + 1) * ribStep)
    .flatMap((offset) => [W / 2 - offset, W / 2 + offset])]
    .filter((x) => x > ribStep * 0.3 && x < W - ribStep * 0.3);
  // what the openings take from the front's pattern: a rib stops at an opening's head, a joint at its jambs
  const ribFrom = (x: number) => Math.max(0, ...openings.filter((opening) => x > opening.xM && x < opening.xM + opening.widthM).map((opening) => opening.heightM));
  let walls: GeneralView['walls'] = null;
  if (wallsIn) {
    const d = envelope.wallSystem === 'profiled-sheet'
      ? [
        ...sideStations.map((at) => line([W, at, 0], [W, at, E])),
        ...frontRibs.filter((x) => ribFrom(x) < roofZ(x) - 0.2).map((x) => line([x, 0, ribFrom(x)], [x, 0, roofZ(x)])),
      ].join('')
      : [
        ...stations(E, jointStep).map((z) => line([W, 0, z], [W, L, z])),
        ...stations(R, jointStep).flatMap((z) => {
          // the end wall's width at z: whole up to the eave, closing to the ridge
          const half = z <= E ? W / 2 : (W / 2) * (1 - (z - E) / (R - E));
          if (half < 0.3) return [];
          const cut = openings.filter((opening) => opening.heightM > z).map((opening) => [opening.xM, opening.xM + opening.widthM] as const);
          return free([W / 2 - half, W / 2 + half], cut).map(([a, b]) => line([a, 0, z], [b, 0, z]));
        }),
      ].join('');
    walls = { system: envelope.wallSystem, d };
  }
  let roof: GeneralView['roof'] = null;
  if (roofIn) {
    // down both slopes, eave to ridge: the sheet's ribs at the walls' step, a roof panel's joints twice as far apart
    const step = envelope.roofSystem === 'sandwich-panel' ? niceStep(2 * ribStep) : ribStep;
    roof = { system: envelope.roofSystem, d: stations(L, step).map((at) => line([0, at, E], [W / 2, at, R], [W, at, E])).join('') };
  }

  // ── the openings ──
  const openingPaths = openings.map(({ xM, widthM, heightM }) => pathOf(([[xM, 0, 0], [xM, 0, heightM], [xM + widthM, 0, heightM], [xM + widthM, 0, 0]] as P3[]).map(P), true)).join('');

  // ── the frame, where a surface is not clad and the frame is in the request: as «Каркас» draws it — the front frame in
  //    the paper's ink and the heaviest line, the frames behind and the members between them thin, the bracing in
  //    copper. Its outermost members only: through the open walls the near columns, under the open roof the frames'
  //    top chords and the purlins; what lies further in is left to «Каркас». ──
  let frameLines: GeneralView['frame'] = null;
  if (scope.frame && (!wallsIn || !roofIn)) {
    const truss = domain.structural.roofStructure === 'truss';
    const centre = domain.structural.scheme === 'centerSupport';
    const columnXs = centre ? [0, W / 2, W] : [0, W];
    const layout = deriveBayLayout(L);
    const frames = layout.stationsM;
    const braced = [...new Set(model.bracing.map((brace) => brace.bayIndex))].filter((bay) => bay >= 0 && bay < frames.length - 1);
    const purlinXs = roofPurlinPositionsM(W, domain.structural.roofStructure).filter((purlin) => purlin.kind === 'purlin').map((purlin) => purlin.xM);
    const parts = { front: [] as string[], back: [] as string[], thin: [] as string[], brace: [] as string[] };
    if (!wallsIn) {
      parts.front.push(...columnXs.map((x) => line([x, 0, 0], [x, 0, E])));
      parts.front.push(...roofMembersAt(0, { W, E, R, truss, panelXs: trussPanelNodesM(W).panelXsM }).map((points) => line(...points)));
      parts.back.push(...frames.slice(1).map((d) => line([W, d, 0], [W, d, E])));
      parts.thin.push(...[E / 3, (2 * E) / 3].map((z) => line([W, 0, z], [W, L, z])));
      const framing = endWallFraming({ widthM: W, eaveM: E, centre, openings: [] });
      parts.thin.push(...framing.postXs.map((x) => line([x, 0, 0], [x, 0, roofZ(x)])));
      parts.thin.push(...framing.girts.map(({ z, from, to }) => line([from, 0, z], [to, 0, z])));
      parts.brace.push(...braced.map((bay) => {
        const [a, b] = [frames[bay], frames[bay + 1]];
        return `${line([W, a, 0], [W, b, E])}${line([W, b, 0], [W, a, E])}`;
      }));
    }
    if (!roofIn) {
      // the front frame's top chord is the end wall's top edge, or the front frame's own
      parts.back.push(...frames.slice(1).map((d) => line([0, d, E], [W / 2, d, R], [W, d, E])));
      parts.thin.push(...purlinXs.map((x) => line([x, 0, roofZ(x)], [x, L, roofZ(x)])));
      const slopes = [[0, ...purlinXs.filter((x) => x < W / 2), W / 2], [W / 2, ...purlinXs.filter((x) => x > W / 2), W]];
      const panels = slopes.flatMap((xs) => xs.slice(1).map((x, index): Pt => [xs[index], x]));
      parts.brace.push(...braced.flatMap((bay) => {
        const [a, b] = [frames[bay], frames[bay + 1]];
        return panels.map(([p, q]) => `${line([p, a, roofZ(p)], [q, b, roofZ(q)])}${line([p, b, roofZ(p)], [q, a, roofZ(q)])}`);
      }));
    }
    frameLines = { front: parts.front.join(''), back: parts.back.join(''), thin: parts.thin.join(''), brace: parts.brace.join('') };
  }

  // ── the ground: a line along the building's base, past its ends, with a short hatch under it — as on «Каркас» ──
  const groundPath = pathOf(ground);
  const hatchUnder = (from: Pt, to: Pt, stroke: Pt) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const count = Math.max(1, Math.floor(length / HATCH_EVERY));
    return Array.from({ length: count }, (_, index) => {
      const at = add(from, [to[0] - from[0], to[1] - from[1]], (index + 0.5) / count);
      return pathOf([at, add(at, stroke, HATCH)]);
    }).join('');
  };
  // at 45° in each line's own upright plane: down and to the left under the front, down and towards the front under
  // the side
  const frontStroke = norm([-AX[0], 1 - AX[1]]);
  const sideStroke = norm([-DIR[0] * 0.5, 1 - DIR[1] * 0.5]);
  const hatch = `${hatchUnder(ground[0], ground[2], frontStroke)}${hatchUnder(ground[2], ground[4], sideStroke)}`;

  // ── the sizes ──
  const tickAt = ([x, y]: Pt, [tx, ty]: Pt) => `M${n(x - tx * TICK)},${n(y - ty * TICK)}l${n(2 * tx * TICK)},${n(2 * ty * TICK)}`;
  const sizePaths = sizes.map((size) => ({
    key: size.key,
    d: `${size.segments.map((segment) => pathOf(segment)).join('')}${size.ticks.map((point) => tickAt(point, size.tick)).join('')}`,
    dot: size.dot,
    label: size.label,
  }));

  return {
    viewBox: `0 0 ${n(frame.width)} ${n(frame.height)}`,
    planes,
    front,
    edges,
    out,
    walls,
    roof,
    openings: openingPaths,
    frame: frameLines,
    ground: groundPath,
    hatch,
    sizes: sizePaths,
  };
}
