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
  const [snapPlace, setSnapPlace] = useState<{ side: 'left' | 'right'; wrap: boolean; max: number }>({ side: 'left', wrap: false, max: 0 });
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
    const stamp = stampNone ? 0 : (stampShort ? SHORT_STAMP : room.stamp) + STAMP_OFFSET;
    const left = seam - SNAP_GAP - AIR;
    const right = room.width - seam - SNAP_GAP - AIR - stamp;
    const next = width <= left ? { side: 'left' as const, wrap: false, max: 0 }
      : width <= right ? { side: 'right' as const, wrap: false, max: 0 }
        : { side: left >= right ? 'left' as const : 'right' as const, wrap: true, max: Math.max(left, right) };
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
      // shown on this layer: the scheme's names, on «Каркас»
      const here = layer === 'frame';
      if (!cut && here && rightTagWould && rightBox && meets(rect, rightBox)) yieldTag = true;
      if (cut === ('cut' in label.dataset)) continue;
      if (cut) label.dataset.cut = '';
      else delete label.dataset.cut;
      // …with its leader (review, 04.10: a leader stayed, pointing at nothing)
      const pointer = stage.querySelector<SVGGElement>(`.hv2-proof-tag-leaders [data-tag="${label.dataset.tag}"]`);
      if (pointer) {
        if (cut) pointer.dataset.cut = '';
        else delete pointer.dataset.cut;
      }
    }
    // A node's letter gives way to a word of the drawing it would cover — the word says what the drawing is; the letter
    // is in the «Вузли крупно» bar too, and its ring stays (06.10: on a tablet's frame the walls' and the footings'
    // names lay under Д and В). «Схема ›» gives way to a letter as to a word (on a short laptop with the seam at 64 % it
    // covered «Г»)
    const words = [...stage.querySelectorAll<HTMLElement>('.hv2-proof-labels > span:not([data-cut])')].filter((label) => shown(label));
    for (const pin of stage.querySelectorAll<HTMLElement>('.hv2-proof-detail-pin')) {
      const rect = pin.getBoundingClientRect();
      // (and, as a word, it is hidden whole where the seam cuts it — never half a letter)
      const under = layer === 'frame' && (rect.left < seam + 1 || words.some((label) => meets(rect, label.getBoundingClientRect())));
      if (under) pin.dataset.cut = '';
      else delete pin.dataset.cut;
      if (!under && layer === 'frame' && rightTagWould && rightBox && rect.left >= seam && meets(rect, rightBox)) yieldTag = true;
    }
    setTagYield(yieldTag);
  }, [stageRef, split, layer, room, snap, narrowRight]);

  return { stampShort, stampNone, narrowLeft, narrowRight, tagYield, snapPlace, snapLabelRef };
}
