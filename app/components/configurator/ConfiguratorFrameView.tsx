'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FRAME_TOUR_DURATIONS, FrameTourStage, frameNodes, useFrameTourModel } from '../angary/FrameTour';
import { TourControl } from '../directions/TourParts';
import { useDrawingTour } from '../useDrawingTour';

// The configurator's «Каркас» view (07.10): the frame drawing that was its own section under the configurator —
// «Каркас вашого ангара — від покрівлі до основи» — now on the configurator's own sheet, so the visitor sees the frame
// of the hangar they are setting up without leaving it. The same five steps (span, frame, purlins and bracing, snow,
// wind), the same one automatic tour, which starts when the view is opened; on the frame's step the front frame's nodes
// open one by one — the camera pushes in on the node and the strip under the drawing says what it does.

const pad = (value: number) => String(value).padStart(2, '0');

export function ConfiguratorFrameView({ onCaption }: Readonly<{ onCaption: (caption: string) => void }>) {
  const { g, summary, steps, captions } = useFrameTourModel();
  const nodes = useMemo(() => frameNodes(g), [g]);
  const tour = useDrawingTour(steps.length, { loops: 1, durations: FRAME_TOUR_DURATIONS });
  const { visualRef, step, touring, run, size, motion, stepMs, choose, toggle } = tour;
  const [nodeId, setNodeId] = useState<string | null>(null);
  // A node belongs to the frame's step: the tour moving on, or another step chosen, closes it
  const node = step === 2 ? nodes.find((item) => item.id === nodeId) ?? null : null;
  const active = node ?? (step ? steps[step - 1] : undefined);

  const caption = node ? `${node.title} · схема` : captions[step];
  useEffect(() => onCaption(caption), [caption, onCaption]);

  function openNode(id: string) {
    choose(2);
    setNodeId((current) => (current === id ? null : id));
  }

  function chooseStep(index: number) {
    setNodeId(null);
    choose(index);
  }

  // On a phone the steps are one row that scrolls sideways: the step on show, chosen or reached by the tour, is brought
  // into it (07.10)
  const stepsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = stepsRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-index="${step}"]`);
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' });
  }, [step]);

  let text = 'Каркас вашого ангара крок за кроком: проліт, ферма, прогони й в’язі, а потім як сніг і вітер проходять крізь нього до основи. Оберіть крок.';
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
      <div className="hc-frame-bar">
        <div className="hc-frame-steps" role="group" aria-label="Кроки схеми каркаса" ref={stepsRef}>
          {steps.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className="hc-frame-step"
              data-index={index + 1}
              aria-pressed={step === index + 1}
              onClick={() => chooseStep(index + 1)}
            >
              <span aria-hidden="true">{pad(index + 1)}</span> {item.title}
            </button>
          ))}
        </div>
        {motion && <TourControl touring={touring} toggle={toggle} what="каркаса" />}
      </div>
      {/* The step's words, and on the frame's step its nodes: one slot as tall as the longest text, so nothing under the
          sheet moves from step to step */}
      <div className="hc-frame-text">
        <p aria-live="polite">{text}</p>
        {step === 2 && (
          <div className="hc-frame-nodes" role="group" aria-label="Вузли">
            <span aria-hidden="true">Вузли:</span>
            {nodes.map((item) => (
              <button
                key={item.id}
                type="button"
                className="hc-frame-node"
                aria-pressed={node?.id === item.id}
                onClick={() => openNode(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
