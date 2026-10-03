'use client';

import { useMemo, type CSSProperties } from 'react';
import { DrawingSheet } from '../DrawingSheet';
import { stageTransform, useDrawingTour } from '../useDrawingTour';
import { useHangarInquiryContext } from '../configurator/HangarInquiryContext';
import { sameBusinessConfiguration } from '../../lib/configurator/attachmentContract';
import { deriveDomainModel, type HangarDomainModel } from '../../lib/configurator/domainModel';
import { deriveSummary } from '../../lib/configurator/deriveSummary';
import { deriveBayLayout, ridgeHeightM } from '../../lib/configurator/parametricModel';
import { DEFAULT_CONFIGURATOR_STATE } from '../../lib/configurator/types';
import { TourControl, TourProgress, TourSteps, tourStepCell } from '../directions/TourParts';
import './frame-tour.css';

// /angary «Каркас вашого ангара — від покрівлі до основи» (UX review 2026-10; redrawn 03.10 — owner: «не завжди
// зрозуміло конструктив», with a load-path reference he liked). The visitor's own frame — span, wall and ridge
// heights, truss or portal frame, the centre row of supports — as a wireframe of its first bays in the drawing-office
// dimetric (the span at 7°, true size; the length at 41°, half size — so the gable keeps its shape): columns,
// trusses or rafters, purlins on the roof, wall purlins on the side wall, bracing in the first bay, and the footings
// drawn dashed, because their type is the designer's.
//
// Five steps, the camera pushing in as on the direction nodes: the span, the frame, purlins and bracing — then two
// loads followed through the structure link by link, each link lighting in copper with its name in the legend over
// the drawing: snow on one frame's strip of roof (roof → purlins → truss → columns → footings → ground) and wind on the end wall (end
// wall → roof bracing → wall bracing → footings), which is what the bracing is for. Schematic: letters on the
// dimension lines, no sizes or forces; every number on the page is the configurator's own. Reads the business
// configuration only, attaches nothing. One automatic tour per page — this one.

type P3 = readonly [number, number, number];
const VIEW = { width: 720, height: 440 };
/** Bays drawn at most; a longer building continues past a break */
const BAYS = 3;
/** How far in front of the end wall the wind arrows start, m */
const WIND = 5.5;
const fmt = (value: number) => value.toLocaleString('uk-UA', { maximumFractionDigits: 1 });
const n = (value: number) => value.toFixed(1);

/** Dimetric axes on the sheet: x — across the span, right and a little down; d — along the building, right and up */
const AX = [Math.cos((7.18 * Math.PI) / 180), Math.sin((7.18 * Math.PI) / 180)] as const;
const AD = [0.5 * Math.cos((41.42 * Math.PI) / 180), -0.5 * Math.sin((41.42 * Math.PI) / 180)] as const;
/** The unit along +d on the sheet, and its normal: the wind arrows' heads */
const DIR = [AD[0] / 0.5, AD[1] / 0.5] as const;
const unit = ([x, d, z]: P3) => [x * AX[0] + d * AD[0], x * AX[1] + d * AD[1] - z] as const;

function frameGeometry(domain: HangarDomainModel) {
  const { widthM: W, lengthM, eaveHeightM: E } = domain.dimensions;
  const R = ridgeHeightM(W, E, domain.roof.pitchDeg);
  const layout = deriveBayLayout(lengthM);
  const s = layout.spacingM;
  const bays = Math.min(layout.bayCount, BAYS);
  const continues = layout.bayCount > BAYS;
  const DEP = bays * s;
  const end = continues ? DEP + s * 0.45 : DEP;
  const truss = domain.structural.roofStructure === 'truss';
  const centre = domain.structural.scheme === 'centerSupport';
  const roofZ = (x: number) => E + (R - E) * (1 - Math.abs(x - W / 2) / (W / 2));

  // Fit the frame with its footings, dimensions and the wind arrows into the sheet: room on top for the snow arrows
  const extremes: P3[] = [
    [-0.9, -0.75, -1.1], [-3.6, 0, E / 2], [0, -2.9, -1.4], [W, -2.9, -1.4], [W * 0.2, -WIND, E * 0.25], [W * 0.8, -WIND, E * 0.25],
    [W + 0.75, -0.75, -1.1], [W + 4.6, s / 2, 0], [W + 1.4, end, 0], [W + 0.75, DEP + 0.75, -1.1], [0, end, E + 0.8],
    [W / 2, end, R + 0.8], [W, end, E + 0.8], [W / 2, 0, R],
  ];
  const raw = extremes.map(unit);
  const [minX, maxX] = [Math.min(...raw.map(([x]) => x)), Math.max(...raw.map(([x]) => x))];
  const [minY, maxY] = [Math.min(...raw.map(([, y]) => y)), Math.max(...raw.map(([, y]) => y))];
  // room on top for the snow arrows and, on a phone, the legend's row
  const pad = { side: 22, top: 62, bottom: 24 };
  const k = Math.min((VIEW.width - 2 * pad.side) / (maxX - minX), (VIEW.height - pad.top - pad.bottom) / (maxY - minY));
  const ox = pad.side + (VIEW.width - 2 * pad.side - (maxX - minX) * k) / 2 - minX * k;
  const oy = pad.top + (VIEW.height - pad.top - pad.bottom - (maxY - minY) * k) / 2 - minY * k;
  const xy = (point: P3) => { const [x, y] = unit(point); return [ox + x * k, oy + y * k] as const; };
  const p = (point: P3) => xy(point).map(n).join(',');
  const line = (...points: P3[]) => `M${points.map(p).join('L')}`;
  const frames = Array.from({ length: bays + 1 }, (_, index) => index * s);

  // ── the frame ──
  const columnXs = centre ? [0, W / 2, W] : [0, W];
  const columnsAt = (d: number, xs: readonly number[] = columnXs) => xs.map((x) => line([x, d, 0], [x, d, E])).join('');
  const knee = Math.min(1.6, W / 8);
  const roofAt = (d: number) => truss
    ? [
      line([0, d, E], [W / 2, d, R], [W, d, E]),
      line([0, d, E], [W, d, E]),
      `M${Array.from({ length: 9 }, (_, index) => p([(index * W) / 8, d, index % 2 === 0 ? E : roofZ((index * W) / 8)])).join('L')}`,
    ].join('')
    : [
      line([0, d, E], [W / 2, d, R], [W, d, E]),
      // haunches at the knees
      line([0, d, E - knee * 0.75], [knee, d, roofZ(knee)]),
      line([W, d, E - knee * 0.75], [W - knee, d, roofZ(W - knee)]),
    ].join('');
  const backFrames = frames.slice(1).map((d) => `${columnsAt(d)}${roofAt(d)}`).join('');
  const zig = (point: P3) => { const [x, y] = xy(point); return `M${n(x)},${n(y)}l4,-7l5,7l4,-7`; };
  const edges: P3[] = [[0, 0, E], [W, 0, E], [W / 2, 0, R], [W, 0, 0], [0, 0, 0]];
  const longitudinals = edges.map(([x, , z]) => `${line([x, 0, z], [x, end, z])}${continues ? zig([x, end, z]) : ''}`).join('');
  // the far end wall, when all the building's bays are drawn
  const farEnd = continues ? '' : line([0, DEP, 0], [W, DEP, 0]);

  // Purlins on the roof, wall purlins on the near side wall and the end wall; bracing in the first bay
  const purlinXs = [1 / 3, 2 / 3].flatMap((t) => [(t * W) / 2, W - (t * W) / 2]);
  const purlins = purlinXs.map((x) => line([x, 0, roofZ(x)], [x, end, roofZ(x)])).join('');
  const girts = [E / 3, (2 * E) / 3].map((z) => `${line([W, 0, z], [W, end, z])}${line([0, 0, z], [W, 0, z])}`).join('');
  const wallBracing = `${line([W, 0, 0], [W, s, E])}${line([W, s, 0], [W, 0, E])}`;
  const roofBracing = `${line([W, 0, E], [W / 2, s, R])}${line([W, s, E], [W / 2, 0, R])}`;

  // Footings: a dashed box under every column (the type is the designer's), its visible edges only
  const box = (x: number, d: number) => {
    const b = 0.75;
    const h = 1.1;
    return [
      line([x - b, d - b, 0], [x + b, d - b, 0], [x + b, d + b, 0], [x - b, d + b, 0], [x - b, d - b, 0]),
      line([x - b, d - b, 0], [x - b, d - b, -h], [x + b, d - b, -h], [x + b, d + b, -h], [x + b, d + b, 0]),
      line([x + b, d - b, 0], [x + b, d - b, -h]),
    ].join('');
  };
  const footings = frames.flatMap((d) => columnXs.map((x) => box(x, d))).join('');
  const groundUnder = (points: readonly P3[]) => points.map((point) => {
    const [cx, cy] = xy(point);
    return [9, 16].map((r) => `M${n(cx - r)},${n(cy + r * 0.3)}q${r},${n(r * 0.5)} ${r * 2},0`).join('');
  }).join('');
  const slab = line([-1.4, -1.4, 0], [W + 1.4, -1.4, 0], [W + 1.4, end, 0]);

  // Dimensions: the span L in front, the wall height H at the near-left column, the frame spacing a along the side
  const tick = (point: P3) => { const [x, y] = xy(point); return `M${n(x - 4)},${n(y - 2.3)}l8,4.6`; };
  const spanDim = `${line([0, -2.4, 0], [W, -2.4, 0])}${tick([0, -2.4, 0])}${tick([W, -2.4, 0])}${line([0, -0.9, 0], [0, -2.9, 0])}${line([W, -0.9, 0], [W, -2.9, 0])}`;
  const heightDim = (() => {
    const [bx, by] = xy([-2.2, 0, 0]);
    const [, ty] = xy([-2.2, 0, E]);
    return `M${n(bx)},${n(by)}V${n(ty)}M${n(bx - 5)},${n(by)}h10M${n(bx - 5)},${n(ty)}h10${line([-0.9, 0, E], [-2.6, 0, E])}`;
  })();
  const bayDim = `${line([W + 2.3, 0, 0], [W + 2.3, s, 0])}${tick([W + 2.3, 0, 0])}${tick([W + 2.3, s, 0])}${line([W + 0.9, 0, 0], [W + 2.8, 0, 0])}${line([W + 0.9, s, 0], [W + 2.8, s, 0])}`;

  // ── snow, followed through one frame (the second): the strip of roof it carries — half a bay either side — then
  //    its purlins, the frame, its columns, footings and the ground ──
  const [s0, s1] = [s / 2, (3 * s) / 2];
  const snowArrows = [0.72, 1.28].flatMap((t) => [0.17, 0.38, 0.62, 0.83].map((f) => {
    const [ax, ay] = xy([W * f, t * s, roofZ(W * f)]);
    return `M${n(ax)},${n(ay - 26)}V${n(ay - 4)}M${n(ax - 3.5)},${n(ay - 10)}L${n(ax)},${n(ay - 4)}L${n(ax + 3.5)},${n(ay - 10)}`;
  })).join('');
  const plane = (...points: P3[]) => `M${points.map(p).join('L')}Z`;
  const snowStrip = `${plane([0, s0, E], [W / 2, s0, R], [W / 2, s1, R], [0, s1, E])}${plane([W / 2, s0, R], [W, s0, E], [W, s1, E], [W / 2, s1, R])}`;
  const stripEdges = `${line([0, s0, E], [W / 2, s0, R], [W, s0, E])}${line([0, s1, E], [W / 2, s1, R], [W, s1, E])}`;
  const stripPurlins = purlinXs.map((x) => line([x, s0, roofZ(x)], [x, s1, roofZ(x)])).join('');
  const snowFootings = columnXs.map((x) => box(x, s)).join('');
  // drops running down that frame, from the ridge to the footings
  const snowFlow = [
    line([W / 2, s, R], [0, s, E], [0, s, -1]),
    line([W / 2, s, R], [W, s, E], [W, s, -1]),
    ...(centre ? [line([W / 2, s, E], [W / 2, s, -1])] : []),
  ];

  // ── wind on the near end wall, along the building: end wall → roof bracing → wall bracing → footings ──
  const head = (tip: P3) => {
    const [tx, ty] = xy(tip);
    // the arrow points along +d; its head opens back along −d
    const [bx, by] = [tx - 8 * DIR[0], ty - 8 * DIR[1]];
    return `M${n(bx - 4 * DIR[1])},${n(by + 4 * DIR[0])}L${n(tx)},${n(ty)}L${n(bx + 4 * DIR[1])},${n(by - 4 * DIR[0])}`;
  };
  const windArrows = [0.25, 0.55, 0.85].flatMap((h) => [0.2, 0.5, 0.8].map((f) => {
    const z = Math.min(E * h, roofZ(W * f) - 0.6);
    return `${line([W * f, -WIND, z], [W * f, -0.5, z])}${head([W * f, -0.5, z])}`;
  })).join('');
  const endWall = plane([0, 0, 0], [W, 0, 0], [W, 0, E], [W / 2, 0, R], [0, 0, E]);
  const braceFootings = `${box(W, 0)}${box(W, s)}`;
  const windFlow = [line([W / 2, 0, R], [W, s, E], [W, 0, 0], [W, 0, -1]), line([W / 2, s, R], [W, 0, E], [W, s, 0], [W, s, -1])];

  // Names on the members for steps 2 and 3: a short leader from the member to its label
  const tag = (point: P3, dx: number, dy: number) => {
    const [x, y] = xy(point);
    return { d: `M${n(x)},${n(y)}l${dx},${dy}`, x: x + dx + (dx < 0 ? -4 : 4), y: y + dy + 5, anchor: dx < 0 ? 'end' as const : 'start' as const };
  };
  const tags = {
    frame: [
      { label: truss ? 'ферма' : 'ригель рами', ...tag([W * 0.3, 0, roofZ(W * 0.3)], -24, -30) },
      { label: 'колона', ...tag([W, 0, E * 0.3], 30, 12) },
    ],
    bays: [
      { label: 'прогони', ...tag([W - W / 6, s * 1.5, roofZ(W - W / 6)], 22, -26) },
      { label: 'стінові прогони', ...tag([W * 0.92, 0, E / 3], -14, 28) },
      { label: 'в’язі', ...tag([W, s * 0.62, E * 0.62], 34, -10) },
    ],
  };

  const focus = {
    span: xy([W / 2, 0, E * 0.4]),
    frame: xy([W / 2, 0, E * 0.6]),
    bays: xy([W * 0.86, s, E * 0.6]),
    overview: [VIEW.width / 2, VIEW.height / 2] as const,
    wind: xy([W * 0.62, -1.2, E * 0.45]),
  };
  const letter = (point: P3, dy = 0) => { const [x, y] = xy(point); return [x, y + dy] as const; };
  return {
    W, lengthM, E, truss, centre,
    slab, footings, backFrames, longitudinals, farEnd, purlins, girts, wallBracing, roofBracing,
    frontColumns: columnsAt(0, [0, W]), frontRoof: `${roofAt(0)}${centre ? columnsAt(0, [W / 2]) : ''}`, spanDim, heightDim, bayDim,
    snowArrows, snowStrip, stripEdges, stripPurlins, snowFrame: roofAt(s), snowColumns: columnsAt(s), snowFootings,
    snowGround: groundUnder(columnXs.map((x) => [x, s, -1.1] as P3)), snowFlow,
    windArrows, endWall, braceFootings, windGround: groundUnder([[W, 0, -1.1], [W, s, -1.1]]), windFlow,
    tags, focus,
    letters: { L: letter([centre ? W / 4 : W / 2, -2.4, 0], 24), H: letter([-3.3, 0, E / 2], 6), a: letter([W + 3.9, s / 2, 0], 16) },
  };
}

type TourStep = { title: string; text: string; caption: string; focus: readonly [number, number]; zoom: number };

/** The legend over the drawing in the two load steps: its links light one after another, with the drawing */
const snowChain = (truss: boolean) => ['Покрівля', 'Прогони', truss ? 'Ферма' : 'Ригель рами', 'Колони', 'Фундаменти', 'Ґрунт'];
const WIND_CHAIN = ['Торцева стіна', 'В’язі покрівлі', 'В’язі стін', 'Фундаменти'];
const at = (index: number) => ({ '--n': index }) as CSSProperties;

export function FrameTour({ titleId }: Readonly<{ titleId: string }>) {
  const inquiry = useHangarInquiryContext();
  const state = inquiry?.state ?? DEFAULT_CONFIGURATOR_STATE;
  const domain = useMemo(() => deriveDomainModel(state), [state]);
  const g = useMemo(() => frameGeometry(domain), [domain]);
  const summary = deriveSummary(domain);
  const own = !sameBusinessConfiguration(state, DEFAULT_CONFIGURATOR_STATE);

  const steps: TourStep[] = [
    {
      title: 'Проліт L',
      text: `Відстань між крайніми колонами — ${fmt(g.W)} м у вашій конфігурації. H — висота стіни.`,
      caption: 'Проліт між крайніми колонами',
      focus: g.focus.span,
      zoom: 1.3,
    },
    {
      title: g.truss ? 'Ферма' : 'Рама',
      text: summary.structuralVisualizationDescription,
      caption: summary.structuralVisualizationLabel,
      focus: g.focus.frame,
      zoom: 1.2,
    },
    {
      title: 'Прогони й в’язі',
      text: `Прогони лежать на ${g.truss ? 'фермах' : 'рамах'} й несуть покрівлю, стінові прогони — обшивку стін. В’язі зв’язують рами між собою, щоб каркас тримав форму вздовж будівлі. Крок рам a уточнює розрахунок.`,
      caption: 'Прогони й в’язі в першому прольоті',
      focus: g.focus.bays,
      zoom: 1.5,
    },
    {
      title: 'Сніг на покрівлі',
      text: `Сніг тисне на покрівлю. Кожна ${g.truss ? 'ферма' : 'рама'} збирає його зі своєї смуги — по половині кроку з обох боків: прогони передають навантаження на ${g.truss ? 'ферму' : 'раму'}, вона — на колони, колони — на фундаменти, а ті — у ґрунт.`,
      caption: 'Шлях навантаження від снігу',
      // the whole frame: no push-in
      focus: g.focus.overview,
      zoom: 1,
    },
    {
      title: 'Вітер у торець',
      text: 'Вітер тисне на торцеву стіну вздовж будівлі. Зусилля збирають в’язі покрівлі й передають на в’язі стін, а ті — на фундаменти. Для цього в’язі й потрібні.',
      caption: 'Шлях навантаження від вітру',
      focus: g.focus.wind,
      zoom: 1.15,
    },
  ];
  const { visualRef, step, touring, run, size, motion, choose, toggle, hover } = useDrawingTour(steps.length);
  const active = step ? steps[step - 1] : undefined;
  const object = `${own ? 'Ваш ангар' : 'Приклад'} · ${fmt(g.W)} × ${fmt(g.lengthM)} × ${fmt(g.E)} м`;
  let chain: readonly string[] | null = null;
  if (step === 4) chain = snowChain(g.truss);
  else if (step === 5) chain = WIND_CHAIN;

  return (
    <div className="shell direction-editorial-grid dn ft" data-layout="copy-first" data-step={step || undefined} data-touring={touring || undefined}>
      <div className="direction-editorial-copy">
        <p className="eyebrow"><span /> Схема каркаса</p>
        <h2 id={titleId}>Каркас вашого ангара — від покрівлі до основи</h2>
        <p>
          Креслення будується з вашої конфігурації — проліт, висоти, схема каркаса — і показує, як сніг і вітер проходять
          крізь каркас до основи. Це попередня схема без масштабу; фундаменти показано умовно — конструктив визначає
          проєктувальник.
        </p>
      </div>
      <TourSteps steps={steps} step={step} choose={choose} hover={hover} />
      <DrawingSheet
        className="direction-editorial-media dn-sheet ft-sheet"
        imageClassName="dn-visual ft-visual"
        imageRef={visualRef}
        cells={[
          tourStepCell(step, steps.length),
          { tone: 'main', label: 'Що показано', value: <span className="dn-caption">{active ? active.caption : 'Каркас, прогони й в’язі'}</span> },
          { label: 'Об’єкт', value: object, className: 'ft-object' },
        ]}
        action={motion && <TourControl touring={touring} toggle={toggle} what="каркаса" />}
      >
        <div className="dn-stage is-drawing" style={{ transform: stageTransform(size, VIEW, active) }}>
          <svg className="ft-drawing" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Схема каркаса: ${summary.structuralVisualizationLabel.toLowerCase()}, проліт ${fmt(g.W)} м; шлях навантаження від снігу й вітру`}>
            <defs>
              <filter id="ft-glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <path className="ft-slab" d={g.slab} />
            <path className="ft-footing" d={g.footings} />
            {/* the structure, back to front */}
            <path className="ft-back" d={`${g.backFrames}${g.longitudinals}${g.farEnd}`} />
            <g className="ft-part" data-part="3">
              <path className="ft-thin" d={`${g.purlins}${g.girts}`} />
              <path className="ft-brace" pathLength={1} d={g.wallBracing} />
              <path className="ft-brace" pathLength={1} d={g.roofBracing} />
              <path className="ft-dim" d={g.bayDim} />
              <text className="ft-letter" x={g.letters.a[0]} y={g.letters.a[1]}>a</text>
            </g>
            {/* the front columns belong to the span and to the frame */}
            <g className="ft-part" data-part="1 2">
              <path className="ft-member" pathLength={1} d={g.frontColumns} />
            </g>
            <g className="ft-part" data-part="1">
              <path className="ft-dim" pathLength={1} d={g.spanDim} />
              <text className="ft-letter" x={g.letters.L[0]} y={g.letters.L[1]}>L</text>
              <path className="ft-dim" d={g.heightDim} />
              <text className="ft-letter" x={g.letters.H[0]} y={g.letters.H[1]}>H</text>
            </g>
            <g className="ft-part" data-part="2">
              <path className="ft-member" pathLength={1} d={g.frontRoof} />
            </g>

            {/* the members named, for the frame and the bays */}
            {([['2', g.tags.frame], ['3', g.tags.bays]] as const).map(([part, list]) => (
              <g key={part} className="ft-tags" data-tags={part} aria-hidden="true">
                {list.map((item) => (
                  <g key={item.label}>
                    <path className="ft-leader" d={item.d} />
                    <text className="ft-tag" x={item.x} y={item.y} textAnchor={item.anchor}>{item.label}</text>
                  </g>
                ))}
              </g>
            ))}

            {/* snow: the links light in turn (--n), as the legend does; the drops run down the front frame */}
            <g className="ft-load" data-load="snow" aria-hidden="true">
              <path className="ft-link ft-plane" style={at(0)} d={g.snowStrip} />
              <path className="ft-link ft-edge" style={at(0)} d={g.stripEdges} />
              <path className="ft-arrows" d={g.snowArrows} />
              <path className="ft-link" style={at(1)} d={g.stripPurlins} />
              <path className="ft-link" style={at(2)} d={g.snowFrame} />
              <path className="ft-link" style={at(3)} d={g.snowColumns} />
              <path className="ft-link ft-link-footing" style={at(4)} d={g.snowFootings} />
              <path className="ft-link" style={at(5)} d={g.snowGround} />
              {g.snowFlow.map((d) => <path key={d} className="ft-flow" d={d} />)}
            </g>
            <g className="ft-load" data-load="wind" aria-hidden="true">
              <path className="ft-link ft-plane" style={at(0)} d={g.endWall} />
              <path className="ft-arrows ft-arrows-wind" d={g.windArrows} />
              <path className="ft-link" style={at(1)} d={g.roofBracing} />
              <path className="ft-link" style={at(2)} d={g.wallBracing} />
              <path className="ft-link ft-link-footing" style={at(3)} d={g.braceFootings} />
              <path className="ft-link" style={at(3)} d={g.windGround} />
              {g.windFlow.map((d) => <path key={d} className="ft-flow" d={d} />)}
            </g>
          </svg>
        </div>
        {chain && (
          <ol className="ft-chain" key={step} aria-hidden="true">
            {chain.map((link, index) => <li key={link} style={at(index)}>{link}</li>)}
          </ol>
        )}
        <TourProgress count={steps.length} step={step} run={run} className="ft-progress" />
      </DrawingSheet>
    </div>
  );
}
