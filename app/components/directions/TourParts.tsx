'use client';

import { Fragment, type CSSProperties, type PointerEvent } from 'react';
import './direction-node.css';

// The parts every drawing tour on a direction page shares — «Вузол напряму» (DirectionNode) and /angary «Каркас вашого
// ангара» (FrameTour): the list of steps (each a button that shows its step — pressed, or pointed at with a mouse), the
// round pause / replay control in the sheet's title block, and the progress bars over the picture.
//
// They live in one module that carries direction-node.css, so the two tours share a chunk with code in it: imported
// by both components directly, the stylesheet became a CSS-only chunk whose empty JS file the build left out while
// the page still asked for it (a 404 on every page with a tour, 2026-10).

const pad = (value: number) => String(value).padStart(2, '0');

type HoverHandlers = (value: number) => { onPointerMove: (event: PointerEvent) => void; onPointerLeave: () => void };

export function TourSteps({
  steps,
  step,
  choose,
  hover,
}: Readonly<{
  steps: readonly { title: string; text: string }[];
  step: number;
  choose: (value: number) => void;
  hover: HoverHandlers;
}>) {
  return (
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
  );
}

/** «Пауза» / «Відтворити»; `what` completes the label for a screen reader («показу вузла», «показ каркаса»). With `label`
 *  the button says its own words instead, seen and heard alike — the action it takes, never the tour's state (09.10,
 *  audit F44: the configurator's «Показати по черзі» stood beside the button, not in it, and a click on the words did
 *  nothing; a voice command naming them found no button) */
export function TourControl({ touring, toggle, what, label }: Readonly<{
  touring: boolean;
  toggle: () => void;
  what: string;
  label?: { play: string; stop: string };
}>) {
  return (
    <button type="button" className="dn-control" data-paused={touring ? undefined : true} onClick={toggle}>
      {label
        ? <span className="dn-control-label">{touring ? label.stop : label.play}</span>
        : <span className="dn-control-label">{touring ? 'Пауза' : 'Відтворити'}<span className="sr-only">{touring ? ` показу ${what}` : ` показ ${what}`}</span></span>}
      <span className="dn-control-icon" aria-hidden="true" />
    </button>
  );
}

export function TourProgress({ count, step, run, className }: Readonly<{ count: number; step: number; run: number; className?: string }>) {
  if (step === 0) return null;
  return (
    <div className={['dn-progress', className].filter(Boolean).join(' ')} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={index + 1 < step ? 'is-done' : undefined}>
          {index + 1 === step && <i key={`${step}-${run}`} className="dn-fill" />}
        </span>
      ))}
    </div>
  );
}

/** «Що показано»: every caption of the tour laid in one place, only the one on show visible, so the cell is as tall as
 *  the longest and the title block keeps its height from step to step (the picture above it shrank and grew by a
 *  line as the tour walked, 07.10). The caption on show carries `dn-caption`. */
export function TourCaptions({ captions, step, className }: Readonly<{ captions: readonly string[]; step: number; className?: string }>) {
  return (
    <span className={['tour-captions', className].filter(Boolean).join(' ')}>
      {captions.map((caption, index) => (
        <Fragment key={`${index}-${caption}`}>
          <span className={index === step ? 'dn-caption' : undefined} data-on={index === step || undefined}>{caption}</span>{' '}
        </Fragment>
      ))}
    </span>
  );
}

/** The title block's first cell: the step on show, or «Огляд» */
export function tourStepCell(step: number, count: number) {
  return step
    ? { tone: 'number' as const, label: 'Крок', value: <>{pad(step)}<span> / {pad(count)}</span></> }
    : { label: 'Показ', value: 'Огляд' };
}
