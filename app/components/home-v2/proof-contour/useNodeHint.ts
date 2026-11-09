import { useLayoutEffect, type RefObject } from 'react';
import type { DetailId } from '../ProofDetails';

// Node Г's hint beside its own ring (owner, 07.11: «Давай також реалізуємо ідеї» — this lifts DEC-42 (a)'s place for it):
// until then it was a 12.5 px line over the photo's top corner, ~737 px from the ring at 1440 × 900, across the seam,
// and on a laptop «Натисніть Г» read as a key to press, which did nothing. Now a thin copper leader runs from a small
// square on the ring out to the line, and the line is a button that opens the node — the same press as its pill.
//
// Where the line goes is measured on the page, as the drawing's words are (useLabelFit): the first place, in order, that
// lies right of the seam, inside the frame and clear of every word that can show there — the scheme's names (the hover's
// too), the stamp, the seam's names — and of the other rings and letters: right of the ring in one line, then in two,
// each straight out, a little up, a little down, further up, further down, the leader meeting the line at its middle,
// its top third or its bottom third. While it shows, the stamp keeps its first line, «Схема · без розмірів»
// (home-v2.css): its second, «каркас такого типу…», is the title block's line too, and on a 1280 × 720 laptop it took the
// one room level with the ring. Where none is clear: the seam's «Схема ›» gives way to it, as it gives way to a word of
// the drawing (useLabelFit's tagYield); then the line may cross another node's ring — never its letter or a word
// (data-over-ring: on a 1250 × 613 laptop the room right of Г is between Б's ring, «Ферма» and the stamp, ~24 px high).
// Where even that fails, the same again with a shorter leader (LEADS_TIGHT); and where that fails too it keeps the place
// that covers least (data-crowded), so a test can say where.

/** Air round the line, px */
const AIR = 6;
/** The leader's run from the ring's edge out to the line, px */
const LEADS = [16, 24, 42] as const;
/** A shorter run, tried only where no place at LEADS is free of words: Linux Chromium sets the hint's two lines 205 px
 *  wide where macOS sets 203, and at 1280 × 720 and 1250 × 613 the one free place (two lines, 28° down, at 16 px) then
 *  stood 4.6 px from «Ферма», not AIR, so the hint fell to data-crowded there (Main Regression from 42399915818 on,
 *  home-proof-contour.spec.ts «node Г’s hint stands beside its ring»). 12 px moves that place 3.5 px left: 2.1 px to
 *  spare on Linux. Where a place at LEADS is found, as on macOS, nothing changes. */
const LEADS_TIGHT = [12] as const;
/** Where on the line's height the leader meets it, from its top */
const MEETS = [0.5, 0.25, 0.75] as const;
/** Its ways out of the ring, degrees clockwise from the ring's right: straight out first (the letter Г stands under the
 *  ring, at 90°), then a little up and down, then further */
const WAYS = [0, -28, 28, -55, 55, -78] as const;

type Box = { left: number; right: number; top: number; bottom: number };
type Place = { box: Box; mark: [number, number]; end: [number, number]; lines: 1 | 2; covered: number };

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

/** Every place the line can take beside the ring (cx, cy, radius), in one line and in two, in the order they are tried */
function candidatesOf([cx, cy, radius]: readonly [number, number, number], sizes: readonly { lines: 1 | 2; width: number; height: number }[], leads: readonly number[] = LEADS) {
  const candidates: Place[] = [];
  for (const { lines, width, height } of sizes) {
    for (const way of WAYS) {
      for (const meet of MEETS) {
        for (const lead of leads) {
          const [cos, sin] = [Math.cos((way * Math.PI) / 180), Math.sin((way * Math.PI) / 180)];
          const mark: [number, number] = [cx + radius * cos, cy + radius * sin];
          const end: [number, number] = [cx + (radius + lead) * cos, cy + (radius + lead) * sin];
          // the line's left edge at the leader's end, the end at its middle (or a third up or down) — lower down the
          // line as the way rises
          const top = Math.min(Math.max(end[1] - height * meet + (sin * height) / 2, end[1] - height + 8), end[1] - 8);
          const left = end[0] + 6;
          candidates.push({ box: { left, right: left + width, top, bottom: top + height }, mark, end, lines, covered: 0 });
        }
      }
    }
  }
  return candidates;
}

/** What the line keeps clear of: `words` (and the stamp, the letters, the handle), the other nodes' `rings`, the seam's
 *  «Схема ›» (`seamName`) */
type Clear = Readonly<{ words: Box[]; rings: Box[]; seamName: Box[] }>;

/** The first place clear of all; then one where «Схема ›» gives way; then one over another node's ring; else the one
 *  that covers least (crowded) */
function choose(candidates: Place[], inFrame: Place[], { words, rings, seamName }: Clear) {
  const fixed = [...words, ...rings];
  const cover = (place: Place, others: Box[]) => others.reduce((sum, other) => sum + overlap(place.box, { left: other.left - AIR, right: other.right + AIR, top: other.top - AIR, bottom: other.bottom + AIR }), 0);
  const clear = inFrame.find((place) => cover(place, [...fixed, ...seamName]) === 0);
  if (clear) return { chosen: clear, yieldName: false, overRing: false, crowded: false };
  const yielding = inFrame.find((place) => cover(place, fixed) === 0);
  if (yielding) return { chosen: yielding, yieldName: true, overRing: false, crowded: false };
  const overRing = inFrame.find((place) => cover(place, [...words, ...seamName]) === 0) ?? inFrame.find((place) => cover(place, words) === 0);
  if (overRing) return { chosen: overRing, yieldName: cover(overRing, seamName) > 0, overRing: true, crowded: false };
  const pool = inFrame.length ? inFrame : candidates;
  for (const place of pool) place.covered = cover(place, fixed);
  const least = pool.reduce((best, place) => (place.covered < best.covered ? place : best), pool[0]);
  return { chosen: least, yieldName: false, overRing: false, crowded: true };
}

/** The hint placed beside node `id`'s ring while `on` (and again when the frame resizes); `split`: where the seam rests */
export function useNodeHint(stageRef: RefObject<HTMLDivElement | null>, hintRef: RefObject<HTMLSpanElement | null>, { on, id, split }: Readonly<{ on: boolean; id: DetailId; split: number }>) {
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const hint = hintRef.current;
    if (!on || !stage || !hint) return;
    const place = () => {
      const button = hint.querySelector<HTMLElement>('.hv2-contour-node-hint-button');
      const ring = stage.querySelector(`.hv2-proof-detail-rings [data-detail="${id}"]`);
      // (a phone's hint is the strip under the frame: this one is not shown)
      if (!button || !ring || !button.checkVisibility()) return;
      const frame = stage.getBoundingClientRect();
      const rel = (rect: DOMRect): Box => ({ left: rect.left - frame.left, right: rect.right - frame.left, top: rect.top - frame.top, bottom: rect.bottom - frame.top });
      const r = rel(ring.getBoundingClientRect());
      const seam = (frame.width * split) / 100;
      const seen = (element: Element) => element.checkVisibility({ visibilityProperty: true });
      const boxes = (selector: string) => [...stage.querySelectorAll(selector)].filter(seen).map((element) => rel(element.getBoundingClientRect()));
      // every word that can show on the scheme's side (the names the hover shows are there, faded out), the stamp, the
      // other nodes' letters and rings, the handle
      const clear: Clear = {
        words: [...boxes('.hv2-proof-labels > span, .hv2-contour-stamp, .hv2-proof-detail-pin, .hv2-contour-handle'), ...boxes('.hv2-contour-seamtags > span:first-child')],
        rings: boxes(`.hv2-proof-detail-rings circle:not([data-detail="${id}"])`),
        seamName: boxes('.hv2-contour-seamtags > span:last-child'),
      };
      // the line's size in one line and in two
      const sizes = ([1, 2] as const).map((lines) => {
        hint.dataset.lines = String(lines);
        return { lines, width: button.offsetWidth, height: button.offsetHeight };
      });
      const ringAt = [(r.left + r.right) / 2, (r.top + r.bottom) / 2, (r.right - r.left) / 2] as const;
      const fits = ({ box }: Place) => box.left >= seam + AIR && box.right <= frame.width - AIR && box.top >= AIR && box.bottom <= frame.height - AIR;
      const placed = (leads?: readonly number[]) => {
        const candidates = candidatesOf(ringAt, sizes, leads);
        return choose(candidates, candidates.filter(fits), clear);
      };
      let best = placed();
      // (the shorter run only once every place at the usual runs is crowded: LEADS_TIGHT)
      if (best.crowded) {
        const tight = placed(LEADS_TIGHT);
        if (!tight.crowded) best = tight;
      }
      const { chosen, yieldName, overRing, crowded } = best;
      hint.dataset.lines = String(chosen.lines);
      hint.toggleAttribute('data-crowded', crowded);
      hint.toggleAttribute('data-over-ring', overRing);
      stage.toggleAttribute('data-hint-yield', yieldName);
      hint.style.setProperty('--hint-x', `${chosen.box.left.toFixed(1)}px`);
      hint.style.setProperty('--hint-y', `${chosen.box.top.toFixed(1)}px`);
      const lead = hint.querySelector('.hv2-contour-node-hint-lead path');
      const mark = hint.querySelector('.hv2-contour-node-hint-lead rect');
      lead?.setAttribute('d', `M${chosen.mark[0].toFixed(1)} ${chosen.mark[1].toFixed(1)}L${chosen.end[0].toFixed(1)} ${chosen.end[1].toFixed(1)}H${chosen.box.left.toFixed(1)}`);
      mark?.setAttribute('x', (chosen.mark[0] - 2.5).toFixed(1));
      mark?.setAttribute('y', (chosen.mark[1] - 2.5).toFixed(1));
    };
    place();
    let frame = 0;
    let live = true;
    const again = () => {
      cancelAnimationFrame(frame);
      // after the drawing's words have been fitted to the new frame (useLabelFit answers the same resize)
      frame = requestAnimationFrame(place);
    };
    // the frame resized, the stamp's words in (with reduced motion the hint stands from hydration, the fonts maybe still
    // on their way: the line and the words it keeps clear of are measured again once they are in)
    const observer = new ResizeObserver(again);
    observer.observe(stage);
    const stamp = stage.querySelector('.hv2-contour-stamp');
    if (stamp) observer.observe(stamp);
    void document.fonts?.ready.then(() => {
      if (live) again();
    });
    return () => {
      live = false;
      observer.disconnect();
      cancelAnimationFrame(frame);
      delete stage.dataset.hintYield;
    };
  }, [stageRef, hintRef, on, id, split]);
}
