'use client';

import { memo, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { HomeProofCase } from '../../data/homeProof';
import { homeProofContour, type ContourLine } from '../../data/homeProofContour';
import { homeProofDetailSpots, homeProofFrame, onRoof, pointLoadAt, type PointLoad, type ScopePart } from '../../data/homeProofFrame';
import { DrawingSheet } from '../DrawingSheet';
import { PROOF_DETAILS, type DetailId } from './ProofDetails';
import { ProofFrame, ProofKeyPins, ProofMarks, ProofLabels, ProofPoint, SKETCH } from './ProofFrame';
import { SCOPE_FOCUS_EVENT, type ScopeFocus } from './ScopeCells';
import { homeProofMeasures } from '../../data/homeProofMeasures';

// HOME's proof (owner, 04.10): ONE «Креслення» sheet with the real photo, and right of a seam the visitor moves the same
// frame as a tracing — grey, dark, on a fine grid — with one of three layers over it, chosen in the title block:
//   «Каркас» (the default) — a SCHEME of a frame of the type the owner names for this object, drawn inside the
//     silhouette measured from eight photos of this hangar, in the photo's own perspective (app/data/homeProofFrame.ts,
//     app/data/homeProofContour.ts): illustrative, labelled so on the sheet («Схема · без розмірів») and in the note;
//     with the walls and the central row of columns the owner remembers, but never this building's drawn structure —
//     nobody can see it under the cladding and its drawings were not kept. The outline is one solid copper line, with
//     the one measured figure the scheme keeps, the roof's slope with its «≈» and «±» (app/data/homeProofMeasures.ts);
//   «Сніг» — the same scheme with the snow's way through it, link by link, roof to ground; «Вітер» — the wind's, across
//     the building, in its own cool tint (owner review, 04.10).
// («Контур», the measured lines with their measured / approximate split and three figures, is gone — owner, 05.10:
// «клієнту точно цього не треба знати».)
// The scheme never goes over the photo: it lives right of the seam only, and so do the words that belong to it — the
// stamp that says what it is and the load's chain, clipped at the seam. «Контур на фото» lays the measured lines (and
// only those) over the photo as well, as proof that they land on it.
//
// The seam is a real range input (keys, screen readers). Mouse and pen drag anywhere in the frame; a finger drags only
// the handle, so the page still scrolls and zooms under a thumb, and on a phone «Фото» / «Схема» show one side whole.
// The seam moves only while a button is held or a finger is on the handle (owner, 05.10: a mouse leading it on its own
// is gone). Passing a line of the outline — a gate's jamb, a corner of the gable — the seam lights it up over the photo
// and names it at its top, but never holds there (owner, 04.10: a magnet at the gates «не дуже»); keys and screen
// readers step as before.
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

// «Контур» is gone (owner, 05.10: «клієнту точно цього не треба знати» — the measured / approximate split): the copper
// outline stays on the scheme's layers, one solid line
type Layer = 'frame' | 'load' | 'wind' | 'sketch';

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
 *  of it — the photo's columns 245–1504, the gable whole — so a line at a per cent of the canvas stands at
 *  (per cent × ZOOM − LEFT) of the frame; the sweep turns just past the gable's left corner there */
const PHONE_ZOOM = 1.22;
const PHONE_LEFT = 19.46;
const SWEEP_TURN_PHONE = 1;
/** While the seam moves under a pointer, the rest of the sheet (the range's value, the names that give way, the stamp)
 *  catches up at most this often, ms: the seam itself moves every frame (review, 05.10: dragging it stuttered) */
const COMMIT_EVERY = 100;
/** A scope's cell lighting its part (ScopeCells): the seam glides here, so the whole gable shows, and back on letting go */
const FOCUS_SPLIT = 15;
const FOCUS_SPLIT_PHONE = 1;
/** «Як це будується» (owner, 05.10): the scheme assembled in the order it is built, a step every BUILD_STEP ms
 *  (home-v2.css, data-building), its step named in the corner; the names come back once the last step lands */
const BUILD_STEP = 700;
const BUILD_STEPS = ['Фундаменти', 'Стіни з газобетону', 'Колони', 'Ферми лягають на опори', 'Прогони й в’язі'] as const;
const BUILD_MS = BUILD_STEP * (BUILD_STEPS.length + 1);
/** The scheme's names as numbers on a phone (no room for words in its frame), keyed under it */
const PHONE_KEY = ['Ферма', 'Прогони й в’язі', 'Центральний ряд колон', 'Стіни — газобетон', 'Фундаменти — умовно'] as const;
/** Where the brief for a hangar like this one starts */
const BRIEF_HREF = '/angary#configurator';
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
type Room = { width: number; height: number; left: number; right: number; stamp: number };

const LAYERS: Record<Layer, { button: string; seam: string; nominative: string; genitive: string }> = {
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
type LegendKey = 'outline' | 'scheme' | 'depth' | 'load' | 'wind';
const LEGEND: Record<Layer, readonly LegendKey[]> = {
  frame: ['outline', 'scheme', 'depth'],
  load: ['outline', 'scheme', 'load'],
  wind: ['outline', 'scheme', 'wind'],
  sketch: [],
};
const LEGEND_WORDS: Record<LegendKey, string> = {
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
type Snap = { line: string; at: number; name: string };
const pointsOf = (id: string) => lines.find((line) => line.id === id)!.points;
const snapAt = (id: string, from: number, to?: number) => {
  const part = pointsOf(id).slice(from, to);
  return (part.reduce((sum, [x]) => sum + x, 0) / part.length / contourPhoto.width) * 100;
};
const SNAPS: readonly Snap[] = [
  { line: 'gable-base', at: snapAt('gable-base', 1), name: 'Лівий кут фронтона' },
  { line: 'gate-left', at: snapAt('gate-left', 0, 2), name: 'Ліві ворота, одвірок' },
  { line: 'gate-left', at: snapAt('gate-left', 2), name: 'Ліві ворота, одвірок' },
  { line: 'gate-right', at: snapAt('gate-right', 0, 2), name: 'Праві ворота, одвірок' },
  { line: 'gate-right', at: snapAt('gate-right', 2), name: 'Праві ворота, одвірок' },
  { line: 'gable-corner-right', at: snapAt('gable-corner-right', 2), name: 'Правий кут фронтона' },
];
const phoneNow = () => window.matchMedia('(max-width: 760px)').matches;
const stillNow = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** A node opening (owner, 05.10: «плавний перехід від вузла до збільшеної моделі»): the panel grows out of its ring on the
 *  scheme, a disc as small as the ring, to its place, and the node is put together in it part by part (ProofDetails).
 *  Closing, it shrinks back into the ring */
const NODE_GROW = { duration: 480, easing: 'cubic-bezier(.2, .75, .25, 1)' } as const;
const NODE_SHRINK = { duration: 300, easing: 'cubic-bezier(.45, 0, .7, .4)', fill: 'forwards' } as const;
/** The transform that puts a panel onto a ring: its centre on the ring's, as wide as the ring */
function ontoRing(ring: Element, panel: HTMLElement) {
  const [a, b] = [ring.getBoundingClientRect(), panel.getBoundingClientRect()];
  if (!a.width || !b.width) return null;
  const scale = Math.max(a.width / b.width, 0.04);
  return `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${scale})`;
}
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
/** The whole frame in view, or near enough (a part lit may be its roof, at the top): a press below it — a scope's cell, «Як
 *  це будується» on a phone — must not play to an empty screen */
function bringIntoView(stage: HTMLElement) {
  const box = stage.getBoundingClientRect();
  const shown = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0);
  if (shown >= box.height * 0.92) return false;
  stage.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  return true;
}
/** How long a smooth scroll to the frame takes before the assembly starts */
const SCROLL_FIRST = 450;
/** The letters А, Б, В ring a few times once the sweep or the assembly has put them up, so the nodes behind them are
 *  found (owner, 05.10: found by chance) */
const NODES_HINT_MS = 2800;
function hintNodes(stage: HTMLElement, after: number) {
  window.setTimeout(() => {
    stage.dataset.nodesHint = '';
    window.setTimeout(() => delete stage.dataset.nodesHint, NODES_HINT_MS);
  }, after);
}

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
  // The four that carry the seam's place (home-v2.css: --split is theirs only, not inherited): the right side's window
  // and its counter-moved content, the rail with the seam and its names, the handle
  const paneRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  // Where the seam is drawn now; a commit to React waiting to go
  const live = useRef(DEFAULT_SPLIT);
  const commitTimer = useRef<number | undefined>(undefined);
  const drag = useRef<{ pointer: number; offset: number } | null>(null);
  const touched = useRef(false);
  const [room, setRoom] = useState<Room | null>(null);
  // The seam's right-hand name gives way to a figure or a name of the drawing it would cover (review, 05.10)
  const [tagYield, setTagYield] = useState(false);
  // The scope's cell lighting its part, and where the seam and the layer were before it (restored on letting go)
  const [focusPart, setFocusPart] = useState<ScopePart | null>(null);
  const focusFrom = useRef<{ split: number; chosen: Layer | null } | null>(null);
  // «Точка навантаження»: the weight a pointer puts on the roof on «Сніг», and whether anyone has yet
  const [point, setPoint] = useState<PointLoad | null>(null);
  const [pointed, setPointed] = useState(false);
  const pointFrame = useRef(0);
  const pointX = useRef(0);
  // The detail open (А, Б, В), and the canvas on the right side the pointer is read against
  const [detail, setDetail] = useState<DetailId | null>(null);
  // On a phone the frame is too low for a drawing: the node opens as a sheet from the screen's foot, over the page
  const [detailSheet, setDetailSheet] = useState(false);
  const paneCanvasRef = useRef<HTMLDivElement>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  // «Як це будується»: replayed on every press (a new key restarts it), and whether it runs now
  const [buildRun, setBuildRun] = useState(0);
  const [building, setBuilding] = useState(false);
  const buildTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(buildTimer.current), []);

  const layers: readonly Layer[] = sketchMode ? ['sketch', 'frame'] : ['frame', 'load', 'wind'];
  const layer: Layer = chosen && layers.includes(chosen) ? chosen : layers[0];
  const rightSide = LAYERS[layer];
  // for the listeners set up once
  const layerRef = useRef(layer);
  const chosenRef = useRef(chosen);
  useEffect(() => {
    layerRef.current = layer;
    chosenRef.current = chosen;
  });

  // The seam's place on the page: written straight onto the four elements that carry it, never through a render — a
  // drag or a mouse moves it every frame, and nothing else on the sheet need restyle for it
  const paint = (value: number) => {
    live.current = value;
    for (const element of [paneRef.current, innerRef.current, railRef.current, handleRef.current]) element?.style.setProperty('--split', `${value}%`);
  };
  // …and the rest of the sheet told every COMMIT_EVERY ms while the pointer moves it — a throttle, not a debounce: a
  // steady move must not hold it back (review, 05.10: the range and the cut figures waited for the pointer to pause) —
  // and at once when it stops
  const commit = (value: number, now = false) => {
    if (now) {
      window.clearTimeout(commitTimer.current);
      commitTimer.current = undefined;
      setSplit(value);
      return;
    }
    if (commitTimer.current !== undefined) return;
    commitTimer.current = window.setTimeout(() => {
      commitTimer.current = undefined;
      setSplit(live.current);
    }, COMMIT_EVERY);
  };
  // A move that is not the pointer's — a key, a button, a layer, the range — reaches the seam through the state, and the
  // seam glides there (the four's transition on --split)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || stage.dataset.dragging !== undefined) return;
    if (Math.abs(split - live.current) > 0.001 || !paneRef.current?.style.getPropertyValue('--split')) paint(split);
  }, [split]);
  useEffect(() => () => window.clearTimeout(commitTimer.current), []);

  // The first view (see SWEEP_AT): the seam waits at the right edge — the photo whole — while the sheet plots in, then
  // sweeps on the four's --split (a registered custom property, home-v2.css), so the range's value and what it says
  // never move. It waits until the stage is in view and the page has stopped scrolling. The visitor's own move in the
  // sheet first, or reduced motion: no sweep, the seam at rest.
  useEffect(() => {
    const stage = stageRef.current;
    const sheet = stage?.closest('figure');
    if (!stage || !sheet || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let sweep: Animation[] = [];
    let timer: number | undefined;
    let due = false;
    let visible = false;
    let scrolled = 0;
    stage.dataset.sweep = 'wait';
    const stop = () => {
      touched.current = true;
      window.clearTimeout(timer);
      for (const animation of sweep) animation.cancel();
      delete stage.dataset.gliding;
      delete stage.dataset.sweep;
    };
    const run = () => {
      if (touched.current || !due || !visible || sweep.length) return;
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
      const keyframes = [
        { '--split': '100%', easing: 'cubic-bezier(.35, 0, .3, 1)' },
        { '--split': `${phone ? SWEEP_TURN_PHONE : SWEEP_TURN}%`, offset: 0.62, easing: 'cubic-bezier(.45, 0, .25, 1)' },
        { '--split': `${DEFAULT_SPLIT}%` },
      ];
      const carriers = [paneRef.current, innerRef.current, railRef.current, handleRef.current].filter((element) => element !== null);
      sweep = carriers.map((element) => element.animate(keyframes, { duration: phone ? SWEEP_MS_PHONE : SWEEP_MS }));
      sweep[0].onfinish = () => {
        delete stage.dataset.gliding;
        delete stage.dataset.sweep;
        // Two rings from the handle, once: this is the thing to drag
        stage.dataset.pulse = '';
        timer = window.setTimeout(() => delete stage.dataset.pulse, 1700);
        // …then the nodes' letters
        hintNodes(stage, 1300);
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
      for (const animation of sweep) animation.cancel();
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
        // the height too: a height-only change moves the figures against the stamp (review, 04.10)
        const next = { width: stage.clientWidth, height: stage.clientHeight, left, right, stamp: full || previous?.stamp || 196 };
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

  // A scope's cell below lights its part here (ScopeCells): the scheme on — off «Контур» onto «Каркас» — and the seam
  // glides left so the whole gable shows; letting go brings the seam and the layer back, unless the visitor has moved
  // the seam meanwhile. A pressed cell (a tap on a phone) brings the sheet into view first
  useEffect(() => {
    // Letting go waits a moment: the pointer passing from one cell to the next must not send the seam back and forth
    let release: number | undefined;
    const onScope = (event: Event) => {
      const { part, sticky } = (event as CustomEvent<ScopeFocus>).detail;
      const stage = stageRef.current;
      if (!stage) return;
      const to = phoneNow() ? FOCUS_SPLIT_PHONE : FOCUS_SPLIT;
      window.clearTimeout(release);
      if (part) {
        if (!focusFrom.current) focusFrom.current = { split: live.current, chosen: chosenRef.current };
        setFocusPart(part);
        snapRef.current = null;
        setSnap(null);
        setPoint(null);
        setDetail(null);
        if (live.current > to) setSplit(to);
        if (sticky) bringIntoView(stage);
        return;
      }
      release = window.setTimeout(() => {
        const from = focusFrom.current;
        focusFrom.current = null;
        setFocusPart(null);
        if (!from) return;
        if (Math.abs(live.current - to) < 0.5) setSplit(from.split);
      }, sticky ? 0 : 160);
    };
    window.addEventListener(SCOPE_FOCUS_EVENT, onScope);
    return () => {
      window.clearTimeout(release);
      window.removeEventListener(SCOPE_FOCUS_EVENT, onScope);
    };
  }, []);

  // A detail opened takes the focus to its close; Esc, or the close, gives it back to its letter
  const detailPinRefs = useRef<Partial<Record<DetailId, HTMLButtonElement | null>>>({});
  const detailRef = useRef<HTMLDivElement>(null);
  // «Зібрати ще раз»: a new key puts the node's drawing together again
  const [nodeRun, setNodeRun] = useState(0);
  const detailMotion = useRef<Animation | null>(null);
  const ringOf = (id: DetailId) => stageRef.current?.querySelector(`.hv2-proof-detail-rings [data-detail="${id}"]`) ?? null;
  // Opening (and switching to another node): out of its ring, before the first paint so it never flashes in place
  useLayoutEffect(() => {
    const panel = detailRef.current;
    const ring = detail && ringOf(detail);
    if (!panel || !ring || stillNow()) return;
    detailMotion.current?.cancel();
    const from = ontoRing(ring, panel);
    if (!from) return;
    detailMotion.current = panel.animate(
      [{ transform: from, opacity: 0.35, borderRadius: '50%' }, { transform: 'none', opacity: 1, borderRadius: '0' }],
      NODE_GROW,
    );
  }, [detail, detailSheet]);
  // Closing: back into its ring, then gone; the focus to its letter
  const closeDetail = () => {
    const was = detail;
    const done = () => {
      setDetail(null);
      if (was) detailPinRefs.current[was]?.focus({ preventScroll: true });
    };
    const panel = detailRef.current;
    const ring = was && ringOf(was);
    if (!panel || !ring || stillNow()) return done();
    detailMotion.current?.cancel();
    const to = ontoRing(ring, panel);
    if (!to) return done();
    const shrink = panel.animate([{ transform: 'none', opacity: 1, borderRadius: '0' }, { transform: to, opacity: 0, borderRadius: '50%' }], NODE_SHRINK);
    detailMotion.current = shrink;
    // once, on its end — or a moment after, should a hidden tab hold the animation — unless another node took its place
    let closed = false;
    const finish = () => {
      if (closed || detailMotion.current !== shrink) return;
      closed = true;
      done();
    };
    shrink.onfinish = finish;
    window.setTimeout(finish, NODE_SHRINK.duration + 200);
  };
  const closeDetailRef = useRef(closeDetail);
  useEffect(() => {
    closeDetailRef.current = closeDetail;
  });
  useEffect(() => {
    if (!detail) return;
    detailCloseRef.current?.focus({ preventScroll: true });
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeDetailRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [detail]);
  useEffect(() => () => cancelAnimationFrame(pointFrame.current), []);

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
    type Box = { left: number; right: number; top: number; bottom: number };
    const meets = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const covers: Box[] = [];
    if (shown(leftTag)) covers.push({ left: seam - 3 - leftTag.offsetWidth, right: seam - 3, top, bottom: top + leftTag.offsetHeight });
    const stamp = stage.querySelector<HTMLElement>('.hv2-contour-stamp');
    if (stamp && shown(stamp)) covers.push(stamp.getBoundingClientRect());
    // The right-hand name would stand here were it shown — it gives way to a word of the drawing, not the other way
    const rightTagWould = rightTag && !narrowRight && !snap && layer !== 'load' && layer !== 'wind' && getComputedStyle(rightTag.parentElement!).display !== 'none';
    const rightBox = rightTag ? { left: seam + 3, right: seam + 3 + rightTag.offsetWidth, top, bottom: top + rightTag.offsetHeight } : null;
    let yieldTag = false;
    for (const label of stage.querySelectorAll<HTMLElement>('.hv2-proof-labels > span')) {
      const rect = label.getBoundingClientRect();
      const cut = rect.left < seam + 1 || covers.some((cover) => meets(rect, cover));
      // shown on this layer: the scheme's names and the figures marked for it on «Каркас», every figure on «Контур»
      const here = layer === 'frame' && (label.dataset.tag !== undefined || label.dataset.onFrame !== undefined);
      if (!cut && here && rightTagWould && rightBox && meets(rect, rightBox)) yieldTag = true;
      if (cut === ('cut' in label.dataset)) continue;
      if (cut) label.dataset.cut = '';
      else delete label.dataset.cut;
      // …with what points at it: a name's leader, a figure's marks (review, 04.10: the slope's leader stayed, pointing at
      // nothing)
      const { tag, measure } = label.dataset;
      const pointer = tag
        ? stage.querySelector<SVGGElement>(`.hv2-proof-tag-leaders [data-tag="${tag}"]`)
        : measure ? stage.querySelector<SVGGElement>(`.hv2-proof-marks [data-mark="${measure}"]`) : null;
      if (pointer) {
        if (cut) pointer.dataset.cut = '';
        else delete pointer.dataset.cut;
      }
    }
    setTagYield(yieldTag);
  }, [split, layer, room, snap, narrowRight]);

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
    const tenths = Math.round(value * 10) / 10;
    paint(tenths);
    commit(tenths);
  };

  // Where a pointer is in the photo's own pixels, if it is on the right side of the seam
  const onScheme = (clientX: number, clientY: number): readonly [number, number] | null => {
    const canvas = paneCanvasRef.current?.getBoundingClientRect();
    const box = stageRef.current?.getBoundingClientRect();
    if (!canvas || !box || clientX < box.left + (box.width * live.current) / 100) return null;
    return [((clientX - canvas.left) / canvas.width) * contourPhoto.width, ((clientY - canvas.top) / canvas.height) * contourPhoto.height];
  };
  // «Точка навантаження»: on «Сніг», a pointer over the roof puts a weight there — at most once a frame
  const pointAt = (x: number) => {
    pointX.current = x;
    if (pointFrame.current) return;
    pointFrame.current = requestAnimationFrame(() => {
      pointFrame.current = 0;
      setPoint((previous) => {
        const next = pointLoadAt(pointX.current);
        return previous && previous.node === next.node && Math.abs(previous.x - next.x) < 1 ? previous : next;
      });
      setPointed(true);
    });
  };
  const dropPoint = () => {
    cancelAnimationFrame(pointFrame.current);
    pointFrame.current = 0;
    setPoint(null);
  };
  const roofAt = (clientX: number, clientY: number) => {
    if (layerRef.current !== 'load' || detail) return null;
    const at = onScheme(clientX, clientY);
    return at && onRoof(at) ? at : null;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !ready) return;
    // The details' letters and the detail open are their own: no seam moves under them
    if ((event.target as Element).closest('.hv2-proof-detail-pin, .hv2-detail')) return;
    // On «Сніг» the roof takes the weight: a finger puts it there, a mouse already has, and the seam stays
    const roof = roofAt(event.clientX, event.clientY);
    if (roof) {
      if (event.pointerType === 'touch') pointAt(roof[0]);
      return;
    }
    const handle = (event.target as Element).closest('.hv2-contour-handle');
    // A finger on the photo scrolls the page; only the handle takes it
    if (event.pointerType === 'touch' && !handle) {
      if (point) dropPoint();
      return;
    }
    event.preventDefault();
    if (handle) {
      // Grabbing the handle keeps the seam where it is and the handle under the pointer. The offset is taken from where
      // the handle is drawn, not from the seam: at either end of the frame it is held clear of the edge, off the seam
      const grip = handle.getBoundingClientRect();
      drag.current = { pointer: event.pointerId, offset: event.clientX - (grip.left + grip.width / 2) };
    } else {
      // A click elsewhere moves the seam there (below, once the press is marked a drag)
      drag.current = { pointer: event.pointerId, offset: 0 };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    // set here, not only by the render: the press's own move must not glide
    event.currentTarget.dataset.dragging = '';
    setDragging(true);
    setPointerFocus(true);
    rangeRef.current?.focus({ preventScroll: true });
    if (!handle) splitAt(event.clientX, 0, event.pointerType === 'touch');
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer === event.pointerId) {
      splitAt(event.clientX, drag.current.offset, event.pointerType === 'touch');
      return;
    }
    // A mouse over the frame, no press, moves no seam (owner, 05.10: only while the button is held). On «Сніг» it puts
    // a weight on the roof it is over
    if (event.pointerType !== 'mouse' || !ready || drag.current || event.currentTarget.dataset.sweep !== undefined) return;
    const roof = roofAt(event.clientX, event.clientY);
    if (roof) pointAt(roof[0]);
    else if (point || pointFrame.current) dropPoint();
  };
  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current) return;
    if (event.pointerType === 'mouse') dropPoint();
  };
  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    delete stageRef.current?.dataset.dragging;
    commit(live.current, true);
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
    dropPoint();
    if (next !== 'frame') setDetail(null);
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

  // «Як це будується»: the scheme on, the seam glided left so the gable shows whole, then the assembly
  const build = () => {
    clearLit();
    dropPoint();
    setDetail(null);
    setChosen('frame');
    const to = phoneNow() ? FOCUS_SPLIT_PHONE : FOCUS_SPLIT;
    if (live.current > to) setSplit(to);
    const wait = stageRef.current && bringIntoView(stageRef.current) ? SCROLL_FIRST : 0;
    setBuilding(false);
    window.clearTimeout(buildTimer.current);
    buildTimer.current = window.setTimeout(() => {
      setBuildRun((run) => run + 1);
      setBuilding(true);
      buildTimer.current = window.setTimeout(() => {
        setBuilding(false);
        if (stageRef.current) hintNodes(stageRef.current, 0);
      }, BUILD_MS);
    }, wait);
  };
  // A node from the title block: the scheme on, its ring in view, the frame on the screen (a phone's sheet covers it)
  const openNode = (id: DetailId) => {
    clearLit();
    dropPoint();
    setChosen('frame');
    if (live.current > DEFAULT_SPLIT) setSplit(DEFAULT_SPLIT);
    const phone = phoneNow();
    if (!phone && stageRef.current) bringIntoView(stageRef.current);
    if (detail === id) return closeDetail();
    setDetailSheet(phone);
    setDetail(id);
  };
  // Once the visitor has watched a load go down or the frame go up, the way on to their own hangar lights up
  const engaged = loadRun + windRun + buildRun > 0;

  // The figures the scheme shows: the slope (the others were «Контур»'s)
  const measured = homeProofMeasures.filter((measure) => measure.onFrame && measure.chip);
  const sliderLabel = `Порівняти фото й ${{ frame: 'схему', load: 'схему', wind: 'схему', sketch: 'ескіз' }[layer]}`;

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
              <b>Реальний об’єкт: фото, виміри, схема.</b> Фото з ретушшю переднього плану; контур і схил —
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
            <>
              <span className="hv2-contour-facts-slot" aria-hidden="true">
                <span className="hv2-contour-chips" data-on="">
                  {measured.map((measure) => <span key={measure.id} data-measure={measure.id}>{measure.chip}</span>)}
                </span>
              </span>
              {/* the numbers on the scheme, named (a phone's frame has no room for the words) */}
              <span className="hv2-contour-key" aria-hidden="true">
                {PHONE_KEY.map((word, index) => <span key={word}><i>{index + 1}</i>{word}</span>)}
              </span>
            </>
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
                        <span key={key} data-key={key}>{legendLine}{LEGEND_WORDS[key]}</span>
                      ))
                    )}
                  </span>
                ))}
              </span>
              <span className="hv2-contour-more">
                <button type="button" className="hv2-contour-build" disabled={!ready || layer === 'sketch'} onClick={build}>
                  <i aria-hidden="true" />
                  Як це будується
                </button>
                {/* The nodes drawn as details, named here too: their letters on the scheme were found by chance */}
                <span className="hv2-contour-nodes" role="group" aria-label="Вузли крупно">
                  <span className="hv2-contour-nodes-label" aria-hidden="true">Вузли крупно</span>
                  {PROOF_DETAILS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`Вузол ${item.letter}: ${item.title}`}
                      aria-haspopup="dialog"
                      aria-expanded={detail === item.id}
                      disabled={!ready || layer === 'sketch'}
                      onClick={() => openNode(item.id)}
                    >
                      {item.letter}
                    </button>
                  ))}
                </span>
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
              {layer === 'sketch' ? 'Ескіз' : 'Схема'}
            </button>
          </span>
          {/* The way on: a hangar like this one, the visitor's own (owner, 05.10: in place of «Контур на фото», and
              to be seen) */}
          <a className="hv2-contour-brief" href={BRIEF_HREF} data-lit={engaged ? '' : undefined}>
            <small>Такий ангар, але ваш</small>
            <span>Сформувати бриф <i aria-hidden="true">→</i></span>
          </a>
        </span>
      }
    >
      <div
        ref={stageRef}
        className="hv2-contour-stage"
        data-layer={layer}
        data-dragging={dragging ? '' : undefined}
        data-pointer-focus={pointerFocus ? '' : undefined}
        // The seam's names give way where their side is too narrow, the right one before the stamp; the stamp shortens
        data-narrow-left={narrowLeft ? '' : undefined}
        data-narrow-right={narrowRight || tagYield ? '' : undefined}
        data-stamp={stampNone ? 'none' : stampShort ? 'short' : undefined}
        data-photo-only={split >= 100 ? '' : undefined}
        data-snapped={snap ? '' : undefined}
        data-snap-side={snapPlace.side}
        data-snap-wrap={snapPlace.wrap ? '' : undefined}
        data-focus={focusPart ?? undefined}
        data-point={point ? '' : undefined}
        data-pointed={pointed ? '' : undefined}
        data-detail={detail ?? undefined}
        data-building={building ? '' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        {/* The photo, in one canvas in its own proportion; on a laptop the stage is shorter than the canvas and crops its
            sky and gravel, on a phone it is a close-up of the gable (home-v2.css). «Контур на фото» draws the measured
            lines over it too */}
        <div className="hv2-contour-canvas">
          <picture>
            <source type="image/webp" srcSet={SRC_SET} sizes={SIZES} />
            <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" draggable={false} />
          </picture>
        </div>
        {/* The right side: a window as wide as the stage, moved to the seam, its content moved back by as much — so the
            tracing and every layer stand still while the window uncovers them, and moving the seam is two transforms the
            compositor does alone, with nothing repainted (review, 05.10: clip-paths repainted the whole drawing on every
            frame of a drag). The same canvas inside, so nothing slides */}
        <div className="hv2-contour-pane" ref={paneRef}>
          <div className="hv2-contour-pane-inner" ref={innerRef}>
            <div className="hv2-contour-canvas" ref={paneCanvasRef}>
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
              <ProofFrame buildRun={buildRun} loadRun={loadRun} windRun={windRun} shown={layer === 'frame' || layer === 'load' || layer === 'wind'} wind={layer === 'wind'} ready={ready} />
              <ProofPoint point={layer === 'load' ? point : null} />
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
              <ProofMarks />
              <ProofLabels />
              <ProofKeyPins />
              {/* The details' letters (А, Б, В) beside their rings on «Каркас»: each opens its node, drawn */}
              <div className="hv2-proof-detail-pins">
                {homeProofDetailSpots.map(({ id, badge: [x, y], badgePhone: [px, py] }) => {
                  const item = PROOF_DETAILS.find((entry) => entry.id === id)!;
                  return (
                    <button
                      key={id}
                      ref={(element) => { detailPinRefs.current[id] = element; }}
                      type="button"
                      className="hv2-proof-detail-pin"
                      data-detail={id}
                      style={{
                        '--x': `${(x / contourPhoto.width) * 100}%`, '--y': `${(y / contourPhoto.height) * 100}%`,
                        '--px': `${(px / contourPhoto.width) * 100}%`, '--py': `${(py / contourPhoto.height) * 100}%`,
                      } as CSSProperties}
                      aria-label={`Вузол ${item.letter}: ${item.title}`}
                      aria-haspopup="dialog"
                      aria-expanded={detail === id}
                      disabled={!ready}
                      onClick={() => {
                        if (detail === id) return closeDetail();
                        setDetailSheet(phoneNow());
                        setDetail(id);
                      }}
                    >
                      {item.letter}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* The right side's own words, outside the canvas (never cropped): what it is, top right */}
            <span className="hv2-contour-corner" aria-hidden="true">
              <span className="hv2-contour-stamp">
                <small>
                  {layer === 'sketch' ? 'Тест' : 'Схема'}
                  {/* a phone keeps the first word only */}
                  <span className="hv2-contour-stamp-more">{layer === 'sketch' ? '' : ' · без розмірів'}</span>
                </small>
                <span className="hv2-contour-stamp-text">
                  {layer === 'sketch' ? 'згенероване зображення' : 'каркас такого типу, як на цьому об’єкті'}
                </span>
              </span>
              {/* «Як це будується»: the step on now */}
              {buildRun > 0 && (
                <span className="hv2-contour-build-steps" key={buildRun}>
                  {BUILD_STEPS.map((word, index) => (
                    <span key={word} style={{ '--i': index } as CSSProperties}><i>{index + 1}</i>{word}</span>
                  ))}
                </span>
              )}
            </span>
          </div>
        </div>
        {/* The held line once more, over both sides: a jamb or a corner the seam passes lies right on the seam, so it
            lights up landing on the photo's edge (review, 04.10) */}
        {snap && (
          <div className="hv2-contour-canvas" data-over="">
            <svg className="hv2-contour-held" viewBox={`0 0 ${contourPhoto.width} ${contourPhoto.height}`} aria-hidden="true">
              <path className="hv2-contour-held-casing" d={pathOf(lines.find((line) => line.id === snap.line)!)} />
              <path d={pathOf(lines.find((line) => line.id === snap.line)!)} />
            </svg>
          </div>
        )}
        {/* The node opened (ProofDetails): over the photo's side, so its ring on the scheme stays in view */}
        {detail && (() => {
          const item = PROOF_DETAILS.find((entry) => entry.id === detail)!;
          const body = (
            <div ref={detailRef} className="hv2-detail" data-sheet={detailSheet ? '' : undefined} role="dialog" aria-modal={detailSheet ? true : undefined} aria-labelledby="hv2-detail-title" aria-describedby="hv2-detail-spoken">
              <div className="hv2-detail-head">
                <span className="hv2-detail-letter" aria-hidden="true">{item.letter}</span>
                <b id="hv2-detail-title">Вузол {item.letter} · {item.title}</b>
                <button ref={detailCloseRef} type="button" className="hv2-detail-close" aria-label="Закрити вузол" onClick={closeDetail}>
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <item.Drawing key={nodeRun} />
              <div className="hv2-detail-foot">
                <p className="hv2-detail-note">Вузол такого типу · схема без розмірів</p>
                <button type="button" className="hv2-detail-again" onClick={() => setNodeRun((run) => run + 1)}>
                  <span aria-hidden="true">↻</span> Зібрати ще раз
                </button>
              </div>
              <p className="sr-only" id="hv2-detail-spoken">{item.spoken}</p>
            </div>
          );
          const main = detailSheet ? document.querySelector('main[data-home="v2"]') : null;
          return main ? createPortal(<><div className="hv2-detail-backdrop" aria-hidden="true" onClick={closeDetail} />{body}</>, main) : body;
        })()}
        {/* What the figures say, for a screen reader: the labels on the frame are drawn for the eye only */}
        <ul className="sr-only" aria-label="За фото цього ангара, без масштабу">
          {homeProofMeasures.filter((measure) => measure.onFrame).map((measure) => <li key={measure.id} data-measure={measure.id}>{measure.spoken}</li>)}
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
        <span className="hv2-contour-rail" ref={railRef} aria-hidden="true">
          {/* On «Сніг», until the visitor has tried it: the roof takes a weight */}
          <span className="hv2-contour-hint">
            <span data-input="hover">Наведіть на дах — куди піде вага</span>
            <span data-input="touch">Торкніться даху — куди піде вага</span>
          </span>
          <span className="hv2-contour-seamtags">
            <span>‹ Фото</span>
            <span>{rightSide.seam} ›</span>
          </span>
          <span className="hv2-contour-snap" ref={snapLabelRef} aria-hidden="true" style={snapPlace.wrap ? ({ '--snap-max': `${Math.round(snapPlace.max)}px` } as CSSProperties) : undefined}>
            {snapWords?.name}
            <span className="hv2-contour-snap-measure">{snapWords?.name}</span>
          </span>
          <span className="hv2-contour-seam" />
          <span className="hv2-contour-handle" ref={handleRef}>‹ ›</span>
        </span>
      </div>
    </DrawingSheet>
  );
}
