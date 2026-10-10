import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Layer } from '../ProofContour';
import type { Snap } from './useSeam';

// What fits right of the seam (review, 04.10). The stamp and the load's chain lie on the right side only, clipped at the
// seam (home-v2.css): the stamp keeps its full words while that side is wider than it, its first word below that, and
// the seam's names give way before they reach the stamp or the frame's edge. Measured on the page (the frame's width,
// the names' and the stamp's); in the server markup and without JavaScript, by per cent.
const STAMP_OFFSET = 10;
const SHORT_STAMP = 96;
const AIR = 8;
/** The held line's name: its distance from the seam, px */
const SNAP_GAP = 10;
/** …and its padding and border, px (home-v2.css) */
const SNAP_FRAME = 20;
type Room = { width: number; height: number; left: number; right: number; stamp: number };
type Box = { left: number; right: number; top: number; bottom: number };
type SnapPlace = { side: 'left' | 'right'; wrap: boolean; max: number };

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

/** The held line's name, `width` px: on the photo's side if it fits there, else on the scheme's side, else wrapped on the
 *  roomier side */
function placeOf(width: number, left: number, right: number): SnapPlace {
  if (width <= left) return { side: 'left', wrap: false, max: 0 };
  if (width <= right) return { side: 'right', wrap: false, max: 0 };
  return { side: left >= right ? 'left' : 'right', wrap: true, max: Math.max(left, right) };
}

const meets = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const shown = (element: Element | null) => element && getComputedStyle(element).visibility === 'visible';

/** The drawing's words the seam cuts, or a name or the stamp covers (`covers`): hidden whole, with their leaders (review,
 *  04.10: a leader stayed, pointing at nothing). Whether a word shown on «Каркас» meets the seam's right-hand name where
 *  it would stand (`yieldTo`) */
function cutWords(stage: HTMLElement, seam: number, covers: readonly Box[], yieldTo: Box | null) {
  let yieldTag = false;
  // Read the whole set before changing visibility: a data-cut change can
  // otherwise make the next geometry read flush styles again.
  const cuts = [...stage.querySelectorAll<HTMLElement>('.hv2-proof-labels > span')].map((label) => {
    const rect = label.getBoundingClientRect();
    const cut = rect.left < seam + 1 || covers.some((cover) => meets(rect, cover));
    if (!cut && yieldTo && meets(rect, yieldTo)) yieldTag = true;
    return { label, cut };
  });
  for (const { label, cut } of cuts) {
    if (cut === ('cut' in label.dataset)) continue;
    label.toggleAttribute('data-cut', cut);
    const pointer = stage.querySelector<SVGGElement>(`.hv2-proof-tag-leaders [data-tag="${label.dataset.tag}"]`);
    pointer?.toggleAttribute('data-cut', cut);
  }
  return yieldTag;
}

/** A node's letter gives way to a word of the drawing it would cover — the word says what the drawing is; the letter
 *  is in the «Вузли крупно» bar too, and its ring stays (06.10: on a tablet's frame the walls' and the footings' names
 *  lay under Д and В) — and, as a word, it is hidden whole where the seam cuts it. «Схема ›» gives way to a letter as to
 *  a word (on a short laptop with the seam at 64 % it covered «Г»): whether one meets it (`yieldTo`) */
function cutLetters(stage: HTMLElement, seam: number, onFrame: boolean, yieldTo: Box | null) {
  // Word cuts have already been applied: read their final visibility once,
  // then reuse each box for all pins. Pin writes follow every geometry read.
  const words = [...stage.querySelectorAll<HTMLElement>('.hv2-proof-labels > span:not([data-cut])')]
    .filter((label) => shown(label)).map((label) => label.getBoundingClientRect());
  let yieldTag = false;
  const cuts = [...stage.querySelectorAll<HTMLElement>('.hv2-proof-detail-pin')].map((pin) => {
    const rect = pin.getBoundingClientRect();
    const under = onFrame && (rect.left < seam + 1 || words.some((word) => meets(rect, word)));
    if (!under && yieldTo && rect.left >= seam && meets(rect, yieldTo)) yieldTag = true;
    return { pin, under };
  });
  for (const { pin, under } of cuts) {
    if (under !== pin.hasAttribute('data-cut')) pin.toggleAttribute('data-cut', under);
  }
  return yieldTag;
}

// The room right and left of the seam (see STAMP_OFFSET): the frame's width, the seam names' and the full stamp's,
// again when the frame resizes, the layer changes their words or the fonts arrive. A short stamp keeps the full
// stamp's width last measured
export function useRoom(stageRef: RefObject<HTMLDivElement | null>, layer: Layer) {
  const [room, setRoom] = useState<Room | null>(null);
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
  }, [stageRef, layer]);
  return room;
}

/** Where the words on the frame stand against the seam: which of the seam's names give way, how much of the stamp shows,
 *  where the held line's name goes — and which of the drawing's words and letters the seam cuts */
export function useLabelFit(stageRef: RefObject<HTMLDivElement | null>, { room, split, layer, snap }: Readonly<{ room: Room | null; split: number; layer: Layer; snap: Snap | null }>) {
  const snapLabelRef = useRef<HTMLSpanElement>(null);
  const [snapPlace, setSnapPlace] = useState<SnapPlace>({ side: 'left', wrap: false, max: 0 });
  // The seam's right-hand name gives way to a figure or a name of the drawing it would cover (review, 05.10)
  const [tagYield, setTagYield] = useState(false);
  const { stampShort, stampNone, narrowLeft, narrowRight } = fitOf(room, split);

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
    // what the stamp takes of the scheme's side, if it shows
    const stampWidth = stampShort ? SHORT_STAMP : room.stamp;
    const stamp = stampNone ? 0 : stampWidth + STAMP_OFFSET;
    const left = seam - SNAP_GAP - AIR;
    const right = room.width - seam - SNAP_GAP - AIR - stamp;
    const next = placeOf(width, left, right);
    setSnapPlace((previous) => (previous.side === next.side && previous.wrap === next.wrap && previous.max === next.max ? previous : next));
  }, [stageRef, snap, split, room, stampNone, stampShort]);

  // A figure or a name the seam cuts through is hidden whole, never shown in part (review, 04.10: «≈ 3,2 висоти» cut to
  // «2 висоти» changes what the figure says). Measured on the page whenever the seam, the layer or the frame changes
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !room) return;
    const box = stage.getBoundingClientRect();
    // (on the frame's own width to the fraction: a sheet narrowed to fit the window is no whole number of pixels wide, and
    // the rounded clientWidth put the seam half a pixel off — a word touching it was taken for cut, 06.10)
    const seam = box.left + (box.width * split) / 100;
    // …and one under the seam's names or the stamp (review, 04.10): their boxes where they will stand once the seam has
    // glided there (measured now, a gliding name would be read mid-way)
    const [leftTag, rightTag] = stage.querySelectorAll<HTMLElement>('.hv2-contour-seamtags > span');
    const top = box.top + 10;
    const covers: Box[] = [];
    if (shown(leftTag)) covers.push({ left: seam - 3 - leftTag.offsetWidth, right: seam - 3, top, bottom: top + leftTag.offsetHeight });
    const stamp = stage.querySelector<HTMLElement>('.hv2-contour-stamp');
    if (stamp && shown(stamp)) covers.push(stamp.getBoundingClientRect());
    // The right-hand name would stand here were it shown — it gives way to a word of the drawing on «Каркас», not the
    // other way
    const onFrame = layer === 'frame';
    const rightTagWould = onFrame && rightTag && !narrowRight && !snap && getComputedStyle(rightTag.parentElement!).display !== 'none';
    const yieldTo = rightTagWould ? { left: seam + 3, right: seam + 3 + rightTag.offsetWidth, top, bottom: top + rightTag.offsetHeight } : null;
    const wordYields = cutWords(stage, seam, covers, yieldTo);
    const yieldTag = cutLetters(stage, seam, onFrame, yieldTo) || wordYields;
    setTagYield(yieldTag);
  }, [stageRef, split, layer, room, snap, narrowRight]);

  return { stampShort, stampNone, narrowLeft, narrowRight, tagYield, snapPlace, snapLabelRef };
}
