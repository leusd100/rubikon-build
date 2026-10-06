'use client';

import { Bean, Flower, Flower2, Sprout, Vegan, Wheat } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  GRAIN_COMPLEX_DEFAULT,
  GRAIN_CROP_OPTIONS,
  GRAIN_SCALE_OPTIONS,
  GRAIN_STORAGE_OPTIONS,
  grainComplexModel,
  grainModuleInfo,
  grainModulePress,
  type GrainComplexState,
  type GrainCrop,
  type GrainModuleKey,
} from '../../lib/grainComplex';
import { DrawingSheet } from '../DrawingSheet';
import { PrefillInquiryLink } from '../directions/PrefillInquiryLink';
import { TourControl } from '../directions/TourParts';
import { GrainComplexDrawing, grainModuleCentre } from './GrainComplexDrawing';
import './grain-complex.css';

/** Each crop's icon on its chip — the planner's own (StorageQuestion), rapeseed's added — drawn in the crop's colour */
const CROP_ICONS: Record<GrainCrop, ReactNode> = {
  wheat: <Wheat />,
  corn: <Vegan />,
  sunflower: <Flower2 />,
  barley: <Sprout />,
  rapeseed: <Flower />,
  soy: <Bean />,
};

/** How long the phone's view takes to glide along the elevation while it assembles (its modules arrive over ~3.3 s) */
const GLIDE_MS = 3600;
/** How long a changed module flashes and a new line in «Будує RUBIKON» stays lit */
const FLASH_MS = 1400;
/** A tip shown by a touch stays this long (a finger has no «leave» to wait for) */
const TOUCH_TIP_MS = 2600;
/** The tip's distance from its module, and from the drawing's edges it never crosses */
const TIP_GAP = 10;
const TIP_EDGE = 8;

/** The module a tip names, and where the phone's sideways view is going if a press just sent it there */
type Tip = { key: GrainModuleKey; view: number | null };

// The block's working part: the choices as real form controls, the drawing that follows them — and answers a pointer
// itself (owner, 06.10: «креслення як пульт»): a module names who builds what in it, a press adds or removes cleaning
// and drying or swaps the storage. Whatever changed flashes on the drawing and in «Будує RUBIKON»; on a phone the
// sideways view comes to it, and the drawing stays on screen over the choices (sticky, grain-complex.css). Arriving in
// view the complex assembles module by module, then the grain runs through it while it is on screen; the round control
// pauses that (WCAG 2.2.2). The phases live in data attributes set straight on the element (as DrawingSheet and
// ProcessMotion do). Reduced motion: the finished complex, still; changes jump instead of gliding.

export function GrainComplexBuilder() {
  const [state, setState] = useState<GrainComplexState>(GRAIN_COMPLEX_DEFAULT);
  /** The form is started with the chain only once the visitor has chosen something — never with the opening picture */
  const [touched, setTouched] = useState(false);
  const [running, setRunning] = useState(true);
  const [motion, setMotion] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const [flash, setFlash] = useState<GrainModuleKey | null>(null);
  const [fresh, setFresh] = useState<readonly string[]>([]);
  /** Counts the changes, so a module or a line lit twice in a row lights again (its element is drawn anew) */
  const [pulse, setPulse] = useState(0);
  /** Whether the drawing is wider than its view (a phone): only then is it a scroll region to reach by Tab */
  const [scrolls, setScrolls] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef('mouse');
  const stopGlideRef = useRef<() => void>(() => undefined);
  const flashTimer = useRef(0);
  const tipTimer = useRef(0);
  const model = grainComplexModel(state);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(!query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(flashTimer.current);
    window.clearTimeout(tipTimer.current);
  }, []);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    // fires once on observing, then on every resize
    const observer = new ResizeObserver(() => setScrolls(scroller.scrollWidth - scroller.clientWidth > 12));
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const scroller = scrollRef.current;
    if (!root || !scroller || !motion) return;
    if (!root.dataset.gc) root.dataset.gc = 'armed';
    let assemble = 0;
    let frame = 0;
    // On a phone the elevation is wider than the screen: while it assembles, the view glides along it after the grain,
    // from the receiving pit to the loading bin — until the visitor takes the drawing (or a choice) in hand
    const stopGlide = () => window.cancelAnimationFrame(frame);
    stopGlideRef.current = stopGlide;
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
    // The drawing itself is watched, not the whole block: on a low screen (a phone on its side, a laptop at 200 %) the
    // block never shows a third of itself at once, and the complex would stay unassembled
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
    observer.observe(scroller);
    return () => {
      observer.disconnect();
      window.clearTimeout(assemble);
      stopGlide();
      scroller.removeEventListener('pointerdown', stopGlide);
      scroller.removeEventListener('wheel', stopGlide);
      // motion turned off mid-visit (or the block leaves): the finished complex, still — nothing armed, nothing running
      delete root.dataset.gc;
      delete root.dataset.inview;
    };
  }, [motion]);

  // The tip sits inside the drawing, beside its module: over it, under it, to its right or left — the first place where it
  // is whole, in view and clear of the pause in the top corner; failing all (a phone's drawing is low), at the drawing's
  // top over the module, beside the pause or under it. It lives in the sideways view's own coordinates, so it travels with
  // the drawing; measured after the drawing has changed.
  useLayoutEffect(() => {
    const element = tipRef.current;
    const scroller = scrollRef.current;
    const area = tip && scroller?.querySelector(`.gc-hit[data-module="${tip.key}"]`);
    if (!element || !scroller || !area || !tip) return;
    const frame = scroller.getBoundingClientRect();
    const box = area.getBoundingClientRect();
    const left = box.left - frame.left + scroller.scrollLeft;
    const top = box.top - frame.top;
    const view = tip.view ?? scroller.scrollLeft;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const minX = view + TIP_EDGE;
    const maxX = view + scroller.clientWidth - width - TIP_EDGE;
    const maxY = scroller.clientHeight - height - TIP_EDGE;
    const centred = Math.min(Math.max(left + box.width / 2 - width / 2, minX), maxX);
    // the pause stays put over the sideways view: where it will be once the view has got where it is going
    const pause = rootRef.current?.querySelector('.gc-pause')?.getBoundingClientRect();
    const pauseLeft = pause ? pause.left - frame.left + view : Infinity;
    const pauseBottom = pause ? pause.bottom - frame.top : 0;
    const clear = (px: number, py: number) =>
      !pause || px + width + TIP_GAP <= pauseLeft || px >= pauseLeft + pause.width + TIP_GAP || py >= pauseBottom + TIP_GAP;
    const places = [
      [centred, top - TIP_GAP - height],
      [centred, top + box.height + TIP_GAP],
      [left + box.width + TIP_GAP, top + TIP_EDGE],
      [left - TIP_GAP - width, top + TIP_EDGE],
      [centred, TIP_EDGE],
      [Math.min(centred, pauseLeft - TIP_GAP - width), TIP_EDGE],
      [centred, pauseBottom + TIP_GAP],
    ];
    const [x, y] = places.find(([px, py]) => px >= minX && px <= maxX && py >= TIP_EDGE && py <= maxY && clear(px, py)) ?? [centred, TIP_EDGE];
    element.style.left = `${Math.round(x)}px`;
    element.style.top = `${Math.round(y)}px`;
  }, [tip, state]);

  /** A change from a chip or from the drawing: the new state, what it lit, and — on a phone — the module brought into view
   *  (returns where that view is going) */
  const apply = (next: GrainComplexState, changed: GrainModuleKey | null) => {
    stopGlideRef.current();
    const before = grainComplexModel(state);
    const after = grainComplexModel(next);
    setTouched(true);
    setState(next);
    setFresh([...after.own, ...after.partners].filter((item) => !before.own.includes(item) && !before.partners.includes(item)));
    setFlash(changed);
    setPulse((count) => count + 1);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => { setFlash(null); setFresh([]); }, FLASH_MS);
    const scroller = scrollRef.current;
    const room = scroller ? scroller.scrollWidth - scroller.clientWidth : 0;
    if (!changed || !scroller || room <= 12) return null;
    const scale = (scroller.querySelector('svg')?.getBoundingClientRect().width ?? scroller.scrollWidth) / 2400;
    const left = Math.min(Math.max(grainModuleCentre(changed, after) * scale - scroller.clientWidth / 2, 0), room);
    scroller.scrollTo({ left, behavior: motion ? 'smooth' : 'auto' });
    return left;
  };
  const update = (patch: Partial<GrainComplexState>, changed: GrainModuleKey | null) => apply({ ...state, ...patch }, changed);
  const toggleCrop = (crop: GrainCrop, on: boolean) =>
    update({ crops: on ? [...state.crops, crop] : state.crops.filter((item) => item !== crop) }, 'storage');

  // A mouse or a pen names a module by pointing at it; a finger only by a tap — sliding the drawing sideways names nothing —
  // and its tip goes by itself, as a finger has no «leave»
  const showTip = (key: GrainModuleKey, view: number | null) => {
    window.clearTimeout(tipTimer.current);
    setTip({ key, view });
    if (pointerRef.current === 'touch') tipTimer.current = window.setTimeout(() => setTip(null), TOUCH_TIP_MS);
  };
  const enter = (key: GrainModuleKey, pointerType: string) => {
    pointerRef.current = pointerType;
    if (pointerType !== 'touch') showTip(key, null);
  };
  const leave = (pointerType: string) => {
    if (pointerType === 'touch') return;
    window.clearTimeout(tipTimer.current);
    setTip(null);
  };
  const press = (key: GrainModuleKey) => {
    const patch = grainModulePress(key, state);
    showTip(key, patch ? update(patch, key) : null);
  };

  const info = tip ? grainModuleInfo(tip.key, state) : null;
  const crops = GRAIN_CROP_OPTIONS.filter((option) => state.crops.includes(option.value)).map((option) => option.genitive).join(', ');
  const lit = (item: string) => (fresh.includes(item) ? { key: `${item}-${pulse}`, className: 'is-new' } : { key: item });
  const pause = motion && <TourControl touring={running} toggle={() => setRunning(!running)} what="руху зерна" />;
  const cta = (className: string) => (
    <PrefillInquiryLink className={`button button-primary ${className}`} text={touched ? model.inquiryText : ''}>
      Обговорити такий комплекс <span aria-hidden="true">↓</span>
    </PrefillInquiryLink>
  );

  return (
    <div className="gc" ref={rootRef} data-flow={running ? 'on' : 'off'}>
      {/* the sheet and the choices: on a phone the sheet stays at the top while the choices pass under it */}
      <div className="gc-stage">
        <DrawingSheet
          className="gc-sheet"
          imageClassName="gc-visual"
          cells={[
            {
              tone: 'main',
              label: 'Ланцюг',
              // the arrows are seen; a screen reader hears the modules in their order
              value: <><span aria-hidden="true">{model.chain.join(' → ')}</span><span className="sr-only">{model.chain.join(', ')}</span></>,
            },
            { label: 'Місткість', value: `${model.scaleLabel} · умовно` },
            { label: 'Зображення', value: 'Схема' },
          ]}
          action={cta('gc-cta')}
        >
          {/* On a phone the elevation is wider than the screen: it scrolls sideways, at a size its words can be read */}
          <div className="gc-scroll" ref={scrollRef} role="region" tabIndex={scrolls ? 0 : undefined} aria-label={scrolls ? 'Схема комплексу, гортайте вбік' : 'Схема комплексу'}>
            <GrainComplexDrawing
              model={model}
              label={`Схема зернового комплексу: ${model.chain.join(', ')}${crops ? ` — ${crops}` : ''}`}
              hovered={tip?.key ?? null}
              flash={flash}
              pulse={pulse}
              onEnter={enter}
              onLeave={leave}
              onPress={press}
            />
            {info && (
              <div className="gc-tip" ref={tipRef} aria-hidden="true">
                <b>{info.name}</b>
                <span className="gc-tip-own">RUBIKON: {info.own}</span>
                {info.partners && <span className="gc-tip-partner">Спеціалісти: {info.partners}</span>}
                {info.action && <em>{info.action}</em>}
              </div>
            )}
          </div>
          {/* the grain's pause sits on the drawing it stops, in its empty top corner: the title block keeps its line for the
              chain, and a phone's sheet has no title block */}
          {pause && <span className="gc-pause">{pause}</span>}
        </DrawingSheet>
        {/* what changed, said once — outside the title block, which a phone does not show */}
        <p className="sr-only" aria-live="polite">Ланцюг: {model.chain.join(', ')}</p>

        <div className="gc-controls">
          {/* each crop keeps its own silo (or zone) and colour on the drawing; its icon on the chip is in that colour */}
          <fieldset className="gc-group gc-group-crops">
            <legend>Що зберігаєте</legend>
            <div className="gc-options">
              {GRAIN_CROP_OPTIONS.map((option) => (
                <label className="gc-chip" key={option.value}>
                  <input type="checkbox" checked={state.crops.includes(option.value)} onChange={(event) => toggleCrop(option.value, event.target.checked)} />
                  <span><i className={`gc-crop-icon gc-crop-${option.value}`} aria-hidden="true">{CROP_ICONS[option.value]}</i>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="gc-group">
            <legend>Підготовка зерна</legend>
            <div className="gc-options">
              <label className="gc-chip">
                <input type="checkbox" checked={state.cleaning} onChange={(event) => update({ cleaning: event.target.checked }, 'cleaning')} />
                <span>Очищення</span>
              </label>
              <label className="gc-chip">
                <input type="checkbox" checked={state.drying} onChange={(event) => update({ drying: event.target.checked }, 'drying')} />
                <span>Сушіння</span>
              </label>
            </div>
          </fieldset>
          <fieldset className="gc-group">
            <legend>Зберігання</legend>
            <div className="gc-options">
              {GRAIN_STORAGE_OPTIONS.map((option) => (
                <label className="gc-chip" key={option.value}>
                  <input type="radio" name="gc-storage" checked={state.storage === option.value} onChange={() => update({ storage: option.value }, 'storage')} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="gc-group">
            <legend>Місткість</legend>
            <div className="gc-options">
              {GRAIN_SCALE_OPTIONS.map((option) => (
                <label className="gc-chip" key={option.value}>
                  <input type="radio" name="gc-scale" checked={state.scale === option.value} onChange={() => update({ scale: option.value }, 'storage')} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {cta('gc-cta-phone')}
        </div>
      </div>

      <div className="gc-scope">
        <div className="gc-scope-col" data-tone="own">
          <h3>Будує RUBIKON</h3>
          <ul>{model.own.map((item) => { const { key, className } = lit(item); return <li key={key} className={className}>{item}</li>; })}</ul>
        </div>
        <div className="gc-scope-col" data-tone="partner">
          <h3>Постачають і монтують профільні спеціалісти</h3>
          <ul>{model.partners.map((item) => { const { key, className } = lit(item); return <li key={key} className={className}>{item}</li>; })}</ul>
        </div>
        <p className="gc-next">
          Схема без масштабу: кількість силосів і розміри визначає проєкт.{' '}
          <span className="gc-next-pointer">Наведіть на модуль креслення — побачите, хто що в ньому робить; натисніть — додасте чи приберете його.</span>
          <span className="gc-next-touch">Торкніться модуля креслення — побачите, хто що в ньому робить, і додасте чи приберете його.</span>
        </p>
      </div>
    </div>
  );
}
