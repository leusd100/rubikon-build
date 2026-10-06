'use client';

import { useEffect, useRef, useState } from 'react';
import {
  GRAIN_COMPLEX_DEFAULT,
  GRAIN_CROP_OPTIONS,
  GRAIN_SCALE_OPTIONS,
  GRAIN_STORAGE_OPTIONS,
  grainComplexModel,
  type GrainComplexState,
  type GrainCrop,
} from '../../lib/grainComplex';
import { DrawingSheet } from '../DrawingSheet';
import { PrefillInquiryLink } from '../directions/PrefillInquiryLink';
import { TourControl } from '../directions/TourParts';
import { GrainComplexDrawing } from './GrainComplexDrawing';
import './grain-complex.css';

/** How long the phone's view takes to glide along the elevation while it assembles (its modules arrive over ~3.3 s) */
const GLIDE_MS = 3600;

// The block's working part: three choices (preparation, storage, scale) as real form controls, the drawing that
// follows them, who builds what in the chosen chain, and the way into the form with the chain already written.
// Arriving in view the complex assembles module by module, then the grain runs through it while it is on screen; the
// round control pauses that (WCAG 2.2.2). The phases live in data attributes set straight on the element (as
// DrawingSheet and ProcessMotion do), so nothing re-renders for them. Reduced motion: the finished complex, still.

export function GrainComplexBuilder() {
  const [state, setState] = useState<GrainComplexState>(GRAIN_COMPLEX_DEFAULT);
  /** The form is started with the chain only once the visitor has chosen something — never with the opening picture */
  const [touched, setTouched] = useState(false);
  const [running, setRunning] = useState(true);
  const [motion, setMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const model = grainComplexModel(state);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(!query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const scroller = scrollRef.current;
    if (!root || !scroller || !motion) return;
    if (!root.dataset.gc) root.dataset.gc = 'armed';
    let assemble = 0;
    let frame = 0;
    // On a phone the elevation is wider than the screen: while it assembles, the view glides along it after the grain,
    // from the receiving pit to the loading bin — until the visitor takes the drawing in hand
    const stopGlide = () => window.cancelAnimationFrame(frame);
    const glide = () => {
      const distance = scroller.scrollWidth - scroller.clientWidth;
      if (distance < 12) return;
      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - started) / GLIDE_MS);
        scroller.scrollLeft = distance * (t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
        if (t < 1) frame = window.requestAnimationFrame(step);
      };
      frame = window.requestAnimationFrame(step);
    };
    scroller.addEventListener('pointerdown', stopGlide);
    scroller.addEventListener('wheel', stopGlide, { passive: true });
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) root.dataset.inview = '';
      else delete root.dataset.inview;
      if (entry.intersectionRatio >= 0.35 && root.dataset.gc === 'armed') {
        root.dataset.gc = 'on';
        glide();
        // the grain starts once the last module (shipping) has drawn in
        assemble = window.setTimeout(() => { root.dataset.gc = 'assembled'; }, 3600);
      }
    }, { threshold: [0, 0.35] });
    observer.observe(root);
    return () => {
      observer.disconnect();
      window.clearTimeout(assemble);
      stopGlide();
      scroller.removeEventListener('pointerdown', stopGlide);
      scroller.removeEventListener('wheel', stopGlide);
    };
  }, [motion]);

  const update = (patch: Partial<GrainComplexState>) => {
    setTouched(true);
    setState((current) => ({ ...current, ...patch }));
  };
  const toggleCrop = (crop: GrainCrop, on: boolean) => {
    setTouched(true);
    setState((current) => ({ ...current, crops: on ? [...current.crops, crop] : current.crops.filter((item) => item !== crop) }));
  };

  return (
    <div className="gc" ref={rootRef} data-flow={running ? 'on' : 'off'}>
      <DrawingSheet
        className="gc-sheet"
        imageClassName="gc-visual"
        cells={[
          { tone: 'main', label: 'Ланцюг', value: <span aria-live="polite">{model.chain.join(' → ')}</span> },
          { label: 'Масштаб', value: `${model.scaleLabel} · умовно` },
          { label: 'Зображення', value: 'Схема' },
        ]}
        action={motion && <TourControl touring={running} toggle={() => setRunning(!running)} what="руху зерна" />}
      >
        {/* On a phone the elevation is wider than the screen: it scrolls sideways, at a size its words can be read */}
        <div className="gc-scroll" ref={scrollRef} role="region" tabIndex={0} aria-label="Схема комплексу, гортайте вбік">
          <GrainComplexDrawing model={model} label={`Схема зернового комплексу: ${model.chain.join(', ')}`} />
        </div>
      </DrawingSheet>

      <div className="gc-controls">
        {/* each crop keeps its own silo (or zone) and colour on the drawing; the swatch is that colour */}
        <fieldset className="gc-group gc-group-crops">
          <legend>Що зберігаєте</legend>
          <div className="gc-options">
            {GRAIN_CROP_OPTIONS.map((option) => (
              <label className="gc-chip" key={option.value}>
                <input type="checkbox" checked={state.crops.includes(option.value)} onChange={(event) => toggleCrop(option.value, event.target.checked)} />
                <span><i className={`gc-swatch gc-crop-${option.value}`} aria-hidden="true" />{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="gc-group">
          <legend>Підготовка зерна</legend>
          <div className="gc-options">
            <label className="gc-chip">
              <input type="checkbox" checked={state.cleaning} onChange={(event) => update({ cleaning: event.target.checked })} />
              <span>Очищення</span>
            </label>
            <label className="gc-chip">
              <input type="checkbox" checked={state.drying} onChange={(event) => update({ drying: event.target.checked })} />
              <span>Сушіння</span>
            </label>
          </div>
        </fieldset>
        <fieldset className="gc-group">
          <legend>Зберігання</legend>
          <div className="gc-options">
            {GRAIN_STORAGE_OPTIONS.map((option) => (
              <label className="gc-chip" key={option.value}>
                <input type="radio" name="gc-storage" checked={state.storage === option.value} onChange={() => update({ storage: option.value })} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="gc-group">
          <legend>Масштаб</legend>
          <div className="gc-options">
            {GRAIN_SCALE_OPTIONS.map((option) => (
              <label className="gc-chip" key={option.value}>
                <input type="radio" name="gc-scale" checked={state.scale === option.value} onChange={() => update({ scale: option.value })} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="gc-scope">
        <div className="gc-scope-col" data-tone="own">
          <h3>Будує RUBIKON</h3>
          <ul>{model.own.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="gc-scope-col" data-tone="partner">
          <h3>Постачають і монтують профільні спеціалісти</h3>
          <ul>{model.partners.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="gc-next">
          <p>Схема без масштабу: кількість силосів і розміри визначає проєкт.</p>
          <PrefillInquiryLink className="button button-primary gc-cta" text={touched ? model.inquiryText : ''}>
            Обговорити такий комплекс <span aria-hidden="true">↓</span>
          </PrefillInquiryLink>
        </div>
      </div>
    </div>
  );
}
