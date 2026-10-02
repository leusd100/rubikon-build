'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import ResponsiveImage from '../ResponsiveImage';
import { NodeDrawing } from './NodeDrawing';
import { DrawingSheet } from '../DrawingSheet';
import { useHoverStep } from '../useHoverStep';
import type { DirectionNode as DirectionNodeConfig, DirectionNodeStep } from '../../types/directionPage';
import './direction-node.css';

// «Вузол напряму» — a direction page's editorial picture as a tour of one node, in three steps (metal: the drawing,
// the bolted joint, the weld; concrete: reinforcement, anchors, formwork; roofing: the base, the eave, the drainage).
// Every step brackets its place on the picture and the camera pushes in on it; the title block names what it shows.
// Arriving half in view, the three steps play once and return to the overview; the round control pauses or replays
// them, and every item in the list is a button that shows its step — pressed, or pointed at with a mouse
// (useHoverStep). Reduced motion: no tour and no camera move — a
// pressed item switches at once. Without JavaScript: the overview with all three marks.
//
// The mechanics are /pro-nas practice's (PracticeSteps), with the marks given as data: the picture is cropped by cover
// and the stage wraps it and its marks, so one transform moves both and keeps them aligned at any size.

const STEP_MS = 5200; // room for each step to build what it names (UX pass 2026-10)
const pad = (value: number) => String(value).padStart(2, '0');

function stageTransform(size: { width: number; height: number } | null, picture: { width: number; height: number }, step: DirectionNodeStep | undefined) {
  if (!size || !step) return undefined;
  const { width, height } = size;
  const cover = Math.max(width / picture.width, height / picture.height);
  const fx = step.focus[0] * cover - (picture.width * cover - width) / 2;
  const fy = step.focus[1] * cover - (picture.height * cover - height) / 2;
  // Keep the pushed-in frame covered: the centre never comes closer to an edge than half the zoomed window
  const halfW = width / (2 * step.zoom);
  const halfH = height / (2 * step.zoom);
  const cx = Math.min(Math.max(fx, halfW), width - halfW);
  const cy = Math.min(Math.max(fy, halfH), height - halfH);
  return `translate(${width / 2}px, ${height / 2}px) scale(${step.zoom}) translate(${-cx}px, ${-cy}px)`;
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
  const visualRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [step, setStep] = useState(0);
  const [touring, setTouring] = useState(false);
  const [run, setRun] = useState(0);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [motion, setMotion] = useState(false);
  const { steps } = node;

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

  // The tour starts once, when the picture is at least half in view; leaving the view entirely pauses it (the control
  // sits under the picture, so reaching for it must not pause it first — see PracticeSteps)
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
  const hover = useHoverStep(step, choose);
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
    <section className={`page-section direction-editorial-section dn-section${className ? ` ${className}` : ''}`} aria-labelledby={titleId}>
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
