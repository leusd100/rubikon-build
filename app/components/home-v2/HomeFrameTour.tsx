'use client';

import type { CSSProperties } from 'react';
import { FRAME_TOUR_DURATIONS, FrameTourStage, useFrameTourModel } from '../angary/FrameTour';
import { sheetObjectLabel } from '../configurator/sheetLabels';
import { TourControl } from '../directions/TourParts';
import { useDrawingTour } from '../useDrawingTour';
import { deriveDomainModel, sizesProvenance } from '../../lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE } from '../../lib/configurator/types';

// HOME's first engineering picture (owner 02.11: the best motion of the site stood at the end of /angary's configurator,
// and a client may never get there). This is that tour, not a redrawing of it: /angary's own drawing and steps, the
// configurator's untouched example, labelled «Приклад» — it is not the real hangar of the sheet below. It plays by itself
// once, as the drawing comes half into view, and stops off screen (useDrawingTour); a step chosen by hand or a pause
// hands it over to the visitor. Reduced motion: the whole frame, and the steps switch at once.

const EXAMPLE = deriveDomainModel(DEFAULT_CONFIGURATOR_STATE);
const EXAMPLE_LABEL = sheetObjectLabel(sizesProvenance(EXAMPLE), EXAMPLE.dimensions);

export function HomeFrameTour() {
  const { g, summary, steps, captions } = useFrameTourModel();
  const { visualRef, step, touring, run, size, motion, stepMs, choose, toggle, hover } = useDrawingTour(steps.length, { durations: FRAME_TOUR_DURATIONS });
  const active = step ? steps[step - 1] : g.cameras.overview;

  return (
    <div className="ft dn hv2-frame-tour" data-step={step || undefined} data-touring={touring || undefined} style={{ '--dn-step-ms': `${stepMs}ms` } as CSSProperties}>
      <div className="hv2-frame-picture">
        <FrameTourStage g={g} summary={summary} visualRef={visualRef} size={size} active={active} step={step} run={run} count={steps.length} />
        <p className="hv2-frame-stamp">
          <span>{captions[step]}</span>
          <span>{EXAMPLE_LABEL}</span>
        </p>
      </div>
      <div className="hv2-frame-side">
        <ol className="hv2-frame-steps">
          {steps.map((item, index) => (
            <li key={item.title}>
              <button type="button" aria-pressed={step === index + 1} onClick={() => choose(step === index + 1 ? 0 : index + 1)} {...hover(index + 1)}>
                <i aria-hidden="true">{String(index + 1).padStart(2, '0')}</i>{item.title}
              </button>
            </li>
          ))}
        </ol>
        {motion && <TourControl touring={touring} toggle={toggle} what="каркаса" label={{ play: 'Показати по черзі', stop: 'Зупинити показ' }} />}
        {/* a fixed room for the longest step's words, so nothing under it moves from step to step (home-v2.css) */}
        <div className="hv2-frame-text">
          <p aria-live="polite">{step ? steps[step - 1].text : ''}</p>
        </div>
      </div>
    </div>
  );
}
