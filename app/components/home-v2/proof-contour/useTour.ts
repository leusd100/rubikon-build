import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { queueProofEvent } from '../../../lib/proofAnalytics';
import type { DetailId } from '../ProofDetails';
import type { Layer } from '../ProofContour';
import { AUTO_NODE_EVENT } from './useFirstSweep';
import { DEFAULT_SPLIT } from './useSeam';

/** «Тур за 20 секунд» (owner, 05.10): the block shows itself to whoever presses nothing — the frame put up, the snow, a
 *  weight walking the roof, the wind, the ridge's node with its load, the way on to the brief; each step named and held
 *  this long. Any press or key in the sheet hands it back */
export const TOUR: readonly { name: string; hold: number }[] = [
  { name: 'Каркас збирається', hold: 4800 },
  { name: 'Сніг: куди йде вага', hold: 3600 },
  { name: 'Вага на даху', hold: 3000 },
  { name: 'Вітер: куди тисне', hold: 3600 },
  { name: 'Вузол крупно', hold: 4200 },
  { name: 'Такий, але ваш', hold: 2600 },
];
/** The weight's walk along the roof (photo columns), and how long it takes */
const WALK = { from: 430, to: 1390, ms: 2600 } as const;
/** After the arrival, on a laptop or a tablet, this node opens by itself (owner, 09.10) */
const AUTO_NODE: DetailId = 'ridge';

type Sheet = Readonly<{
  layerRef: RefObject<Layer>;
  /** The visitor's own move in the sheet (useFirstSweep) */
  touchedRef: RefObject<boolean>;
  /** The node's focus moves (useNodeDetail): none while touring, none for the arrival's own node */
  touringRef: RefObject<boolean>;
  quietOpenRef: RefObject<boolean>;
  detail: DetailId | null;
  flowOn: boolean;
  setFlowOn: Dispatch<SetStateAction<boolean>>;
  setSplit: Dispatch<SetStateAction<number>>;
  showNode: (id: DetailId) => void;
  closeDetail: () => void;
  build: () => void;
  choose: (layer: Layer) => void;
  pointAt: (x: number) => void;
}>;

/** «Тур»: one step, then the next after its hold; and the arrival's own node (see AUTO_NODE) */
export function useTour(stageRef: RefObject<HTMLDivElement | null>, sheet: Sheet) {
  const { layerRef, touchedRef, touringRef, quietOpenRef, detail, flowOn, setFlowOn, setSplit, showNode, closeDetail, build, choose, pointAt } = sheet;
  // «Тур»: the step on, its timer, the weight's walk, the load's way as it was before (put back after), the brief's call
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tourTimer = useRef<number | undefined>(undefined);
  const walkFrame = useRef(0);
  const flowBefore = useRef(false);
  const [calling, setCalling] = useState(false);
  const callTimer = useRef<number | undefined>(undefined);
  // the tour's timers reach the render's own functions through this (theirs would be the first render's)
  // (and the node the arrival opens by itself — `node`: no focus moved, no visit counted, the visitor did nothing)
  const tourApi = useRef<{ run: (step: number) => void; end: (restore?: boolean) => void; point: (x: number) => void; node: () => void } | null>(null);
  useEffect(() => () => {
    window.clearTimeout(tourTimer.current);
    window.clearTimeout(callTimer.current);
    cancelAnimationFrame(walkFrame.current);
  }, []);

  const walkRoof = () => {
    // timed from its own first frame (the React compiler reads a performance.now() here as a call during render)
    let start = -1;
    const frame = (now: number) => {
      if (start < 0) start = now;
      const t = Math.min(1, (now - start) / WALK.ms);
      tourApi.current?.point(WALK.from + (WALK.to - WALK.from) * (0.5 - Math.cos(Math.PI * t) / 2));
      if (t < 1) walkFrame.current = requestAnimationFrame(frame);
    };
    walkFrame.current = requestAnimationFrame(frame);
  };
  const runTour = (step: number) => {
    // a frame scrolled out of sight is not played to: the next step finds it gone and ends the tour
    const box = stageRef.current?.getBoundingClientRect();
    if (step > 0 && box && (box.bottom < 60 || box.top > window.innerHeight - 60)) return endTour();
    touringRef.current = true;
    setTourStep(step);
    if (step === 0) build();
    else if (step === 1) choose('load');
    else if (step === 2) walkRoof();
    else if (step === 3) {
      cancelAnimationFrame(walkFrame.current);
      choose('wind');
    } else if (step === 4) {
      choose('frame');
      setFlowOn(true);
      showNode('ridge');
    } else if (step === 5) {
      closeDetail();
      window.setTimeout(() => setSplit(DEFAULT_SPLIT), 450);
      setCalling(true);
      window.clearTimeout(callTimer.current);
      callTimer.current = window.setTimeout(() => setCalling(false), 2600);
    }
    window.clearTimeout(tourTimer.current);
    tourTimer.current = window.setTimeout(() => {
      if (step + 1 < TOUR.length) tourApi.current?.run(step + 1);
      else tourApi.current?.end();
    }, TOUR[step].hold);
  };
  // Ended by the visitor's own press: the seam stays where they put it; otherwise (the button, Esc, the frame scrolled
  // away) it goes back to rest — not the tour's 15 % (audit 08.10, F13)
  const endTour = (restore = true) => {
    touringRef.current = false;
    window.clearTimeout(tourTimer.current);
    cancelAnimationFrame(walkFrame.current);
    setTourStep(null);
    setFlowOn(flowBefore.current);
    if (restore) setSplit(DEFAULT_SPLIT);
  };
  const toggleTour = () => {
    if (tourStep !== null) return endTour();
    flowBefore.current = flowOn;
    runTour(0);
    queueProofEvent('tour_start');
  };
  useEffect(() => {
    tourApi.current = {
      run: runTour,
      end: endTour,
      point: pointAt,
      node: () => {
        if (detail || touchedRef.current || layerRef.current !== 'frame') return;
        quietOpenRef.current = true;
        showNode(AUTO_NODE);
      },
    };
  });
  // The arrival's own node (see AUTO_NODE): the sweep's effect asks for it by an event on the stage
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const open = () => tourApi.current?.node();
    stage.addEventListener(AUTO_NODE_EVENT, open);
    return () => stage.removeEventListener(AUTO_NODE_EVENT, open);
  }, [stageRef]);
  // Any press or key of the visitor's own in the sheet (not the tour's button) hands the block back
  useEffect(() => {
    if (tourStep === null) return;
    const figure = stageRef.current?.closest('figure');
    if (!figure) return;
    const onOwn = (event: Event) => {
      if ((event.target as Element).closest?.('.hv2-contour-tour-btn')) return;
      tourApi.current?.end(false);
    };
    // Esc anywhere, the tour's own button focused included
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') tourApi.current?.end();
    };
    figure.addEventListener('pointerdown', onOwn, true);
    figure.addEventListener('keydown', onOwn, true);
    document.addEventListener('keydown', onEscape);
    return () => {
      figure.removeEventListener('pointerdown', onOwn, true);
      figure.removeEventListener('keydown', onOwn, true);
      document.removeEventListener('keydown', onEscape);
    };
  }, [stageRef, tourStep]);

  return { tourStep, calling, toggleTour };
}
