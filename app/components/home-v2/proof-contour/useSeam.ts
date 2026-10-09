import { useEffect, useRef, useState, type RefObject } from 'react';
import { homeProofContour } from '../../../data/homeProofContour';

// ProofContour's seam: where it stands (the state, and the place it is drawn now), the four elements that carry it, the
// pointer's drag of it and the measured line it lights on the way.

/** The seam's resting place: right of the left gate and left of the ridge, so each side keeps a gate */
export const DEFAULT_SPLIT = 62;
/** Passing a measured line, in per cent of the frame: lit within GRAB of it, until the seam is past RELEASE */
const SNAP_GRAB = 0.8;
const SNAP_RELEASE = 1.4;
/** A phone's close-up of the gable (home-v2.css, ≤ 760 px): the canvas 1.22 × the frame's width, shifted left by 19.46 %
 *  of it — the photo's columns 245–1504, the gable whole — so a line at a per cent of the canvas stands at
 *  (per cent × ZOOM − LEFT) of the frame; the sweep turns just past the gable's left corner there */
const PHONE_ZOOM = 1.22;
const PHONE_LEFT = 19.46;
/** While the seam moves under a pointer, the rest of the sheet (the range's value, the names that give way, the stamp)
 *  catches up at most this often, ms: the seam itself moves every frame (review, 05.10: dragging it stuttered) */
const COMMIT_EVERY = 100;

const { photo: contourPhoto, lines } = homeProofContour;

// What the seam snaps to: the measured verticals — both gates' jambs and the gable's corners, each at its mean x — with
// the words for the seam's foot. Not the ridge: nobody measured where it stands
export type Snap = { line: string; at: number; name: string };
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
export const phoneNow = () => window.matchMedia('(max-width: 760px)').matches;
/** Where a measured line stands in the frame, per cent: on a phone the canvas is zoomed in on the gable */
const stageAt = (snap: Snap, phone: boolean) => (phone ? snap.at * PHONE_ZOOM - PHONE_LEFT : snap.at);
export const clamp = (value: number) => Math.min(100, Math.max(0, value));

export function useSeam(stageRef: RefObject<HTMLDivElement | null>) {
  const [split, setSplit] = useState(DEFAULT_SPLIT);
  const [dragging, setDragging] = useState(false);
  // The measured line the dragged seam holds, and the last one's words (they fade out after it is let go)
  const [snap, setSnap] = useState<Snap | null>(null);
  const snapRef = useRef<Snap | null>(null);
  const [snapWords, setSnapWords] = useState<Snap | null>(null);
  // The four that carry the seam's place (home-v2.css: --split is theirs only, not inherited): the right side's window
  // and its counter-moved content, the rail with the seam and its names, the handle
  const paneRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  // Where the seam is drawn now; a commit to React waiting to go
  const liveRef = useRef(DEFAULT_SPLIT);
  const commitTimer = useRef<number | undefined>(undefined);
  const dragRef = useRef<{ pointer: number; offset: number } | null>(null);

  // The seam's place on the page: written straight onto the four elements that carry it, never through a render — a
  // drag or a mouse moves it every frame, and nothing else on the sheet need restyle for it
  const paint = (value: number) => {
    liveRef.current = value;
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
      setSplit(liveRef.current);
    }, COMMIT_EVERY);
  };
  // A move that is not the pointer's — a key, a button, a layer, the range — reaches the seam through the state, and the
  // seam glides there (the four's transition on --split)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || stage.dataset.dragging !== undefined) return;
    if (Math.abs(split - liveRef.current) > 0.001 || !paneRef.current?.style.getPropertyValue('--split')) paint(split);
  }, [stageRef, split]);
  useEffect(() => () => window.clearTimeout(commitTimer.current), []);

  const splitAt = (clientX: number, offset = 0, touch = false) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const value = clamp(((clientX - offset - box.left) / box.width) * 100);
    // The measured line the seam is passing: lit from within GRAB until past RELEASE, so it does not flicker at the edge
    const phone = phoneNow();
    const lit = snapRef.current;
    // Not under a finger (owner, 06.10: on a phone the lit gate line, its name and a buzz read as the seam sticking to
    // the gates — it never did; under a finger nothing lights, the seam just follows it)
    let near: Snap | null = null;
    if (!touch && lit && Math.abs(value - stageAt(lit, phone)) < SNAP_RELEASE) near = lit;
    else if (!touch) near = SNAPS.find((candidate) => Math.abs(value - stageAt(candidate, phone)) < SNAP_GRAB) ?? null;
    if (near !== lit) {
      snapRef.current = near;
      setSnap(near);
      if (near) setSnapWords(near);
    }
    // Tenths of a per cent: a whole per cent is a 13 px jump on a wide screen
    const tenths = Math.round(value * 10) / 10;
    paint(tenths);
    commit(tenths);
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    delete stageRef.current?.dataset.dragging;
    commit(liveRef.current, true);
    snapRef.current = null;
    setSnap(null);
    setDragging(false);
  };

  // A move that is not the pointer's — a key, a button, a layer — leaves no line lit behind it (review, 04.10)
  const clearLit = () => {
    snapRef.current = null;
    setSnap(null);
  };

  return {
    split, setSplit, dragging, setDragging, snap, snapWords, liveRef, dragRef,
    paneRef, innerRef, railRef, handleRef, splitAt, endDrag, clearLit,
  };
}
