'use client';

import type { CSSProperties } from 'react';
import { PracticeDrawing } from './PracticeDrawing';
import { DrawingSheet } from '../DrawingSheet';
import { useDrawingCamera, type ViewNeeds } from '../useDrawingCamera';
import { useDrawingTour } from '../useDrawingTour';

// /pro-nas «Досвід працює ще до початку робіт»: the illustration answers the list one step at a time. The camera
// pushes in on that step's place in the image — the drawing under the hands, the order the frame goes up (base
// plate → column → beam), the bolted joint — only its mark shows, and the caption names it. Arriving in view, the
// three steps play once by themselves and return to the overview; the round control pauses or replays them, and
// every item is a button that shows its step — pressed, or pointed at with a mouse (useHoverStep). Reduced motion: no tour and no camera move — a pressed item switches
// at once. Without JavaScript: the overview with all three marks, as before.
//
// The image sits on the site's «Креслення» sheet (DrawingSheet): its title block carries the step, the caption and
// the control (no «Ілюстрація» here — the owner's choice for /pro-nas).
//
// The marks are drawn in image pixels and the image is cropped by cover; the stage wraps both, so one transform
// moves them together and keeps them aligned at any size. The camera (useDrawingCamera) also keeps what each view
// must show in the frame (NEEDS), measured on the drawing: the frame is the drawing's 4:5 only on a phone, and cover
// alone cut «L», the bracket of 01 and the frame lit in 02 off its edges on tablets and laptops (06.10).

export type PracticeStep = {
  title: string;
  text: string;
  /** Names what the camera shows, on the image's caption bar */
  caption: string;
  /** Image pixels the camera centres on (the source is 1440 × 1800) */
  focus: readonly [number, number];
  zoom: number;
};

const IMAGE = { width: 1440, height: 1800 };
/** What each view must show whole: the overview — every mark with its number, every part a step lights and both
 *  letters of the dimensions; a step — its mark with its numbered circles, and the parts it lights, clear of the
 *  step bars (.ps-progress: 16 px from the top, 3 px tall) */
const NEEDS: ViewNeeds = {
  overview: '.aqc-mark, .practice-drawing [data-part], .practice-drawing text',
  step: (index) => `.aqc-mark-${index} :is(.aqc-line, .aqc-step), .practice-drawing [data-part="${index}"]`,
  stepTop: 19,
};
const pad = (value: number) => String(value).padStart(2, '0');

export function PracticeSteps({
  eyebrow,
  title,
  titleId,
  lead,
  steps,
  support,
  overviewCaption,
}: Readonly<{
  eyebrow: string;
  title: string;
  titleId: string;
  lead: string;
  steps: readonly PracticeStep[];
  support: string;
  overviewCaption: string;
}>) {
  const { visualRef, step, touring, run, size, motion, choose, toggle, hover } = useDrawingTour(steps.length);
  const { stageRef, transform, placed } = useDrawingCamera(size, IMAGE, steps, step, NEEDS);

  const active = step ? steps[step - 1] : undefined;

  return (
    <div className="shell about-story-layout ps" data-motion data-step={step || undefined} data-touring={touring || undefined}>
      <DrawingSheet
        className="ps-sheet"
        imageClassName="promise-visual about-planning-visual"
        imageRef={visualRef}
        cells={[
          step
            ? { tone: 'number', label: 'Крок', value: <>{pad(step)}<span> / {pad(steps.length)}</span></> }
            : { label: 'Показ', value: 'Огляд' },
          { tone: 'main', label: 'Що показано', value: <span className="ps-caption-text">{active ? active.caption : overviewCaption}</span> },
        ]}
        action={motion && (
          <button type="button" className="ps-control" data-paused={touring ? undefined : true} onClick={toggle}>
            <span className="ps-control-label">{touring ? 'Пауза' : 'Відтворити'}<span className="sr-only">{touring ? ' показу кроків' : ' показ кроків'}</span></span>
            <span className="ps-control-icon" aria-hidden="true" />
          </button>
        )}
      >
        {/* A vector drawing, so every push-in stays sharp (UX pass 2026-10: zooming the picture lost its quality) */}
        <div
          ref={stageRef}
          className="ps-stage is-drawing"
          style={{ transform, transition: placed ? undefined : 'none', '--ps-aspect': IMAGE.width / IMAGE.height } as CSSProperties}
        >
          <PracticeDrawing />
          <svg className="aqc-overlay" viewBox="0 0 1440 1800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
            <g className="aqc-mark aqc-mark-1">
              <path className="aqc-line" pathLength={1} d="M240 1040 H330 M1110 1040 H1200 V1130 M1200 1530 V1620 H1110 M330 1620 H240 V1530 M240 1130 V1040" />
              <g transform="translate(240 1040)"><g className="aqc-badge"><circle r="40" /><text dy="11">01</text></g></g>
            </g>
            <g className="aqc-mark aqc-mark-2">
              <path className="aqc-line" pathLength={1} d="M1040 884V530H640" />
              <g transform="translate(1040 884)"><g className="aqc-step"><circle r="30" /><text dy="10">1</text></g></g>
              <g transform="translate(1040 700)"><g className="aqc-step"><circle r="30" /><text dy="10">2</text></g></g>
              <g transform="translate(640 530)"><g className="aqc-step"><circle r="30" /><text dy="10">3</text></g></g>
              <g transform="translate(1200 884)"><g className="aqc-badge"><circle r="40" /><text dy="11">02</text></g></g>
            </g>
            <g className="aqc-mark aqc-mark-3">
              <circle className="aqc-line" pathLength={1} cx="1016" cy="530" r="120" />
              <g transform="translate(1090 425)"><g className="aqc-badge"><circle r="40" /><text dy="11">03</text></g></g>
            </g>
          </svg>
        </div>
        {step > 0 && (
          <div className="ps-progress" aria-hidden="true">
            {steps.map((item, index) => (
              <span key={item.title} className={index + 1 < step ? 'is-done' : undefined}>
                {index + 1 === step && <i key={`${step}-${run}`} className="ps-fill" />}
              </span>
            ))}
          </div>
        )}
      </DrawingSheet>
      <div className="about-story-copy">
        <p className="eyebrow"><span /> {eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
        <p className="about-story-lead">{lead}</p>
        <ol className="about-before">
          {steps.map((item, index) => (
            <li key={item.title} style={{ '--i': index } as CSSProperties}>
              <button type="button" className="about-before-step" aria-pressed={step === index + 1} onClick={() => choose(index + 1)} {...hover(index + 1)}>
                <span className="about-before-index" aria-hidden="true">{pad(index + 1)}</span>
                <b>{item.title}</b>
                <span className="about-before-text">{item.text}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="about-story-support">{support}</p>
      </div>
    </div>
  );
}
