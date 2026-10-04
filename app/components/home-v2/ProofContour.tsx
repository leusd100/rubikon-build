'use client';

import { memo, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { HomeProofCase } from '../../data/homeProof';
import { homeProofContour, type ContourLine } from '../../data/homeProofContour';
import { homeProofFrame } from '../../data/homeProofFrame';
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
//     («Схема · без розмірів») and in the note; with the walls and the central row of columns the owner remembers, but
//     never this building's drawn structure — nobody can see it under the cladding and its drawings were not kept. Here
//     the outline is one solid copper line and the cladding's strip lines are off (owner, 04.10): the measured /
//     approximate split is «Контур»'s;
//   «Сніг» — the same scheme with the snow's way through it, link by link, roof to ground; «Вітер» — the wind's, across
//     the building, in its own cool tint (owner review, 04.10).
// The scheme never goes over the photo: it lives right of the seam only, and so do the words that belong to it — the
// stamp that says what it is and the load's chain, clipped at the seam. «Контур на фото» lays the measured lines (and
// only those) over the photo as well, as proof that they land on it.
//
// The seam is a real range input (keys, screen readers). Mouse and pen drag anywhere in the frame; a finger drags only
// the handle, so the page still scrolls and zooms under a thumb, and on a phone «Фото» / «Схема» show one side whole.
// A mouse over the frame moves the seam with it, no press needed (owner, 04.10); a press and a drag still work, and a
// finger takes the handle. Passing a measured line — a gate's jamb, a corner of the gable — the seam lights it up over
// the photo and names it at its top, as a CAD cursor reports what it is on, but never holds there (owner, 04.10: a
// magnet at the gates «не дуже»); keys and screen readers step as before.
// Arriving with motion (owner review, 04.10 — «шов-плотер»), the sheet plots in as a whole photo, then the seam sweeps
// from the right edge across the gable and back to rest, and what it has passed is the drawing, whole; the figures and
// names come in when it rests, and two rings from the handle say it moves. A mouse or pen pressed in the sheet, a finger
// on the handle or a button, or a key there stops that; scrolling the page over the sheet does not (review, 04.10: a
// wheel or a swipe is how a visitor arrives). With reduced motion or without JavaScript the sheet stands complete at its
// resting split, the controls disabled until the page is hydrated.
//
// On a laptop the sheet fits under the header: the stage keeps the sheet's width and crops the photo's sky and gravel
// (home-v2.css); the photo, its tracing and every layer share one canvas in the photo's own pixels, so nothing slides.
//
// Test only (owner, 04.10): /?xray=sketch puts the old generated sketch on the right instead, to compare it with the
// drawn scheme. Read on the client after hydration — the server HTML is the default page's — and never linked.

type Layer = 'contour' | 'frame' | 'load' | 'wind' | 'sketch';

/** The seam's resting place: right of the left gate and left of the ridge, so each side keeps a gate */
export const DEFAULT_SPLIT = 62;
const PAGE_STEP = 10;
/** The first view's sweep: once the photo has plotted in (DrawingSheet: 120 + 900 ms), from the right edge to just past
 *  the gable's left corner, then back to rest — the turn at 62 % of its time, each leg eased on its own (one easing over
 *  both would reverse at full speed) */
const SWEEP_AT = 1050;
const SWEEP_TURN = 15;
const SWEEP_MS = 3000;
const SWEEP_MS_PHONE = 2200;
/** The page must have stopped scrolling this long before the sweep: the eye is on the way, not on the seam */
const SWEEP_QUIET = 250;
/** Passing a measured line, in per cent of the frame: lit within GRAB of it, until the seam is past RELEASE */
const SNAP_GRAB = 0.8;
const SNAP_RELEASE = 1.4;
/** A phone's close-up of the gable (home-v2.css, ≤ 760 px): the canvas 1.22 × the frame's width, shifted left by 19.46 %
 *  of it — the photo's columns 245–1505, the gable whole — so a line at a per cent of the canvas stands at
 *  (per cent × ZOOM − LEFT) of the frame; the sweep turns just past the gable's left corner there */
const PHONE_ZOOM = 1.22;
const PHONE_LEFT = 19.46;
const SWEEP_TURN_PHONE = 1;
/** The held line's name: its distance from the seam, px */
const SNAP_GAP = 10;
/** …and its padding and border, px (home-v2.css) */
const SNAP_FRAME = 20;
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
  // Two loads, each its own layer and its own colour (owner review, 04.10: «розумно кольорів, наприклад вітер»)
  load: { button: 'Сніг', seam: 'Схема', nominative: 'схема', genitive: 'схеми' },
  wind: { button: 'Вітер', seam: 'Схема', nominative: 'схема', genitive: 'схеми' },
  sketch: { button: 'Ескіз', seam: 'Ескіз · тест', nominative: 'ескіз', genitive: 'ескізу' },
};
/** Each load's way, link by link, in its own words, each word lit with its part of the drawing (n: ProofFrame's --n) —
 *  in the legend under the layers, not on the frame: on a laptop's crop the frame has no free room for it (review, 04.10) */
const CHAINS: Partial<Record<Layer, readonly (readonly [string, number])[]>> = {
  load: [['Сніг', 0], ['покрівля', 1], ['прогони', 2], ['ферма', 3], ['стіни й колони', 4], ['фундаменти', 5], ['ґрунт', 6]],
  wind: [['Вітер', 0], ['стіна', 2], ['ферма', 3], ['стіна й колона', 4], ['фундаменти', 5], ['ґрунт', 6]],
};
// The legend's keys per layer. Every layer's set is laid out in one cell, the others hidden, so the title block keeps one
// height whichever is on (review, 04.10: on a 360 px phone the load's set took a second line and pushed the controls)
// On the scheme's layers the outline is one solid line and what stands behind the gable is copper (owner, 04.10): the
// measured / approximate split is the «Контур» layer's
type LegendKey = 'measured' | 'approximate' | 'outline' | 'scheme' | 'depth' | 'load' | 'wind';
const LEGEND: Record<Layer, readonly LegendKey[]> = {
  contour: ['measured', 'approximate'],
  frame: ['outline', 'scheme', 'depth'],
  load: ['outline', 'scheme', 'load'],
  wind: ['outline', 'scheme', 'wind'],
  sketch: [],
};
const LEGEND_WORDS: Record<LegendKey, string> = {
  measured: 'виміряно',
  approximate: 'наближено',
  // One word: every set shares one cell, and a second line on a laptop pushed the title block over the picture
  outline: 'контур',
  scheme: 'схема',
  depth: 'у глибині',
  load: 'сніг',
  wind: 'вітер',
};

const { photo: contourPhoto, variants, lines, label } = homeProofContour;
const SRC_SET = variants.map(({ src, width }) => `${src} ${width}w`).join(', ');
// The frame's width: the shell less the sheet's margins (34 px on a phone, 46 px above), at most 1440 − 46
const SIZES = '(max-width: 760px) calc((100vw - 66px) * 1.22), (max-width: 1556px) calc(92.5vw - 46px), 1394px';

const pathOf = ({ points }: ContourLine) => `M${points.map(([x, y]) => `${x} ${y}`).join('L')}`;

// What the seam snaps to: the measured verticals — both gates' jambs and the gable's corners, each at its mean x — with
// the words for the seam's foot. Not the ridge: nobody measured where it stands (homeProofMeasures.ts)
type Snap = { line: string; at: number; name: string; status: string };
const pointsOf = (id: string) => lines.find((line) => line.id === id)!.points;
const snapAt = (id: string, from: number, to?: number) => {
  const part = pointsOf(id).slice(from, to);
  return (part.reduce((sum, [x]) => sum + x, 0) / part.length / contourPhoto.width) * 100;
};
const SNAPS: readonly Snap[] = [
  { line: 'gable-base', at: snapAt('gable-base', 1), name: 'Лівий кут фронтона', status: 'виміряно' },
  { line: 'gate-left', at: snapAt('gate-left', 0, 2), name: 'Ліві ворота, одвірок', status: 'виміряно' },
  { line: 'gate-left', at: snapAt('gate-left', 2), name: 'Ліві ворота, одвірок', status: 'виміряно' },
  { line: 'gate-right', at: snapAt('gate-right', 0, 2), name: 'Праві ворота, одвірок', status: 'виміряно' },
  { line: 'gate-right', at: snapAt('gate-right', 2), name: 'Праві ворота, одвірок', status: 'виміряно' },
  { line: 'gable-corner-right', at: snapAt('gable-corner-right', 2), name: 'Правий кут фронтона', status: 'наближено' },
];
const phoneNow = () => window.matchMedia('(max-width: 760px)').matches;
/** Where a measured line stands in the frame, per cent: on a phone the canvas is zoomed in on the gable */
const stageAt = (snap: Snap, phone: boolean) => (phone ? snap.at * PHONE_ZOOM - PHONE_LEFT : snap.at);

// The quiet tracing (owner review, 04.10 — «тиха калька»): right of the seam the photo stays only inside the building —
// its drawn silhouette, widened a little for the gutters and the fascia — and the sky and the gravel become the sheet's
// flat paper with its grid, the building free of the grid. One mask, a data URI of the silhouette, used both ways
const SILHOUETTE = homeProofFrame.silhouette.map((outline) => `M${outline.map(([x, y]) => `${x} ${y}`).join('L')}Z`).join('');
const BUILDING_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${contourPhoto.width} ${contourPhoto.height}' preserveAspectRatio='none'>`
  + `<path d='${SILHOUETTE}' fill='#000' stroke='#000' stroke-width='14' stroke-linejoin='round'/></svg>`,
)}")`;
// …and the ground under it, as a drawing marks it: a line a little under the cladding's bottom, along the long wall and
// the gable to the frame's edges, short strokes hatched under it
const GROUND_DROP = 10;
const GROUND: readonly (readonly [number, number])[] = (() => {
  const [far, corner] = [homeProofFrame.silhouette[1][3], homeProofFrame.silhouette[0][5]];
  const near = homeProofFrame.silhouette[0][4];
  const at = (a: readonly [number, number], b: readonly [number, number], x: number) => a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
  return [[0, at(far, corner, 0) + GROUND_DROP], [corner[0], corner[1] + GROUND_DROP], [contourPhoto.width, at(corner, near, contourPhoto.width) + GROUND_DROP]];
})();
const GROUND_HATCH = (() => {
  let path = '';
  for (let index = 0; index < GROUND.length - 1; index += 1) {
    const [[x0, y0], [x1, y1]] = [GROUND[index], GROUND[index + 1]];
    for (let x = Math.ceil(x0 / 18) * 18; x < x1; x += 18) {
      const y = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      path += `M${x} ${Math.round(y * 10) / 10}l-8 9`;
    }
  }
  return path;
})();
const clamp = (value: number) => Math.min(100, Math.max(0, value));
// False in the server markup and the hydrating render, true after (ProjectInquiryForm's idiom)
const subscribeToNothing = () => () => undefined;
const sketchRequested = () => new URLSearchParams(window.location.search).get('xray') === 'sketch';

// See STAMP_OFFSET: whether the stamp keeps its full words, and which seam name gives way
function fitOf(room: Room | null, split: number) {
  if (!room) return { stampShort: false, stampNone: false, narrowLeft: split < 12, narrowRight: split > 72 };
  const right = (room.width * (100 - split)) / 100;
  const stampShort = right < room.stamp + STAMP_OFFSET + AIR;
  return {
    stampShort,
    // Narrower than even its first word: no stamp at all, not a fragment of one (review, 04.10: «ХЕМА» at the corner)
    stampNone: right < SHORT_STAMP + STAMP_OFFSET + AIR,
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

// Memoised, as are ProofFrame's layers: a mouse leading the seam re-renders the stage on every frame, and none of these
// changes with it (review, 04.10)
const Lines = memo(function Lines({ casing, snapped }: Readonly<{ casing?: boolean; snapped?: string }>) {
  return (
    <g className={casing ? 'hv2-contour-casing' : 'hv2-contour-ink'}>
      {lines.map((line) => (
        <path
          key={line.id}
          d={pathOf(line)}
          data-line={line.id}
          data-kind={line.kind}
          data-approximate={line.approximate ? '' : undefined}
          data-snapped={snapped === line.id ? '' : undefined}
        >
          {!casing && <title>{line.title}</title>}
        </path>
      ))}
    </g>
  );
});

const legendLine = <svg viewBox="0 0 28 4" aria-hidden="true" focusable="false"><path d="M2 2H26" /></svg>;

export function ProofContour({ photo }: Readonly<{ photo: HomeProofCase['photo'] }>) {
  const [split, setSplit] = useState(DEFAULT_SPLIT);
  const [chosen, setChosen] = useState<Layer | null>(null);
  const [loadRun, setLoadRun] = useState(0);
  const [windRun, setWindRun] = useState(0);
  const [linesOnPhoto, setLinesOnPhoto] = useState(false);
  const [dragging, setDragging] = useState(false);
  // The measured line the dragged seam holds, and the last one's words (they fade out after it is let go)
  const [snap, setSnap] = useState<Snap | null>(null);
  const snapRef = useRef<Snap | null>(null);
  const [snapWords, setSnapWords] = useState<Snap | null>(null);
  const [snapPlace, setSnapPlace] = useState<{ side: 'left' | 'right'; wrap: boolean; max: number }>({ side: 'left', wrap: false, max: 0 });
  const snapLabelRef = useRef<HTMLSpanElement>(null);
  const ready = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const sketchMode = useSyncExternalStore(subscribeToNothing, sketchRequested, () => false);
  // Focus the pointer put on the range: the keyboard's ring stays off until a key is pressed
  const [pointerFocus, setPointerFocus] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ pointer: number; offset: number } | null>(null);
  const hoverX = useRef(0);
  const hoverFrame = useRef(0);
  const touched = useRef(false);
  const [room, setRoom] = useState<Room | null>(null);

  const layers: readonly Layer[] = sketchMode ? ['sketch', 'frame'] : ['contour', 'frame', 'load', 'wind'];
  const layer: Layer = chosen && layers.includes(chosen) ? chosen : layers[sketchMode ? 0 : 1];
  const rightSide = LAYERS[layer];

  // The first view (see SWEEP_AT): the seam waits at the right edge — the photo whole — while the sheet plots in, then
  // sweeps on the stage's --split only (a registered custom property, home-v2.css), so the range's value and what it
  // says never move. It waits until the stage is in view and the page has stopped scrolling. The visitor's own move in
  // the sheet first, or reduced motion: no sweep, the seam at rest.
  useEffect(() => {
    const stage = stageRef.current;
    const sheet = stage?.closest('figure');
    if (!stage || !sheet || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let sweep: Animation | undefined;
    let timer: number | undefined;
    let due = false;
    let visible = false;
    let scrolled = 0;
    stage.dataset.sweep = 'wait';
    const stop = () => {
      touched.current = true;
      window.clearTimeout(timer);
      sweep?.cancel();
      delete stage.dataset.gliding;
      delete stage.dataset.sweep;
    };
    const run = () => {
      if (touched.current || !due || !visible || sweep) return;
      const quiet = performance.now() - scrolled;
      if (quiet < SWEEP_QUIET) {
        window.clearTimeout(timer);
        timer = window.setTimeout(run, SWEEP_QUIET - quiet);
        return;
      }
      // In one task: the hold at the edge gives way to the sweep's first frame, at the same edge
      stage.dataset.gliding = '';
      stage.dataset.sweep = 'run';
      const phone = phoneNow();
      sweep = stage.animate(
        [
          { '--split': '100%', easing: 'cubic-bezier(.35, 0, .3, 1)' },
          { '--split': `${phone ? SWEEP_TURN_PHONE : SWEEP_TURN}%`, offset: 0.62, easing: 'cubic-bezier(.45, 0, .25, 1)' },
          { '--split': `${DEFAULT_SPLIT}%` },
        ],
        { duration: phone ? SWEEP_MS_PHONE : SWEEP_MS },
      );
      sweep.onfinish = () => {
        delete stage.dataset.gliding;
        delete stage.dataset.sweep;
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
      }, SWEEP_AT);
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
      sweep?.cancel();
      delete stage.dataset.sweep;
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

  const { stampShort, stampNone, narrowLeft, narrowRight } = fitOf(room, split);

  // On a laptop the picture takes the height the window has left (home-v2.css): the sheet's other parts — the rulers, the
  // title block, however many lines its note wraps to — are measured here, so the title block is never pushed under the
  // picture (owner, 04.10: on a short window the picture covered the note)
  useEffect(() => {
    const image = stageRef.current?.parentElement;
    const sheet = image?.closest<HTMLElement>('figure');
    if (!image || !sheet) return;
    const measure = () => sheet.style.setProperty('--hv2-sheet-rest', `${Math.ceil(sheet.offsetHeight - image.offsetHeight)}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    const caption = sheet.querySelector('figcaption');
    if (caption) observer.observe(caption);
    return () => observer.disconnect();
  }, []);

  // The held line's name stands at the top of the seam, where the seam's own names were (they give way while it is held):
  // on the photo's side if it fits there, else on the scheme's side short of the stamp, else wrapped on the roomier side
  // — never off the frame (review, 04.10: on a phone it ran off and lost «виміряно»)
  useEffect(() => {
    const stage = stageRef.current;
    const label = snapLabelRef.current;
    if (!snap || !stage || !label || !room) return;
    // Its width in one line, read off a hidden copy: the label itself may still be wrapped from the line held before
    const width = (label.querySelector<HTMLElement>('.hv2-contour-snap-measure')?.offsetWidth ?? label.scrollWidth) + SNAP_FRAME;
    const seam = (room.width * split) / 100;
    const stamp = stampNone ? 0 : (stampShort ? SHORT_STAMP : room.stamp) + STAMP_OFFSET;
    const left = seam - SNAP_GAP - AIR;
    const right = room.width - seam - SNAP_GAP - AIR - stamp;
    const next = width <= left ? { side: 'left' as const, wrap: false, max: 0 }
      : width <= right ? { side: 'right' as const, wrap: false, max: 0 }
        : { side: left >= right ? 'left' as const : 'right' as const, wrap: true, max: Math.max(left, right) };
    setSnapPlace((previous) => (previous.side === next.side && previous.wrap === next.wrap && previous.max === next.max ? previous : next));
  }, [snap, split, room, stampNone, stampShort]);

  // A figure or a name the seam cuts through is hidden whole, never shown in part (review, 04.10: «≈ 3,2 висоти» cut to
  // «2 висоти» changes what the figure says). Measured on the page whenever the seam, the layer or the frame changes
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !room) return;
    const box = stage.getBoundingClientRect();
    const seam = box.left + (room.width * split) / 100;
    // …and one under the seam's names or the stamp (review, 04.10): their boxes where they will stand once the seam has
    // glided there (measured now, a gliding name would be read mid-way)
    const shown = (element: Element | null) => element && getComputedStyle(element).visibility === 'visible';
    const [leftTag, rightTag] = stage.querySelectorAll<HTMLElement>('.hv2-contour-seamtags > span');
    const top = box.top + 10;
    const covers: { left: number; right: number; top: number; bottom: number }[] = [];
    if (shown(leftTag)) covers.push({ left: seam - 3 - leftTag.offsetWidth, right: seam - 3, top, bottom: top + leftTag.offsetHeight });
    if (shown(rightTag)) covers.push({ left: seam + 3, right: seam + 3 + rightTag.offsetWidth, top, bottom: top + rightTag.offsetHeight });
    const stamp = stage.querySelector<HTMLElement>('.hv2-contour-stamp');
    if (stamp && shown(stamp)) covers.push(stamp.getBoundingClientRect());
    for (const label of stage.querySelectorAll<HTMLElement>('.hv2-proof-labels > span')) {
      const rect = label.getBoundingClientRect();
      const cut = rect.left < seam + 1
        || covers.some((cover) => rect.left < cover.right && rect.right > cover.left && rect.top < cover.bottom && rect.bottom > cover.top);
      if (cut === ('cut' in label.dataset)) continue;
      if (cut) label.dataset.cut = '';
      else delete label.dataset.cut;
      const tag = label.dataset.tag;
      const leader = tag ? stage.querySelector<SVGGElement>(`.hv2-proof-tag-leaders [data-tag="${tag}"]`) : null;
      if (leader) {
        if (cut) leader.dataset.cut = '';
        else delete leader.dataset.cut;
      }
    }
  }, [split, layer, room, snap]);

  const splitAt = (clientX: number, offset = 0, touch = false) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const value = clamp(((clientX - offset - box.left) / box.width) * 100);
    // The measured line the seam is passing: lit from within GRAB until past RELEASE, so it does not flicker at the edge
    const phone = phoneNow();
    const lit = snapRef.current;
    const near = lit && Math.abs(value - stageAt(lit, phone)) < SNAP_RELEASE
      ? lit
      : SNAPS.find((candidate) => Math.abs(value - stageAt(candidate, phone)) < SNAP_GRAB) ?? null;
    if (near !== lit) {
      snapRef.current = near;
      setSnap(near);
      if (near) {
        setSnapWords(near);
        // A touch on Android feels it; nowhere else does anything happen
        if (touch) navigator.vibrate?.(6);
      }
    }
    // Tenths of a per cent: a whole per cent is a 13 px jump on a wide screen
    setSplit(Math.round(value * 10) / 10);
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
      splitAt(event.clientX, 0, event.pointerType === 'touch');
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    delete event.currentTarget.dataset.following;
    setDragging(true);
    setPointerFocus(true);
    rangeRef.current?.focus({ preventScroll: true });
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer === event.pointerId) {
      splitAt(event.clientX, drag.current.offset, event.pointerType === 'touch');
      return;
    }
    // A mouse over the frame, no press: the seam follows it, eased (data-following, home-v2.css) — once the first view's
    // sweep is over, and only for a move of the mouse itself, not the one a browser makes up after a scroll
    const stage = event.currentTarget;
    if (event.pointerType !== 'mouse' || !ready || drag.current || stage.dataset.sweep !== undefined) return;
    if ((event.movementX === 0 && event.movementY === 0) || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    stage.dataset.following = '';
    // At most once a frame: a mouse reports more often than the screen draws
    hoverX.current = event.clientX;
    if (hoverFrame.current) return;
    hoverFrame.current = requestAnimationFrame(() => {
      hoverFrame.current = 0;
      if (!drag.current && stage.dataset.following !== undefined) splitAt(hoverX.current);
    });
  };
  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current) return;
    cancelAnimationFrame(hoverFrame.current);
    hoverFrame.current = 0;
    delete event.currentTarget.dataset.following;
    snapRef.current = null;
    setSnap(null);
  };
  const endDrag = () => {
    drag.current = null;
    snapRef.current = null;
    setSnap(null);
    setDragging(false);
  };

  // Arrows step by one through the native range; the larger steps are the same in every browser
  // A move that is not the pointer's — a key, a button, a layer — leaves no line lit behind it (review, 04.10)
  const clearLit = () => {
    snapRef.current = null;
    setSnap(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    setPointerFocus(false);
    clearLit();
    const to = { PageUp: Math.round(split) + PAGE_STEP, PageDown: Math.round(split) - PAGE_STEP, Home: 0, End: 100 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    setSplit(clamp(to));
  };

  // «Фото» / «Схема» show one side whole; pressed again, they bring the seam back to rest
  const showOnly = (side: 100 | 0) => {
    clearLit();
    setSplit(split === side ? DEFAULT_SPLIT : side);
  };

  // A layer chosen with the seam far right brings the right side back into view; the load is replayed on every press,
  // and on a phone its way down the frame wants the wider right side
  const choose = (next: Layer) => {
    clearLit();
    setChosen(next);
    if (next === 'load' || next === 'wind') {
      (next === 'load' ? setLoadRun : setWindRun)((run) => run + 1);
      const phone = window.matchMedia('(max-width: 760px)').matches;
      if (phone && split > 40) setSplit(40);
      else if (split >= 85) setSplit(DEFAULT_SPLIT);
    } else if (split >= 85) {
      setSplit(DEFAULT_SPLIT);
    }
  };

  const measured = homeProofMeasures.filter((measure) => measure.chip);
  const sliderLabel = `Порівняти фото й ${{ contour: 'контур за фото', frame: 'схему', load: 'схему', wind: 'схему', sketch: 'ескіз' }[layer]}`;

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
          // A phone's figures: the measured facts as chips (the frame has no room for labels there); a load's way is the
          // legend's
          className: 'hv2-contour-facts',
          value: (
            <span className="hv2-contour-facts-slot" aria-hidden="true">
              <span className="hv2-contour-chips" data-on="">
                {measured.map((measure) => <span key={measure.id} data-measure={measure.id}>{measure.chip}</span>)}
              </span>
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
                    {CHAINS[name] ? (
                      // A load's legend is its way: its tint's key, then each link lit as the drawing reaches it (replayed
                      // with it on every press)
                      <span className="hv2-contour-legend-chain" data-load={name} key={name === 'load' ? loadRun : windRun}>
                        <span data-key={name}>{legendLine}</span>
                        {CHAINS[name]!.map(([word, n]) => <span key={word} style={{ '--n': n } as CSSProperties}>{word}</span>)}
                      </span>
                    ) : (
                      LEGEND[name].map((key) => (
                        <span key={key} data-key={key} data-approximate={key === 'approximate' ? '' : undefined}>{legendLine}{LEGEND_WORDS[key]}</span>
                      ))
                    )}
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
        data-stamp={stampNone ? 'none' : stampShort ? 'short' : undefined}
        data-photo-only={split >= 100 ? '' : undefined}
        data-snapped={snap ? '' : undefined}
        data-snap-side={snapPlace.side}
        data-snap-wrap={snapPlace.wrap ? '' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
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
          <div className="hv2-contour-trace" aria-hidden="true" style={{ '--hv2-building': BUILDING_MASK } as CSSProperties}>
            <svg className="hv2-contour-ground" viewBox={`0 0 ${contourPhoto.width} ${contourPhoto.height}`}>
              <path d={`M${GROUND.map(([x, y]) => `${x} ${Math.round(y * 10) / 10}`).join('L')}`} />
              <path className="hv2-contour-ground-hatch" d={GROUND_HATCH} />
            </svg>
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
          <ProofFrame loadRun={loadRun} windRun={windRun} shown={layer === 'frame' || layer === 'load' || layer === 'wind'} wind={layer === 'wind'} ready={ready} />
          <svg
            className="hv2-contour-lines"
            viewBox={`0 0 ${contourPhoto.width} ${contourPhoto.height}`}
            role="img"
            aria-label={label}
          >
            {/* A thin dark casing under each copper line keeps it legible where it crosses the photo's light cladding */}
            <Lines casing snapped={snap?.line} />
            <Lines snapped={snap?.line} />
          </svg>
          {/* The held line once more, over the photo too: a jamb or a corner the seam holds lies right on it, where the
              lines' own layer is cut off — so it lights up landing on the photo's edge (review, 04.10) */}
          {snap && (
            <svg className="hv2-contour-held" viewBox={`0 0 ${contourPhoto.width} ${contourPhoto.height}`} aria-hidden="true">
              <path className="hv2-contour-held-casing" d={pathOf(lines.find((line) => line.id === snap.line)!)} />
              {/* dashed where the line is approximate, as everywhere else */}
              <path d={pathOf(lines.find((line) => line.id === snap.line)!)} data-approximate={lines.find((line) => line.id === snap.line)!.approximate ? '' : undefined} />
            </svg>
          )}
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
          onChange={(event) => {
            clearLit();
            setSplit(Number(event.target.value));
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setPointerFocus(false)}
        />
        {/* The seam, its handle, its names and the held line's name ride one full-width rail moved by a transform: moved
            by left, they shifted the page's layout on every frame of the sweep (review, 04.10: CLS) */}
        <span className="hv2-contour-rail" aria-hidden="true">
          <span className="hv2-contour-seamtags">
            <span>‹ Фото</span>
            <span>{rightSide.seam} ›</span>
          </span>
          <span className="hv2-contour-snap" ref={snapLabelRef} aria-hidden="true" style={snapPlace.wrap ? ({ '--snap-max': `${Math.round(snapPlace.max)}px` } as CSSProperties) : undefined}>
            {snapWords?.name}
            <small>{snapWords?.status}</small>
            <span className="hv2-contour-snap-measure">
              {snapWords?.name}
              <small>{snapWords?.status}</small>
            </span>
          </span>
          <span className="hv2-contour-seam" />
          <span className="hv2-contour-handle">‹ ›</span>
        </span>
      </div>
    </DrawingSheet>
  );
}
