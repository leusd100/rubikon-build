import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from 'react';
import { homeProofContour } from '../../../data/homeProofContour';
import { homeProofDetailSpots } from '../../../data/homeProofFrame';
import { PROOF_DETAILS, type DetailId } from '../ProofDetails';
import { useNodeCamera, type Shot } from './useNodeCamera';
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
/** …and with the camera (07.11), the card fades where it stands while the camera eases back, ms */
const CARD_OUT = 160;
/** A node's ring and the seam «На фото» (owner, 05.10: on «А» the seam stood across it, the handle over it): the seam
 *  stops this far past the handle's half width from the ring, on the photo's side of it */
const NODE_CLEAR = 12;
/** A swipe across a phone's sheet: this far, and mostly sideways */
const SWIPE_MIN = 48;
/** The card's top under the stamp's first line, and the card's own edges, px */
const STAMP_AIR = 10;
const CARD_EDGE = 14;
/** The leader from the ring to the card: where it meets the card, at least this far in from the card's corners, px */
const LEADER_IN = 22;
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
  /** the scheme's canvas, right of the seam: the camera moves it */
  canvasRef: RefObject<HTMLDivElement | null>;
  /** told when the camera is back at rest (useNodeCamera) */
  onCameraRest?: () => void;
}>;

/** A node's ring where it stands at rest, in the stage's px: read off the data and the canvas's layout, not the ring's box
 *  — the camera may still be on its way in or out */
function restRing(canvas: HTMLElement, id: DetailId) {
  const { ring: [x, y], radius } = homeProofDetailSpots.find((entry) => entry.id === id)!;
  const k = canvas.offsetWidth / homeProofContour.photo.width;
  return { cx: canvas.offsetLeft + x * k, cy: canvas.offsetTop + y * k, radius: radius * k };
}

/** The card beside its ring on a laptop's frame (useNodeCamera's shot): its column, and its top under the stamp's first
 *  line, centred on the ring where it can be; the drawing in it gives way to the height left (home-v2.css) */
function placeCard(stage: HTMLElement, panel: HTMLElement, shot: Shot) {
  if (!shot.card) return null;
  panel.style.left = `${shot.card.x}px`;
  panel.style.width = `${shot.card.width}px`;
  panel.style.removeProperty('top');
  panel.style.removeProperty('max-height');
  const height = shot.size.height;
  const stamp = stage.querySelector<HTMLElement>('.hv2-contour-stamp');
  const box = stage.getBoundingClientRect();
  const stampBox = stamp?.checkVisibility() ? stamp.getBoundingClientRect() : null;
  const least = stampBox && stampBox.left - box.left < shot.card.x + shot.card.width ? stampBox.bottom - box.top + STAMP_AIR : CARD_EDGE;
  const tall = Math.min(panel.offsetHeight, height - least - CARD_EDGE);
  const top = Math.round(Math.min(Math.max(shot.target.y - tall / 2, least), height - tall - CARD_EDGE));
  panel.style.top = `${top}px`;
  panel.style.maxHeight = `${height - top - CARD_EDGE}px`;
  return { top, bottom: top + tall };
}

/** The node open (А–Д, ProofDetails): the camera on it and its card beside the ring (useNodeCamera) — «На фото», its
 *  panel grown out of its ring over the photo's corner, the seam past the ring — the focus taken to it and given back,
 *  and on a phone or a narrow tablet the sheet over the page */
export function useNodeDetail(stageRef: RefObject<HTMLDivElement | null>, rangeRef: RefObject<HTMLInputElement | null>, { liveRef, handleRef, setSplit, canvasRef, onCameraRest }: Seam) {
  // The node open (А–Д)
  const [detail, setDetail] = useState<DetailId | null>(null);
  // Its card is in the page: opened from rest with the camera, a frame after the press — the camera's first frame is not
  // held for the card's commit (a dialog and its drawing: on production the press's frame took 85–89 ms, 32 of them the
  // card's layout and text shaping — Chrome, 1440 × 900, 07.11)
  const [cardOn, setCardOn] = useState(false);
  const cardTimer = useRef<{ frame: number; timer: number | undefined }>({ frame: 0, timer: undefined });
  useEffect(() => () => {
    cancelAnimationFrame(cardTimer.current.frame);
    window.clearTimeout(cardTimer.current.timer);
  }, []);
  const camera = useNodeCamera(stageRef, canvasRef, onCameraRest);
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
  const assemblyRun = useRef(0);
  // Read the committed drawing's animations: elapsed wall time cannot prove a delayed or paused assembly finished.
  useLayoutEffect(() => {
    const panel = detailRef.current;
    const drawing = panel?.querySelector('.hv2-detail-drawing');
    if (!detail || exploded || !panel || !drawing) return;
    let active = true;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const complete = async () => {
      const run = assemblyRun.current;
      // Flow/assembly opacity transitions react to data-flow itself; only the members and their names gate readiness.
      const animations = [...drawing.querySelectorAll('.hv2-detail-part, .hv2-detail-callouts, .hv2-detail-part-shift, .hv2-detail-zoom, .hv2-detail-names-wrap')]
        .flatMap((element) => element.getAnimations())
        .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity);
      try {
        await Promise.all(animations.map((animation) => animation.finished));
      } catch {
        // A cancelled drawing belongs to an interrupted run, never to the next node or reassembly.
        return;
      }
      if (active && run === assemblyRun.current && drawing === detailRef.current?.querySelector('.hv2-detail-drawing')) {
        setAssembled(true);
      }
    };
    void complete();
    // Switching reduced motion removes the CSS animations; inspect the new rendered state instead of a rejected run.
    const changeMotion = () => {
      assemblyRun.current += 1;
      setAssembled(motion.matches);
      void complete();
    };
    motion.addEventListener('change', changeMotion);
    return () => {
      active = false;
      motion.removeEventListener('change', changeMotion);
    };
  }, [detail, exploded, cardOn]);
  // Moving to the next or the previous node: the drawing slides in from that side instead of the panel growing again
  const nodeSwitch = useRef<-1 | 0 | 1>(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  // the tour moves the focus nowhere (audit 08.10, F13: it took it to «Закрити вузол», then to a letter)
  const touringRef = useRef(false);
  // Where the seam was before a node took it past its ring («На фото»), and where it put it (restored on closing, unless
  // moved)
  const nodeSeam = useRef<{ from: number; at: number } | null>(null);
  // The leader from the open panel to its ring on the scheme, as a drawing's detail is called out
  const leaderRef = useRef<SVGPathElement>(null);
  const leaderDotRef = useRef<SVGCircleElement>(null);
  const detailMotion = useRef<Animation | null>(null);
  // A close under way: the card's fade, or the panel's shrink into its ring — its end puts the node away
  const closingRef = useRef(false);
  const ringOf = (id: DetailId) => ringIn(stageRef.current, id);
  // The camera's node (07.11): every open but «На фото», where the node is looked for on the photo at the scheme's own
  // scale, the panel over the photo's corner and called out to the ring as before
  const cameraOn = !nodeOnPhoto;
  const cardShown = Boolean(detail && cardOn);
  // Opening (and switching to another node): out of its ring, before the first paint so it never flashes in place. With
  // the camera the camera is the move: the card comes in beside the ring as it lands (home-v2.css), and on a switch the
  // drawing slides in as before
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
    if (cameraOn && !detailSheet) return;
    detailMotion.current?.cancel();
    const from = ontoRing(ring, panel);
    if (!from) return;
    detailMotion.current = panel.animate(
      [{ transform: from, opacity: 0.35, borderRadius: '50%' }, { transform: 'none', opacity: 1, borderRadius: '0' }],
      NODE_GROW,
    );
    // (cameraOn is read as it is now: switching «На фото» moves no panel out of a ring)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageRef, detail, detailSheet, cardShown]);
  // The camera follows the node open — the press already started it (showNode); this keeps it so whatever closed or
  // switched the node (a layer, «Як це будується», a scope's cell, the tour)
  useLayoutEffect(() => {
    if (detail && cameraOn) camera.aim(detail, detailSheet);
    else camera.rest();
    // (camera's functions are the render's own; the effect answers the node, the sheet and «На фото» only)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, detailSheet, cameraOn]);
  // The card's place and the leader. With the camera (a laptop's frame): the card in its column beside the ring's landing
  // place and a short leader from the ring's edge to it — never across the photo. «На фото»: from the panel's right edge
  // at its title, a short level run, then straight to the ring's edge, measured on the panel's own layout (not its
  // growing transform). Again when the frame resizes. A phone's sheet has neither, but its camera aims again too (review
  // 07.11: a phone turned to 844 × 390 kept the upright shot, Б's ring 674 px into a 735 px frame)
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const panel = detailRef.current;
    if (!detail || !cardShown || !stage || !panel) return;
    const measure = () => {
      const path = leaderRef.current;
      if (cameraOn) {
        // the frame resized: the camera re-aimed, straight (useNodeCamera), for the node as it was opened — beside its
        // card, or over a sheet
        const old = camera.shotRef.current;
        if (old && (old.size.width !== stage.clientWidth || old.size.height !== stage.clientHeight)) camera.aim(detail, detailSheet);
        if (detailSheet) return;
        const shot = camera.shotRef.current;
        const card = shot && placeCard(stage, panel, shot);
        if (!shot || !card || !path) return;
        const [x0, y0] = [shot.target.x + shot.ring + 3, shot.target.y];
        const y = Math.min(Math.max(y0, card.top + LEADER_IN), card.bottom - LEADER_IN);
        const x = shot.card!.x;
        path.setAttribute('d', `M${x0.toFixed(1)} ${y0.toFixed(1)}L${(x - 12).toFixed(1)} ${y.toFixed(1)}H${x.toFixed(1)}`);
        leaderDotRef.current?.setAttribute('cx', x0.toFixed(1));
        leaderDotRef.current?.setAttribute('cy', y0.toFixed(1));
        return;
      }
      if (detailSheet) return;
      for (const name of ['left', 'top', 'width', 'max-height']) panel.style.removeProperty(name);
      const canvas = canvasRef.current;
      if (!canvas || !path) return;
      const [px, py] = [panel.offsetLeft + panel.offsetWidth, panel.offsetTop + 22];
      const { cx, cy, radius } = restRing(canvas, detail);
      const ex = px + 16;
      const length = Math.hypot(ex - cx, py - cy) || 1;
      const [tx, ty] = [cx + ((ex - cx) / length) * radius, cy + ((py - cy) / length) * radius];
      path.setAttribute('d', `M${px.toFixed(1)} ${py.toFixed(1)}H${ex.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}`);
      leaderDotRef.current?.setAttribute('cx', tx.toFixed(1));
      leaderDotRef.current?.setAttribute('cy', ty.toFixed(1));
    };
    measure();
    let frame = 0;
    // (a resize's measure waits for its frame: the observer's first call is the observe itself, and a re-aim under it
    // would cut the camera's way in short)
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(stage);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageRef, detail, detailSheet, cardShown, cameraOn]);
  // Where the seam stands for a node «На фото»: past its ring by the handle's half width and NODE_CLEAR, the ring whole on
  // the photo and ringed there. Where the frame's edge holds the handle back onto the ring (the right gable corner), the
  // handle steps down or up off it
  const placeSeam = (id: DetailId) => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const handle = handleRef.current;
    if (!stage || !canvas) return;
    const [width, height] = [stage.clientWidth, stage.clientHeight];
    const { cx, cy, radius } = restRing(canvas, id);
    const half = (handle?.offsetWidth || 44) / 2;
    const at = clamp(((cx + radius + half + NODE_CLEAR) / width) * 100);
    nodeSeam.current = { from: nodeSeam.current?.from ?? liveRef.current, at };
    setSplit(at);
    if (!handle) return;
    const handleX = Math.min(Math.max((at / 100) * width, half), width - half);
    if (Math.hypot(handleX - cx, height / 2 - cy) >= radius + half + NODE_CLEAR) return handle.style.removeProperty('--handle-y');
    const below = cy + radius + half + NODE_CLEAR;
    handle.style.setProperty('--handle-y', `${Math.round(below + half <= height ? below : cy - radius - half - NODE_CLEAR)}px`);
  };
  // A node opened (owner, 05.10: «позначка вузла на фото»); pressed again, it closes. `step`: reached by ‹ › or a swipe
  const showNode = (id: DetailId, step: -1 | 0 | 1 = 0) => {
    if (closingRef.current) {
      // pressed while the node open is going out (its card's fade, a sheet's or «На фото»'s shrink): that close is called
      // off — its end would put away the node pressed now, the focus falling to <body> (review 07.11); cancelled, the
      // fade's or the shrink's forwards fill goes with it
      closingRef.current = false;
      detailMotion.current?.cancel();
      detailMotion.current = null;
      if (detail === id && !step) {
        // the same node again: as it was, the camera back on it
        if (cameraOn) camera.aim(id, detailSheet);
        if (!touringRef.current) detailCloseRef.current?.focus({ preventScroll: true });
        return;
      }
    }
    if (detail === id && !step) return closeDetail();
    if (!detail && !step) nodeSeam.current = null;
    nodeSwitch.current = detail ? step : 0;
    setExploded(false);
    assemblyRun.current += 1;
    setAssembled(stillNow());
    const sheet = sheetNow();
    // the camera moves now, in the press's own task (useNodeCamera); «На фото» moves the seam instead
    if (cameraOn) camera.aim(id, sheet);
    else placeSeam(id);
    setDetailSheet(sheet);
    setDetail(id);
    // the card a frame later, opened from rest with the camera (cardOn); on a switch it is there already
    const timers = cardTimer.current;
    cancelAnimationFrame(timers.frame);
    window.clearTimeout(timers.timer);
    if (detail || !cameraOn || stillNow()) {
      setCardOn(true);
      return;
    }
    setCardOn(false);
    timers.frame = requestAnimationFrame(() => {
      timers.timer = window.setTimeout(() => setCardOn(true), 0);
    });
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
  // The node gone, nothing of it left behind: «На фото» is kept from node to node, not from one open to the next (the next
  // open is the camera's again), and the seam it took goes back where it was, unless moved since
  const reset = () => {
    closingRef.current = false;
    const timers = cardTimer.current;
    cancelAnimationFrame(timers.frame);
    window.clearTimeout(timers.timer);
    const seam = nodeSeam.current;
    nodeSeam.current = null;
    handleRef.current?.style.removeProperty('--handle-y');
    setExploded(false);
    setNodeOnPhoto(false);
    setCardOn(false);
    if (seam && Math.abs(liveRef.current - seam.at) < 0.5) setSplit(seam.from);
    setDetail(null);
  };
  // Put away at once, by whatever takes the block over — a layer, «Як це будується», a scope's cell: the same reset as a
  // close's end (review 07.11: a bare setDetail(null) kept «На фото» on for the next open, with no camera, and the seam
  // where the node had taken it), and a close under way called off
  const dropDetail = () => {
    assemblyRun.current += 1;
    detailMotion.current?.cancel();
    detailMotion.current = null;
    if (detail) reset();
  };
  // Closing: with the camera, the camera eases back at once and the card fades where it stands (shrunk into its ring, it
  // would cross the seam onto the photo); a phone's sheet and «На фото» back into the ring, as before. Then gone; the
  // seam back where it was; the focus to its letter — unless `keepFocus`: put away by a key on the range, the focus
  // stays there
  const close = (keepFocus: boolean) => {
    assemblyRun.current += 1;
    const was = detail;
    const timers = cardTimer.current;
    cancelAnimationFrame(timers.frame);
    window.clearTimeout(timers.timer);
    const done = () => {
      reset();
      // the focus back on its letter — or, where the scheme's letter has given way (data-cut), on the bar's
      const pin = was ? detailPinsRef.current[was] : null;
      if (touringRef.current || keepFocus) return;
      if (pin && pin.dataset.cut === undefined) {
        pin.focus({ preventScroll: true });
        // the letters come back from under the camera with their visibility's transition, which with reduced motion (its
        // .01 ms) starts only with the next frame: hidden till then, a letter takes no focus — it does once that has run,
        // unless the visitor has put the focus somewhere meanwhile
        if (document.activeElement !== pin) {
          const back = pin.parentElement?.getAnimations() ?? [];
          void Promise.all(back.map((animation) => animation.finished.catch(() => undefined))).then(() => {
            if (!document.activeElement || document.activeElement === document.body) pin.focus({ preventScroll: true });
          });
        }
      } else if (was) {
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
    if (was && cameraOn) camera.rest();
    if (was && cameraOn && !detailSheet) {
      if (!panel || stillNow()) return done();
      detailMotion.current?.cancel();
      const fade = panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CARD_OUT, easing: 'ease', fill: 'forwards' });
      detailMotion.current = fade;
      closingRef.current = true;
      let gone = false;
      const finish = () => {
        if (gone || detailMotion.current !== fade) return;
        gone = true;
        done();
      };
      fade.onfinish = finish;
      window.setTimeout(finish, CARD_OUT + 200);
      return;
    }
    const ring = was && ringOf(was);
    if (!panel || !ring || stillNow()) return done();
    detailMotion.current?.cancel();
    const to = ontoRing(ring, panel);
    if (!to) return done();
    const shrink = panel.animate([{ transform: 'none', opacity: 1, borderRadius: '0' }, { transform: to, opacity: 0, borderRadius: '50%' }], NODE_SHRINK);
    detailMotion.current = shrink;
    closingRef.current = true;
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
  const closeDetail = () => close(false);
  const closeKeepingFocus = () => close(true);
  // A point (client px) on the node's card, or where it is coming to stand beside its ring: its box — its wipe-in's
  // clip-path keeps the pointer from it, so a press there met the scheme's canvas for ~450 ms after opening and put the
  // node away (review 07.11) — or, the frame before it is in the page, its column (useNodeCamera's shot)
  const onCard = (clientX: number, clientY: number) => {
    const panel = detailRef.current;
    if (panel) {
      const box = panel.getBoundingClientRect();
      return clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom;
    }
    // (read off the camera, not the render: the press that opened the node may not have been committed yet)
    const column = camera.shotRef.current?.card;
    const stage = stageRef.current;
    if (!column || !stage) return false;
    const left = stage.getBoundingClientRect().left + column.x;
    return clientX >= left && clientX <= left + column.width;
  };
  const closeDetailRef = useRef(closeDetail);
  useEffect(() => {
    closeDetailRef.current = closeDetail;
  });
  // the focus to the card's close once the card is in the page (a frame after the press, opened with the camera)
  useEffect(() => {
    if (detail && cardShown && !touringRef.current) detailCloseRef.current?.focus({ preventScroll: true });
  }, [detail, cardShown]);
  useEffect(() => {
    if (!detail) return;
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
    assemblyRun.current += 1;
    setAssembled(stillNow());
    setExploded((on) => !on);
  };
  // «На фото»: the camera back to rest and the seam past the ring, the ring whole on the photo and ringed there; again, the
  // seam back where it was and the camera onto the node (the camera's layout effect above)
  const toggleOnPhoto = (id: DetailId) => {
    if (!nodeOnPhoto) placeSeam(id);
    else {
      const seam = nodeSeam.current;
      nodeSeam.current = null;
      handleRef.current?.style.removeProperty('--handle-y');
      if (seam && Math.abs(liveRef.current - seam.at) < 0.5) setSplit(seam.from);
    }
    setNodeOnPhoto((on) => !on);
  };

  return {
    detail, dropDetail, detailSheet, cardShown, flowOn, setFlowOn, exploded, nodeOnPhoto, assembled,
    detailRef, detailCloseRef, detailPinsRef, leaderRef, leaderDotRef, touringRef,
    ringOf, showNode, stepNode, closeDetail, closeKeepingFocus, onCard, onSheetDown, onSheetUp, onSheetCancel, toggleExploded, toggleOnPhoto,
  };
}
