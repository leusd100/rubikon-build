import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from 'react';
import { PROOF_DETAILS, type DetailId } from '../ProofDetails';
import { clamp } from './useSeam';

/** A node opens as a sheet from the screen's foot up to a narrow tablet: in a 768 px frame its drawing had to shrink to
 *  unreadable to fit the panel (QA 09.10) */
export const sheetNow = () => window.matchMedia('(max-width: 900px)').matches;
const stillNow = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** A node opening (owner, 05.10: «плавний перехід від вузла до збільшеної моделі»): the panel grows out of its ring on the
 *  scheme, a disc as small as the ring, to its place, and the node is put together in it part by part (ProofDetails).
 *  Closing, it shrinks back into the ring */
const NODE_GROW = { duration: 480, easing: 'cubic-bezier(.2, .75, .25, 1)' } as const;
const NODE_SHRINK = { duration: 300, easing: 'cubic-bezier(.45, 0, .7, .4)', fill: 'forwards' } as const;
/** A node's ring and the seam (owner, 05.10: on «А» the seam stood across it, the handle over it): the seam stops this
 *  far past the handle's half width from the ring, on the scheme's side of it or — «На фото» — past it */
const NODE_CLEAR = 12;
/** A swipe across a phone's sheet: this far, and mostly sideways */
const SWIPE_MIN = 48;
/** «Зібрати» after «Розібрати»: the parts back in place (proof-details.css: 650 ms, 80 ms apart, up to seven) before the
 *  load's way shows again */
const REASSEMBLE_MS = 650 + 6 * 80 + 120;
/** …and the assembly's own longest run (proof-details.css: the names in at 360 ms + six steps of 260 ms + 260 ms, for
 *  360 ms): should its end never be heard — a hidden tab holds animations — the way shows after this */
const ASSEMBLY_MS = 360 + 1560 + 260 + 360 + 160;
/** The transform that puts a panel onto a ring: its centre on the ring's, as wide as the ring */
function ontoRing(ring: Element, panel: HTMLElement) {
  const [a, b] = [ring.getBoundingClientRect(), panel.getBoundingClientRect()];
  if (!a.width || !b.width) return null;
  const scale = Math.max(a.width / b.width, 0.04);
  return `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${scale})`;
}

/** A node's ring on the scheme */
const ringIn = (stage: HTMLElement | null, id: DetailId) => stage?.querySelector(`.hv2-proof-detail-rings [data-detail="${id}"]`) ?? null;

type Seam = Readonly<{
  liveRef: RefObject<number>;
  handleRef: RefObject<HTMLSpanElement | null>;
  setSplit: Dispatch<SetStateAction<number>>;
}>;

/** The node open (А–Д, ProofDetails): its panel grown out of its ring and called out to it, the seam stood clear of the
 *  ring, the focus taken to it and given back, and on a phone the sheet over the page */
export function useNodeDetail(stageRef: RefObject<HTMLDivElement | null>, rangeRef: RefObject<HTMLInputElement | null>, { liveRef, handleRef, setSplit }: Seam) {
  // The detail open (А, Б, В)
  const [detail, setDetail] = useState<DetailId | null>(null);
  // On a phone the frame is too low for a drawing: the node opens as a sheet from the screen's foot, over the page
  const [detailSheet, setDetailSheet] = useState(false);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  // A detail opened takes the focus to its close; Esc, or the close, gives it back to its letter
  const detailPinsRef = useRef<Partial<Record<DetailId, HTMLButtonElement | null>>>({});
  const detailRef = useRef<HTMLDialogElement>(null);
  // «Куди йде навантаження»: the load's way through the node, kept on from node to node once asked for
  const [flowOn, setFlowOn] = useState(false);
  // «Розібрати»: the node's parts drawn apart, named (back together on another node); «На фото»: the seam past the ring,
  // so the node is ringed on the photo (kept from node to node)
  const [exploded, setExploded] = useState(false);
  const [nodeOnPhoto, setNodeOnPhoto] = useState(false);
  // The node put together: its load's way only then (owner, 05.10: on the next node it ran while the parts were still
  // coming in) — on the names' arrival, the assembly's last beat, or once the parts are back after «Зібрати»
  const [assembled, setAssembled] = useState(false);
  const assembledTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(assembledTimer.current), []);
  // Moving to the next or the previous node: the drawing slides in from that side instead of the panel growing again
  const nodeSwitch = useRef<-1 | 0 | 1>(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  // the tour moves the focus nowhere (audit 08.10, F13: it took it to «Закрити вузол», then to a letter)
  const touringRef = useRef(false);
  // (and the node the arrival opens by itself: no focus moved, the visitor did nothing)
  const quietOpenRef = useRef(false);
  // Where the seam was before a node took it onto its ring, and where it put it (restored on closing, unless moved)
  const nodeSeam = useRef<{ from: number; at: number } | null>(null);
  // The leader from the open panel to its ring on the scheme, as a drawing's detail is called out
  const leaderRef = useRef<SVGPathElement>(null);
  const leaderDotRef = useRef<SVGCircleElement>(null);
  const detailMotion = useRef<Animation | null>(null);
  const ringOf = (id: DetailId) => ringIn(stageRef.current, id);
  // Opening (and switching to another node): out of its ring, before the first paint so it never flashes in place
  useLayoutEffect(() => {
    const panel = detailRef.current;
    const ring = detail && ringIn(stageRef.current, detail);
    const step = nodeSwitch.current;
    nodeSwitch.current = 0;
    if (!panel || !ring || stillNow()) return;
    if (step) {
      panel.querySelector('.hv2-detail-drawing')?.animate(
        [{ transform: `translateX(${step * 36}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 320, easing: 'cubic-bezier(.2, .75, .25, 1)' },
      );
      return;
    }
    detailMotion.current?.cancel();
    const from = ontoRing(ring, panel);
    if (!from) return;
    detailMotion.current = panel.animate(
      [{ transform: from, opacity: 0.35, borderRadius: '50%' }, { transform: 'none', opacity: 1, borderRadius: '0' }],
      NODE_GROW,
    );
  }, [stageRef, detail, detailSheet]);
  // The leader: from the panel's right edge at its title, a short level run, then straight to the ring's edge — measured
  // on the panel's own layout (not its growing transform) and again when the frame resizes; none on a phone's sheet
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const panel = detailRef.current;
    if (!detail || detailSheet || !stage || !panel) return;
    const measure = () => {
      const ring = ringIn(stage, detail);
      const path = leaderRef.current;
      if (!ring || !path) return;
      const box = stage.getBoundingClientRect();
      const r = ring.getBoundingClientRect();
      const [px, py] = [panel.offsetLeft + panel.offsetWidth, panel.offsetTop + 22];
      const [cx, cy, radius] = [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top, r.width / 2];
      const ex = px + 16;
      const length = Math.hypot(ex - cx, py - cy) || 1;
      const [tx, ty] = [cx + ((ex - cx) / length) * radius, cy + ((py - cy) / length) * radius];
      path.setAttribute('d', `M${px.toFixed(1)} ${py.toFixed(1)}H${ex.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}`);
      leaderDotRef.current?.setAttribute('cx', tx.toFixed(1));
      leaderDotRef.current?.setAttribute('cy', ty.toFixed(1));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stageRef, detail, detailSheet]);
  // Where the seam stands for a node: clear of its ring by the handle's half width and NODE_CLEAR — before it, the ring
  // whole on the scheme, or past it («На фото»), the ring whole on the photo and ringed there. Where the frame's edge
  // holds the handle back onto the ring (the right gable corner, on the photo), the handle steps down or up off it
  const placeSeam = (id: DetailId, onPhoto: boolean) => {
    const stage = stageRef.current;
    const ring = ringOf(id);
    const handle = handleRef.current;
    if (!stage || !ring) return;
    const box = stage.getBoundingClientRect();
    const r = ring.getBoundingClientRect();
    const half = (handle?.offsetWidth || 44) / 2;
    const x = onPhoto ? r.right + half + NODE_CLEAR : r.left - half - NODE_CLEAR;
    const at = clamp(((x - box.left) / box.width) * 100);
    nodeSeam.current = { from: nodeSeam.current?.from ?? liveRef.current, at };
    setSplit(at);
    if (!handle) return;
    const handleX = Math.min(Math.max((at / 100) * box.width, half), box.width - half);
    const [cx, cy, radius] = [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top, r.width / 2];
    const middle = box.height / 2;
    if (Math.hypot(handleX - cx, middle - cy) >= radius + half + NODE_CLEAR) return handle.style.removeProperty('--handle-y');
    const below = cy + radius + half + NODE_CLEAR;
    handle.style.setProperty('--handle-y', `${Math.round(below + half <= box.height ? below : cy - radius - half - NODE_CLEAR)}px`);
  };
  // A node opened (owner, 05.10: «позначка вузла на фото»); pressed again, it closes. `step`: reached by ‹ › or a swipe
  const showNode = (id: DetailId, step: -1 | 0 | 1 = 0) => {
    if (detail === id && !step) return closeDetail();
    if (!detail && !step) nodeSeam.current = null;
    nodeSwitch.current = detail ? step : 0;
    setExploded(false);
    window.clearTimeout(assembledTimer.current);
    setAssembled(stillNow());
    assembledTimer.current = window.setTimeout(() => setAssembled(true), ASSEMBLY_MS);
    placeSeam(id, nodeOnPhoto);
    setDetailSheet(sheetNow());
    setDetail(id);
  };
  // The next node or the previous one, round the five
  const stepNode = (by: -1 | 1) => {
    if (!detail) return;
    const at = PROOF_DETAILS.findIndex((entry) => entry.id === detail);
    showNode(PROOF_DETAILS[(at + by + PROOF_DETAILS.length) % PROOF_DETAILS.length].id, by);
  };
  // A finger swiped across the sheet: on to the next node, or back
  const onSheetDown = (event: PointerEvent<HTMLElement>) => {
    swipe.current = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
  };
  const onSheetUp = (event: PointerEvent<HTMLElement>) => {
    const from = swipe.current;
    swipe.current = null;
    if (!from) return;
    const [dx, dy] = [event.clientX - from.x, event.clientY - from.y];
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) stepNode(dx < 0 ? 1 : -1);
  };
  const onSheetCancel = () => { swipe.current = null; };
  // Closing: back into its ring, then gone; the seam back where it was; the focus to its letter
  const closeDetail = () => {
    const was = detail;
    const done = () => {
      const seam = nodeSeam.current;
      nodeSeam.current = null;
      handleRef.current?.style.removeProperty('--handle-y');
      setExploded(false);
      if (seam && Math.abs(liveRef.current - seam.at) < 0.5) setSplit(seam.from);
      setDetail(null);
      // the focus back on its letter — or, where the scheme's letter has given way (data-cut), on the bar's
      const pin = was ? detailPinsRef.current[was] : null;
      if (touringRef.current) return;
      if (pin && pin.dataset.cut === undefined) pin.focus({ preventScroll: true });
      else if (was) {
        // the letter given way: the title block's row while «Каркас» shows it, else — a frame on, once the cut is read
        // again — the letter, else the seam's range (review 09.10: the focus fell to <body>)
        const sheet = stageRef.current?.closest('figure');
        const inRow = sheet?.querySelector<HTMLButtonElement>(`.hv2-contour-nodes[data-place="block"] button[aria-label^="Вузол ${PROOF_DETAILS.find((entry) => entry.id === was)?.letter}:"]`);
        if (inRow?.checkVisibility({ visibilityProperty: true })) inRow.focus({ preventScroll: true });
        else {
          requestAnimationFrame(() => {
            if (pin && pin.dataset.cut === undefined && pin.offsetParent) pin.focus({ preventScroll: true });
            else rangeRef.current?.focus({ preventScroll: true });
          });
        }
      }
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
    if (!touringRef.current && !quietOpenRef.current) detailCloseRef.current?.focus({ preventScroll: true });
    quietOpenRef.current = false;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeDetailRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [detail]);
  // A phone's node sheet holds the page still under it (audit 08.10, F18: a finger on it scrolled the page away)
  useEffect(() => {
    if (!detail || !detailSheet) return;
    const roots = [document.documentElement, document.body];
    const was = roots.map((root) => root.style.overflow);
    for (const root of roots) root.style.overflow = 'hidden';
    return () => roots.forEach((root, index) => { root.style.overflow = was[index]; });
  }, [detail, detailSheet]);

  // «Розібрати» / «Зібрати»: the parts apart, or back in place before the load's way shows again
  const toggleExploded = () => {
    window.clearTimeout(assembledTimer.current);
    if (exploded && !stillNow()) {
      setAssembled(false);
      assembledTimer.current = window.setTimeout(() => setAssembled(true), REASSEMBLE_MS);
    }
    setExploded((on) => !on);
  };
  // «На фото»: the seam past the ring, or back before it
  const toggleOnPhoto = (id: DetailId) => {
    placeSeam(id, !nodeOnPhoto);
    setNodeOnPhoto((on) => !on);
  };
  // the assembly's last beat (proof-details.css): the names in
  const onAssembled = () => setAssembled(true);

  return {
    detail, setDetail, detailSheet, flowOn, setFlowOn, exploded, nodeOnPhoto, assembled,
    detailRef, detailCloseRef, detailPinsRef, leaderRef, leaderDotRef, touringRef, quietOpenRef,
    ringOf, showNode, stepNode, closeDetail, onSheetDown, onSheetUp, onSheetCancel, toggleExploded, toggleOnPhoto, onAssembled,
  };
}
