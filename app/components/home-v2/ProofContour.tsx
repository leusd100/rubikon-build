'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { HomeProofCase } from '../../data/homeProof';
import { homeProofContour, type ContourLine } from '../../data/homeProofContour';
import { DrawingSheet } from '../DrawingSheet';
import { ProofFrame, ProofMarks, ProofLabels, SKETCH } from './ProofFrame';
import { homeProofMeasures } from '../../data/homeProofMeasures';

// HOME's proof (owner, 04.10): ONE «Креслення» sheet with the real photo, and right of a seam the visitor moves the same
// frame as a tracing — grey, dark, on a fine grid — with one of three layers over it, chosen in the title block:
//   «Контур» — the copper lines measured from eight photos of this hangar (solid — measured, dashed — approximate;
//     app/data/homeProofContour.ts) and three scale-free figures measured from them: the roof's slope with its
//     uncertainty, the two equal gates, the gable's width to its height (app/data/homeProofMeasures.ts). With «≈» and
//     «±» always, and never a size: the photos give no scale. (Review, 04.10: «the ridge in the middle» is gone — the
//     photo study assumes it, nobody measured it);
//   «Каркас» (the default) — a SCHEME of a frame of the type the owner names for this object, drawn inside that
//     silhouette in the photo's own perspective (app/data/homeProofFrame.ts): illustrative, labelled so on the sheet
//     («Схема · без розмірів») and in the note; never this building's structure, which nobody can see under its
//     cladding and whose drawings were not kept;
//   «Навантаження» — the same scheme with the snow's way through it, link by link, roof to ground.
// The scheme never goes over the photo: it lives right of the seam only, and so do the words that belong to it — the
// stamp that says what it is and the load's chain, clipped at the seam. «Контур на фото» lays the measured lines (and
// only those) over the photo as well, as proof that they land on it.
//
// The seam is a real range input (keys, screen readers). Mouse and pen drag anywhere in the frame; a finger drags only
// the handle, so the page still scrolls and zooms under a thumb, and on a phone «Фото» / «Схема» show one side whole.
// Arriving with motion, the sheet plots in, the lines draw, the scheme builds, and once the seam glides left and back
// (a hint that it moves) — a mouse or pen pressed in the sheet, a finger on the handle or a button, or a key there stops
// that; scrolling the page over the sheet does not (review, 04.10: a wheel or a swipe is how a visitor arrives). With
// reduced motion or without JavaScript the sheet stands complete at its resting split, the controls disabled until the
// page is hydrated.
//
// On a laptop the sheet fits under the header: the stage keeps the sheet's width and crops the photo's sky and gravel
// (home-v2.css); the photo, its tracing and every layer share one canvas in the photo's own pixels, so nothing slides.
//
// Test only (owner, 04.10): /?xray=sketch puts the old generated sketch on the right instead, to compare it with the
// drawn scheme. Read on the client after hydration — the server HTML is the default page's — and never linked.

type Layer = 'contour' | 'frame' | 'load' | 'sketch';

/** The seam's resting place: right of the left gate and left of the ridge, so each side keeps a gate */
export const DEFAULT_SPLIT = 62;
const PAGE_STEP = 10;
/** The first view's glide: from the resting split to here and back */
const GLIDE_TO = 42;
const GLIDE_AT = 4800;
/** The page must have stopped scrolling this long before the glide: the eye is on the way, not on the seam */
const GLIDE_QUIET = 350;
// What fits right of the seam (review, 04.10). The stamp and the load's chain lie on the right side only, clipped at the
// seam (home-v2.css): the stamp keeps its full words while that side is wider than it, its first word below that, and
// the seam's names give way before they reach the stamp or the frame's edge. Measured on the page (the frame's width,
// the names' and the stamp's); in the server markup and without JavaScript, by per cent.
const STAMP_OFFSET = 10;
const SHORT_STAMP = 96;
const AIR = 8;
type Room = { width: number; left: number; right: number; stamp: number };

const LAYERS: Record<Layer, { button: string; seam: string; nominative: string; genitive: string }> = {
  contour: { button: 'Контур', seam: 'Контур', nominative: 'контур за фото', genitive: 'контуру' },
  frame: { button: 'Каркас', seam: 'Схема', nominative: 'схема', genitive: 'схеми' },
  load: { button: 'Навантаження', seam: 'Схема', nominative: 'схема', genitive: 'схеми' },
  sketch: { button: 'Ескіз', seam: 'Ескіз · тест', nominative: 'ескіз', genitive: 'ескізу' },
};
const CHAIN = ['Сніг', 'покрівля', 'прогони', 'ферма', 'стіни', 'фундаменти', 'ґрунт'];
// The legend's keys per layer. Every layer's set is laid out in one cell, the others hidden, so the title block keeps one
// height whichever is on (review, 04.10: on a 360 px phone the load's set took a second line and pushed the controls)
type LegendKey = 'measured' | 'approximate' | 'scheme' | 'load';
const LEGEND: Record<Layer, readonly LegendKey[]> = {
  contour: ['measured', 'approximate'],
  frame: ['measured', 'approximate', 'scheme'],
  load: ['measured', 'scheme', 'load'],
  sketch: [],
};
const LEGEND_WORDS: Record<LegendKey, string> = { measured: 'виміряно', approximate: 'наближено', scheme: 'схема', load: 'навантаження' };

const { photo: contourPhoto, variants, lines, label } = homeProofContour;
const SRC_SET = variants.map(({ src, width }) => `${src} ${width}w`).join(', ');
// The frame's width: the shell less the sheet's margins (34 px on a phone, 46 px above), at most 1440 − 46
const SIZES = '(max-width: 760px) calc(100vw - 66px), (max-width: 1556px) calc(92.5vw - 46px), 1394px';

const pathOf = ({ points }: ContourLine) => `M${points.map(([x, y]) => `${x} ${y}`).join('L')}`;
const clamp = (value: number) => Math.min(100, Math.max(0, value));
// False in the server markup and the hydrating render, true after (ProjectInquiryForm's idiom)
const subscribeToNothing = () => () => undefined;
const sketchRequested = () => new URLSearchParams(window.location.search).get('xray') === 'sketch';

// See STAMP_OFFSET: whether the stamp keeps its full words, and which seam name gives way
function fitOf(room: Room | null, split: number) {
  if (!room) return { stampShort: false, narrowLeft: split < 12, narrowRight: split > 72 };
  const right = (room.width * (100 - split)) / 100;
  const stampShort = right < room.stamp + STAMP_OFFSET + AIR;
  return {
    stampShort,
    narrowLeft: (room.width * split) / 100 < room.left + 3 + AIR,
    narrowRight: right < room.right + 3 + AIR + (stampShort ? SHORT_STAMP : room.stamp) + STAMP_OFFSET,
  };
}

// What the slider says instead of a per cent: which side is which, and roughly how much of each shows
function valueText(value: number, layer: Layer) {
  const right = LAYERS[layer];
  if (value >= 100) return 'Лише фото';
  if (value <= 0) return `Лише ${right.nominative}`;
  let share = 'порівну';
  if (value >= 80) share = 'здебільшого фото';
  else if (value > 55) share = 'більше фото';
  else if (value <= 20) share = `здебільшого ${right.nominative}`;
  else if (value < 45) share = `більше ${right.genitive}`;
  return `Фото ліворуч, ${right.nominative} праворуч: ${share}`;
}

function Lines({ casing }: Readonly<{ casing?: boolean }>) {
  return (
    <g className={casing ? 'hv2-contour-casing' : 'hv2-contour-ink'}>
      {lines.map((line, index) => (
        <path
          key={line.id}
          d={pathOf(line)}
          // Solid lines draw in by their dash offset, measured in path lengths; the dashed ones only fade in
          pathLength={line.approximate ? undefined : 1}
          data-line={line.id}
          data-kind={line.kind}
          data-approximate={line.approximate ? '' : undefined}
          style={{ '--i': index } as CSSProperties}
        >
          {!casing && <title>{line.title}</title>}
        </path>
      ))}
    </g>
  );
}

const legendLine = <svg viewBox="0 0 28 4" aria-hidden="true" focusable="false"><path d="M2 2H26" /></svg>;

export function ProofContour({ photo }: Readonly<{ photo: HomeProofCase['photo'] }>) {
  const [split, setSplit] = useState(DEFAULT_SPLIT);
  const [chosen, setChosen] = useState<Layer | null>(null);
  const [loadRun, setLoadRun] = useState(0);
  const [linesOnPhoto, setLinesOnPhoto] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ready = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const sketchMode = useSyncExternalStore(subscribeToNothing, sketchRequested, () => false);
  // Focus the pointer put on the range: the keyboard's ring stays off until a key is pressed
  const [pointerFocus, setPointerFocus] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ pointer: number; offset: number } | null>(null);
  const touched = useRef(false);
  const [room, setRoom] = useState<Room | null>(null);

  const layers: readonly Layer[] = sketchMode ? ['sketch', 'frame'] : ['contour', 'frame', 'load'];
  const layer: Layer = chosen && layers.includes(chosen) ? chosen : layers[sketchMode ? 0 : 1];
  const rightSide = LAYERS[layer];

  // The first view: once the sheet has arrived and the scheme has built, the seam glides left and back — on the stage's
  // --split only (a registered custom property, home-v2.css), so the range's value and what it says never move. It
  // waits until the stage is in view and the page has stopped scrolling. Only the visitor's own move in the sheet
  // first, or reduced motion: no glide.
  useEffect(() => {
    const stage = stageRef.current;
    const sheet = stage?.closest('figure');
    if (!stage || !sheet || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let glide: Animation | undefined;
    let timer: number | undefined;
    let due = false;
    let visible = false;
    let scrolled = 0;
    const stop = () => {
      touched.current = true;
      window.clearTimeout(timer);
      glide?.cancel();
      delete stage.dataset.gliding;
    };
    const run = () => {
      if (touched.current || !due || !visible || glide) return;
      const quiet = performance.now() - scrolled;
      if (quiet < GLIDE_QUIET) {
        window.clearTimeout(timer);
        timer = window.setTimeout(run, GLIDE_QUIET - quiet);
        return;
      }
      stage.dataset.gliding = '';
      const from = `${DEFAULT_SPLIT}%`;
      const to = `${GLIDE_TO}%`;
      glide = stage.animate(
        [{ '--split': from }, { '--split': to, offset: 0.44 }, { '--split': to, offset: 0.67 }, { '--split': from }],
        { duration: 1800, easing: 'cubic-bezier(.45, 0, .25, 1)' },
      );
      glide.onfinish = () => {
        delete stage.dataset.gliding;
        // Two rings from the handle, once: this is the thing to drag
        stage.dataset.pulse = '';
        timer = window.setTimeout(() => delete stage.dataset.pulse, 1700);
      };
    };
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      run();
    }, { threshold: 0.35 });
    seen.observe(stage);
    const arrived = new MutationObserver(() => {
      if (sheet.getAttribute('data-sheet-state') !== 'on') return;
      arrived.disconnect();
      timer = window.setTimeout(() => {
        due = true;
        run();
      }, GLIDE_AT);
    });
    arrived.observe(sheet, { attributes: true, attributeFilter: ['data-sheet-state'] });
    const onScroll = () => { scrolled = performance.now(); };
    // A mouse or a pen pressed anywhere in the sheet is the visitor's own move; a finger only on what it can move (the
    // handle, a button): elsewhere it scrolls the page. Keys reach the sheet only on its range and buttons
    const onPointer = (event: globalThis.PointerEvent) => {
      if (event.pointerType === 'touch' && !(event.target as Element).closest('.hv2-contour-handle, button')) return;
      stop();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    sheet.addEventListener('pointerdown', onPointer, { passive: true });
    sheet.addEventListener('keydown', stop);
    return () => {
      seen.disconnect();
      arrived.disconnect();
      window.clearTimeout(timer);
      glide?.cancel();
      window.removeEventListener('scroll', onScroll);
      sheet.removeEventListener('pointerdown', onPointer);
      sheet.removeEventListener('keydown', stop);
    };
  }, []);

  // The room right and left of the seam (see STAMP_OFFSET): the frame's width, the seam names' and the full stamp's,
  // again when the frame resizes, the layer changes their words or the fonts arrive. A short stamp keeps the full
  // stamp's width last measured
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let live = true;
    const measure = () => {
      if (!live) return;
      const [left = 0, right = 0] = [...stage.querySelectorAll<HTMLElement>('.hv2-contour-seamtags > span')].map((tag) => tag.offsetWidth);
      const stamp = stage.querySelector<HTMLElement>('.hv2-contour-stamp');
      const full = stamp && stage.dataset.stamp !== 'short' ? stamp.offsetWidth : 0;
      setRoom((previous) => {
        const next = { width: stage.clientWidth, left, right, stamp: full || previous?.stamp || 196 };
        return previous && Object.entries(next).every(([key, value]) => previous[key as keyof Room] === value) ? previous : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    void document.fonts?.ready.then(measure);
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [layer]);

  const splitAt = (clientX: number, offset = 0) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    // Tenths of a per cent: a whole per cent is a 13 px jump on a wide screen
    setSplit(Math.round(clamp(((clientX - offset - box.left) / box.width) * 100) * 10) / 10);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !ready) return;
    const handle = (event.target as Element).closest('.hv2-contour-handle');
    // A finger on the photo scrolls the page; only the handle takes it
    if (event.pointerType === 'touch' && !handle) return;
    event.preventDefault();
    if (handle) {
      // Grabbing the handle keeps the seam where it is and the handle under the pointer. The offset is taken from where
      // the handle is drawn, not from the seam: at either end of the frame it is held clear of the edge, off the seam
      const grip = handle.getBoundingClientRect();
      drag.current = { pointer: event.pointerId, offset: event.clientX - (grip.left + grip.width / 2) };
    } else {
      // A click elsewhere moves the seam there
      drag.current = { pointer: event.pointerId, offset: 0 };
      splitAt(event.clientX);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setPointerFocus(true);
    rangeRef.current?.focus({ preventScroll: true });
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer === event.pointerId) splitAt(event.clientX, drag.current.offset);
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  // Arrows step by one through the native range; the larger steps are the same in every browser
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    setPointerFocus(false);
    const to = { PageUp: Math.round(split) + PAGE_STEP, PageDown: Math.round(split) - PAGE_STEP, Home: 0, End: 100 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    setSplit(clamp(to));
  };

  // «Фото» / «Схема» show one side whole; pressed again, they bring the seam back to rest
  const showOnly = (side: 100 | 0) => setSplit(split === side ? DEFAULT_SPLIT : side);

  // A layer chosen with the seam far right brings the right side back into view; the load is replayed on every press,
  // and on a phone its way down the frame wants the wider right side
  const choose = (next: Layer) => {
    setChosen(next);
    if (next === 'load') {
      setLoadRun((run) => run + 1);
      const phone = window.matchMedia('(max-width: 760px)').matches;
      if (phone && split > 40) setSplit(40);
      else if (split >= 85) setSplit(DEFAULT_SPLIT);
    } else if (split >= 85) {
      setSplit(DEFAULT_SPLIT);
    }
  };

  const measured = homeProofMeasures.filter((measure) => measure.chip);
  const { stampShort, narrowLeft, narrowRight } = fitOf(room, split);
  const sliderLabel = `Порівняти фото й ${{ contour: 'контур за фото', frame: 'схему', load: 'схему', sketch: 'ескіз' }[layer]}`;

  return (
    <DrawingSheet
      className="hv2-contour"
      imageClassName="hv2-contour-media"
      cells={[
        { label: 'Ліворуч', value: 'Фото об’єкта' },
        {
          tone: 'note',
          label: 'Об’єкт',
          // The sketch's own note only while the sketch is on the right: the drawn scheme keeps its own in test mode too
          value: layer === 'sketch' ? (
            <>
              <b>Тестовий режим для порівняння.</b> Праворуч — згенероване зображення, не фото й не креслення; його
              композиція не збігається з фото.
            </>
          ) : (
            <>
              <b>Реальний об’єкт: фото, виміри, схема.</b> Фото з ретушшю переднього плану; контур, схил і пропорції —
              за вісьмома фото цього ангара, без масштабу. Креслень саме цього ангара в нас немає, тож каркас показано
              схемою — такого типу, як на цьому об’єкті, без розмірів.
            </>
          ),
        },
        {
          // A phone's figures: the measured facts as chips (the frame has no room for labels there), or the load's way
          className: 'hv2-contour-facts',
          value: (
            <span className="hv2-contour-facts-slot" aria-hidden="true">
              <span className="hv2-contour-chips" data-on={layer === 'load' ? undefined : ''}>
                {measured.map((measure) => <span key={measure.id} data-measure={measure.id}>{measure.chip}</span>)}
              </span>
              <span className="hv2-contour-chain-text" data-on={layer === 'load' ? '' : undefined}>{CHAIN.join(' → ')}</span>
            </span>
          ),
        },
        {
          label: 'Праворуч',
          className: 'hv2-contour-right',
          value: (
            <>
              <span className="hv2-contour-layers" role="group" aria-label="Що показати праворуч">
                {layers.map((name) => (
                  <button key={name} type="button" aria-pressed={layer === name} disabled={!ready} onClick={() => choose(name)}>
                    {LAYERS[name].button}
                  </button>
                ))}
              </span>
              <span className="hv2-contour-legend">
                {layers.map((name) => (
                  <span key={name} className="hv2-contour-legend-set" data-layer={name} data-on={name === layer ? '' : undefined}>
                    {LEGEND[name].map((key) => (
                      <span key={key} data-key={key} data-approximate={key === 'approximate' ? '' : undefined}>{legendLine}{LEGEND_WORDS[key]}</span>
                    ))}
                  </span>
                ))}
              </span>
            </>
          ),
        },
      ]}
      action={
        <span className="hv2-contour-controls">
          <span className="hv2-contour-sides">
            <button type="button" aria-pressed={split === 100} disabled={!ready} onClick={() => showOnly(100)}>Фото</button>
            <button type="button" aria-pressed={split === 0} disabled={!ready} onClick={() => showOnly(0)}>
              {layer === 'contour' ? 'Контур' : layer === 'sketch' ? 'Ескіз' : 'Схема'}
            </button>
          </span>
          <button type="button" className="hv2-contour-toggle" aria-pressed={linesOnPhoto} disabled={!ready} onClick={() => setLinesOnPhoto((on) => !on)}>
            <i aria-hidden="true" />
            Контур на фото
          </button>
        </span>
      }
    >
      <div
        ref={stageRef}
        className="hv2-contour-stage"
        style={{ '--split': `${split}%` } as CSSProperties}
        data-layer={layer}
        data-dragging={dragging ? '' : undefined}
        data-lines-on-photo={linesOnPhoto ? '' : undefined}
        data-pointer-focus={pointerFocus ? '' : undefined}
        // The seam's names give way where their side is too narrow, the right one before the stamp; the stamp shortens
        data-narrow-left={narrowLeft ? '' : undefined}
        data-narrow-right={narrowRight ? '' : undefined}
        data-stamp={stampShort ? 'short' : undefined}
        data-photo-only={split >= 100 ? '' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        {/* One canvas in the photo's own proportion: the photo, its tracing and every layer over it. On a laptop the
            stage is shorter than the canvas and crops its sky and gravel (home-v2.css) */}
        <div className="hv2-contour-canvas">
          <picture>
            <source type="image/webp" srcSet={SRC_SET} sizes={SIZES} />
            <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" draggable={false} />
          </picture>
          {/* The tracing: the same frame (the same file, so no second download), grey and dark, on a fine grid */}
          <div className="hv2-contour-trace" aria-hidden="true">
            <picture>
              <source type="image/webp" srcSet={SRC_SET} sizes={SIZES} />
              <img src={photo.src} alt="" width={photo.width} height={photo.height} loading="lazy" decoding="async" draggable={false} />
            </picture>
          </div>
          {sketchMode && (
            <div className="hv2-contour-sketch">
              {/* eslint-disable-next-line @next/next/no-img-element -- a pre-generated WebP pair, as ResponsiveImage */}
              <img
                src={SKETCH.src}
                srcSet={SKETCH.srcSet}
                sizes="(max-width: 760px) 80vw, 75vw"
                alt="Згенероване зображення: умовний каркас ангара зі шляхом навантаження — тестове порівняння, не цей об’єкт"
                width={SKETCH.width}
                height={SKETCH.height}
                draggable={false}
              />
            </div>
          )}
          <ProofFrame loadRun={loadRun} shown={layer === 'frame' || layer === 'load'} />
          <svg
            className="hv2-contour-lines"
            viewBox={`0 0 ${contourPhoto.width} ${contourPhoto.height}`}
            role="img"
            aria-label={label}
          >
            {/* A thin dark casing under each copper line keeps it legible where it crosses the photo's light cladding */}
            <Lines casing />
            <Lines />
          </svg>
          <ProofMarks />
          <ProofLabels />
        </div>
        {/* The right side's own words, outside the canvas (never cropped) and on that side only (clipped at the seam):
            what it is, top right; the load's chain, bottom right */}
        <span className="hv2-contour-corner" aria-hidden="true">
          <span className="hv2-contour-stamp">
            <small>
              {layer === 'contour' ? 'Виміряно' : layer === 'sketch' ? 'Тест' : 'Схема'}
              {/* a phone keeps the first word only */}
              <span className="hv2-contour-stamp-more">{layer === 'contour' ? ' за фото' : layer === 'sketch' ? '' : ' · без розмірів'}</span>
            </small>
            <span className="hv2-contour-stamp-text">
              {layer === 'contour' ? 'без масштабу' : layer === 'sketch' ? 'згенероване зображення' : 'каркас такого типу, як на цьому об’єкті'}
            </span>
          </span>
          <span className="hv2-contour-chain" key={`chain-${loadRun}`}>
            {CHAIN.map((link, index) => <span key={link} style={{ '--n': index } as CSSProperties}>{link}</span>)}
          </span>
        </span>
        <span className="hv2-contour-seamtags" aria-hidden="true">
          <span>‹ Фото</span>
          <span>{rightSide.seam} ›</span>
        </span>
        {/* What the figures say, for a screen reader: the labels on the frame are drawn for the eye only */}
        <ul className="sr-only" aria-label="Виміряно за фото, без масштабу">
          {homeProofMeasures.map((measure) => <li key={measure.id} data-measure={measure.id}>{measure.spoken}</li>)}
        </ul>
        <input
          ref={rangeRef}
          className="hv2-contour-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(split)}
          aria-label={sliderLabel}
          aria-valuetext={valueText(Math.round(split), layer)}
          disabled={!ready}
          onChange={(event) => setSplit(Number(event.target.value))}
          onKeyDown={onKeyDown}
          onBlur={() => setPointerFocus(false)}
        />
        <span className="hv2-contour-seam" aria-hidden="true" />
        <span className="hv2-contour-handle" aria-hidden="true">‹ ›</span>
      </div>
    </DrawingSheet>
  );
}
