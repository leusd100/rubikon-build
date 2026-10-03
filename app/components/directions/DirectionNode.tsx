'use client';

import type { CSSProperties } from 'react';
import ResponsiveImage from '../ResponsiveImage';
import { NodeDrawing } from './NodeDrawing';
import { DrawingSheet } from '../DrawingSheet';
import { stageTransform, useDrawingTour } from '../useDrawingTour';
import type { DirectionNode as DirectionNodeConfig } from '../../types/directionPage';
import './direction-node.css';

// «Вузол напряму» — a direction page's editorial picture as a tour of one node, in three steps (metal: the drawing,
// the bolted joint, the weld; concrete: reinforcement, anchors, formwork; roofing: the base, the eave, the drainage).
// Every step brackets its place on the picture and the camera pushes in on it; the title block names what it shows.
// Arriving half in view, the three steps play once and return to the overview; the round control pauses or replays
// them, and every item in the list is a button that shows its step — pressed, or pointed at with a mouse
// (useHoverStep). Reduced motion: no tour and no camera move — a
// pressed item switches at once. Without JavaScript: the overview with all three marks.
//
// The mechanics are /pro-nas practice's (useDrawingTour, shared with PracticeSteps), with the marks given as data: the picture is cropped by cover
// and the stage wraps it and its marks, so one transform moves both and keeps them aligned at any size.

const pad = (value: number) => String(value).padStart(2, '0');

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

  const active = step ? steps[step - 1] : undefined;

  return (
    <section className={['page-section direction-editorial-section dn-section', className].filter(Boolean).join(' ')} aria-labelledby={titleId}>
      <div className="shell direction-editorial-grid dn" data-layout={layout} data-step={step || undefined} data-touring={touring || undefined}>
        {/* Three grid areas — copy, steps, picture: on a desktop the steps sit under the copy beside the picture; on a
            phone they come after the picture, so a pressed step changes what is right above it */}
        <div className="direction-editorial-copy">
          <p className="eyebrow"><span /> {eyebrow}</p>
          <h2 id={titleId}>{title}</h2>
          <p>{text}</p>
        </div>
        <ol className="dn-steps">
          {steps.map((item, index) => (
            <li key={item.title} style={{ '--i': index } as CSSProperties}>
              <button type="button" className="dn-step" aria-pressed={step === index + 1} onClick={() => choose(index + 1)} {...hover(index + 1)}>
                <span className="dn-step-index" aria-hidden="true">{pad(index + 1)}</span>
                <b>{item.title}</b>
                <span className="dn-step-text">{item.text}</span>
              </button>
            </li>
          ))}
        </ol>
        <DrawingSheet
          className="direction-editorial-media dn-sheet"
          imageClassName="dn-visual"
          imageRef={visualRef}
          cells={[
            step
              ? { tone: 'number', label: 'Крок', value: <>{pad(step)}<span> / {pad(steps.length)}</span></> }
              : { label: 'Показ', value: 'Огляд' },
            { tone: 'main', label: 'Що показано', value: <span className="dn-caption">{active ? active.caption : node.overviewCaption}</span> },
            { label: 'Зображення', value: node.drawing ? 'Схема' : 'Ілюстрація' },
          ]}
          action={motion && (
            <button type="button" className="dn-control" data-paused={touring ? undefined : true} onClick={toggle}>
              <span className="dn-control-label">{touring ? 'Пауза' : 'Відтворити'}<span className="sr-only">{touring ? ' показу вузла' : ' показ вузла'}</span></span>
              <span className="dn-control-icon" aria-hidden="true" />
            </button>
          )}
        >
          <div className={`dn-stage${node.drawing ? ' is-drawing' : ''}`} style={{ transform: stageTransform(size, node, active) }}>
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
          {step > 0 && (
            <div className="dn-progress" aria-hidden="true">
              {steps.map((item, index) => (
                <span key={item.title} className={index + 1 < step ? 'is-done' : undefined}>
                  {index + 1 === step && <i key={`${step}-${run}`} className="dn-fill" />}
                </span>
              ))}
            </div>
          )}
        </DrawingSheet>
      </div>
    </section>
  );
}
