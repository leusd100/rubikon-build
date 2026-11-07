import { useEffect, useRef, type RefObject } from 'react';
import { homeProofContour } from '../../../data/homeProofContour';
import { homeProofDetailSpots } from '../../../data/homeProofFrame';
import type { DetailId } from '../ProofDetails';

// «Камера наближається до вузла» (owner, 07.11: «Давай також реалізуємо ідеї» — the prototype of 06.11, proto-3-node-camera,
// lifts for this one change the ui-system §6.9 freeze on the node's opening). A node opened, the seam glides to one place
// (home-v2.css: --hv2-cam-split on the four that carry it, so the range keeps the visitor's own split), and only the
// scheme's canvas right of it moves: a transform of that canvas with its origin on the node's ring, scaled in until the
// ring stands just right of the seam; the rest of the frame dims, and the node's card stands beside the ring on the same
// side. ‹ › fly the camera from node to node with a slight pull-back, the seam still. Closed, it all eases back to rest.
// The scheme never goes over the photo: the canvas lives in the right side's window (.hv2-contour-pane, overflow hidden)
// and moves inside it only.
//
// The move starts in the press's own task (showNode calls aim before React commits), so its first frame is the press's
// first frame; the card, the heavy part, mounts a frame later (useNodeDetail's cardOn). The prototype, which answered the
// commit from a MutationObserver, started 250–300 ms late.

const { width: PHOTO_W } = homeProofContour.photo;
/** The card's width on a laptop, and the least it gives up to a narrower frame (the prototype: 540 × 360) */
const CARD_W = 540;
const CARD_MIN = 360;
/** Air between the seam, the ring, the card and the frame's edge, px */
const GAP = 26;
const EDGE = 14;
/** How far the camera pulls back on its way from node to node, as a share of its scale (2.4 → 1.68: the prototype's 1.7) */
const PULL = 0.7;

export type Shot = Readonly<{
  id: DetailId;
  /** the ring's centre in the canvas's own px — the transform's origin */
  origin: { x: number; y: number };
  translate: { x: number; y: number };
  scale: number;
  /** where the ring lands, and how large, in the stage's px */
  target: { x: number; y: number };
  ring: number;
  /** the card's column on a laptop's frame; none on a phone's sheet */
  card: { x: number; width: number } | null;
  size: { width: number; height: number };
}>;

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** A time of home-v2.css's choreography, ms */
const msOf = (element: Element, name: string) => {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
};
/** Commits the element's style now (a style read forces it): a transition set after starts from what it shows then */
const commitStyle = (element: Element) => getComputedStyle(element).transform;
const transformOf = ({ translate, scale }: Pick<Shot, 'translate' | 'scale'>) =>
  `translate(${translate.x.toFixed(2)}px, ${translate.y.toFixed(2)}px) scale(${scale})`;

/** The shot that brings a node's ring to its place: the stage's size and the canvas's offset read now */
function shotOf(id: DetailId, stage: HTMLElement, canvas: HTMLElement, sheet: boolean): Shot {
  const style = getComputedStyle(stage);
  const scale = Number.parseFloat(style.getPropertyValue('--hv2-cam-scale')) || 2.4;
  const split = Number.parseFloat(style.getPropertyValue('--hv2-cam-split')) || 0;
  const spot = homeProofDetailSpots.find((entry) => entry.id === id)!;
  const [width, height] = [stage.clientWidth, stage.clientHeight];
  const k = canvas.offsetWidth / PHOTO_W;
  const origin = { x: spot.ring[0] * k, y: spot.ring[1] * k };
  const ring = spot.radius * k * scale;
  const seam = (width * split) / 100;
  let target: Shot['target'];
  let card: Shot['card'] = null;
  if (sheet) {
    // a phone's sheet covers the frame's foot: the ring a little over the middle of the whole scheme (the seam at 0)
    target = { x: width / 2, y: height * 0.42 };
  } else {
    // the card at the frame's right edge, as wide as the room right of the ring allows; the ring halfway between it and
    // the seam
    const cardWidth = Math.round(Math.min(CARD_W, Math.max(CARD_MIN, width - seam - 2 * ring - 3 * GAP - EDGE)));
    const cardX = width - EDGE - cardWidth;
    const x = Math.min(Math.max((seam + cardX) / 2, seam + GAP + ring), cardX - GAP - ring);
    target = { x: Number.isFinite(x) ? x : (seam + cardX) / 2, y: height / 2 };
    card = { x: cardX, width: cardWidth };
  }
  return {
    id, origin, scale, target, ring, card, size: { width, height },
    translate: { x: target.x - canvas.offsetLeft - origin.x, y: target.y - canvas.offsetTop - origin.y },
  };
}

/** The camera over the scheme: `aim` a node (from rest, or flying from the one shown), `rest` back. `onRest`: told once the
 *  stage is at rest again — what is measured on the scheme (useLabelFit) is measured again then, not on the moved canvas */
export function useNodeCamera(stageRef: RefObject<HTMLDivElement | null>, canvasRef: RefObject<HTMLDivElement | null>, onRest?: () => void) {
  const shotRef = useRef<Shot | null>(null);
  const restRef = useRef(onRest);
  useEffect(() => {
    restRef.current = onRest;
  });
  const flight = useRef<Animation | null>(null);
  const settle = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(settle.current), []);

  const veil = () => stageRef.current?.querySelector<HTMLElement>('.hv2-camera-veil');
  const place = (shot: Shot) => {
    const canvas = canvasRef.current!;
    canvas.style.transformOrigin = `${shot.origin.x.toFixed(2)}px ${shot.origin.y.toFixed(2)}px`;
    canvas.style.transform = transformOf(shot);
    veil()?.style.setProperty('--at', `${shot.target.x.toFixed(1)}px ${shot.target.y.toFixed(1)}px`);
  };

  /** What the canvas shows now — mid-move included — as a translate and a scale about `origin` */
  const nowAbout = (canvas: HTMLElement, from: Shot, origin: Shot['origin']) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(canvas).transform);
    // the computed matrix is about the origin in force (from's): moved to another origin, the same picture is the
    // translate t + (1 − s)(o₁ − o₂)
    const scale = matrix.a || 1;
    return {
      scale,
      translate: { x: matrix.e + (1 - scale) * (from.origin.x - origin.x), y: matrix.f + (1 - scale) * (from.origin.y - origin.y) },
    };
  };

  const fly = (stage: HTMLElement, canvas: HTMLElement, from: Shot, to: Shot) => {
    const now = nowAbout(canvas, from, to.origin);
    flight.current?.cancel();
    // the move between two nodes: the camera's own move, so no transition under it (home-v2.css, data-camera="fly")
    stage.dataset.camera = 'fly';
    place(to);
    // halfway, pulled back, the point halfway between the two rings at the ring's place
    const pull = Math.max(1.2, to.scale * PULL);
    const middle = { x: (from.origin.x + to.origin.x) / 2, y: (from.origin.y + to.origin.y) / 2 };
    const at = { x: to.target.x - canvas.offsetLeft, y: to.target.y - canvas.offsetTop };
    const half = { x: at.x - to.origin.x - pull * (middle.x - to.origin.x), y: at.y - to.origin.y - pull * (middle.y - to.origin.y) };
    const root = document.documentElement;
    const animation = canvas.animate(
      [{ transform: transformOf(now) }, { transform: transformOf({ translate: half, scale: pull }), offset: 0.5 }, { transform: transformOf(to) }],
      { duration: msOf(root, '--hv2-for-cam-fly'), easing: getComputedStyle(root).getPropertyValue('--ease-plot').trim() || 'ease' },
    );
    flight.current = animation;
    animation.onfinish = () => {
      if (flight.current !== animation) return;
      flight.current = null;
      if (stage.dataset.camera === 'fly') stage.dataset.camera = 'in';
    };
  };

  /** The camera onto a node. `sheet`: a phone's sheet covers the frame's foot */
  const aim = (id: DetailId, sheet: boolean) => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const from = shotRef.current;
    const was = stage.dataset.camera;
    const there = was === 'in' || was === 'fly';
    // the same node, the same frame: already there, or on its way (the press aimed it before React's layout effect does)
    if (from?.id === id && there && from.size.width === stage.clientWidth && from.size.height === stage.clientHeight) return;
    window.clearTimeout(settle.current);
    const to = shotOf(id, stage, canvas, sheet);
    shotRef.current = to;
    if (from && from.id !== id && there && !still()) return fly(stage, canvas, from, to);
    flight.current?.cancel();
    flight.current = null;
    if (from?.id === id && there) {
      // the same node again — the frame resized: straight there, no glide
      stage.dataset.camera = 'fly';
      place(to);
      requestAnimationFrame(() => {
        if (stage.dataset.camera === 'fly' && !flight.current) stage.dataset.camera = 'in';
      });
      return;
    }
    // from rest (or on the way back): the canvas's transition takes it there (home-v2.css)
    stage.dataset.camera = 'in';
    place(to);
  };

  /** Back to rest: the canvas, the seam and the veils ease back, and then the stage is as it was before the first open */
  const rest = () => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas || !stage.dataset.camera || stage.dataset.camera === 'out') return;
    const from = shotRef.current;
    if (flight.current && from) {
      // a flight cut short: its picture now becomes the transition's start
      const now = nowAbout(canvas, from, from.origin);
      flight.current.cancel();
      flight.current = null;
      stage.dataset.camera = 'fly';
      canvas.style.transform = transformOf(now);
      commitStyle(canvas);
    }
    shotRef.current = null;
    stage.dataset.camera = 'out';
    canvas.style.transform = '';
    const done = () => {
      if (stage.dataset.camera !== 'out') return;
      delete stage.dataset.camera;
      // (and no empty style attribute left behind: the stage as it was before the first open, byte for byte)
      canvas.style.removeProperty('transform');
      canvas.style.removeProperty('transform-origin');
      if (!canvas.style.length) canvas.removeAttribute('style');
      const shade = veil();
      shade?.style.removeProperty('--at');
      if (shade && !shade.style.length) shade.removeAttribute('style');
      // told once the canvas has really come back: with reduced motion its transform still eases out over the site's
      // .01 ms, which starts with the next frame
      void Promise.all(canvas.getAnimations().map((animation) => animation.finished.catch(() => undefined))).then(() => {
        if (!stage.dataset.camera) restRef.current?.();
      });
    };
    if (still()) return done();
    settle.current = window.setTimeout(done, msOf(document.documentElement, '--hv2-for-cam-out') + 60);
  };

  return { aim, rest, shotRef };
}
