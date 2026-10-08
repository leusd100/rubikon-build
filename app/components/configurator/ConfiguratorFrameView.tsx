'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { FRAME_TOUR_DURATIONS, FrameTourStage, frameNodes, useFrameTourModel } from '../angary/FrameTour';
import { TourControl } from '../directions/TourParts';
import { useDrawingTour } from '../useDrawingTour';

// The configurator's «Каркас» step (07.10): the frame drawing that was its own section under the configurator —
// «Каркас вашого ангара — від покрівлі до основи» — on the configurator's own sheet, so the visitor sees the frame of
// the hangar they are setting up without leaving it.
//
// The drawing is the picture only. What to show of it — the span, the frame, purlins and bracing, snow, wind, and on
// the frame its nodes — is chosen in the step's own panel beside it (a portal into #hc-frame-panel, ConfiguratorControls),
// like every other step's choices: one way round the block, the controls on the left and the picture on the right.
// Nothing plays by itself — the visitor came to set up a hangar, not to watch; «Показати по черзі» plays the five once.

export function ConfiguratorFrameView({ onCaption }: Readonly<{ onCaption: (caption: string) => void }>) {
  const { g, summary, steps, captions } = useFrameTourModel();
  const nodes = useMemo(() => frameNodes(g), [g]);
  const tour = useDrawingTour(steps.length, { loops: 0, durations: FRAME_TOUR_DURATIONS });
  const { visualRef, step, touring, run, size, motion, stepMs, choose, toggle } = tour;
  const [nodeId, setNodeId] = useState<string | null>(null);
  // A node belongs to the frame's step: the tour moving on, or another step chosen, closes it
  const node = step === 2 ? nodes.find((item) => item.id === nodeId) ?? null : null;
  // with nothing chosen, the whole frame centred (07.10: it sat off to the left of the sheet)
  const active = node ?? (step ? steps[step - 1] : g.cameras.overview);

  const caption = node ? `${node.title} · схема` : captions[step];
  useEffect(() => onCaption(caption), [caption, onCaption]);

  // The step's panel: the controls render it with every step, so it is on the page before this view opens (never on the
  // server: the sizes' step is the first)
  const [panel] = useState(() => (typeof document === 'undefined' ? null : document.getElementById('hc-frame-panel')));

  function openNode(id: string) {
    choose(2);
    setNodeId((current) => (current === id ? null : id));
  }

  function chooseStep(index: number) {
    setNodeId(null);
    // the shown item pressed again goes back to the whole frame
    choose(step === index ? 0 : index);
  }

  let text = 'Оберіть, що показати на кресленні вашого каркаса.';
  if (node) text = node.text;
  else if (step) text = steps[step - 1].text;

  return (
    <div
      className="ft dn hc-frame"
      data-step={step || undefined}
      data-touring={touring || undefined}
      data-node={node?.id}
      style={{ '--dn-step-ms': `${stepMs}ms` } as CSSProperties}
    >
      <FrameTourStage
        g={g}
        summary={summary}
        visualRef={visualRef}
        size={size}
        active={active}
        step={step}
        run={run}
        count={steps.length}
        nodes={nodes}
        node={node?.id ?? null}
        onNode={openNode}
      />
      {panel && createPortal(
        <>
          {/* after the step's own questions: how the frame works, shown on the drawing — for whoever wants it */}
          <h3 className="hc-frame-heading">Як працює ваш каркас</h3>
          <div className="hc-frame-list" role="group" aria-label="Що показати">
            {steps.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className="hc-frame-item"
                aria-pressed={step === index + 1}
                onClick={() => chooseStep(index + 1)}
              >
                {item.title}
              </button>
            ))}
          </div>
          <p className="hc-frame-text" aria-live="polite"><span key={text}>{text}</span></p>
          {step === 2 && (
            <div className="hc-frame-nodes" role="group" aria-label="Вузли ферми">
              {nodes.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="hc-frame-node"
                  aria-pressed={node?.id === item.id}
                  onClick={() => openNode(item.id)}
                >
                  <span className="hc-frame-node-number" aria-hidden="true">{index + 1}</span>
                  {item.title}
                </button>
              ))}
            </div>
          )}
          {motion && (
            <div className="hc-frame-play">
              <TourControl touring={touring} toggle={toggle} what="каркаса" />
              <span aria-hidden="true">{touring ? 'Показуємо по черзі' : 'Показати по черзі'}</span>
            </div>
          )}
        </>,
        panel,
      )}
    </div>
  );
}
