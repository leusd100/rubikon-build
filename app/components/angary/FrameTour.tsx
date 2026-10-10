'use client';

import { useMemo, type CSSProperties, type RefObject } from 'react';
import { stageTransform, type StageSize, type TourFocus } from '../useDrawingTour';
import { useHangarInquiryContext } from '../configurator/HangarInquiryContext';
import { deriveDomainModel, sizesProvenance, type HangarDomainModel } from '../../lib/configurator/domainModel';
import { deriveSummary } from '../../lib/configurator/deriveSummary';
import { formatNumber } from '../../lib/configurator/formatNumber';
import {
  buildParametricModel, deriveBayLayout, ridgeHeightM, roofPurlinPositionsM, trussPanelNodesM,
} from '../../lib/configurator/parametricModel';
import { DEFAULT_CONFIGURATOR_STATE } from '../../lib/configurator/types';
import { TourProgress } from '../directions/TourParts';
import { keepShortWords } from '../../lib/typography';
import {
  DIR, around, crosses, overlaps, roofHeight, roofMembersAt, union, unit, within, type Box, type P3, type Pt, type Segment,
} from './dimetric';
import { endWallFraming, sheetOpenings } from './endWallFraming';
import './frame-tour.css';

// /angary «Каркас вашого ангара — від покрівлі до основи» (UX review 2026-10; redrawn 03.10 — owner: «не завжди
// зрозуміло конструктив», with a load-path reference he liked). The visitor's own frame — span, wall and ridge
// heights, truss or portal frame, the centre row of supports — as a wireframe of its first bays in the drawing-office
// dimetric (the span at 7°, true size; the length at 41°, half size — so the gable keeps its shape): columns,
// trusses or rafters, purlins on the roof, wall purlins on the side and end walls, the end wall’s posts around its gates
// and door (endWallFraming.ts, 04.10), bracing in the braced bays it shows, the coordinate axes with their bubbles, and
// the footings under the ground line — since 10.10 a schematic pad foundation, dashed below the ground, because their
// type is the designer's (the note over the drawing says «умовно»). Its projection and frame members are shared with
// the general view (dimetric.ts), so the two read as one set of drawings.
//
// Five steps, the camera pushing in as on the direction nodes: the span, the frame, purlins and bracing — then two
// loads followed through the structure link by link, each link lighting in copper with its name in the legend above
// the drawing: snow on one frame's strip of roof (roof → purlins → truss → columns → footings → ground) and wind on
// the end wall (end wall → its posts → roof bracing, split at the ridge → the bracing of both long walls → footings),
// which is what the bracing is for — then, for a moment, what the first bay would do without it (03.10). Schematic:
// letters on the dimension lines and in the axis bubbles, no sizes or forces; every number on the page is the
// configurator's own. Reads the business configuration only, attaches nothing.
//
// Since 07.10 the drawing is the configurator's «Каркас» step (ConfiguratorFrameView), not a section of its own: this
// file keeps its model and its picture; the section and its «Змінити габарити ↑» link are gone.

const VIEW = { width: 720, height: 440 };
/** Bays drawn at most; a longer building continues past a break */
const BAYS = 3;
/** How far in front of the end wall the wind arrows start, m */
const WIND = 5.5;
/** The span's dimension line: below the footings (1.1 m deep in the drawing), m */
const DIM_Z = -2.6;
/** The frame spacing's dimension line: out from the side wall, m — 3 m since 10.10 (owner: «a трохи далі відвести»; at
 *  1.8 m it stood among the side wall's footings) */
const DIM_A = 3;
/** How far the first bay leans in the racking ghost, in bays — enlarged, as the note on the sheet says (03.10) */
const LEAN = 0.3;
/** The labels at their largest — a phone's (--ft-t 1.5 for the names, --ft-k 1.55 for the letters and bubbles), in the
 *  drawing's units: a camera that holds them there holds them everywhere (03.10: they must never leave the camera) */
const TAG = 15 * 1.5;
const LETTER = 19 * 1.55;
const BUBBLE = 11 * 1.55;
/** A size's value beside its letter (10.10): upright, smaller than the letter — at a phone's largest, as LETTER */
const VALUE = 15 * 1.55;
/** A value's width: Manrope 600's figures, «м» and spaces run ~0.56 em */
const valueWidth = (text: string) => text.length * VALUE * 0.56;
/** Between a dimension line and its letter, and between L and the axes' bubbles past it */
const LETTER_GAP = 6;
/** How far under the span's dimension line its axes' bubbles stand: past L (09.10) */
const BUBBLE_DOWN = LETTER_GAP * 2 + LETTER * 0.72 + BUBBLE;
/** A name's width: Manrope 600 runs at most ~0.62 em a letter in these words (measured, 03.10) */
const tagWidth = (label: string) => label.length * TAG * 0.62;
/** The axes across the span, lettered in sequence (ДСТУ Б А.2.4-4 skips none of these) */
const AXIS_LETTERS = ['А', 'Б', 'В'] as const;
const fmt = (value: number) => formatNumber(value);
/** A size with its unit, never split from it (04.10) */
const metres = (value: number) => `${fmt(value)}\u00A0м`;
/** A dash or a «·» keeps to the word before it, so no line of a step's text or caption starts with one (04.10); a short
 *  word keeps to the word after it, so none ends a line (10.10, audit F103: «стін; у / торцевій») */
const keepMarks = (text: string) => keepShortWords(text.replaceAll(' — ', '\u00A0— ').replaceAll(' · ', '\u00A0· '));
/** The whole frame says what it is, as the other views do (10.10, audit F38): «Каркас, прогони й в’язі» read as step 3
 *  already on, and nothing by the drawing said the scheme is preliminary */
const OVERVIEW_CAPTION = 'Каркас · попередня схема';
/** The paint around a name, half of it on either side of the letters, at a phone's line weight (--ft-k). Laid out at
 *  the 5 px it was: the 7 px painted since 09.10 (frame-tour.css .ft-tag, audit F73) only parts the members a name
 *  still lies on from its letters — counted here, it moved the names onto more of them (141 → 166 crossings) */
const HALO = (5 * 1.55) / 2;
const n = (value: number) => value.toFixed(1);
const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

/** A step's camera: pushed in on its focus as far as `zoom`, eased back and moved over just enough to hold `box` whole —
 *  what a step names never leaves its window (03.10). The window is the picture's 720 × 440 over the zoom, kept inside
 *  the picture, as stageTransform keeps it. */
function camera(focus: Pt, zoom: number, box: Box) {
  const [left, top, right, bottom] = [box[0] - 8, box[1] - 8, box[2] + 8, box[3] + 8];
  const z = Math.max(1, Math.min(zoom, VIEW.width / (right - left), VIEW.height / (bottom - top)));
  const [hw, hh] = [VIEW.width / 2 / z, VIEW.height / 2 / z];
  const at: Pt = [
    clamp(clamp(focus[0], right - hw, left + hw), hw, VIEW.width - hw),
    clamp(clamp(focus[1], bottom - hh, top + hh), hh, VIEW.height - hh),
  ];
  return { focus: at, zoom: z, view: [at[0] - hw, at[1] - hh, at[0] + hw, at[1] + hh] as Box };
}

/** What a step hands the stage: its camera without the window it was fitted to */
const shot = ({ focus, zoom }: { focus: Pt; zoom: number }) => ({ focus, zoom });

/** The straight runs of a path the drawing built with `line()` (absolute M…L…) */
const segmentsOf = (d: string): Segment[] => d.split('M').filter(Boolean).flatMap((run) => {
  const points = run.split('L').map((pair) => pair.split(',').map(Number) as unknown as Pt);
  return points.slice(1).map((point, index): Segment => [points[index], point]);
});

type Tag = { label: string; lines: readonly string[]; d: string; x: number; y: number; anchor: 'start' | 'end'; box: Box };
/** Names a member with a short leader to its label: the first way out (from one of the member's points, at one of the
 *  leaders) that keeps the label inside the window and clear of every label, bubble, footing, dimension line and
 *  leader placed so far — on one line if it can, else in two (a phone's labels are half as large again); failing that,
 *  the first clear one inside the picture, and the camera eases back to take it in. With `bars` — the members the step
 *  lights — of the ways that fit, the one fewest of them run through (09.10, audit F73: «стійки фахверку» sat on the
 *  roof bracing, «стінові прогони» on the wall's cross, copper names on copper lines). Not a hard rule: on the bays'
 *  dense copper grid no way is often clear of all of them. */
/** Whether two segments cross (their ends on either side of each other's line) */
function segmentsCross([[ax, ay], [bx, by]]: Segment, [[cx, cy], [dx, dy]]: Segment) {
  const side = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  return side(ax, ay, bx, by, cx, cy) * side(ax, ay, bx, by, dx, dy) < 0 && side(cx, cy, dx, dy, ax, ay) * side(cx, cy, dx, dy, bx, by) < 0;
}

/** Further ways out from a member's point, when its own short ones all meet a lit member: 8 directions, 3 reaches */
const RING: readonly Pt[] = [40, 60, 84, 112].flatMap((r) => [[1, -1], [-1, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [0.5, -1], [-0.5, -1]]
  .map(([dx, dy]) => [Math.round(r * dx / Math.hypot(dx, dy)), Math.round(r * dy / Math.hypot(dx, dy))] as Pt));

function placeTag(label: string, ways: readonly { from: Pt; leaders: readonly Pt[] }[], view: Box, taken: Box[], lines: Segment[], bars: readonly Segment[] = [], others: readonly Segment[] = [], ring = true): Tag {
  const words = label.split(' ');
  const layouts = words.length > 1 ? [[label], [words[0], words.slice(1).join(' ')]] : [[label]];
  // With lit members to keep off (the «Прогони й в’язі» step), a name may go further out on a longer leader (10.10, owner:
  // there «текст налазить», on «Ферма» it only adds to the drawing and stays clear)
  // with `ring` off, only the name's own ways: a name the owner wants in one place (10.10, «прогони» above the roof)
  const reach = (leaders: readonly Pt[]) => (bars.length && ring ? [...leaders, ...RING] : leaders);
  const options = layouts.flatMap((rows) => ways.flatMap(({ from: [x, y], leaders }) => reach(leaders).map(([dx, dy]) => {
    const anchor = dx < 0 ? 'end' as const : 'start' as const;
    const [tx, ty] = [x + dx + (dx < 0 ? -4 : 4), y + dy + 5];
    const width = Math.max(...rows.map(tagWidth));
    // under a name in two lines, its halo too: without it the second line sat on the name below on a phone (a two-line
    // «стійки фахверку» on «стінові прогони» at 24 × 60 × 4, 04.10)
    const box: Box = [
      anchor === 'end' ? tx - width - 3 : tx - 3, ty - TAG * 0.78 - 2,
      anchor === 'end' ? tx + 3 : tx + width + 3, ty + TAG * (0.24 + 1.1 * (rows.length - 1)) + 2 + (rows.length > 1 ? HALO : 0),
    ];
    const leader: Segment = [[x, y], [x + dx, y + dy]];
    // the leader leaves its own member: tested from a few units out
    const length = Math.hypot(dx, dy);
    const out: Segment = [[x + (dx * 5) / length, y + (dy * 5) / length], [x + dx, y + dy]];
    return { label, rows, d: `M${n(x)},${n(y)}l${dx},${dy}`, x: tx, y: ty, anchor, box, leader, out };
  })));
  const clear = (option: (typeof options)[number]) => !taken.some((box) => overlaps(box, option.box) || crosses(option.leader, box))
    && !lines.some((segment) => crosses(segment, option.box));
  const picture: Box = [4, 4, VIEW.width - 4, VIEW.height - 4];
  // a name keeps off the lit members; its thin leader may cross one on its way, as a drawing's leaders do
  const crossed = (option: (typeof options)[number]) => bars.filter((bar) => crosses(bar, option.box)).length;
  const single = (option: (typeof options)[number]) => option.rows.length === 1;
  // On a step with lit members: of the places where neither the name nor its leader lies on any of them, the one in the
  // clearest space — in one line rather than two, in the step's window rather than out of it (the camera then takes it
  // in), over the fewest of the drawing's other lines, on a short leader that crosses few lit members; only then the
  // least crossed, as it was
  const greyed = (option: (typeof options)[number]) => others.filter((line) => crosses(line, option.box) || segmentsCross(line, option.out)).length;
  const score = (option: (typeof options)[number]) => (single(option) ? 0 : 1000) + (within(option.box, view) ? 0 : 300)
    + greyed(option) * 12 + bars.filter((bar) => segmentsCross(bar, option.out)).length * 10
    + Math.hypot(option.leader[1][0] - option.leader[0][0], option.leader[1][1] - option.leader[0][1]) * 0.35;
  const untouched = bars.length ? options.filter((option) => within(option.box, picture) && clear(option) && crossed(option) === 0) : [];
  const chosen = untouched.reduce<(typeof options)[number] | undefined>((best, option) => (best && score(best) <= score(option) ? best : option), undefined)
    ?? options.filter((option) => within(option.box, view) && clear(option))
      .reduce<(typeof options)[number] | undefined>((best, option) => (best && crossed(best) <= crossed(option) ? best : option), undefined)
    ?? options.find((option) => within(option.box, picture) && clear(option))
    ?? options.find((option) => within(option.box, picture))
    ?? options[0];
  taken.push(chosen.box);
  lines.push(chosen.leader);
  return { label: chosen.label, lines: chosen.rows, d: chosen.d, x: chosen.x, y: chosen.y, anchor: chosen.anchor, box: chosen.box };
}

function frameGeometry(domain: HangarDomainModel) {
  const { widthM: W, lengthM, eaveHeightM: E } = domain.dimensions;
  const R = ridgeHeightM(W, E, domain.roof.pitchDeg);
  const layout = deriveBayLayout(lengthM);
  const s = layout.spacingM;
  const bays = Math.min(layout.bayCount, BAYS);
  const continues = layout.bayCount > BAYS;
  // The visitor's own sizes by their letters (10.10, owner: «цифри замість літер, коли розміри вказав клієнт»): «L = 32 м»
  // on its line, «8 м» under H. The frame spacing a stays a letter — the calculation sets it — and an example's or an
  // orientation's sizes keep the letters alone, as the steps' words call them.
  const values = sizesProvenance(domain) === 'own' ? { L: `\u00A0=\u00A0${metres(W)}`, H: metres(E) } : null;
  const DEP = bays * s;
  const end = continues ? DEP + s * 0.45 : DEP;
  const truss = domain.structural.roofStructure === 'truss';
  const centre = domain.structural.scheme === 'centerSupport';
  const roofZ = roofHeight(W, E, R);
  const columnXs = centre ? [0, W / 2, W] : [0, W];
  // The configurator's own model: its gates and door on this end wall — on the same side of the centre as the general
  // view and the 3D show them, and only with walls in the request (09.10, sheetOpenings) — and the bays it braces
  const model = buildParametricModel(domain);
  const openings = sheetOpenings(model.openings, W, domain.scope.walls);
  // The end wall's posts (стійки фахверку) carry its wall purlins between the corner columns, about every 7 m (with a
  // centre row a post halves each span, 03.10) — and frame its gates, never standing in one (04.10, endWallFraming.ts)
  const framing = endWallFraming({ widthM: W, eaveM: E, centre, openings });
  const { postXs } = framing;
  // The configurator's own frame, so the two drawings show one hangar (03.10): purlins where its model puts them — on a
  // truss's top-chord nodes (between nodes the chord would carry them in bending), evenly on a portal rafter — the eave
  // and ridge lines being the longitudinals below; the truss's panels as the model divides them
  const purlinXs = roofPurlinPositionsM(W, domain.structural.roofStructure).filter((purlin) => purlin.kind === 'purlin').map((purlin) => purlin.xM);
  const panelXs = trussPanelNodesM(W).panelXsM;
  const frames = Array.from({ length: bays + 1 }, (_, index) => index * s);

  // Fit the frame with its footings, dimensions and the wind arrows into the sheet: room on top for the snow arrows,
  // under the span's dimension for its axes' bubbles, and right of the frame spacing's for its letter. The room right of
  // it for the frames' bubbles, no longer drawn since 09.10, is gone (10.10): it kept the hangar off to the left and
  // small in the snow's and the wind's windows (owner: «так далеко можна не віддаляти», «відцентрувати… наш об'єкт»).
  const extremes: P3[] = [
    [-0.9, -0.75, -1.1], [-3.6, 0, E / 2], [0, 0, DIM_Z], [W, 0, DIM_Z],
    [W * 0.2, -WIND, E * 0.25], [W * 0.8, -WIND, E * 0.25],
    [W + 0.75, -0.75, -1.1], [W + DIM_A, 0, 0], [W + DIM_A, DEP, 0], [W + 1.4, end, 0], [W + 0.75, DEP + 0.75, -1.1],
    [0, end, E + 0.8], [W / 2, end, R + 0.8], [W, end, E + 0.8], [W / 2, 0, R],
  ];
  const raw = extremes.map(unit);
  const [minX, maxX] = [Math.min(...raw.map(([x]) => x)), Math.max(...raw.map(([x]) => x))];
  const [minY, maxY] = [Math.min(...raw.map(([, y]) => y)), Math.max(...raw.map(([, y]) => y))];
  const fit = (reach: number) => {
    // H's value is wider than its letter: room for it on the left
    const pad = { left: 22 + (values ? Math.max(0, valueWidth(values.H) - LETTER * 0.72) : 0), right: 22 + reach, top: 32, bottom: 10 + BUBBLE_DOWN + BUBBLE };
    const k = Math.min((VIEW.width - pad.left - pad.right) / (maxX - minX), (VIEW.height - pad.top - pad.bottom) / (maxY - minY));
    return {
      k,
      ox: pad.left + (VIEW.width - pad.left - pad.right - (maxX - minX) * k) / 2 - minX * k,
      oy: pad.top + (VIEW.height - pad.top - pad.bottom - (maxY - minY) * k) / 2 - minY * k,
    };
  };
  const { k, ox, oy } = fit(LETTER_GAP + LETTER * 0.72);
  const xy = (point: P3) => { const [x, y] = unit(point); return [ox + x * k, oy + y * k] as const; };
  const p = (point: P3) => xy(point).map(n).join(',');
  const line = (...points: P3[]) => `M${points.map(p).join('L')}`;
  const segment = (a: P3, b: P3) => [xy(a), xy(b)] as const;

  // ── the frame ──
  const columnsAt = (d: number, xs: readonly number[] = columnXs) => xs.map((x) => line([x, d, 0], [x, d, E])).join('');
  // the truss with its web, or the portal frame's rafters with their haunches (dimetric.ts, shared with the general view's
  // frame where a surface is not clad, 10.10)
  const roofAt = (d: number) => roofMembersAt(d, { W, E, R, truss, panelXs }).map((points) => line(...points)).join('');
  const backFrames = frames.slice(1).map((d) => `${columnsAt(d)}${roofAt(d)}`).join('');
  // …the same, columns and roofs apart: the first view raises the columns before it lays the trusses on them (10.10)
  const backColumns = frames.slice(1).map((d) => columnsAt(d)).join('');
  const backRoofs = frames.slice(1).map((d) => roofAt(d)).join('');
  const zig = (point: P3) => { const [x, y] = xy(point); return `M${n(x)},${n(y)}l4,-7l5,7l4,-7`; };
  const edges: P3[] = [[0, 0, E], [W, 0, E], [W / 2, 0, R], [W, 0, 0], [0, 0, 0]];
  const longitudinals = edges.map(([x, , z]) => `${line([x, 0, z], [x, end, z])}${continues ? zig([x, end, z]) : ''}`).join('');
  // the far end wall, when all the building's bays are drawn
  const farEnd = continues ? '' : line([0, DEP, 0], [W, DEP, 0]);

  // Purlins on the roof; wall purlins on the near side wall and on the end wall, between its posts and stopping at its
  // openings; the openings themselves outlined, as the configurator draws them (04.10)
  const purlins = purlinXs.map((x) => line([x, 0, roofZ(x)], [x, end, roofZ(x)])).join('');
  const girts = [
    ...[E / 3, (2 * E) / 3].map((z) => line([W, 0, z], [W, end, z])),
    ...framing.girts.map(({ z, from, to }) => line([from, 0, z], [to, 0, z])),
  ].join('');
  const openingOutlines = openings.map(({ xM, widthM, heightM }) => line([xM, 0, 0], [xM, 0, heightM], [xM + widthM, 0, heightM], [xM + widthM, 0, 0])).join('');
  const posts = postXs.map((x) => line([x, 0, 0], [x, 0, roofZ(x)])).join('');
  // Bracing in the braced bays the drawing shows — the model's first, last and (from six bays) middle one, so a short
  // building drawn whole is braced as the configurator braces it (04.10): a cross in each long wall (the far one in the
  // back line's ink) and, on both roof slopes, a horizontal wind truss — a cross in every panel between the purlins, from
  // the eave to the ridge (03.10). The loads follow the first bay's.
  const wallCross = (x: number, d = 0) => `${line([x, d, 0], [x, d + s, E])}${line([x, d + s, 0], [x, d, E])}`;
  const wallBracing = wallCross(W);
  const farBracing = wallCross(0);
  const panelEdges = [[0, ...purlinXs.filter((x) => x < W / 2), W / 2], [W / 2, ...purlinXs.filter((x) => x > W / 2), W]];
  // each panel from the ridge side towards its eave, so the wind's drops run out to both long walls
  const panels = panelEdges.flatMap((xs, slope) => xs.slice(1).map((x, index): Pt => (slope === 0 ? [x, xs[index]] : [xs[index], x])));
  const roofCrosses = (d: number) => panels.map(([a, b]) => `${line([a, d, roofZ(a)], [b, d + s, roofZ(b)])}${line([a, d + s, roofZ(a)], [b, d, roofZ(b)])}`).join('');
  const roofBracing = roofCrosses(0);
  const laterBays = [...new Set(model.bracing.map((brace) => brace.bayIndex))].filter((bay) => bay > 0 && bay < bays).map((bay) => bay * s);
  const laterBracing = laterBays.map((d) => `${wallCross(W, d)}${roofCrosses(d)}`).join('');
  const laterFarBracing = laterBays.map((d) => wallCross(0, d)).join('');

  // Footings (10.10, owner: «це буде справді цікавіше»): a pad foundation under every column and post — a pedestal
  // (підколонник) under the base on a wider pad (подушка) — in place of the dashed box that stood for it. Below the
  // ground, so dashed, as hidden edges are; only the pedestal's top, where the column stands, at the ground and solid.
  // A type hint, the same for every hangar: its type and sizes are the designer's, by the soil and the loads, and the
  // note over the drawing says so («умовно»). The visible edges only: the pedestal's top, its three near verticals and
  // its foot on the pad; the pad's top, its three near verticals and its two near lower edges.
  const PEDESTAL_DEPTH = 0.75;
  const FOOTING_DEPTH = 1.1;
  const footingAt = (x: number, d: number, [bx, bd]: Pt = [0.75, 0.75], [px, pd]: Pt = [0.3, 0.3]) => {
    const [t, h] = [PEDESTAL_DEPTH, FOOTING_DEPTH];
    return {
      top: line([x - px, d - pd, 0], [x + px, d - pd, 0], [x + px, d + pd, 0], [x - px, d + pd, 0], [x - px, d - pd, 0]),
      d: [
        line([x - px, d - pd, 0], [x - px, d - pd, -t]), line([x + px, d - pd, 0], [x + px, d - pd, -t]), line([x + px, d + pd, 0], [x + px, d + pd, -t]),
        line([x - px, d - pd, -t], [x + px, d - pd, -t], [x + px, d + pd, -t]),
        line([x - bx, d - bd, -t], [x + bx, d - bd, -t], [x + bx, d + bd, -t], [x - bx, d + bd, -t], [x - bx, d - bd, -t]),
        line([x - bx, d - bd, -t], [x - bx, d - bd, -h], [x + bx, d - bd, -h], [x + bx, d + bd, -h], [x + bx, d + bd, -t]),
        line([x + bx, d - bd, -t], [x + bx, d - bd, -h]),
      ].join(''),
      box: union(([[x - px, d - pd, 0], [x + px, d + pd, 0], [x - bx, d - bd, -t], [x + bx, d + bd, -t], [x - bx, d - bd, -h], [x + bx, d + bd, -h], [x + bx, d - bd, -h], [x - bx, d + bd, -h]] as P3[]).map((point) => around(xy(point), 1))),
    };
  };
  // The posts' footings smaller than the columns' — a 1 m pad, a 0.4 m pedestal; one under two posts that stand closer
  // than their footings are wide (the jambs of two gates side by side, 04.10), its pad and pedestal as wide as both
  const postFootings = postXs.reduce<{ from: number; to: number }[]>((groups, x) => {
    const last = groups.at(-1);
    if (last && x - last.to < 1.1) last.to = x;
    else groups.push({ from: x, to: x });
    return groups;
  }, []).map(({ from, to }) => ({ x: (from + to) / 2, pad: [0.5 + (to - from) / 2, 0.5] as Pt, pedestal: [0.2 + (to - from) / 2, 0.2] as Pt }));
  const footings = [
    ...frames.flatMap((d) => columnXs.map((x) => footingAt(x, d))),
    ...postFootings.map(({ x, pad, pedestal }) => footingAt(x, 0, pad, pedestal)),
  ];
  const footingPath = (x: number, d: number, pad?: Pt, pedestal?: Pt) => {
    const footing = footingAt(x, d, pad, pedestal);
    return `${footing.top}${footing.d}`;
  };
  const groundUnder = (points: readonly P3[]) => points.map((point) => {
    const [cx, cy] = xy(point);
    return [9, 16].map((r) => `M${n(cx - r)},${n(cy + r * 0.3)}q${r},${n(r * 0.5)} ${r * 2},0`).join('');
  }).join('');
  // The ground line along the footings' outer top edges — out at 1.4 m it ran through the side footings (03.10) — with
  // a short hatch under it, as a section marks the ground (10.10): strokes at 45° in the line's own vertical plane, the
  // same length and about the same spacing on the sheet along the front and along the side
  const slab = line([-0.75, -0.75, 0], [W + 0.75, -0.75, 0], [W + 0.75, end, 0]);
  const hatchLength = 6 / k;
  const hatchAlong = (from: number, to: number, spacing: number, stroke: (at: number) => string) => {
    const count = Math.max(1, Math.floor((to - from) / spacing));
    return Array.from({ length: count }, (_, index) => stroke(from + ((index + 0.5) * (to - from)) / count)).join('');
  };
  const groundHatch = hatchAlong(-0.75, W + 0.75, 11 / k, (x) => line([x, -0.75, 0], [x - hatchLength, -0.75, -hatchLength]))
    + hatchAlong(-0.75, end, 22 / k, (d) => line([W + 0.75, d, 0], [W + 0.75, d - hatchLength, -hatchLength]));

  // Dimensions: the span L under the front frame, below its footings (as on a section — in front of them it crossed the
  // foundations, 03.10), the wall height H at the near-left column, the frame spacing a along the side. One way for all
  // three (owner, 09.10: «з цими розмірними лініями треба навести лад»): extension lines from what is measured to just
  // past the dimension line, a 45° tick at each end, and the letter at the line's middle on its outer side, a gap off it.
  // H had flat ticks and no lower extension line, a stood off past its line's end, L beside Б's bubble.
  const tickAt = ([x, y]: Pt) => `M${n(x - 4)},${n(y + 4)}l8,-8`;
  const tick = (point: P3) => tickAt(xy(point));
  // L between the outer columns' axes, with their extension lines down from under the footings (10.10, owner: «розмірні
  // лінії мають міряти між центрами крайніх колон») — off step 1 the axes are not drawn, and L hung free under the frame
  const spanDim = `${line([0, 0, DIM_Z], [W, 0, DIM_Z])}${tick([0, 0, DIM_Z])}${tick([W, 0, DIM_Z])}`
    + `${line([0, 0, -1.3], [0, 0, DIM_Z - 0.4])}${line([W, 0, -1.3], [W, 0, DIM_Z - 0.4])}`;
  const [hx, hy] = xy([-2.2, 0, 0]);
  const [, hty] = xy([-2.2, 0, E]);
  const heightDim = `M${n(hx)},${n(hy)}V${n(hty)}${tickAt([hx, hy])}${tickAt([hx, hty])}`
    + `${line([-0.9, 0, 0], [-2.6, 0, 0])}${line([-0.9, 0, E], [-2.6, 0, E])}`;
  // a's ticks at 45° to it in the ground's plane (10.10): the sheet's «/» of the other two lay along a's line, at 41°,
  // and did not show
  const groundTick = (point: P3) => {
    const [tx, ty] = unit([-1, 1, 0]);
    const length = Math.hypot(tx, ty);
    const [x, y] = xy(point);
    return `M${n(x - (tx / length) * 5.7)},${n(y - (ty / length) * 5.7)}l${n((2 * tx / length) * 5.7)},${n((2 * ty / length) * 5.7)}`;
  };
  const bayDim = `${line([W + DIM_A, 0, 0], [W + DIM_A, s, 0])}${groundTick([W + DIM_A, 0, 0])}${groundTick([W + DIM_A, s, 0])}`
    + `${line([W + 0.9, 0, 0], [W + DIM_A + 0.4, 0, 0])}${line([W + 0.9, s, 0], [W + DIM_A + 0.4, s, 0])}`;

  // Coordinate axes, dash-dot, with their bubbles past the dimension lines (03.10): across the span in letters, one after
  // another as a drawing letters them (04.10) — А, Б on a clear span, А, Б, В with the centre row (Б) — down through
  // the front columns to under L. The axes along the building (1, 2, 3…) are not drawn (09.10, audit F89): the
  // configurator's sheet has one numbering, the steps' and the nodes' (07.10), and their hidden bubbles still pulled the
  // «Прогони й в’язі» camera back, leaving a sixth of its window empty on the right.
  const down = (point: P3, by: number) => { const [x, y] = xy(point); return [x, y + by] as const; };
  // the bubbles past L, so the letter keeps the line's middle whatever axis runs there (09.10)
  const spanBubbles = columnXs.map((x, index) => ({ label: AXIS_LETTERS[index], at: down([x, 0, DIM_Z], BUBBLE_DOWN) }));
  const spanAxes = columnXs.map((x, index) => `M${p([x, 0, roofZ(x) + 0.7])}L${spanBubbles[index].at.map(n).join(',')}`).join('');
  // Each letter's centre (they are set on their middle, frame-tour.css): L under the middle of its line — with the centre
  // row Б's axis runs behind it, parted by the letter's paint, and Б's bubble stands past it (audit F126: beside the
  // bubble it read «Б L»); H left of its line, a right of its own, each by the same gap
  const letters = {
    L: down([W / 2, 0, DIM_Z], LETTER_GAP + LETTER * 0.36),
    H: [hx - LETTER_GAP, (hy + hty) / 2] as const,
    a: (() => { const [x, y] = xy([W + DIM_A, s / 2, 0]); return [x + LETTER_GAP, y] as const; })(),
  };

  // H's value under its letter, ending where it ends
  const hValueAt: Pt = [letters.H[0], letters.H[1] + LETTER * 0.36 + VALUE * 0.62];

  // What labels must keep clear of, at a phone's sizes: L on its centre, H ending at its point, a starting at its point —
  // with a value, L's box as wide as «L = 32 м» and H's down to its value's foot
  const letterBox = ([x, y]: Pt, anchor: 'middle' | 'end' | 'start' = 'middle', lowercase = false, extra = 0, below = 0) => {
    const width = LETTER * 0.72 + extra;
    const half = LETTER * (lowercase ? 0.28 : 0.38);
    const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
    return [left, y - half, left + width, y + half + below] as Box;
  };
  const labelBoxes = {
    L: letterBox(letters.L, 'middle', false, values ? valueWidth(values.L) : 0),
    H: letterBox(letters.H, 'end', false, values ? Math.max(0, valueWidth(values.H) - LETTER * 0.72) : 0, values ? VALUE * 1.05 : 0),
    a: letterBox(letters.a, 'start', true),
  };
  const bubbleBoxes = spanBubbles.map(({ at }) => around(at, BUBBLE + 2));
  const letterBoxes = [labelBoxes.L, labelBoxes.H, labelBoxes.a];
  const dimLines: Segment[] = [
    segment([0, 0, DIM_Z], [W, 0, DIM_Z]), segment([0, 0, -1.3], [0, 0, DIM_Z - 0.4]), segment([W, 0, -1.3], [W, 0, DIM_Z - 0.4]),
    segment([W + DIM_A, 0, 0], [W + DIM_A, s, 0]), [[hx, hy], [hx, hty]], segment([-0.9, 0, E], [-2.6, 0, E]),
    segment([-0.9, 0, 0], [-2.6, 0, 0]), segment([W + 0.9, 0, 0], [W + DIM_A + 0.4, 0, 0]), segment([W + 0.9, s, 0], [W + DIM_A + 0.4, s, 0]),
  ];

  // ── snow, followed through one frame (the second): the strip of roof it carries — half a bay either side — then
  //    its purlins, the frame, its columns, footings and the ground ──
  const [s0, s1] = [s / 2, (3 * s) / 2];
  // one path per arrow, so each can fall on its own beat
  const snowArrows = [0.72, 1.28].flatMap((t) => [0.17, 0.38, 0.62, 0.83].map((f) => {
    const [ax, ay] = xy([W * f, t * s, roofZ(W * f)]);
    return `M${n(ax)},${n(ay - 26)}V${n(ay - 4)}M${n(ax - 3.5)},${n(ay - 10)}L${n(ax)},${n(ay - 4)}L${n(ax + 3.5)},${n(ay - 10)}`;
  }));
  const plane = (...points: P3[]) => `M${points.map(p).join('L')}Z`;
  const snowStrip = `${plane([0, s0, E], [W / 2, s0, R], [W / 2, s1, R], [0, s1, E])}${plane([W / 2, s0, R], [W, s0, E], [W, s1, E], [W / 2, s1, R])}`;
  const stripEdges = `${line([0, s0, E], [W / 2, s0, R], [W, s0, E])}${line([0, s1, E], [W / 2, s1, R], [W, s1, E])}`;
  const stripPurlins = purlinXs.map((x) => line([x, s0, roofZ(x)], [x, s1, roofZ(x)])).join('');
  const snowFootings = columnXs.map((x) => footingPath(x, s)).join('');
  // The drops, one run per link, each starting when its link lights (--n): along the purlins to the frame, down the
  // frame to the eaves, down the columns, into the footings — the load front moves with the legend
  const snowFlow: { d: string; link: number }[] = [
    ...purlinXs.flatMap((x) => [line([x, s0, roofZ(x)], [x, s, roofZ(x)]), line([x, s1, roofZ(x)], [x, s, roofZ(x)])]).map((d) => ({ d, link: 1 })),
    // with a centre row, down the vertical under the ridge too, to the node column Б stands under (04.10)
    { d: `${line([W / 2, s, R], [0, s, E])}${line([W / 2, s, R], [W, s, E])}${centre ? line([W / 2, s, R], [W / 2, s, E]) : ''}`, link: 2 },
    { d: columnXs.map((x) => line([x, s, E], [x, s, 0])).join(''), link: 3 },
    { d: columnXs.map((x) => line([x, s, 0], [x, s, -1])).join(''), link: 4 },
  ];

  // ── wind on the near end wall, along the building: the end wall → its posts, which stand on footings and hand the
  //    rest up to the roof bracing → the roof bracing, split at the ridge → the bracing of both long walls → footings ──
  const head = (tip: P3) => {
    const [tx, ty] = xy(tip);
    // the arrow points along +d; its head opens back along −d
    const [bx, by] = [tx - 8 * DIR[0], ty - 8 * DIR[1]];
    return `M${n(bx - 4 * DIR[1])},${n(by + 4 * DIR[0])}L${n(tx)},${n(ty)}L${n(bx + 4 * DIR[1])},${n(by - 4 * DIR[0])}`;
  };
  // Three rows of arrows up the wall — fewer on a low wall drawn small, where three piled their heads onto each other's
  // shafts (50 × 10 × 4, 04.10): rows at least ~2.5 heads apart across the arrows
  const rowsApart = (step: number) => E * step * k * Math.cos((41.42 * Math.PI) / 180);
  let windRows = [0.5];
  if (rowsApart(0.3) >= 20) windRows = [0.25, 0.55, 0.85];
  else if (rowsApart(0.45) >= 20) windRows = [0.3, 0.75];
  const windArrows = windRows.flatMap((h) => [0.2, 0.5, 0.8].map((f) => {
    const z = Math.min(E * h, roofZ(W * f) - 0.6);
    return `${line([W * f, -WIND, z], [W * f, -0.5, z])}${head([W * f, -0.5, z])}`;
  }));
  const endWall = plane([0, 0, 0], [W, 0, 0], [W, 0, E], [W / 2, 0, R], [0, 0, E]);
  // The end wall's verticals that take its wind: the posts and, with a centre row, column Б (04.10 — its wall purlins
  // bear on it too); Б's top is a node of the truss's bottom chord, so its drops run up to the eave line
  const windPosts = [...postXs.map((x) => ({ x, top: roofZ(x) })), ...(centre ? [{ x: W / 2, top: E }] : [])];
  const braceBases: P3[] = [[0, 0, 0], [0, s, 0], [W, 0, 0], [W, s, 0], ...windPosts.map(({ x }) => [x, 0, 0] as P3)];
  const braceFootings = [
    ...[0, W].flatMap((x) => [footingPath(x, 0), footingPath(x, s)]),
    ...postFootings.map(({ x, pad, pedestal }) => footingPath(x, 0, pad, pedestal)),
    ...(centre ? [footingPath(W / 2, 0)] : []),
  ].join('');
  // …and the wind's drops: each post from its middle up to the roof and down to its footing; along the roof bracing out
  // from the ridge to both eaves; down both walls' bracing; into the footings
  const windFlow = [
    { d: windPosts.map(({ x, top }) => `${line([x, 0, E / 2], [x, 0, top])}${line([x, 0, E / 2], [x, 0, 0])}`).join(''), link: 1 },
    { d: roofBracing, link: 2 },
    { d: [0, W].map((x) => `${line([x, s, E], [x, 0, 0])}${line([x, 0, E], [x, s, 0])}`).join(''), link: 3 },
    { d: braceBases.map(([x, d]) => line([x, d, 0], [x, d, -1])).join(''), link: 4 },
  ];
  // Without the bracing the frames would lean along the building like dominoes: the first bay as a ghost, its column
  // tops moved along +d by LEAN of a bay (shown enlarged), everything above them following
  const leaned = ([x, d, z]: P3): P3 => [x, d + LEAN * s * clamp(z / E, 0, 1), z];
  const ghostLine = (...points: P3[]) => line(...points.map(leaned));
  const ghost = [0, s].map((d) => [
    ...columnXs.map((x) => ghostLine([x, d, 0], [x, d, E])),
    ghostLine([0, d, E], [W / 2, d, R], [W, d, E]),
    truss ? ghostLine([0, d, E], [W, d, E]) : '',
  ].join('')).join('') + [[0, E], [W / 2, R], [W, E]].map(([x, z]) => ghostLine([x, 0, z], [x, s, z])).join('');

  // ── the steps' cameras and the members' names ──
  const lines = [...dimLines];
  const taken: Box[] = [...footings.map((footing) => footing.box), ...bubbleBoxes, ...letterBoxes];
  const pointsBox = (points: readonly P3[]) => union(points.map((point) => around(xy(point), 0)));
  const frontFrame = pointsBox([[0, 0, 0], [W, 0, 0], [0, 0, E], [W, 0, E], [W / 2, 0, R]]);

  const spanCamera = camera(xy([W / 2, 0, E * 0.4]), 1.3, union([
    frontFrame, pointsBox(columnXs.map((x) => [x, 0, roofZ(x) + 0.7] as P3)),
    ...spanBubbles.map(({ at }) => around(at, BUBBLE + 2)), labelBoxes.L, labelBoxes.H,
  ]));

  // the front frame's nodes the configurator's «Каркас» view opens (07.10): the heel over the left column, the ridge,
  // on a truss a node of the bottom chord near the left quarter and a purlin's node on the right slope, and the right
  // column's base — placed before the members' names, which keep clear of their markers
  const bottomNodes = panelXs.slice(1, -1).filter((_, index) => index % 2 === 1);
  const nearest = (xs: readonly number[], to: number) => xs.reduce((best, x) => (Math.abs(x - to) < Math.abs(best - to) ? x : best));
  const purlinNode = purlinXs.length > 0 ? nearest(purlinXs, W * 0.7) : null;
  const nodePoints = {
    heel: xy([0, 0, E]),
    ridge: xy([W / 2, 0, R]),
    web: truss && bottomNodes.length > 0 ? xy([nearest(bottomNodes, W / 4), 0, E]) : null,
    purlin: truss && purlinNode !== null ? xy([purlinNode, 0, roofZ(purlinNode)]) : null,
    base: xy([W, 0, 0]),
  };
  const nodeBoxes = Object.values(nodePoints).filter((point): point is Pt => point !== null).map((point) => around(point, 16));

  const frameFocus = xy([W / 2, 0, E * 0.6]);
  const frameBase = camera(frameFocus, 1.2, frontFrame);
  const roofTagAt = [0.3, 0.22, 0.4].map((t) => xy([W * t, 0, roofZ(W * t)]));
  // the names keep clear of the nodes' markers only here; the section's own tour had none
  const frameTaken = [...taken, ...nodeBoxes];
  const frameTags = [
    placeTag(truss ? 'ферма' : 'ригель рами', roofTagAt.map((from) => ({ from, leaders: [[-24, -30], [-30, -18], [-14, -40], [24, -34]] as Pt[] })), frameBase.view, frameTaken, lines),
    // to the left of the right column, inside the frame: to its right the camera's edge cut it on phones (03.10)
    placeTag('колона', [0.3, 0.5, 0.7].map((t) => ({ from: xy([W, 0, E * t]), leaders: [[-30, 12], [-30, -12], [-24, 26]] as Pt[] })), frameBase.view, frameTaken, lines),
  ];
  const frameCamera = camera(frameFocus, 1.2, union([frontFrame, ...frameTags.map((tag) => tag.box)]));

  const baysFocus = xy([W * 0.86, s, E * 0.6]);
  const baysEssentials = union([
    pointsBox([[W, 0, 0], [W, s, 0], [W, 0, E], [W, s, E], [W / 2, 0, R], [W / 2, s, R], ...postXs.map((x) => [x, 0, roofZ(x)] as P3)]),
    labelBoxes.a,
  ]);
  const baysBase = camera(baysFocus, 1.5, baysEssentials);
  const sideWall = [1.6, 2.2, 2.8].filter((t) => t * s < end);
  // the end wall's wall purlins, from the right, the lower first, each at its middle: where a name can sit on one
  // without crossing a post's footing; the short pieces beside a gate last
  const bands = [...framing.girts].sort((a, b) => Number(a.to - a.from < 2) - Number(b.to - b.from < 2) || b.from - a.from || a.z - b.z);
  // the members this step lights — purlins, wall purlins, posts and all its bracing: its names keep off them where they can
  const bars = segmentsOf(`${purlins}${girts}${posts}${wallBracing}${farBracing}${roofBracing}${laterBracing}${laterFarBracing}`);
  // On this step the span's bubbles and the L and H letters are not shown: they do not hold its names off the ground
  // under the end wall (10.10). The rest of the drawing's lines the names keep clear of where they can.
  const bayTaken: Box[] = [...footings.map((footing) => footing.box), labelBoxes.a];
  // a name keeps off this step's own dimension, a; the span's and the height's are grey here, among the drawing's
  // other lines, which a name crosses only where no clearer place is
  const bayLines: Segment[] = [segment([W + DIM_A, 0, 0], [W + DIM_A, s, 0]), segment([W + 0.9, 0, 0], [W + DIM_A + 0.4, 0, 0]), segment([W + 0.9, s, 0], [W + DIM_A + 0.4, s, 0])];
  const greyLines = [...segmentsOf(`${backFrames}${longitudinals}${farEnd}${columnsAt(0)}${roofAt(0)}`), ...dimLines];
  const baysTags = [
    placeTag('в’язі', [0.62, 0.4, 0.8].map((t) => ({ from: xy([W, s * t, E * t]), leaders: [[34, -10], [30, 14], [26, -28]] as Pt[] })), baysBase.view, bayTaken, bayLines, bars, greyLines),
    // up from a purlin, over the roof where the picture is free (10.10, owner: «"прогони" краще показати зверху де є
    // вільне місце» — the ring had put it under the side wall, among the other names)
    placeTag('прогони', [...purlinXs].filter((x) => x > W / 2).reverse().flatMap((x) => [1.5, 1.2, 1.9, 2.3].filter((t) => t * s < end).map((t) => ({
      from: xy([x, s * t, roofZ(x)]),
      leaders: [[0, -44], [16, -42], [-16, -42], [10, -60], [-10, -60], [26, -34], [0, -78], [22, -74]] as Pt[],
    }))), baysBase.view, bayTaken, bayLines, bars, greyLines, false),
    // on a wall purlin of the end wall, the name above or below it; else out from the side wall's
    placeTag('стінові прогони', [
      ...bands.map(({ z, from, to }) => ({ from: xy([(from + to) / 2, 0, z]), leaders: [[-14, -20], [14, -20], [-14, 22], [14, 22]] as Pt[] })),
      ...sideWall.flatMap((t) => [(2 * E) / 3, E / 3].map((z) => ({ from: xy([W, s * t, z]), leaders: [[26, -16], [30, 10], [26, 16]] as Pt[] }))),
    ], baysBase.view, bayTaken, bayLines, bars, greyLines),
    // on a post, into the end wall beside it, or above the roof from its top
    placeTag('стійки фахверку', [
      ...[...postXs].reverse().flatMap((x) => [0.8, 0.62, 0.45].map((t) => ({ from: xy([x, 0, E * t]), leaders: [[-24, -14], [24, -14], [-24, 14], [24, 14]] as Pt[] }))),
      ...postXs.map((x) => ({ from: xy([x, 0, roofZ(x) - 0.3]), leaders: [[-18, -34], [18, -34], [-30, -50]] as Pt[] })),
      // or down from a post's foot, under the end wall
      ...postXs.map((x) => ({ from: xy([x, 0, E * 0.12]), leaders: [[-24, 58], [24, 58], [-36, 74], [36, 74]] as Pt[] })),
    ], baysBase.view, bayTaken, bayLines, bars, greyLines),
  ];
  const baysCamera = camera(baysFocus, 1.5, union([baysEssentials, ...baysTags.map((tag) => tag.box)]));

  // The overview as the configurator shows it (07.10): the frame, its footings and the letters of its dimensions held
  // together and centred — the picture's own fit leaves room on the right for the bays' bubbles, which the configurator
  // does not draw, and the hangar sat off to the left
  const overviewBox = union([
    pointsBox([[0, 0, 0], [W, 0, 0], [0, end, 0], [W, end, 0], [0, 0, E], [W / 2, 0, R], [W / 2, end, R], [W, end, E], [0, end, E],
      [0, 0, DIM_Z], [W, 0, DIM_Z], [W + DIM_A, 0, 0], [W + DIM_A, s, 0]]),
    ...footings.map((footing) => footing.box), [hx - 6, hty, hx + 6, hy],
    labelBoxes.L, labelBoxes.H, labelBoxes.a,
  ]);
  const overviewCamera = camera(
    [(overviewBox[0] + overviewBox[2]) / 2, (overviewBox[1] + overviewBox[3]) / 2],
    1.6,
    [overviewBox[0] - 10, overviewBox[1] - 10, overviewBox[2] + 10, overviewBox[3] + 10],
  );

  // The loads' windows (10.10, owner): the hangar itself — its frames, down to the footings — held whole and centred,
  // pushed in as far as that allows. Snow was the whole picture (zoom 1), its dimensions' room round it and the hangar
  // small in it («так далеко можна не віддаляти»); the wind's window was kept inside the picture with the hangar high and
  // off to one side («відцентрувати по центру сцени наш об'єкт»).
  const building = pointsBox([[0, 0, 0], [W, 0, 0], [0, 0, E], [W / 2, 0, R], [W, 0, E], [0, end, E], [W / 2, end, R], [W, end, E], [W, end, 0],
    [-0.75, -0.75, -1.1], [W + 0.75, -0.75, -1.1], [W + 0.75, end, -1.1]]);
  const centred = (box: Box) => camera([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2], 2, box);
  const snowCamera = centred(union([
    building,
    ...[0.72, 1.28].flatMap((t) => [0.17, 0.38, 0.62, 0.83].map((f) => { const [ax, ay] = xy([W * f, t * s, roofZ(W * f)]); return around([ax, ay - 26], 4); })),
    ...columnXs.map((x) => around(down([x, s, -1.1], 6), 18, 6)),
  ]));
  // the wind's: its whole path too, the arrows in front of the end wall, the ground under the footings and the leaning bay
  const windCamera = centred(union([
    building,
    pointsBox([[W * 0.2, -WIND, E * 0.25], [W * 0.8, -WIND, E * 0.25], [0, 0, R], [W / 2, s * (1 + LEAN), R + 0.3], [W, s * (1 + LEAN), E]]),
    ...braceBases.map(([x, d]) => around(down([x, d, -1.1], 6), 18, 6)),
  ]));

  // The visitor's answer on the columns (10.10, owner: «Не працює "Потрібен простір без колон усередині?"» — the click
  // took, but the drawing hardly changed: the end wall's posts stand in front either way and read as columns). Once
  // answered, the overview says it on the floor between the frames, in copper: the clear width between the outer
  // columns' axes, «без колон», or with a centre row its two widths and the row itself lit.
  const clearD = bays > 1 ? 1.5 * s : s / 2;
  const clearSpans: Pt[] = centre ? [[0, W / 2], [W / 2, W]] : [[0, W]];
  const clearLine = clearSpans.map(([a, b]) => `${line([a, clearD, 0], [b, clearD, 0])}${groundTick([a, clearD, 0])}${groundTick([b, clearD, 0])}`).join('');
  const clearLabels = clearSpans.map(([a, b]) => {
    const [x, y] = xy([(a + b) / 2, clearD, 0]);
    return { text: centre ? metres(b - a) : `${metres(b - a)} без колон`, x, y: y - 10 };
  });
  const centreRow = centre ? frames.map((d) => line([W / 2, d, 0], [W / 2, d, E])).join('') : '';

  return {
    W, lengthM, E, truss, centre,
    slab, groundHatch, footings: footings.map((footing) => footing.d), footingTops: footings.map((footing) => footing.top).join(''), backColumns, backRoofs, longitudinals, farEnd, purlins, girts, posts, openingOutlines,
    wallBracing, farBracing, roofBracing, laterBracing, laterFarBracing,
    windPosts: windPosts.map(({ x, top }) => line([x, 0, 0], [x, 0, top])).join(''),
    // the front frame's columns, the centre row's Б among them: on the span's step it stood stepped back with the frame's
    // roof, and its axis over it read as a dashed column (09.10, audit F126) — the step's words name Б, so it lights
    frontColumns: columnsAt(0), frontRoof: roofAt(0), spanDim, heightDim, bayDim,
    spanAxes, spanBubbles, letters, values, hValueAt,
    snowArrows, snowStrip, stripEdges, stripPurlins, snowFrame: roofAt(s), snowColumns: columnsAt(s), snowFootings,
    snowGround: groundUnder(columnXs.map((x) => [x, s, -1.1] as P3)), snowFlow,
    windArrows, endWall, braceFootings, windGround: groundUnder(braceBases.map(([x, d]) => [x, d, -1.1] as P3)), windFlow, ghost,
    tags: { frame: frameTags, bays: baysTags },
    nodePoints,
    clear: { answer: domain.internalSupports, answered: domain.internalSupports !== 'unknown', line: clearLine, labels: clearLabels, centreRow },
    cameras: { span: shot(spanCamera), frame: shot(frameCamera), bays: shot(baysCamera), snow: shot(snowCamera), wind: shot(windCamera), overview: shot(overviewCamera) },
  };
}

type TourStep = { title: string; text: string; caption: string; focus: Pt; zoom: number };

/** The legend above the drawing in the two load steps: its links light one after another, with the drawing */
const snowChain = (truss: boolean) => ['Покрівля', 'Прогони', truss ? 'Ферма' : 'Ригель рами', 'Колони', 'Фундаменти', 'Ґрунт'];
const WIND_CHAIN = ['Торцева стіна', 'Стійки фахверку', 'В’язі покрівлі', 'В’язі стін', 'Фундаменти'];
/** The wind's links that are the bracing: they step back while the leaning bay shows what they prevent */
const BRACE_LINKS = new Set([2, 3]);
/** How long each step holds (03.10): long enough for what it builds — the wind's chain and its leaning bay the longest */
const STEP_DURATIONS = [4200, 4800, 5200, 6400, 7600] as const;
const at = (index: number) => ({ '--n': index }) as CSSProperties;
/** An arrow's own beat in the falling snow and the wind's gusts */
const beat = (index: number) => ({ '--k': index }) as CSSProperties;
/** The frame drawing's model from the business configuration: its geometry, the five steps and the title block's words —
 *  for the configurator's «Каркас» view (07.10) */
export function useFrameTourModel() {
  const inquiry = useHangarInquiryContext();
  const state = inquiry?.state ?? DEFAULT_CONFIGURATOR_STATE;
  const domain = useMemo(() => deriveDomainModel(state), [state]);
  const g = useMemo(() => frameGeometry(domain), [domain]);
  const summary = deriveSummary(domain);
  // the sizes said as the visitor gave them, one rule with the sheet and the stamp (08.10, audit): their own, the
  // example's, or an orientation while they look for theirs
  const provenance = sizesProvenance(domain);
  const where = { own: 'у вашій конфігурації', example: 'у прикладі', approx: 'орієнтовно' }[provenance];

  const steps: TourStep[] = [
    // With a centre row the width between the outer axes holds two spans, so it is not called the span (owner, 03.10)
    g.centre
      ? {
        title: 'Ширина L',
        text: keepMarks(`L — ${metres(g.W)} між осями крайніх колон А і В ${where}. Центральний ряд Б ділить її на два прольоти. H — висота стіни.`),
        caption: 'Ширина між крайніми колонами',
        ...g.cameras.span,
      }
      : {
        title: 'Проліт L',
        text: keepMarks(`Проліт L — відстань між осями крайніх колон А і Б: ${metres(g.W)} ${where}. Усередині колон немає. H — висота стіни.`),
        caption: 'Проліт між крайніми колонами',
        ...g.cameras.span,
      },
    {
      title: g.truss ? 'Ферма' : 'Рама',
      text: keepMarks(summary.structuralVisualizationDescription),
      caption: keepMarks(summary.structuralVisualizationLabel),
      ...g.cameras.frame,
    },
    {
      title: 'Прогони й в’язі',
      text: keepMarks(`Прогони лежать на ${g.truss ? 'вузлах ферм' : 'рамах'} і несуть покрівлю, стінові прогони — обшивку стін; у торцевій стіні їх тримають стійки фахверку. В’язі в крайньому кроці зв’язують рами між собою, щоб каркас тримав форму вздовж будівлі. Крок рам a уточнює розрахунок.`),
      caption: 'Прогони й в’язі в крайньому кроці рам',
      ...g.cameras.bays,
    },
    {
      title: 'Сніг на покрівлі',
      text: keepMarks(`Сніг тисне на покрівлю. Кожна ${g.truss ? 'ферма' : 'рама'} збирає його зі своєї смуги — по половині кроку з обох боків: прогони передають навантаження на ${g.truss ? 'ферму' : 'раму'}, вона — на колони, колони — на фундаменти, а ті — у ґрунт.`),
      caption: 'Шлях навантаження від снігу',
      ...g.cameras.snow,
    },
    {
      title: 'Вітер у торець',
      text: keepMarks('Вітер тисне на торцеву стіну вздовж будівлі. Стійки фахверку передають зусилля на фундаменти й на в’язі покрівлі, а ті — через в’язі обох поздовжніх стін на фундаменти. Без в’язей рами схилилися б уздовж будівлі, як доміно, — в’язі тримають їх рівно.'),
      caption: 'Шлях навантаження від вітру',
      ...g.cameras.wind,
    },
  ];
  /** The title block's «Що показано»: every caption laid out in one cell, only the shown one visible — the cell is as
   *  tall as the longest at any width, so the sheet no longer changes height from step to step (04.10) */
  const captions = [OVERVIEW_CAPTION, ...steps.map((item) => item.caption)];
  return { g, summary, steps, captions };
}

export const FRAME_TOUR_DURATIONS = STEP_DURATIONS;

/** A node of the front frame the configurator's «Каркас» view lets the visitor open (07.10) */
export type FrameNode = { id: string; title: string; text: string; at: Pt; focus: Pt; zoom: number };

/** The camera on a node: pushed in close, the node and a little round it in the window */
function nodeShot(at: Pt) {
  return shot(camera(at, 2.4, around(at, 60)));
}

/** The nodes, in the order they are offered. Schematic words only — what the node does and that the project decides how it
 *  is made; Сергій Іванович reads them before they are final. */
export function frameNodes(g: ReturnType<typeof frameGeometry>): FrameNode[] {
  const { nodePoints: at, truss } = g;
  const list: (FrameNode | null)[] = truss
    ? [
      { id: 'heel', title: 'Опорний вузол', at: at.heel, ...nodeShot(at.heel), text: 'Тут ферма спирається на колону: усе, що ферма зібрала з покрівлі, разом зі снігом, переходить у колону. Як з’єднати ферму з колоною, визначає проєкт.' },
      { id: 'ridge', title: 'Коньковий вузол', at: at.ridge, ...nodeShot(at.ridge), text: 'Верх ферми, де сходяться обидва схили. Велику ферму можна виготовити двома половинами й з’єднати тут на монтажі, щоб її було легше привезти. Чи буде стик, вирішує проєкт.' },
      at.web && { id: 'web', title: 'Вузол решітки', at: at.web, ...nodeShot(at.web), text: 'Тут розкоси сходяться з нижнім поясом. Осі стрижнів зводять в одну точку: тоді ферма працює на розтяг і стиск, а не на згин.' },
      at.purlin && { id: 'purlin', title: 'Прогін на вузлі', at: at.purlin, ...nodeShot(at.purlin), text: 'Прогони кладуть у вузли верхнього пояса: вага покрівлі й снігу приходить прямо у вузол, а не в середину стрижня, де пояс згинався б.' },
      { id: 'base', title: 'База колони', at: at.base, ...nodeShot(at.base), text: 'Колона стоїть на фундаменті через опорну плиту з анкерами. Тип фундаменту й анкерів визначає проєктувальник за ґрунтом і навантаженнями.' },
    ]
    : [
      { id: 'heel', title: 'Карнизний вузол', at: at.heel, ...nodeShot(at.heel), text: 'Тут ригель рами з’єднується з колоною. Вузол жорсткий: він тримає форму рами, тому біля нього ригель роблять вищим.' },
      { id: 'ridge', title: 'Коньковий вузол', at: at.ridge, ...nodeShot(at.ridge), text: 'Верх рами, де сходяться два ригелі. Тут їх з’єднують на монтажі; як саме, визначає проєкт.' },
      { id: 'base', title: 'База колони', at: at.base, ...nodeShot(at.base), text: 'Колона стоїть на фундаменті через опорну плиту з анкерами. Тип фундаменту й анкерів визначає проєктувальник за ґрунтом і навантаженнями.' },
    ];
  // no short word left at a line's end (10.10, audit F103: «половинами й / з’єднати»)
  return list.filter((item): item is FrameNode => Boolean(item)).map((item) => ({ ...item, text: keepShortWords(item.text) }));
}

/** The legend, the camera's window with the drawing, and the progress bars: the picture of the frame tour, in the
 *  section's sheet or in the configurator's (07.10). With `nodes`, the front frame's nodes are marked on the frame's
 *  step and the chosen one is circled; the camera is the caller's (`active`). */
export function FrameTourStage({
  g,
  summary,
  visualRef,
  size,
  active,
  step,
  run,
  count,
  nodes,
  node,
  onNode,
}: Readonly<{
  g: ReturnType<typeof frameGeometry>;
  summary: ReturnType<typeof deriveSummary>;
  visualRef: RefObject<HTMLDivElement | null>;
  size: StageSize | null;
  active: TourFocus | undefined;
  step: number;
  run: number;
  count: number;
  nodes?: readonly FrameNode[];
  node?: string | null;
  onNode?: (id: string) => void;
}>) {
  // A node's target on the drawing (10.10, audit F119): about 30 px across on the screen — on a phone the 40 units it was
  // came to 17–23 px — never less than those 40 units, and never reaching a neighbour's: under half the way to the
  // nearest. The screen's pixels to a unit, as stageTransform scales the picture.
  const pxPerUnit = size ? Math.max(size.width / VIEW.width, size.height / VIEW.height) * (active?.zoom ?? 1) : 0;
  const hitRadius = (at: Pt) => {
    const nearest = Math.min(...(nodes ?? []).filter((other) => other.at !== at).map((other) => Math.hypot(other.at[0] - at[0], other.at[1] - at[1])));
    return Math.min(Math.max(20, pxPerUnit ? 15 / pxPerUnit : 0), nearest / 2 - 1);
  };
  return (
    <>
          {/* The legend, in its own band above the camera's window, so it never covers the drawing: both chains and the note
              always laid out there, so the band is as tall as the tallest and nothing moves from step to step */}
          <div className="ft-legend" aria-hidden="true">
            <ol className="ft-chain" data-load="snow">
              {snowChain(g.truss).map((link, index) => <li key={link} style={at(index)}>{link}</li>)}
            </ol>
            <ol className="ft-chain" data-load="wind">
              {WIND_CHAIN.map((link, index) => <li key={link} style={at(index)} data-brace={BRACE_LINKS.has(index) || undefined}>{link}</li>)}
            </ol>
            <p className="ft-note">Деформацію показано умовно, у{'\u00A0'}збільшеному масштабі</p>
            {/* the drawing's note on what it does not decide (10.10): the footings are a type hint, the designer's to choose —
                in the band the loads' chains take on their own steps, so it costs the sheet no height */}
            <p className="ft-remark">Фундаменти показано умовно</p>
          </div>
          {/* the camera's window: the picture's own proportion (on a phone the legend's band sits above it), in a slot that
              on a computer is the height the sheet leaves under the legend, so the window fits it whole (09.10, F15) */}
          <div className="ft-slot">
          <div className="ft-window" ref={visualRef}>
            <div className="dn-stage is-drawing" style={{ transform: stageTransform(size, VIEW, active) }}>
              <svg className="ft-drawing" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Схема каркаса: ${summary.structuralVisualizationLabel.toLowerCase()}, ${g.centre ? 'ширина' : 'проліт'} ${metres(g.W)}; шлях навантаження від снігу й вітру; фундаменти показано умовно`}>
                <defs>
                  <filter id="ft-glow" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="2.2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <path className="ft-slab" d={g.slab} />
                <path className="ft-ground" d={g.groundHatch} />
                {g.footings.map((d) => <path key={d} className="ft-footing" d={d} />)}
                {/* where the columns and posts stand on their pedestals, at the ground */}
                <path className="ft-footing-top" d={g.footingTops} />
                {/* the axes across the span run through the front columns, under them */}
                <g className="ft-part" data-part="1">
                  <path className="ft-axis" d={g.spanAxes} />
                </g>
                {/* the structure, back to front */}
                <path className="ft-back" data-build-stage="columns" pathLength={1} d={g.backColumns} />
                <path className="ft-back" data-build-stage="roof" pathLength={1} d={`${g.backRoofs}${g.longitudinals}${g.farEnd}`} />
                {/* the gates and the door on the near end wall, as the configurator places them (04.10) */}
                {g.openingOutlines && <path className="ft-opening" d={g.openingOutlines} />}
                <g className="ft-part" data-part="3">
                  <path className="ft-thin" pathLength={1} d={`${g.purlins}${g.girts}`} />
                  <path className="ft-post" pathLength={1} d={g.posts} />
                  <path className="ft-brace ft-brace-far" pathLength={1} d={g.farBracing} />
                  <path className="ft-brace" pathLength={1} d={g.wallBracing} />
                  <path className="ft-brace" pathLength={1} d={g.roofBracing} />
                  {g.laterBracing && <path className="ft-brace ft-brace-far" pathLength={1} d={g.laterFarBracing} />}
                  {g.laterBracing && <path className="ft-brace" pathLength={1} d={g.laterBracing} />}
                  <path className="ft-dim" d={g.bayDim} />
                  <text className="ft-letter" data-anchor="start" x={n(g.letters.a[0])} y={n(g.letters.a[1])}>a</text>
                </g>
                {/* the front columns belong to the span and to the frame */}
                <g className="ft-part" data-part="1 2">
                  <path className="ft-member" pathLength={1} d={g.frontColumns} />
                </g>
                <g className="ft-part" data-part="1">
                  <path className="ft-dim" pathLength={1} d={g.spanDim} />
                  <text className="ft-letter" x={n(g.letters.L[0])} y={n(g.letters.L[1])}>L{g.values && <tspan className="ft-value">{g.values.L}</tspan>}</text>
                  <path className="ft-dim" d={g.heightDim} />
                  <text className="ft-letter" data-anchor="end" x={n(g.letters.H[0])} y={n(g.letters.H[1])}>H</text>
                  {g.values && <text className="ft-letter ft-value" data-anchor="end" x={n(g.hValueAt[0])} y={n(g.hValueAt[1])}>{g.values.H}</text>}
                  {g.spanBubbles.map(({ label, at: [x, y] }) => (
                    <g key={label} className="ft-bubble"><circle cx={n(x)} cy={n(y)} r={11} /><text x={n(x)} y={n(y + 5)}>{label}</text></g>
                  ))}
                </g>
                <g className="ft-part" data-part="2">
                  <path className="ft-member" pathLength={1} d={g.frontRoof} />
                </g>
                {/* the visitor's answer on the columns, on the overview only; keyed by it, so a new answer draws anew */}
                {g.clear.answered && (
                  <g key={`${g.clear.answer}-${g.centre}`} className="ft-clear" aria-hidden="true">
                    {g.clear.centreRow && <path className="ft-clear-row" pathLength={1} d={g.clear.centreRow} />}
                    <path className="ft-clear-line" pathLength={1} d={g.clear.line} />
                    {g.clear.labels.map(({ text, x, y }) => <text key={`${text}-${n(x)}`} className="ft-clear-label" x={n(x)} y={n(y)}>{text}</text>)}
                  </g>
                )}

                {/* the members named, for the frame and the bays */}
                {([['2', g.tags.frame], ['3', g.tags.bays]] as const).map(([part, list]) => (
                  <g key={part} className="ft-tags" data-tags={part} aria-hidden="true">
                    {list.map((item) => (
                      <g key={item.label}>
                        <path className="ft-leader" d={item.d} />
                        <text className="ft-tag" x={n(item.x)} y={n(item.y)} textAnchor={item.anchor}>
                          {item.lines.length > 1
                            ? item.lines.map((row, index) => <tspan key={row} x={n(item.x)} dy={index ? '1.1em' : undefined}>{row}</tspan>)
                            : item.label}
                        </text>
                      </g>
                    ))}
                  </g>
                ))}

                {/* the front frame's nodes, on the frame's step (07.10): a pointer opens one; the buttons under the
                  drawing are the way for the keyboard and a screen reader */}
                {nodes && (
                  <g className="ft-nodes" aria-hidden="true">
                    {nodes.map((item, index) => (
                      <g key={item.id} className="ft-node" data-on={node === item.id || undefined} onClick={() => onNode?.(item.id)}>
                        <circle className="ft-node-hit" cx={n(item.at[0])} cy={n(item.at[1])} r={n(hitRadius(item.at))} />
                        {/* numbered as the buttons under the drawing are */}
                        <g className="ft-node-mark" style={{ transformOrigin: `${n(item.at[0])}px ${n(item.at[1])}px` }}>
                          <circle className="ft-node-ring" cx={n(item.at[0])} cy={n(item.at[1])} r={9} />
                          <text className="ft-node-number" x={n(item.at[0])} y={n(item.at[1] + 3.6)}>{index + 1}</text>
                        </g>
                      </g>
                    ))}
                  </g>
                )}
                {/* snow: the links light in turn (--n), as the legend does, and the drops run on each link as it lights */}
                <g className="ft-load" data-load="snow" aria-hidden="true">
                  <path className="ft-link ft-plane" style={at(0)} d={g.snowStrip} />
                  <path className="ft-link ft-edge" style={at(0)} d={g.stripEdges} />
                  {g.snowArrows.map((d, index) => <path key={d} className="ft-arrows" style={beat((index * 3) % 8)} d={d} />)}
                  <path className="ft-link" style={at(1)} d={g.stripPurlins} />
                  <path className="ft-link" style={at(2)} d={g.snowFrame} />
                  <path className="ft-link" style={at(3)} d={g.snowColumns} />
                  <path className="ft-link ft-link-footing" style={at(4)} d={g.snowFootings} />
                  <path className="ft-link" style={at(5)} d={g.snowGround} />
                  {g.snowFlow.map(({ d, link }) => <path key={d} className="ft-flow" style={at(link)} d={d} />)}
                </g>
                {/* wind: the same, then the bracing steps back while the first bay leans as it would without it */}
                <g className="ft-load" data-load="wind" aria-hidden="true">
                  <path className="ft-link ft-plane" style={at(0)} d={g.endWall} />
                  {g.windArrows.map((d, index) => <path key={d} className="ft-arrows ft-arrows-wind" style={beat((Math.floor(index / 3) + 2 * (index % 3)) % 3)} d={d} />)}
                  <path className="ft-link" style={at(1)} d={g.windPosts} />
                  <path className="ft-link" style={at(2)} data-brace="" d={g.roofBracing} />
                  <path className="ft-link" style={at(3)} data-brace="" d={`${g.wallBracing}${g.farBracing}`} />
                  <path className="ft-link ft-link-footing" style={at(4)} d={g.braceFootings} />
                  <path className="ft-link" style={at(4)} d={g.windGround} />
                  {g.windFlow.map(({ d, link }) => <path key={d} className="ft-flow" style={at(link)} data-brace={BRACE_LINKS.has(link) ? '' : undefined} d={d} />)}
                  <path className="ft-ghost" d={g.ghost} />
                </g>
              </svg>
            </div>
          </div>
          </div>
          <TourProgress count={count} step={step} run={run} className="ft-progress" />
    </>
  );
}
