'use client';

import { useMemo } from 'react';
import { DrawingSheet } from '../DrawingSheet';
import { stageTransform, useDrawingTour } from '../useDrawingTour';
import { useHangarInquiryContext } from '../configurator/HangarInquiryContext';
import { sameBusinessConfiguration } from '../../lib/configurator/attachmentContract';
import { deriveDomainModel, type HangarDomainModel } from '../../lib/configurator/domainModel';
import { deriveSummary } from '../../lib/configurator/deriveSummary';
import { deriveBayLayout, ridgeHeightM } from '../../lib/configurator/parametricModel';
import { DEFAULT_CONFIGURATOR_STATE, FOUNDATION_TYPE_LABELS } from '../../lib/configurator/types';
import { TourControl, TourProgress, TourSteps, tourStepCell } from '../directions/TourParts';
import './frame-tour.css';

// /angary «Каркас вашого ангара — від покрівлі до основи» (UX review 2026-10). It replaced three static schemes that
// ignored the configuration — one of them a flat box in another projection. The visitor's own frame (span, wall and
// ridge heights, frame or truss, the centre row of supports, the foundation they asked for) is drawn in the site's
// oblique — depth up-left at 45°, as on /yak and /pro-nas — and walked through in five steps, the way the direction
// nodes are: the camera pushes in on the part a step names and that part lights in copper. Step 4 sends the load from
// the roof down the frame into the footings as moving dots, the way the water runs on the roofing node.
//
// Letters on the dimension lines, no sizes: every number on this page is the configurator's own. It reads the business
// configuration only, never the presentation demo, and attaches nothing. One automatic tour per page — this one.

type P3 = readonly [number, number, number];
const VIEW = { width: 720, height: 440 };
const BAYS = 3;
const fmt = (value: number) => value.toLocaleString('uk-UA', { maximumFractionDigits: 1 });

function frameGeometry(domain: HangarDomainModel) {
  const { widthM, lengthM, eaveHeightM } = domain.dimensions;
  const ridgeM = ridgeHeightM(widthM, eaveHeightM, domain.roof.pitchDeg);
  const k = Math.min(440 / widthM, 196 / ridgeM);
  const W = widthM * k;
  const E = eaveHeightM * k;
  const R = ridgeM * k;
  const D = Math.min(Math.max(deriveBayLayout(lengthM).spacingM * k, 44), 70);
  const depth = D * BAYS;
  const tail = 22;
  const back = 0.4 * (depth + tail);
  const OX = Math.round((VIEW.width - (W + back + 70)) / 2 + back + 10);
  const OY = Math.round(Math.max(372, 40 + R + back));
  const p = ([x, d, z]: P3) => `${(OX + x - d * 0.4).toFixed(1)},${(OY - z - d * 0.4).toFixed(1)}`;
  const xy = (point: P3) => p(point).split(',').map(Number) as [number, number];
  const line = (...points: P3[]) => `M${points.map(p).join('L')}`;
  const truss = domain.structural.roofStructure === 'truss';
  const centre = domain.structural.scheme === 'centerSupport';
  const roofZ = (x: number) => E + (R - E) * (1 - Math.abs(x - W / 2) / (W / 2));
  const m = 7; // member depth, in drawing units

  const outline = (d: number) => line([0, d, 0], [0, d, E], [W / 2, d, R], [W, d, E], [W, d, 0]);
  const backFrames = Array.from({ length: BAYS }, (_, index) => (index + 1) * D).map((d) => [
    outline(d),
    truss ? line([0, d, E], [W, d, E]) : '',
    centre ? line([W / 2, d, 0], [W / 2, d, E]) : '',
  ].join('')).join('');
  const zig = (x: number, z: number) => {
    const d = depth + tail;
    return `${line([x, depth, z], [x, d - 8, z])}M${p([x, d - 8, z])}l-4,-8l8,5l-4,-8`;
  };
  const longitudinals = [zig(0, E), zig(W, E), zig(W / 2, R), line([0, 0, 0], [0, depth + tail, 0]), line([W, 0, 0], [W, depth + tail, 0])].join('');

  // The front frame in true shape: double-line columns; a portal rafter with its haunches, or a Warren truss
  const columns = `${line([0, 0, 0], [0, 0, E])}${line([m, 0, 0], [m, 0, truss ? E : E - 9])}${line([W, 0, 0], [W, 0, E])}${line([W - m, 0, 0], [W - m, 0, truss ? E : E - 9])}`;
  const slope = (R - E) / (W / 2);
  const roof = truss
    ? [
      line([0, 0, E], [W / 2, 0, R], [W, 0, E]),
      line([0, 0, E], [W, 0, E]),
      `M${Array.from({ length: 9 }, (_, index) => {
        const x = (index * W) / 8;
        return p([x, 0, index % 2 === 0 ? E : roofZ(x)]);
      }).join('L')}`,
    ].join('')
    : [
      line([0, 0, E], [W / 2, 0, R], [W, 0, E]),
      line([m, 0, E - 9], [W / 2, 0, R - 9], [W - m, 0, E - 9]),
      // haunches at the knees
      line([m, 0, E - 34], [m + 34, 0, E - 9 + 34 * slope]),
      line([W - m, 0, E - 34], [W - m - 34, 0, E - 9 + 34 * slope]),
    ].join('');
  const centreColumn = centre ? `${line([W / 2 - m / 2, 0, 0], [W / 2 - m / 2, 0, E])}${line([W / 2 + m / 2, 0, 0], [W / 2 + m / 2, 0, E])}` : '';

  // Bracing: an X in the first bay of the side wall and of the roof slope beside it
  const bracing = `${line([0, 0, 0], [0, D, E])}${line([0, D, 0], [0, 0, E])}${line([0, 0, E], [W / 2, D, R])}${line([0, D, E], [W / 2, 0, R])}`;

  // Footings / slab, by the visitor's foundation choice
  const columnXs = centre ? [m / 2, W / 2, W - m / 2] : [m / 2, W - m / 2];
  const pad3 = (x: number, d: number) => line([x - 15, d, 0], [x - 15, d, -16], [x + 15, d, -16], [x + 15, d, 0]);
  const pads = [0, D, 2 * D, 3 * D].flatMap((d) => columnXs.map((x) => pad3(x, d))).join('');
  const frontPads = columnXs.map((x) => pad3(x, 0)).join('');
  const slabFront = line([-10, 0, 0], [-10, 0, -10], [W + 10, 0, -10], [W + 10, 0, 0]);
  const slabTop = line([W + 10, 0, 0], [W + 10, depth + tail, 0]);
  const slabHatch = Array.from({ length: Math.floor((W + 20) / 14) }, (_, index) => {
    const x = -10 + index * 14 + 4;
    return line([x, 0, -10], [Math.min(x + 9, W + 10), 0, 0]);
  }).join('');
  const padHatch = columnXs.map((x) => [0, 1, 2].map((index) => line([x - 13 + index * 10, 0, -16], [x - 5 + index * 10, 0, -2])).join('')).join('');
  const foundationType = domain.foundation.type;
  const base = foundationType === 'slab' ? `${slabFront}${slabTop}` : foundationType === 'isolated' ? pads : frontPads;
  const baseHatch = foundationType === 'slab' ? slabHatch : foundationType === 'isolated' ? padHatch : '';

  // Dimensions: span L under the front, wall height H at the right, frame spacing a along the left base
  const [l1, l2] = [xy([0, 0, -40]), xy([W, 0, -40])];
  const [h1, h2] = [xy([W + 30, 0, 0]), xy([W + 30, 0, E])];
  const [a1, a2] = [xy([-30, 0, 0]), xy([-30, D, 0])];
  const span = `M${l1[0]},${l1[1]}H${l2[0]}M${l1[0]},${l1[1] - 7}v14M${l2[0]},${l2[1] - 7}v14`;
  const height = `M${h1[0]},${h1[1]}V${h2[1]}M${h1[0] - 7},${h1[1]}h14M${h2[0] - 7},${h2[1]}h14`;
  const bay = `M${a1[0]},${a1[1]}L${a2[0]},${a2[1]}M${a1[0] - 6},${a1[1] + 3}l12,-6M${a2[0] - 6},${a2[1] + 3}l12,-6`;

  // The load: three arrows onto the roof, then the path it takes down the front frame into the base
  const loads = [0.25, 0.5, 0.75].map((t) => {
    const x = W * t;
    const [ax, ay] = xy([x, 0, roofZ(x)]);
    return `M${ax},${ay - 42}V${ay - 6}M${ax - 5},${ay - 14}L${ax},${ay - 6}L${ax + 5},${ay - 14}`;
  }).join('');
  const flowSide = (side: 0 | 1) => {
    const x = side ? W - m / 2 : m / 2;
    return line([W / 2, 0, R - 4], [x, 0, (side ? E : E) - 4], [x, 0, -14]);
  };
  const flow = [flowSide(0), flowSide(1), centre ? line([W / 2, 0, E - 2], [W / 2, 0, -14]) : ''];

  const focus = {
    span: xy([W / 2, 0, E * 0.3]),
    roof: xy([W / 2, 0, (E + R) / 2]),
    bays: xy([0, D * 1.2, E * 0.55]),
    load: xy([W / 2, depth * 0.25, R * 0.45]),
    base: xy([m / 2, 0, -8]),
  };
  const letters = {
    L: [(l1[0] + l2[0]) / 2, l1[1] + 24] as const,
    H: [h1[0] + 16, (h1[1] + h2[1]) / 2 + 6] as const,
    a: [(a1[0] + a2[0]) / 2 - 16, (a1[1] + a2[1]) / 2 + 4] as const,
  };
  return {
    widthM, lengthM, eaveHeightM, ridgeM, truss, centre, foundationType,
    ground: `M${xy([-60, 0, 0]).join(',')}H${xy([W + 60, 0, 0])[0]}`,
    // soil under the front ground line, as on the section drawings
    soil: Array.from({ length: Math.floor((W + 110) / 16) }, (_, index) => {
      const [sx, sy] = xy([-54 + index * 16, 0, 0]);
      return `M${sx},${sy + 3}l-9,12`;
    }).join(''),
    backFrames, longitudinals, columns, roof, centreColumn, bracing, base, baseHatch, span, height, bay, loads, flow, focus, letters,
  };
}

type TourStep = { title: string; text: string; caption: string; focus: readonly [number, number]; zoom: number };

export function FrameTour({ titleId }: Readonly<{ titleId: string }>) {
  const inquiry = useHangarInquiryContext();
  const state = inquiry?.state ?? DEFAULT_CONFIGURATOR_STATE;
  const domain = useMemo(() => deriveDomainModel(state), [state]);
  const g = useMemo(() => frameGeometry(domain), [domain]);
  const summary = deriveSummary(domain);
  const own = !sameBusinessConfiguration(state, DEFAULT_CONFIGURATOR_STATE);

  const frameWord = g.truss ? 'ферму' : 'раму';
  const foundationLabel = FOUNDATION_TYPE_LABELS[g.foundationType];
  const steps: TourStep[] = [
    {
      title: 'Проліт L',
      text: `Відстань між крайніми колонами — ${fmt(g.widthM)} м у вашій конфігурації.`,
      caption: 'Проліт між крайніми колонами',
      focus: g.focus.span,
      zoom: 1.3,
    },
    {
      title: g.truss ? 'Ферма' : 'Рама',
      text: summary.structuralVisualizationDescription,
      caption: summary.structuralVisualizationLabel,
      focus: g.focus.roof,
      zoom: 1.6,
    },
    {
      title: 'Крок рам і в’язі',
      text: 'Рами повторюються з однаковим кроком a; в’язі зв’язують їх уздовж будівлі. Крок рам уточнює розрахунок.',
      caption: 'Крок рам і в’язі в першому прольоті',
      focus: g.focus.bays,
      zoom: 1.5,
    },
    {
      title: 'Шлях навантаження',
      text: `Навантаження з покрівлі передається через ${frameWord} на колони, а з колон — на фундамент.`,
      caption: 'Покрівля → каркас → основа',
      focus: g.focus.load,
      zoom: 1.05,
    },
    {
      title: 'Основа',
      text: g.foundationType === 'engineeringDecision'
        ? 'Тип основи ще не визначено: його визначає проєктувальник за даними майданчика й навантажень.'
        : `${foundationLabel} — ваше попереднє побажання. Тип фундаменту визначає проєктувальник за даними майданчика й навантажень.`,
      caption: `Основа: ${foundationLabel.toLowerCase()}`,
      focus: g.focus.base,
      zoom: 2.3,
    },
  ];
  const { visualRef, step, touring, run, size, motion, choose, toggle, hover } = useDrawingTour(steps.length);
  const active = step ? steps[step - 1] : undefined;
  const object = `${own ? 'Ваш ангар' : 'Приклад'} · ${fmt(g.widthM)} × ${fmt(g.lengthM)} × ${fmt(g.eaveHeightM)} м`;

  return (
    <div className="shell direction-editorial-grid dn ft" data-layout="copy-first" data-step={step || undefined} data-touring={touring || undefined}>
      <div className="direction-editorial-copy">
        <p className="eyebrow"><span /> Схема каркаса</p>
        <h2 id={titleId}>Каркас вашого ангара — від покрівлі до основи</h2>
        <p>
          Креслення будується з вашої конфігурації: проліт, висоти й схема каркаса. Це попередня схема без масштабу —
          конструктив визначає проєктувальник після розрахунку.
        </p>
      </div>
      <TourSteps steps={steps} step={step} choose={choose} hover={hover} />
      <DrawingSheet
        className="direction-editorial-media dn-sheet ft-sheet"
        imageClassName="dn-visual ft-visual"
        imageRef={visualRef}
        cells={[
          tourStepCell(step, steps.length),
          { tone: 'main', label: 'Що показано', value: <span className="dn-caption">{active ? active.caption : 'Каркас і основа'}</span> },
          { label: 'Об’єкт', value: object, className: 'ft-object' },
        ]}
        action={motion && <TourControl touring={touring} toggle={toggle} what="каркаса" />}
      >
        <div className="dn-stage is-drawing" style={{ transform: stageTransform(size, VIEW, active) }}>
          <svg className="ft-drawing" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Схема каркаса: ${summary.structuralVisualizationLabel.toLowerCase()}, проліт ${fmt(g.widthM)} м, основа — ${foundationLabel.toLowerCase()}`}>
            <path className="ft-ground" d={g.ground} />
            <path className="ft-soil" d={g.soil} />
            <g className="ft-part" data-part="3">
              <path className="ft-back" d={`${g.backFrames}${g.longitudinals}`} />
              <path className="ft-brace" pathLength={1} d={g.bracing} />
              <path className="ft-dim" d={g.bay} />
              <text className="ft-letter" x={g.letters.a[0]} y={g.letters.a[1]}>a</text>
            </g>
            <g className="ft-part" data-part="5">
              <path className={`ft-base${g.foundationType === 'engineeringDecision' ? ' is-open' : ''}`} d={g.base} />
              <path className="ft-hatch" d={g.baseHatch} />
            </g>
            <g className="ft-part" data-part="1">
              <path className="ft-member" pathLength={1} d={g.columns} />
              <path className="ft-dim" pathLength={1} d={g.span} />
              <text className="ft-letter" x={g.letters.L[0]} y={g.letters.L[1]}>L</text>
              <path className="ft-dim" d={g.height} />
              <text className="ft-letter" x={g.letters.H[0]} y={g.letters.H[1]}>H</text>
            </g>
            <g className="ft-part" data-part="2">
              <path className="ft-member" pathLength={1} d={`${g.roof}${g.centreColumn}`} />
            </g>
            <g className="ft-load" aria-hidden="true">
              <path className="ft-arrows" d={g.loads} />
              {g.flow.filter(Boolean).map((d) => <path key={d} className="ft-flow" d={d} />)}
            </g>
          </svg>
        </div>
        <TourProgress count={steps.length} step={step} run={run} className="ft-progress" />
      </DrawingSheet>
    </div>
  );
}
