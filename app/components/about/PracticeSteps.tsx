'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { PracticeDrawing } from './PracticeDrawing';
import { DrawingSheet } from '../DrawingSheet';

// /pro-nas «Досвід працює ще до початку робіт»: the illustration answers the list one step at a time. The camera
// pushes in on that step's place in the image — the drawing under the hands, the order the frame goes up (base
// plate → column → beam), the bolted joint — only its mark shows, and the caption names it. Arriving in view, the
// three steps play once by themselves and return to the overview; the round control pauses or replays them, and
// every item is a button that shows its step. Reduced motion: no tour and no camera move — a pressed item switches
// at once. Without JavaScript: the overview with all three marks, as before.
//
// The image sits on the site's «Креслення» sheet (DrawingSheet): its title block carries the step, the caption and
// the control (no «Ілюстрація» here — the owner's choice for /pro-nas).
//
// The marks are drawn in image pixels and the image is cropped by cover; the stage wraps both, so one transform
// moves them together and keeps them aligned at any size.

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
const STEP_MS = 4500;

function stageTransform(size: { width: number; height: number } | null, step: PracticeStep | undefined) {
  if (!size || !step) return undefined;
  const { width, height } = size;
  const cover = Math.max(width / IMAGE.width, height / IMAGE.height);
  const fx = step.focus[0] * cover - (IMAGE.width * cover - width) / 2;
  const fy = step.focus[1] * cover - (IMAGE.height * cover - height) / 2;
  // Keep the pushed-in frame covered: the centre never comes closer to an edge than half the zoomed window
  const halfW = width / (2 * step.zoom);
  const halfH = height / (2 * step.zoom);
  const cx = Math.min(Math.max(fx, halfW), width - halfW);
  const cy = Math.min(Math.max(fy, halfH), height - halfH);
  return `translate(${width / 2}px, ${height / 2}px) scale(${step.zoom}) translate(${-cx}px, ${-cy}px)`;
}

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
  const visualRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [step, setStep] = useState(0);
  const [touring, setTouring] = useState(false);
  const [run, setRun] = useState(0);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    const visual = visualRef.current;
    if (!visual) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(visual);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(!query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // The tour starts once, when the image is at least half in view; leaving the view entirely pauses it. Not sooner:
  // the control sits in the title block under the image, so reaching for it on a phone can scroll most of the image
  // away — pausing there flipped the button, and the tap meant to pause resumed the tour.
  useEffect(() => {
    const visual = visualRef.current;
    if (!visual || !motion) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.5 && !started.current) {
        started.current = true;
        setStep(1);
        setRun((value) => value + 1);
        setTouring(true);
      } else if (!entry.isIntersecting) {
        setTouring(false);
      }
    }, { threshold: [0, 0.5] });
    observer.observe(visual);
    return () => observer.disconnect();
  }, [motion]);

  useEffect(() => {
    if (!touring) return;
    const timer = window.setTimeout(() => {
      if (step < steps.length) {
        setStep(step + 1);
        setRun((value) => value + 1);
      } else {
        setTouring(false);
        setStep(0);
      }
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [touring, step, run, steps.length]);

  const choose = (value: number) => {
    started.current = true;
    setTouring(false);
    setStep(value);
  };
  const toggle = () => {
    started.current = true;
    if (touring) {
      setTouring(false);
      return;
    }
    setStep(step === 0 ? 1 : step);
    setRun((value) => value + 1);
    setTouring(true);
  };

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
        <div className="ps-stage is-drawing" style={{ transform: stageTransform(size, active) }}>
          <PracticeDrawing />
          <svg className="aqc-overlay" viewBox="0 0 1440 1800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
            <g className="aqc-mark aqc-mark-1">
              <path className="aqc-line" pathLength={1} d="M240 1040 H330 M1110 1040 H1200 V1130 M1200 1530 V1620 H1110 M330 1620 H240 V1530 M240 1130 V1040" />
              <g transform="translate(240 1040)"><g className="aqc-badge"><circle r="40" /><text dy="11">01</text></g></g>
            </g>
            <g className="aqc-mark aqc-mark-2">
              <path className="aqc-line" pathLength={1} d="M1040 884 C1130 820 1130 760 1040 700 C950 640 760 610 640 530" />
              <g transform="translate(1040 884)"><g className="aqc-step"><circle r="30" /><text dy="10">1</text></g></g>
              <g transform="translate(1040 700)"><g className="aqc-step"><circle r="30" /><text dy="10">2</text></g></g>
              <g transform="translate(640 530)"><g className="aqc-step"><circle r="30" /><text dy="10">3</text></g></g>
              <g transform="translate(1200 884)"><g className="aqc-badge"><circle r="40" /><text dy="11">02</text></g></g>
            </g>
            <g className="aqc-mark aqc-mark-3">
              <circle className="aqc-line" pathLength={1} cx="990" cy="530" r="125" />
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
              <button type="button" className="about-before-step" aria-pressed={step === index + 1} onClick={() => choose(index + 1)}>
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
