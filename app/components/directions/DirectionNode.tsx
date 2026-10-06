'use client';

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import ResponsiveImage from '../ResponsiveImage';
import { NodeDrawing } from './NodeDrawing';
import { DrawingSheet } from '../DrawingSheet';
import { stageTransform, useDrawingTour } from '../useDrawingTour';
import { drawingTransform, type PictureBox } from '../../lib/drawingCamera';
import type { DirectionNode as DirectionNodeConfig } from '../../types/directionPage';
import { TourControl, TourProgress, TourSteps, tourStepCell } from './TourParts';
import { ScopeKey } from './ScopeKey';

// «Вузол напряму» — a direction page's editorial picture as a tour of one node, in three steps (metal: the drawing,
// the bolted joint, the weld; concrete: reinforcement, anchors, formwork; roofing: the base, the eave, the drainage).
// Every step brackets its place on the picture and the camera pushes in on it; the title block names what it shows.
// Arriving half in view, the three steps play once and return to the overview; the round control pauses or replays
// them, and every item in the list is a button that shows its step — pressed, or pointed at with a mouse
// (useHoverStep). Reduced motion: no tour and no camera move — a
// pressed item switches at once. Without JavaScript: the overview with all three marks.
//
// The mechanics are /pro-nas practice's (useDrawingTour, shared with PracticeSteps), with the marks given as data: the picture is cropped by cover
// and the stage wraps it and its marks, so one transform moves both and keeps them aligned at any size. A drawing's
// camera (drawingTransform, lib/drawingCamera.ts) also keeps what each view must show in the frame, measured on the
// drawing (useNeed): the frame beside the text is narrower than the drawing up to wide screens (half as wide as tall on
// a 768 px tablet; 3:2, as the drawings, only on a phone), and cover alone cropped numbers, labels and the steps' marks
// off its sides.

const pad = (value: number) => String(value).padStart(2, '0');

type Need = { overview: PictureBox; steps: readonly PictureBox[] };

/** An element's box in its svg's own units (the drawing's), whatever the stage's transform is */
function unitBox(element: SVGGraphicsElement): PictureBox | null {
  const toUnits = element.ownerSVGElement?.getScreenCTM()?.inverse();
  const own = element.getScreenCTM();
  if (!toUnits || !own) return null;
  const matrix = toUnits.multiply(own);
  const { x, y, width, height } = element.getBBox();
  const corners = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(([px, py]) => new DOMPoint(px, py).matrixTransform(matrix));
  return [Math.min(...corners.map((p) => p.x)), Math.min(...corners.map((p) => p.y)), Math.max(...corners.map((p) => p.x)), Math.max(...corners.map((p) => p.y))];
}

function union(elements: Iterable<SVGGraphicsElement>): PictureBox | null {
  let box: PictureBox | null = null;
  for (const element of elements) {
    const next = unitBox(element);
    if (next) box = box ? [Math.min(box[0], next[0]), Math.min(box[1], next[1]), Math.max(box[2], next[2]), Math.max(box[3], next[3])] : next;
  }
  return box;
}

/** What each view of a drawing must show (drawingTransform), measured on the drawing itself once its fonts are in: the
 *  overview — every mark with its number, every part a step lights and every label; a step — its mark and the labels
 *  of its parts (a step's parts may lie on both sides, as the concrete's formwork: its mark says which it shows) */
function useNeed(stageRef: RefObject<HTMLDivElement | null>, count: number, drawing: boolean) {
  const [need, setNeed] = useState<Need | null>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !drawing) return;
    let live = true;
    void document.fonts.ready.then(() => {
      const overview = union(stage.querySelectorAll<SVGGraphicsElement>('.dn-mark, .node-drawing [data-part], .node-drawing text'));
      const steps = Array.from({ length: count }, (_, index) => union(
        stage.querySelectorAll<SVGGraphicsElement>(`.dn-mark-${index + 1} .dn-line, .node-drawing [data-part="${index + 1}"] text`),
      ));
      if (live && overview && steps.every((box): box is PictureBox => box !== null)) setNeed({ overview, steps });
    });
    return () => {
      live = false;
    };
  }, [stageRef, count, drawing]);
  return need;
}

export function DirectionNode({
  eyebrow,
  title,
  titleId,
  text,
  image,
  imageAlt,
  node,
  layout,
  className,
}: Readonly<{
  eyebrow: string;
  title: string;
  titleId: string;
  text: string;
  image: string;
  imageAlt: string;
  node: DirectionNodeConfig;
  layout: 'media-first' | 'copy-first';
  className?: string;
}>) {
  const { steps } = node;
  const { visualRef, step, touring, run, size, motion, choose, toggle, hover } = useDrawingTour(steps.length);
  const stageRef = useRef<HTMLDivElement>(null);
  const need = useNeed(stageRef, steps.length, Boolean(node.drawing));
  // The measured camera takes its place at once, not in a camera move: the stage's transition waits until it is drawn
  const [placed, setPlaced] = useState(false);
  const ready = Boolean(size && need);
  useEffect(() => {
    if (!ready || placed) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setPlaced(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, placed]);

  const active = step ? steps[step - 1] : undefined;
  const camera = node.drawing && need
    ? drawingTransform(size, node, active, step ? need.steps[step - 1] : need.overview)
    : stageTransform(size, node, active);

  const sheet = (
    <DrawingSheet
      className="direction-editorial-media dn-sheet"
      imageClassName="dn-visual"
      imageRef={visualRef}
      cells={[
        tourStepCell(step, steps.length),
        { tone: 'main', label: 'Що показано', value: <span className="dn-caption">{active ? active.caption : node.overviewCaption}</span> },
        { label: 'Зображення', value: node.drawing ? 'Схема' : 'Ілюстрація' },
      ]}
      action={motion && <TourControl touring={touring} toggle={toggle} what="вузла" />}
    >
      <div
        ref={stageRef}
        className={`dn-stage${node.drawing ? ' is-drawing is-node' : ''}`}
        style={{ transform: camera, transition: node.drawing && !placed ? 'none' : undefined, '--dn-aspect': node.width / node.height } as CSSProperties}
      >
        {node.drawing
          ? <NodeDrawing kind={node.drawing} label={`Схема: ${node.overviewCaption}`} />
          : <ResponsiveImage src={image} alt={imageAlt} sizes="(max-width: 760px) calc(100vw - 32px), 50vw" />}
        <svg className="dn-overlay" viewBox={`0 0 ${node.width} ${node.height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          {steps.map((item, index) => (
            <g key={item.title} className={`dn-mark dn-mark-${index + 1}`}>
              <path className="dn-line" pathLength={1} d={item.mark.d} />
              <g transform={`translate(${item.mark.badge[0]} ${item.mark.badge[1]})`}>
                <g className="dn-badge"><circle r="42" /><text dy="11">{pad(index + 1)}</text></g>
              </g>
            </g>
          ))}
        </svg>
      </div>
      <TourProgress count={steps.length} step={step} run={run} />
    </DrawingSheet>
  );

  return (
    <section className={['page-section direction-editorial-section dn-section', className].filter(Boolean).join(' ')} aria-labelledby={titleId}>
      <div
        className="shell direction-editorial-grid dn"
        data-layout={layout}
        data-step={step || undefined}
        data-touring={touring || undefined}
        style={{ '--dn-count': steps.length } as CSSProperties}
      >
        {/* Three grid areas — copy, steps, picture: on a desktop the steps sit under the copy beside the picture; on a
            phone they come after the picture, so a pressed step changes what is right above it */}
        <div className="direction-editorial-copy">
          <p className="eyebrow"><span /> {eyebrow}</p>
          <h2 id={titleId}>{title}</h2>
          <p>{text}</p>
        </div>
        <TourSteps steps={steps} step={step} choose={choose} hover={hover} />
        {/* The sheet alone is the picture's grid item; with a key (the grain store's line types) both share the place */}
        {node.legend ? <div className="dn-media">{sheet}<ScopeKey items={node.legend} /></div> : sheet}
      </div>
    </section>
  );
}
