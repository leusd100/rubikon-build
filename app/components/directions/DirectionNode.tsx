'use client';

import type { CSSProperties } from 'react';
import ResponsiveImage from '../ResponsiveImage';
import { NodeDrawing } from './NodeDrawing';
import { DrawingSheet } from '../DrawingSheet';
import { useDrawingCamera, type ViewNeeds } from '../useDrawingCamera';
import { useDrawingTour } from '../useDrawingTour';
import type { DirectionNode as DirectionNodeConfig } from '../../types/directionPage';
import { TourCaptions, TourControl, TourProgress, TourSteps, tourStepCell } from './TourParts';
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
// camera (useDrawingCamera) also keeps what each view must show in the frame, measured on the drawing (NEEDS): the
// frame beside the text is narrower than the drawing up to wide screens (half as wide as tall on a 768 px tablet; 3:2,
// as the drawings, only on a phone), and cover alone cropped numbers, labels and the steps' marks off its sides.

const pad = (value: number) => String(value).padStart(2, '0');

/** What each view of a drawing must show: the overview — every mark with its number, every part a step lights and
 *  every label; a step — its mark and the labels of its parts (a step's parts may lie on both sides, as the concrete's
 *  formwork: its mark says which it shows) */
const NEEDS: ViewNeeds = {
  overview: '.dn-mark, .node-drawing [data-part], .node-drawing text',
  step: (index) => `.dn-mark-${index} .dn-line, .node-drawing [data-part="${index}"] text`,
};

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
  // A photo keeps the tours' own camera: only a drawing is measured
  const { stageRef, transform, placed } = useDrawingCamera(size, node, steps, step, node.drawing ? NEEDS : null);

  const captions = [node.overviewCaption, ...steps.map((item) => item.caption)];

  const sheet = (
    <DrawingSheet
      className="direction-editorial-media dn-sheet"
      imageClassName="dn-visual"
      imageRef={visualRef}
      cells={[
        tourStepCell(step, steps.length),
        { tone: 'main', label: 'Що показано', value: <TourCaptions captions={captions} step={step} /> },
        { label: 'Зображення', value: node.drawing ? 'Схема' : 'Ілюстрація' },
      ]}
      action={motion && <TourControl touring={touring} toggle={toggle} what="вузла" />}
    >
      <div
        ref={stageRef}
        className={`dn-stage${node.drawing ? ' is-drawing is-node' : ''}`}
        style={{ transform, transition: placed ? undefined : 'none', '--dn-aspect': node.width / node.height } as CSSProperties}
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
