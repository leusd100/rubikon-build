'use client';

import { memo, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { queueProofEvent } from '../../lib/proofAnalytics';
import type { HomeProofCase } from '../../data/homeProof';
import { homeProofContour, type ContourLine } from '../../data/homeProofContour';
import { homeProofDetailSpots, homeProofFrame, memberAt, onRoof, pointLoadAt, type PointLoad, type SchemeHit } from '../../data/homeProofFrame';
import { DrawingSheet } from '../DrawingSheet';
import { PROOF_DETAILS, type DetailId } from './ProofDetails';
import { ProofFrame, ProofHover, ProofMarks, ProofLabels, ProofPoint } from './ProofFrame';
import { useFirstSweep } from './proof-contour/useFirstSweep';
import { useLabelFit, useRoom } from './proof-contour/useLabelFit';
import { useNodeDetail } from './proof-contour/useNodeDetail';
import { useNodeHint } from './proof-contour/useNodeHint';
import { bringIntoView, FOCUS_SPLIT, FOCUS_SPLIT_PHONE, useScopeFocus } from './proof-contour/useScopeFocus';
import { clamp, DEFAULT_SPLIT, phoneNow, useSeam } from './proof-contour/useSeam';
import { TOUR, useTour } from './proof-contour/useTour';
import { Arrow } from '../Arrow';

// HOME's proof (owner, 04.10): ONE «Креслення» sheet with the real photo, and right of a seam the visitor moves the same
// frame as a tracing — grey, dark, on a fine grid — with one of three layers over it, chosen in the title block:
//   «Каркас» (the default) — a SCHEME of a frame of the type the owner names for this object, drawn inside the
//     silhouette measured from eight photos of this hangar, in the photo's own perspective (app/data/homeProofFrame.ts,
//     app/data/homeProofContour.ts): illustrative, labelled so on the sheet («Схема · без розмірів») and in the note;
//     with the walls and the central row of columns the owner remembers, but never this building's drawn structure —
//     nobody can see it under the cladding and its drawings were not kept. The outline is one solid copper line, and the
//     scheme carries no figure (owner, 09.10: the roof's slope, the last one, is gone too);
//   «Сніг» — the same scheme with the snow's way through it, link by link, roof to ground; «Вітер» — the wind's, across
//     the building, in its own cool tint (owner review, 04.10).
// («Контур», the measured lines with their measured / approximate split and three figures, is gone — owner, 05.10:
// «клієнту точно цього не треба знати».)
// The scheme never goes over the photo: it lives right of the seam only, and so do the words that belong to it — the
// stamp that says what it is and the load's chain, clipped at the seam (owner, 05.10: «Контур на фото», which laid the
// measured lines over the photo too, is gone).
//
// The seam is a real range input (keys, screen readers). Mouse and pen drag anywhere in the frame; a finger drags only
// the handle, so the page still scrolls and zooms under a thumb, and on a phone «Фото» / «Схема» show one side whole.
// The seam moves only while a button is held or a finger is on the handle (owner, 05.10: a mouse leading it on its own
// is gone). Passing a line of the outline — a gate's jamb, a corner of the gable — the seam lights it up over the photo
// and names it at its top, but never holds there (owner, 04.10: a magnet at the gates «не дуже»); keys and screen
// readers step as before.
// Arriving with motion (owner review, 04.10 — «шов-плотер»; owner 06.11 — «Спершу рентген»), the sheet plots in as the
// X-ray of the whole building, then the seam passes once, slowly, from the left edge to its rest (Phase 5: one move, no
// turn and no rings), and what it has passed is the real photo, whole; the figures and names come in together when it
// rests. A mouse or pen pressed in the sheet, a finger on the handle or a button, or a key there stops that; scrolling
// the page over the sheet does not (review, 04.10: a wheel or a swipe is how a visitor arrives). With reduced motion or
// without JavaScript the sheet stands complete at its resting split, the controls disabled until the page is hydrated.
//
// On a laptop the sheet fits under the header: the stage keeps the sheet's width and crops the photo's sky and gravel
// (home-v2.css); the photo, its tracing and every layer share one canvas in the photo's own pixels, so nothing slides.

// The parts that keep their own state and timing live in ./proof-contour: the seam and its drag (useSeam), the first
// view's sweep (useFirstSweep), the room the words have against the seam (useLabelFit), a scope's cell lighting its part
// (useScopeFocus), the node open (useNodeDetail) and the tour (useTour). Their effects run in this order, as when they
// were written here.

// «Контур» is gone (owner, 05.10: «клієнту точно цього не треба знати» — the measured / approximate split): the copper
// outline stays on the scheme's layers, one solid line
export type Layer = 'frame' | 'load' | 'wind';

const PAGE_STEP = 10;
/** «Як це будується» (owner, 05.10): the scheme assembled in the order it is built, a step every BUILD_STEP ms
 *  (home-v2.css, data-building), its step named in the corner; the names come back once the last step lands */
const BUILD_STEP = 700;
const BUILD_STEPS = ['Фундаменти', 'Стіни з газобетону', 'Колони', 'Ферми лягають на опори', 'Прогони й в’язі'] as const;
const BUILD_MS = BUILD_STEP * (BUILD_STEPS.length + 1);
/** Where the brief for a hangar like this one starts */
const BRIEF_HREF = '/angary#configurator';

const LAYER_ORDER: readonly Layer[] = ['frame', 'load', 'wind'];
const LAYERS: Record<Layer, { button: string; seam: string; nominative: string; genitive: string }> = {
  frame: { button: 'Каркас', seam: 'Схема', nominative: 'схема', genitive: 'схеми' },
  // Two loads, each its own layer and its own colour (owner review, 04.10: «розумно кольорів, наприклад вітер»)
  load: { button: 'Сніг', seam: 'Схема', nominative: 'схема', genitive: 'схеми' },
  wind: { button: 'Вітер', seam: 'Схема', nominative: 'схема', genitive: 'схеми' },
};
/** Each load's way, link by link, in its own words, each word lit with its part of the drawing (n: ProofFrame's --n) —
 *  in the legend under the layers, not on the frame: on a laptop's crop the frame has no free room for it (review, 04.10) */
const CHAINS: Record<Exclude<Layer, 'frame'>, readonly (readonly [string, number])[]> = {
  load: [['Сніг', 0], ['покрівля', 1], ['прогони', 2], ['ферма', 3], ['стіни й колони', 4], ['фундаменти', 5], ['ґрунт', 6]],
  wind: [['Вітер', 0], ['стіна', 2], ['ферма', 3], ['стіна й колона', 4], ['фундаменти', 5], ['ґрунт', 6]],
};

const { photo: contourPhoto, variants, lines, label } = homeProofContour;
// Up to 2304w: a retina laptop took 3072w (378 KB) where 2304w (236 KB) looks the same (audit 08.10, F22)
const SRC_SET = variants.filter(({ width }) => width <= 2304).map(({ src, width }) => `${src} ${width}w`).join(', ');
// The frame's width: the shell less the sheet's margins (34 px on a phone, 46 px above), at most 1440 − 46
// (a phone's frame is the screen's width since 09.10 — the sheet edge to edge — and its canvas 1.22 × that)
const SIZES = '(max-width: 760px) calc(100vw * 1.22), (max-width: 1556px) calc(92.5vw - 46px), 1394px';

/** A line's points in a path's words; the «M» before them, and a «Z» after, are the caller's */
const pathPoints = (points: ContourLine['points']) => points.map(([x, y]) => `${x} ${y}`).join('L');
const pathOf = ({ points }: ContourLine) => `M${pathPoints(points)}`;

// The quiet tracing (owner review, 04.10 — «тиха калька»): right of the seam the photo stays only inside the building —
// its drawn silhouette, widened a little for the gutters and the fascia — and the sky and the gravel become the sheet's
// flat paper with its grid, the building free of the grid. One mask, a data URI of the silhouette, used both ways
const SILHOUETTE = homeProofFrame.silhouette.map((outline) => `M${pathPoints(outline)}Z`).join('');
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
const GROUND_LINE = `M${pathPoints(GROUND.map(([x, y]) => [x, Math.round(y * 10) / 10] as const))}`;
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
/** A data attribute that is there or is not: the CSS and the e2e read its presence, never a value */
const dataFlag = (on: unknown) => (on ? '' : undefined);
/** `run` once the visitor's press or key now under way has ended (its pointerup, click or keyup), or a moment after.
 *  Returns its cancel (the sheet unmounted meanwhile) */
function afterInput(run: () => void) {
  const kinds = ['pointerup', 'pointercancel', 'click', 'keyup'] as const;
  let done = false;
  let soon: number | undefined;
  const cancel = () => {
    done = true;
    for (const kind of kinds) window.removeEventListener(kind, later, true);
    window.clearTimeout(timer);
    window.clearTimeout(soon);
  };
  const once = () => {
    if (done) return;
    cancel();
    run();
  };
  const later = () => { soon = window.setTimeout(once, 0); };
  for (const kind of kinds) window.addEventListener(kind, later, true);
  const timer = window.setTimeout(once, 900);
  return cancel;
}
/** The camera is on a node, or flying between two (useNodeCamera): not on its way back */
const cameraIn = (stage: HTMLElement) => stage.dataset.camera === 'in' || stage.dataset.camera === 'fly';
/** What in the frame answers a press itself — a node's letter, the node open, «Вузли крупно» over the picture, node Г's
 *  hint — so no seam moves under it, and no camera puts its node away */
const OWN_PRESS = '.hv2-proof-detail-pin, .hv2-detail, .hv2-contour-nodes, .hv2-contour-node-hint-button';
/** The keys that move a range's value */
const RANGE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

function stampFit(none: boolean, short: boolean) {
  if (none) return 'none';
  return short ? 'short' : undefined;
}

/** The link of a load's chain lit on the scheme: the word pointed at, else the word pressed. «Каркас» has no chain */
function litStep(layer: Layer, peek: number | null, on: number | null) {
  return layer === 'frame' ? undefined : (peek ?? on ?? undefined);
}

// False in the server markup and the hydrating render, true after (ProjectInquiryForm's idiom)
const subscribeToNothing = () => () => undefined;
/** A node's letter and plain name, the draughtsman's term after it — what its pill and its letter on the scheme are called
 *  (the pill shows the name: the name is in what a voice can press) */
const nodeLabel = ({ letter, title, term }: (typeof PROOF_DETAILS)[number]) => `Вузол ${letter}: ${title} (${term})`;
/** How long a smooth scroll to the frame takes before the assembly starts */
const SCROLL_FIRST = 450;
/** DEC-42 (a), the owner's choice of 13.10 (Phase 5): after the arrival this node is lit — its letter and its ring on the
 *  scheme, its pill — and one line says what a press does; nothing opens by itself. Until 13.10 it opened over the photo
 *  on a laptop or a tablet (owner, 09.10: so nobody passes the block without seeing that the scheme opens), covering
 *  35–60 % of the photo's half (1440 × 900, 1250 × 613); a phone's letter В called instead. The line stood over the photo's
 *  corner until 07.11 (owner: «Давай також реалізуємо ідеї»): now it is a button beside the ring (useNodeHint), and on a
 *  phone, where the ring rests on the photo's side, a strip under the frame */
const NODE_HINT: DetailId = 'ridge';
/** The letters А, Б, В ring a few times once the sweep or the assembly has put them up, so the nodes behind them are
 *  found (owner, 05.10: found by chance) */
const NODES_HINT_MS = 2800;

function hintNodes(stage: HTMLElement, after: number) {
  window.setTimeout(() => {
    stage.dataset.nodesHint = '';
    window.setTimeout(() => delete stage.dataset.nodesHint, NODES_HINT_MS);
  }, after);
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
          data-snapped={dataFlag(snapped === line.id)}
        >
          {!casing && <title>{line.title}</title>}
        </path>
      ))}
    </g>
  );
});

const legendLine = <svg viewBox="0 0 28 4" aria-hidden="true" focusable="false"><path d="M2 2H26" /></svg>;

export function ProofContour({ photo }: Readonly<{ photo: HomeProofCase['photo'] }>) {
  const [chosen, setChosen] = useState<Layer | null>(null);
  const [loadRun, setLoadRun] = useState(0);
  const [windRun, setWindRun] = useState(0);
  const ready = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  // Focus the pointer put on the range: the keyboard's ring stays off until a key is pressed
  const [pointerFocus, setPointerFocus] = useState(false);
  // The title block's node pointed at or focused: its letter and its ring light on the scheme, before the press
  const [peekNode, setPeekNode] = useState<DetailId | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  // «Точка навантаження»: the weight a pointer puts on the roof on «Сніг», and whether anyone has yet
  const [point, setPoint] = useState<PointLoad | null>(null);
  const [pointed, setPointed] = useState(false);
  const pointFrame = useRef(0);
  const pointX = useRef(0);
  // The canvas on the right side the pointer is read against
  const paneCanvasRef = useRef<HTMLDivElement>(null);
  // «Як це будується»: replayed on every press (a new key restarts it), and whether it runs now
  const [buildRun, setBuildRun] = useState(0);
  const [building, setBuilding] = useState(false);
  const buildTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(buildTimer.current), []);

  // Loops (a load's streams, its drops) stop while the frame is off the screen (audit 08.10, F15: 19 infinite animations
  // ran to the end of the visit, 6 % of a laptop's main thread, ~20 % of a slow phone's)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // The newest entry: one call can hold several (DrawingSheet), and the first of them may be a stale «out of view»
    const seen = new IntersectionObserver((entries) => {
      if (entries.at(-1)!.isIntersecting) delete stage.dataset.offscreen;
      else stage.dataset.offscreen = '';
    });
    seen.observe(stage);
    return () => seen.disconnect();
  }, []);

  const layer: Layer = chosen ?? 'frame';
  const rightSide = LAYERS[layer];
  // for the listeners set up once
  const layerRef = useRef(layer);
  useEffect(() => {
    layerRef.current = layer;
  });

  const { split, setSplit, dragging, setDragging, snap, snapWords, liveRef, dragRef, paneRef, innerRef, railRef, handleRef, splitAt, endDrag, clearLit } = useSeam(stageRef);
  // node Г's hint (NODE_HINT): due once the arrival rests, over at the visitor's first own move in the sheet — and over for
  // good then (a phone's strip under the frame keeps its room until that move, so its line comes in without moving the page)
  const [nodeHint, setNodeHint] = useState(false);
  const [hintOver, setHintOver] = useState(false);
  const closingStrip = useRef(false);
  const stripWait = useRef<(() => void) | null>(null);
  useEffect(() => () => stripWait.current?.(), []);
  const toggleHint = (on: boolean) => {
    setNodeHint(on);
    if (on || closingStrip.current) return;
    closingStrip.current = true;
    // …once the press or the key that ended it is over: closed on its pointerdown, the strip moved the title block 44 px
    // under a finger still on a pill, and the tap's click landed on another one (07.11)
    stripWait.current = afterInput(() => setHintOver(true));
  };
  const endHint = () => toggleHint(false);
  const hintRef = useRef<HTMLSpanElement>(null);
  useFirstSweep(stageRef, { paneRef, innerRef, railRef, handleRef }, toggleHint);
  const room = useRoom(stageRef, layer);
  // Each time the camera is back at rest: the words and letters cut against the seam are read again then (useLabelFit
  // reads none while the scheme's canvas is moved)
  const [cameraRests, setCameraRests] = useState(0);
  const {
    detail, dropDetail, detailSheet, cardShown, flowOn, setFlowOn, exploded, nodeOnPhoto, assembled,
    detailRef, detailCloseRef, detailPinsRef, leaderRef, leaderDotRef, touringRef,
    ringOf, showNode, stepNode, closeDetail, closeKeepingFocus, onCard, onSheetDown, onSheetUp, onSheetCancel, toggleExploded, toggleOnPhoto,
  } = useNodeDetail(stageRef, rangeRef, { liveRef, handleRef, setSplit, canvasRef: paneCanvasRef, onCameraRest: () => setCameraRests((count) => count + 1) });
  // «Жива схема»: what the pointer is over on «Каркас» — the member lit, its name by the pointer (moved by hand, never by a
  // render); a finger's tap shows it a moment
  const [hit, setHit] = useState<SchemeHit | null>(null);
  const hitRef = useRef<SchemeHit | null>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const hoverFrame = useRef(0);
  const hoverAt = useRef<{ x: number; y: number } | null>(null);
  const tap = useRef<{ x: number; y: number } | null>(null);
  const tapTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => {
    cancelAnimationFrame(hoverFrame.current);
    window.clearTimeout(tapTimer.current);
  }, []);
  // The load's chain in the legend, word by word: a word pointed at or pressed lights its link on the scheme alone
  const [stepOn, setStepOn] = useState<number | null>(null);
  const [stepPeek, setStepPeek] = useState<number | null>(null);
  const toggleStep = (n: number) => setStepOn((on) => (on === n ? null : n));
  useEffect(() => () => cancelAnimationFrame(pointFrame.current), []);
  // A scope's cell lighting its part: nothing else lit meanwhile — no held line, no weight on the roof, no node open
  const focusPart = useScopeFocus(stageRef, {
    liveRef,
    setSplit,
    onFocus: () => {
      clearLit();
      setPoint(null);
      dropDetail();
    },
  });

  // On a laptop the picture takes the height the window has left (home-v2.css): the sheet's other parts — the rulers, the
  // title block, however many lines its note wraps to — are measured here, so the title block is never pushed under the
  // picture (owner, 04.10: on a short window the picture covered the note)
  useEffect(() => {
    const image = stageRef.current?.parentElement;
    const sheet = image?.closest<HTMLElement>('figure');
    if (!image || !sheet) return;
    const measure = () => {
      sheet.style.setProperty('--hv2-sheet-rest', `${Math.ceil(sheet.offsetHeight - image.offsetHeight)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    const caption = sheet.querySelector('figcaption');
    if (caption) observer.observe(caption);
    return () => observer.disconnect();
  }, []);

  const { stampShort, stampNone, narrowLeft, narrowRight, tagYield, snapPlace, snapLabelRef } = useLabelFit(stageRef, { room, split, layer, snap, cameraRests });

  // Where a pointer is in the photo's own pixels, if it is on the right side of the seam
  const onScheme = (clientX: number, clientY: number): readonly [number, number] | null => {
    const canvas = paneCanvasRef.current?.getBoundingClientRect();
    const box = stageRef.current?.getBoundingClientRect();
    if (!canvas || !box || clientX < box.left + (box.width * liveRef.current) / 100) return null;
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
        return previous?.node === next.node && Math.abs(previous.x - next.x) < 1 ? previous : next;
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

  const showHit = (clientX: number, clientY: number) => {
    hoverAt.current = { x: clientX, y: clientY };
    if (hoverFrame.current) return;
    hoverFrame.current = requestAnimationFrame(() => {
      hoverFrame.current = 0;
      const at = hoverAt.current;
      const stage = stageRef.current;
      const tip = tipRef.current;
      if (!at || !stage) return;
      const onIt = onScheme(at.x, at.y);
      const next = onIt ? memberAt(onIt) : null;
      if (tip) {
        const box = stage.getBoundingClientRect();
        const [x, y] = [at.x - box.left, at.y - box.top];
        tip.style.setProperty('--tx', `${Math.round(x)}px`);
        tip.style.setProperty('--ty', `${Math.round(y)}px`);
        // by the pointer, and back over it near the frame's right edge or its foot
        if (x > box.width - 240) tip.dataset.flipX = '';
        else delete tip.dataset.flipX;
        if (y > box.height - 70) tip.dataset.flipY = '';
        else delete tip.dataset.flipY;
      }
      if (next?.name === hitRef.current?.name && next?.points === hitRef.current?.points && next?.node === hitRef.current?.node) return;
      hitRef.current = next;
      setHit(next);
    });
  };
  const dropHit = () => {
    cancelAnimationFrame(hoverFrame.current);
    hoverFrame.current = 0;
    hoverAt.current = null;
    if (!hitRef.current) return;
    hitRef.current = null;
    setHit(null);
  };

  // The ring of a node under a pointer, on the scheme's side, while the rings are shown (frame, at rest)
  const ringAt = (x: number, y: number): DetailId | null => {
    const stage = stageRef.current;
    if (!stage || layerRef.current !== 'frame' || stage.dataset.sweep !== undefined || stage.dataset.focus !== undefined || cameraIn(stage)) return null;
    const box = stage.getBoundingClientRect();
    if (x < box.left + (box.width * liveRef.current) / 100) return null;
    for (const { id } of homeProofDetailSpots) {
      const ring = ringOf(id)?.getBoundingClientRect();
      if (!ring?.width) continue;
      if (Math.hypot(x - (ring.left + ring.width / 2), y - (ring.top + ring.height / 2)) <= ring.width / 2 + 4) return id;
    }
    return null;
  };
  // A mouse or a pen pressed on a node's ring: the node opens, the seam stays
  const pressedRing = (event: PointerEvent<HTMLDivElement>) => {
    const ring = event.pointerType === 'touch' ? null : ringAt(event.clientX, event.clientY);
    if (!ring) return false;
    event.preventDefault();
    pressNode(ring);
    return true;
  };
  // With the camera on a node, the seam waits at the camera's place: a press anywhere else in the frame puts the node
  // away instead, as a press beside a sheet does (07.11) — not one on its card or where the card is coming in (see
  // onCard), and a finger's only as it lifts, unmoved (onPointerUp): a finger down on the frame may be the start of a
  // scroll (review 07.11, a 1180 × 820 touch tablet: scrolling the page put the node away). True: the press is the camera's
  const pressBesideNode = (event: PointerEvent<HTMLDivElement>) => {
    if (!cameraIn(event.currentTarget)) return false;
    if (event.pointerType !== 'touch' && !onCard(event.clientX, event.clientY)) {
      event.preventDefault();
      closeDetail();
    }
    return true;
  };
  // The press takes the seam: by its handle, or anywhere else in the frame (a mouse's), the seam moved there
  const grabSeam = (event: PointerEvent<HTMLDivElement>, handle: Element | null) => {
    event.preventDefault();
    if (handle) {
      // Grabbing the handle keeps the seam where it is and the handle under the pointer. The offset is taken from where
      // the handle is drawn, not from the seam: at either end of the frame it is held clear of the edge, off the seam
      const grip = handle.getBoundingClientRect();
      dragRef.current = { pointer: event.pointerId, offset: event.clientX - (grip.left + grip.width / 2) };
    } else {
      // A click elsewhere moves the seam there (below, once the press is marked a drag)
      dragRef.current = { pointer: event.pointerId, offset: 0 };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    // set here, not only by the render: the press's own move must not glide
    event.currentTarget.dataset.dragging = '';
    setDragging(true);
    setPointerFocus(true);
    rangeRef.current?.focus({ preventScroll: true });
    if (!handle) splitAt(event.clientX, 0, event.pointerType === 'touch');
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    tap.current = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
    if (event.pointerType === 'mouse') dropHit();
    if (event.button !== 0 || !ready) return;
    // The details' letters, the detail open and the «Вузли крупно» bar over the picture are their own: no seam moves
    // under them (owner, 05.10: pressed, the bar's letters started a drag that took the pointer, and never opened a node)
    if ((event.target as Element).closest(OWN_PRESS)) return;
    if (pressBesideNode(event)) return;
    // A node's ring opens the node (a finger's tap does it on lifting, below)
    if (pressedRing(event)) return;
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
    grabSeam(event, handle);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointer === event.pointerId) {
      splitAt(event.clientX, dragRef.current.offset, event.pointerType === 'touch');
      return;
    }
    // A mouse over the frame, no press, moves no seam (owner, 05.10: only while the button is held). On «Сніг» it puts
    // a weight on the roof it is over
    if (event.pointerType !== 'mouse' || !ready || dragRef.current || event.currentTarget.dataset.sweep !== undefined) return;
    const roof = roofAt(event.clientX, event.clientY);
    if (roof) pointAt(roof[0]);
    else if (point || pointFrame.current) dropPoint();
    // a ring under the mouse is a button: the cursor says so (home-v2.css)
    if (ringAt(event.clientX, event.clientY)) event.currentTarget.dataset.overRing = '';
    else delete event.currentTarget.dataset.overRing;
    // On «Каркас», the member it is over, named — not over a letter, the node open or the handle, nor under the camera
    if (layerRef.current === 'frame' && !cameraIn(event.currentTarget) && !(event.target as Element).closest('.hv2-proof-detail-pin, .hv2-detail, .hv2-contour-handle, .hv2-contour-nodes, .hv2-contour-node-hint-button')) {
      showHit(event.clientX, event.clientY);
    } else dropHit();
  };
  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) return;
    if (event.pointerType === 'mouse') {
      dropPoint();
      dropHit();
    }
  };
  // A finger's tap on «Каркас» (a finger scrolls the page otherwise): the member under it, named, for a moment
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    endDrag();
    const from = tap.current;
    tap.current = null;
    if (!from || event.pointerType !== 'touch') return;
    const still = Math.hypot(event.clientX - from.x, event.clientY - from.y) <= 10;
    // the camera on a node: a finger's tap beside it puts it away (pressBesideNode)
    if (cameraIn(event.currentTarget)) {
      if (still && !(event.target as Element).closest(OWN_PRESS) && !onCard(event.clientX, event.clientY)) closeDetail();
      return;
    }
    if (layerRef.current !== 'frame' || !still || (event.target as Element).closest(`${OWN_PRESS}, .hv2-contour-handle`)) return;
    const ring = ringAt(event.clientX, event.clientY);
    if (ring) {
      pressNode(ring);
      // the tap's own click, a moment later, would land on the panel now drawn under the finger and press its
      // «Розібрати» or «Навантаження» (review 09.10, a touch tablet): it is swallowed, once
      const swallow = (click: MouseEvent) => {
        click.preventDefault();
        click.stopPropagation();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 500);
      return;
    }
    showHit(event.clientX, event.clientY);
    window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(dropHit, 2600);
  };

  // The range moved while the camera holds the seam at its place (a Shift+Tab from the node's card reaches it): the node is
  // put away first, as a press in the frame does, and that key or input is swallowed — the seam the visitor sees (34 %)
  // is not where the range stands (their own split), so a step from the range's value would jump it, unseen till the
  // close (review 07.11: ArrowRight ×6 read 68 with the seam drawn at 34). The focus stays on the range; the next key
  // moves the seam from where it is now seen. True: swallowed
  const rangeBesideNode = () => {
    const stage = stageRef.current;
    if (!stage || !cameraIn(stage)) return false;
    closeKeepingFocus();
    return true;
  };
  // Arrows step by one through the native range; the larger steps are the same in every browser
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    setPointerFocus(false);
    clearLit();
    if (RANGE_KEYS.has(event.key) && rangeBesideNode()) {
      event.preventDefault();
      return;
    }
    const to = { PageUp: Math.round(split) + PAGE_STEP, PageDown: Math.round(split) - PAGE_STEP, Home: 0, End: 100 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    setSplit(clamp(to));
  };

  // A layer chosen with the seam far right brings the right side back into view; the load is replayed on every press,
  // and on a phone its way down the frame wants the wider right side
  const choose = (next: Layer) => {
    setStepOn(null);
    setStepPeek(null);
    dropHit();
    clearLit();
    dropPoint();
    if (next !== 'frame') dropDetail();
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
    dropDetail();
    setChosen('frame');
    const to = phoneNow() ? FOCUS_SPLIT_PHONE : FOCUS_SPLIT;
    if (liveRef.current > to) setSplit(to);
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

  const { tourStep, calling, toggleTour } = useTour(stageRef, {
    touringRef, flowOn, setFlowOn, setSplit, showNode, closeDetail, build, choose, pointAt,
  });

  // A node from the title block: the scheme on, its ring in view, the frame on the screen (a phone's sheet covers it)
  const openNode = (id: DetailId) => {
    clearLit();
    dropPoint();
    endHint();
    setChosen('frame');
    if (!phoneNow() && stageRef.current) bringIntoView(stageRef.current);
    showNode(id);
    if (detail !== id) queueProofEvent('node_open', id);
  };
  // A node from the scheme itself — its letter, or its ring (audit 08.10, F06: a click on the ring moved the seam and hid
  // the node instead of opening it)
  const pressNode = (id: DetailId) => {
    // (a finger's tap on a ring is no press on a button: the hint goes here)
    endHint();
    if (detail !== id && !phoneNow() && stageRef.current) bringIntoView(stageRef.current);
    showNode(id);
    if (detail !== id) queueProofEvent('node_open', id);
  };
  // «Вузли крупно: А Б В Г Д» — the letters on the scheme, named again where they are seen: over the picture's foot on a
  // laptop (the title block keeps its height there: the sheet fits the window), in the title block on a phone (its
  // frame has no room). One shows at a time (home-v2.css, data-place)
  // A pill in the title block pointed at or focused lights its node on the scheme (the bar over the picture does not)
  const peekOn = (id: DetailId) => ({
    onPointerEnter: () => setPeekNode(id),
    onPointerLeave: () => setPeekNode(null),
    onFocus: () => setPeekNode(id),
    onBlur: () => setPeekNode(null),
  });
  const nodesRow = (place: 'stage' | 'block') => {
    const block = place === 'block';
    // node Г's pill, outlined while its hint shows (NODE_HINT)
    const hinted = block && hinting ? NODE_HINT : null;
    return (
      <fieldset className="hv2-contour-nodes" data-place={place} aria-label="Вузли крупно">
        <span className="hv2-contour-nodes-label" aria-hidden="true">Вузли крупно</span>
        {PROOF_DETAILS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={nodeLabel(item)}
            aria-haspopup="dialog"
            aria-expanded={detail === item.id}
            data-hint={dataFlag(item.id === hinted)}
            disabled={!ready}
            onClick={() => openNode(item.id)}
            {...(block ? peekOn(item.id) : {})}
          >
            {block ? <i className="hv2-contour-node-letter">{item.letter}</i> : item.letter}
            {block && <span className="hv2-contour-node-word" aria-hidden="true">{item.title}</span>}
          </button>
        ))}
      </fieldset>
    );
  };
  // A layer's place in the legend: «Каркас»'s five nodes; a load's way, link by link
  const legendSet = (name: Layer) => {
    // «Каркас»'s own row: its five nodes, named, at once (owner, 09.10: «Детальніше» hid them, and the letters on the
    // scheme were found by chance); the draughtsman's key gave it its place
    if (name === 'frame') return nodesRow('block');
    // A load's legend is its way: its tint's key, then each link lit as the drawing reaches it (replayed with it on
    // every press)
    return (
      <span className="hv2-contour-legend-chain" data-load={name} key={name === 'load' ? loadRun : windRun}>
        <span data-key={name}>{legendLine}</span>
        {CHAINS[name].map(([word, n]) => (
          <button
            key={word}
            type="button"
            className="hv2-chain-step"
            disabled={!ready}
            style={{ '--n': n } as CSSProperties}
            aria-pressed={layer === name && stepOn === n}
            onClick={() => toggleStep(n)}
            onPointerEnter={() => setStepPeek(n)}
            onPointerLeave={() => setStepPeek(null)}
            onFocus={() => setStepPeek(n)}
            onBlur={() => setStepPeek(null)}
          >
            {word}
          </button>
        ))}
      </span>
    );
  };
  // A quiet way out for another task than a hangar (audit 08.10: the brief leads to hangars only): under the line on a
  // laptop (the action cell's height is the title block's, and the sheet must fit the window), under the brief on a phone
  // (the thumb is there). One shows at a time (home-v2.css, data-place)
  const exitLink = (place: 'line' | 'action') => (
    <a className="link-arrow hv2-contour-exit" data-place={place} href="#inquiry" onClick={() => queueProofEvent('exit_click')}>
      Інша задача? Розкажіть коротко <Arrow to="down" />
    </a>
  );
  // Once the visitor has watched a load go down or the frame go up, the way on to their own hangar lights up
  const engaged = loadRun + windRun + buildRun > 0;
  // Node Г's hint shows on «Каркас» at rest only: not over a node open, the tour or a scope's cell lighting its part
  const hinting = nodeHint && ready && layer === 'frame' && !detail && tourStep === null && focusPart === null;
  const hintItem = PROOF_DETAILS.find((entry) => entry.id === NODE_HINT)!;
  useNodeHint(stageRef, hintRef, { on: hinting, id: NODE_HINT, split });
  // The hint's words, the press's own («Натисніть» to a pointer, «Торкніться» to a finger), in two parts so a narrow room
  // can take them in two lines
  const hintWords = (verb: string) => (
    <>
      <span>{verb} {hintItem.letter} —</span> <span data-part="2">покажемо вузол зблизька</span>
    </>
  );
  const hintButton = (className: string) => (
    // (disabled only until hydration: the press that ends the hint would disable it before its own click; hidden, it takes
    // no press)
    <button type="button" className={className} disabled={!ready} tabIndex={hinting ? undefined : -1} onClick={() => openNode(NODE_HINT)}>
      <i className="hv2-contour-node-letter" aria-hidden="true">{hintItem.letter}</i>
      <span data-input="hover">{hintWords('Натисніть')}</span>
      <span data-input="touch">{hintWords('Торкніться')}</span>
    </button>
  );

  const sliderLabel = 'Порівняти фото й схему';

  return (
    <DrawingSheet
      className="hv2-contour"
      imageClassName="hv2-contour-media"
      cells={[
        { label: 'Ліворуч', value: 'Фото об’єкта' },
        {
          tone: 'note',
          label: 'Об’єкт',
          // One line that says what this is (audit 08.10: three kickers and a four-sentence note, all under 14 px). The
          // provenance — before RUBIKON BUILD, the foreground retouched — stays under the sheet (EngineeringSignature)
          value: (
            <>
              <span className="hv2-contour-line">Реальний ангар, який вів Сергій Іванович, і схема каркаса такого типу, без розмірів.</span>
              {exitLink('line')}
            </>
          ),
        },
        {
          label: 'Праворуч',
          className: 'hv2-contour-right',
          value: (
            <>
              <fieldset className="hv2-contour-layers" aria-label="Що показати праворуч">
                {LAYER_ORDER.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={layer === name}
                    disabled={!ready}
                    onClick={() => {
                      choose(name);
                      queueProofEvent('layer', name);
                    }}
                  >
                    {LAYERS[name].button}
                  </button>
                ))}
              </fieldset>
              <span className="hv2-contour-legend">
                {LAYER_ORDER.map((name) => (
                  <span key={name} className="hv2-contour-legend-set" data-layer={name} data-on={dataFlag(name === layer)}>
                    {legendSet(name)}
                  </span>
                ))}
              </span>
            </>
          ),
        },
      ]}
      action={
        <span className="hv2-contour-controls">
          {/* «Тур за 20 секунд» — the frame put up first (owner, 05.10: it took over «Як це будується») — over the way on */}
          <button
            type="button"
            className="hv2-contour-build hv2-contour-tour-btn"
            aria-pressed={tourStep !== null}
            disabled={!ready}
            onClick={toggleTour}
          >
            <i aria-hidden="true" data-stop={dataFlag(tourStep !== null)} />
            {tourStep !== null ? 'Зупинити тур' : 'Тур за 20 секунд'}
          </button>
          {/* The way on: a hangar like this one, the visitor's own (owner, 05.10: in place of «Контур на фото», and
              to be seen) */}
          <a className="hv2-contour-brief" href={BRIEF_HREF} data-lit={dataFlag(engaged)} data-call={dataFlag(calling)} onClick={() => queueProofEvent('brief_click')}>
            <small>Такий ангар, але ваш</small>
            <span>Сформувати бриф <Arrow to="right" /></span>
          </a>
          {exitLink('action')}
        </span>
      }
    >
      <>
        <div
          ref={stageRef}
          className="hv2-contour-stage"
          data-layer={layer}
          data-dragging={dataFlag(dragging)}
          data-pointer-focus={dataFlag(pointerFocus)}
          // The seam's names give way where their side is too narrow, the right one before the stamp; the stamp shortens
          data-narrow-left={dataFlag(narrowLeft)}
          data-narrow-right={dataFlag(narrowRight || tagYield)}
          data-stamp={stampFit(stampNone, stampShort)}
          data-photo-only={dataFlag(split >= 100)}
          data-snapped={dataFlag(snap)}
          data-snap-side={snapPlace.side}
          data-snap-wrap={dataFlag(snapPlace.wrap)}
          data-focus={focusPart ?? undefined}
          data-point={dataFlag(point)}
          data-pointed={dataFlag(pointed)}
          data-detail={detail ?? undefined}
          data-node-hint={hinting ? NODE_HINT : undefined}
          data-hit-node={layer === 'frame' ? hit?.node : undefined}
          data-peek-node={layer === 'frame' && peekNode && !detail ? peekNode : undefined}
          data-step-on={litStep(layer, stepPeek, stepOn)}
          data-building={dataFlag(building)}
          data-touring={dataFlag(tourStep !== null)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onPointerUp={onPointerUp}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        >
          {/* The photo, in one canvas in its own proportion; on a laptop the stage is shorter than the canvas and crops its
              sky and gravel, on a phone it is a close-up of the gable (home-v2.css) */}
          <div className="hv2-contour-canvas">
            {/* The open node's ring on the photo too, «На фото»: the seam stands past it */}
            {detail && nodeOnPhoto && (() => {
              const spot = homeProofDetailSpots.find((entry) => entry.id === detail)!;
              return (
                <svg className="hv2-detail-onphoto" viewBox={`0 0 ${contourPhoto.width} ${contourPhoto.height}`} aria-hidden="true">
                  <circle className="hv2-detail-onphoto-casing" cx={spot.ring[0]} cy={spot.ring[1]} r={spot.radius} />
                  <circle cx={spot.ring[0]} cy={spot.ring[1]} r={spot.radius} />
                </svg>
              );
            })()}
            <picture>
              <source type="image/webp" srcSet={SRC_SET} sizes={SIZES} />
              <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" draggable={false} />
            </picture>
          </div>
          {/* The camera on a node (useNodeCamera): the photo's side dims behind it */}
          <span className="hv2-camera-dim" aria-hidden="true" />
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
                    <path d={GROUND_LINE} />
                    <path className="hv2-contour-ground-hatch" d={GROUND_HATCH} />
                  </svg>
                  <picture>
                    <source type="image/webp" srcSet={SRC_SET} sizes={SIZES} />
                    <img src={photo.src} alt="" width={photo.width} height={photo.height} loading="lazy" decoding="async" draggable={false} />
                  </picture>
                </div>
                <ProofFrame buildRun={buildRun} loadRun={loadRun} windRun={windRun} wind={layer === 'wind'} ready={ready} />
                <ProofPoint point={layer === 'load' ? point : null} />
                <ProofHover hit={layer === 'frame' ? hit : null} />
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
                {/* The details' letters on their rings on «Каркас» (homeProofDetailSpots' letter): each opens its node, drawn */}
                <div className="hv2-proof-detail-pins">
                  {homeProofDetailSpots.map(({ id, ring: [rx, ry], radius, letter }) => {
                    const item = PROOF_DETAILS.find((entry) => entry.id === id)!;
                    const [cos, sin] = [Math.cos((letter * Math.PI) / 180), Math.sin((letter * Math.PI) / 180)];
                    return (
                      <button
                        key={id}
                        ref={(element) => { detailPinsRef.current[id] = element; }}
                        type="button"
                        className="hv2-proof-detail-pin"
                        data-detail={id}
                        style={{
                          '--x': `${(((rx + radius * cos) / contourPhoto.width) * 100).toFixed(3)}%`,
                          '--y': `${(((ry + radius * sin) / contourPhoto.height) * 100).toFixed(3)}%`,
                          '--cos': cos.toFixed(3), '--sin': sin.toFixed(3),
                        } as CSSProperties}
                        aria-label={nodeLabel(item)}
                        aria-haspopup="dialog"
                        aria-expanded={detail === id}
                        disabled={!ready}
                        onClick={() => pressNode(id)}
                      >
                        {item.letter}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* …and round the node's ring on the scheme's side, the rest of the scheme dims (still: it is not scaled) */}
              <span className="hv2-camera-veil" aria-hidden="true" />
              {/* The right side's own words, outside the canvas (never cropped): what it is, top right */}
              <span className="hv2-contour-corner" aria-hidden="true">
                <span className="hv2-contour-stamp">
                  <small>
                    Схема
                    {/* a phone keeps the first word only */}
                    <span className="hv2-contour-stamp-more"> · без розмірів</span>
                  </small>
                  <span className="hv2-contour-stamp-text">каркас такого типу, як на цьому об’єкті</span>
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
          {nodesRow('stage')}
          {/* Node Г's hint (NODE_HINT): beside its ring on the scheme, a leader to it, the line itself the node's button
              (useNodeHint places it) */}
          <span className="hv2-contour-node-hint" ref={hintRef} data-on={dataFlag(hinting)}>
            <svg className="hv2-contour-node-hint-lead" aria-hidden="true">
              <path />
              <rect width="5" height="5" />
            </svg>
            {hintButton('hv2-contour-node-hint-button')}
          </span>
          {/* «Тур»: the step on, and how far through it */}
          <output className="hv2-contour-tour" data-on={dataFlag(tourStep !== null)}>
            {tourStep !== null && (
              <>
                <i>{tourStep + 1}/{TOUR.length}</i>
                {TOUR[tourStep].name}
                <span className="hv2-contour-tour-bar" key={tourStep} style={{ '--hold': `${TOUR[tourStep].hold}ms` } as CSSProperties} aria-hidden="true" />
              </>
            )}
          </output>
          {/* «Жива схема»: the name by the pointer */}
          <span ref={tipRef} className="hv2-proof-hover-tip" data-on={dataFlag(layer === 'frame' && hit)} aria-hidden="true">
            <b>{hit?.name}</b>
            {hit?.node && <small>Вузол {PROOF_DETAILS.find((entry) => entry.id === hit.node)?.letter} — натисніть літеру</small>}
          </span>
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
          {/* The node opened (ProofDetails): beside its ring on the scheme's side, the camera on it, a short leader from the
              ring to it (useNodeDetail); «На фото», over the photo's corner, its leader across to the ring */}
          {detail && cardShown && !detailSheet && (
            <svg className="hv2-detail-leader" key={detail} aria-hidden="true">
              <path ref={leaderRef} pathLength={1} />
              <circle ref={leaderDotRef} r="3" />
            </svg>
          )}
          {detail && cardShown && (() => {
            const item = PROOF_DETAILS.find((entry) => entry.id === detail)!;
            const body = (
              <dialog
                open
                ref={detailRef}
                className="hv2-detail"
                data-sheet={dataFlag(detailSheet)}
                // beside its ring on the scheme, the camera on it (useNodeCamera); «На фото», over the photo's corner
                data-camera={dataFlag(!detailSheet && !nodeOnPhoto)}
                data-flow={dataFlag(flowOn && !exploded && assembled)}
                data-exploded={dataFlag(exploded)}
                onPointerDown={onSheetDown}
                onPointerUp={onSheetUp}
                onPointerCancel={onSheetCancel}
                aria-modal={detailSheet ? true : undefined}
                aria-labelledby="hv2-detail-title"
                aria-describedby="hv2-detail-term hv2-detail-spoken"
              >
                <div className="hv2-detail-head">
                  <span className="hv2-detail-letter" aria-hidden="true">{item.letter}</span>
                  {/* its plain name, the draughtsman's word under it (R-UX-06 §07) */}
                  <span className="hv2-detail-name">
                    <b id="hv2-detail-title">Вузол {item.letter} · {item.title}</b>
                    <small id="hv2-detail-term">Термін: {item.term}</small>
                  </span>
                  <span className="hv2-detail-steps">
                    <button type="button" className="hv2-detail-step" aria-label="Попередній вузол" onClick={() => stepNode(-1)}>‹</button>
                    <button type="button" className="hv2-detail-step" aria-label="Наступний вузол" onClick={() => stepNode(1)}>›</button>
                  </span>
                  <button ref={detailCloseRef} type="button" className="hv2-detail-close" aria-label="Закрити вузол" onClick={closeDetail}>
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <item.Drawing key={item.id} />
                {/* the load's way through it, in words, under the drawing while it is shown */}
                {flowOn && !exploded && <p className="hv2-detail-flow-words">{item.flow}</p>}
                <div className="hv2-detail-foot">
                  <p className="hv2-detail-note">Вузол такого типу · схема без розмірів</p>
                  <span className="hv2-detail-actions">
                    <button type="button" className="hv2-detail-again" data-kind="load" aria-pressed={flowOn} onClick={() => setFlowOn((on) => !on)}>
                      <span aria-hidden="true">↓</span> Навантаження
                    </button>
                    <button type="button" className="hv2-detail-again" aria-pressed={exploded} onClick={toggleExploded}>
                      <span aria-hidden="true">⇲</span> {exploded ? 'Зібрати' : 'Розібрати'}
                    </button>
                    <button type="button" className="hv2-detail-again" aria-pressed={nodeOnPhoto} onClick={() => toggleOnPhoto(item.id)}>
                      <span aria-hidden="true">◎</span> На фото
                    </button>
                  </span>
                </div>
                <p className="sr-only" id="hv2-detail-spoken">{item.spoken}</p>
              </dialog>
            );
            const main = detailSheet ? document.querySelector('main[data-home="v2"]') : null;
            return main ? createPortal(<><div className="hv2-detail-backdrop" aria-hidden="true" onClick={closeDetail} />{body}</>, main) : body;
          })()}
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
              // (the value React holds stays: the range shows the visitor's split again)
              if (rangeBesideNode()) return;
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
            {/* The handle's clamp off the frame's edges is a transform too, on a rail-wide grip (a transform's per cent is
                its own box's): as left it shifted the layout through the sweep's first 22 px */}
            <span className="hv2-contour-grip">
              <span className="hv2-contour-handle" ref={handleRef}>‹ ›</span>
            </span>
          </span>
        </div>
        {/* A phone: node Г's ring rests on the photo's side there, so its hint is a strip under the frame (07.11), not a
            patch over the photo. Its room is kept from hydration to the visitor's first own move, so the line comes in
            without moving the page; it closes up on that move (home-v2.css) */}
        <span className="hv2-contour-node-strip" data-reserve={dataFlag(ready && !hintOver)} data-on={dataFlag(hinting)}>
          {hintButton('hv2-contour-node-strip-button')}
        </span>
      </>
    </DrawingSheet>
  );
}
