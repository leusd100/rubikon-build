'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useHoverStep } from '../useHoverStep';
import './change-sheets.css';

// /yak-pratsyuiemo «Як із цього виходять кошторис і графік» (owner 07.10: «покращити… з вау ефектом та зрозумілістю для
// клієнта», chose A). The two documents a client gets — the estimate (its rows are the seven factors drawn above) and the
// schedule — drawn as sheets, and under them the change procedure (changeSteps) acting on them, one example change
// (the insulation): 1 a revision cloud and Δ1 mark the row and the bar, 2 the row and the bar grow and the work after
// them moves — before anything is built, 3 the change sheet is signed and stamped, 4 the work is done and the change is in
// the acceptance documents. No sums or dates: lines and marks only.
//
// Without JavaScript or with reduced motion the sheets show the whole story at once (step 4). With motion the marks are
// held back until the block comes into view, then the procedure walks once, 1 → 4; pointing at or choosing a step stops the
// walk and shows that step. The sheets are decorative (aria-hidden) — the captions and the steps say everything in words.

export type ChangeStepItem = { title: string; detail: string };
type Term = { title: string; text: string };

const STEP_MS = 2300;
const LAST = 4;

/** A step's place against the one shown: shown now, already passed, or still ahead (no attribute). */
function stateOf(value: number, shown: number): 'now' | 'done' | undefined {
  if (value === shown) return 'now';
  return value < shown ? 'done' : undefined;
}

/** The estimate's row lengths (% of the amount column) — a picture of a table, not figures */
const SUMS = [64, 80, 52, 42, 58, 46, 36];
/** The changed row: «Утеплення», the fourth factor */
const HOT = 3;

/** The schedule: start and length in thirteen columns; `own` RUBIKON's works, `other` other contractors' (dashed); `done`
 *  already built when the change comes, `hot` the changed work, `after` the work it moves */
const BARS: readonly { name: string; start: number; length: number; kind: 'own' | 'other'; done?: boolean; hot?: boolean; after?: boolean }[] = [
  { name: 'Фундамент', start: 0, length: 3, kind: 'own', done: true },
  { name: 'Каркас', start: 3, length: 3, kind: 'own', done: true },
  { name: 'Стіни, покрівля, утеплення', start: 6, length: 3, kind: 'own', hot: true },
  { name: 'Мережі — інші підрядники', start: 6, length: 3.5, kind: 'other' },
  { name: 'Здача', start: 9, length: 1.5, kind: 'own', after: true },
];
/** How far the change moves the schedule (columns) */
const GROW = 1.5;

/** A revision cloud around its parent box: scallops of about `r`, drawn to the box's measured size. */
function RevisionCloud({ r = 6, className = 'cs-cloud' }: Readonly<{ r?: number; className?: string }>) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<[number, number] | null>(null);
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return undefined;
    const measure = () => setSize([parent.offsetWidth + 12, parent.offsetHeight + 12]);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  let d = '';
  if (size) {
    const [w, h] = size;
    const x = 2;
    const y = 2;
    const side = (fx: number, fy: number, tx: number, ty: number) => {
      const n = Math.max(1, Math.round(Math.hypot(tx - fx, ty - fy) / (2 * r)));
      const arc = Math.hypot(tx - fx, ty - fy) / n / 2;
      let out = '';
      for (let i = 1; i <= n; i += 1) out += `A${arc.toFixed(2)} ${arc.toFixed(2)} 0 0 1 ${(fx + ((tx - fx) * i) / n).toFixed(2)} ${(fy + ((ty - fy) * i) / n).toFixed(2)}`;
      return out;
    };
    const [x1, y1] = [w - 2, h - 2];
    d = `M${x} ${y}${side(x, y, x1, y)}${side(x1, y, x1, y1)}${side(x1, y1, x, y1)}${side(x, y1, x, y)}Z`;
  }
  return (
    <svg ref={ref} className={className} width={size?.[0] ?? 0} height={size?.[1] ?? 0} aria-hidden="true" focusable="false">
      {d && <path pathLength={1} d={d} />}
    </svg>
  );
}

export function ChangeSheets({ rows, estimate, schedule, principle, steps, back }: Readonly<{
  rows: readonly string[];
  estimate: Term;
  schedule: Term;
  principle: string;
  steps: readonly ChangeStepItem[];
  back: string;
}>) {
  // 4 = the whole story: what the server renders and what stays without motion
  const [step, setStep] = useState(LAST);
  const [armed, setArmed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    // Hold the marks back until the block is seen, then walk the procedure once
    const arm = window.requestAnimationFrame(() => { setArmed(true); setStep(0); });
    const walk = (next: number) => {
      setStep(next);
      if (next < LAST) timer.current = window.setTimeout(() => walk(next + 1), STEP_MS);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.45) return;
      observer.disconnect();
      timer.current = window.setTimeout(() => walk(1), 700);
    }, { threshold: [0, 0.45] });
    observer.observe(root);
    return () => { window.cancelAnimationFrame(arm); observer.disconnect(); window.clearTimeout(timer.current); };
  }, []);

  const choose = (value: number) => {
    window.clearTimeout(timer.current);
    setStep(value);
  };
  const hover = useHoverStep(step, choose);
  const reached = Array.from({ length: step }, (_, index) => index + 1).join(' ');

  return (
    <div className="cs" ref={rootRef} data-reached={reached} data-armed={armed ? '' : undefined}>
      <div className="cs-sheets">
        <figure className="cs-sheet cs-estimate">
          <div className="cs-paper" aria-hidden="true">
            <p className="cs-head"><b>Кошторис</b><span>Аркуш 1</span></p>
            <ol className="cs-rows">
              {rows.map((title, index) => (
                <li key={title} className={index === HOT ? 'cs-hot' : undefined} style={{ '--sum': `${SUMS[index] ?? 50}%` } as CSSProperties}>
                  <span className="cs-num">{index + 1}</span>
                  <span className="cs-name">{title}</span>
                  <span className="cs-sum"><i />{index === HOT && <b className="cs-grow" />}</span>
                  {index === HOT && (
                    <>
                      <span className="cs-cloud-box"><RevisionCloud r={4} /></span>
                      <span className="cs-delta">Зміна 1</span>
                      <span className="cs-tick">в акті ✓</span>
                    </>
                  )}
                </li>
              ))}
            </ol>
            <p className="cs-total"><span>Разом</span><span className="cs-sum"><i /><b className="cs-grow" /></span></p>
          </div>
          <figcaption><b>01</b><span><strong>{estimate.title}</strong>{estimate.text}</span></figcaption>
        </figure>

        <figure className="cs-sheet cs-schedule">
          <div className="cs-paper" aria-hidden="true">
            <p className="cs-head"><b>Графік робіт</b><span>Аркуш 2</span></p>
            <div className="cs-gantt">
              {BARS.map((bar, index) => (
                <div className="cs-lane" key={bar.name} style={{ '--i': index } as CSSProperties}>
                  <span className="cs-lane-name">{bar.name}</span>
                  <span className="cs-track">
                    <span
                      className={`cs-bar cs-bar-${bar.kind}${bar.done ? ' cs-done' : ''}${bar.hot ? ' cs-hot' : ''}${bar.after ? ' cs-after' : ''}`}
                      style={{ '--s': bar.start, '--l': bar.length, '--g': GROW } as CSSProperties}
                    >
                      <i className="cs-fill" />
                      {bar.hot && <><b className="cs-grow" /><span className="cs-cloud-box"><RevisionCloud r={4} /></span><span className="cs-delta">Зміна 1</span></>}
                    </span>
                  </span>
                </div>
              ))}
              {/* Now: the foundation and the frame are built; the change comes before the walls go up */}
              <span className="cs-now" style={{ '--s': 6 } as CSSProperties}><span>зараз</span></span>
            </div>
            <p className="cs-back">↺ {back}</p>
          </div>
          <figcaption><b>02</b><span><strong>{schedule.title}</strong>{schedule.text}</span></figcaption>
        </figure>

        {/* Step 3: the change, signed by both and stamped, before it is built */}
        <div className="cs-order" aria-hidden="true">
          <p className="cs-head"><b>Зміна №1</b><span>Аркуш 3</span></p>
          <i className="cs-lines" />
          <span className="cs-signs">
            <span><svg viewBox="0 0 60 20"><path pathLength={1} d="M2 14c6-10 9 6 15-2s8 6 13-1s7 4 12-2s6 3 14-1" /></svg><small>Замовник</small></span>
            <span><svg viewBox="0 0 60 20"><path pathLength={1} d="M2 12c5-8 10 5 14-1s9 5 14-2s8 4 13-1s7 3 13 0" /></svg><small>RUBIKON</small></span>
          </span>
          <svg className="cs-stamp" viewBox="0 0 40 40"><circle pathLength={1} cx="20" cy="20" r="17" /><circle pathLength={1} cx="20" cy="20" r="11" /></svg>
        </div>
      </div>

      <div className="cs-change">
        <h3 className="cs-tab">Якщо щось змінюється</h3>
        <p className="cs-principle">{principle}</p>
        <p className="cs-example" aria-hidden="true">Приклад на аркушах: змінилось утеплення</p>
        <p className="cs-hint" aria-hidden="true">
          <span className="cs-hint-pointer">Наведіть на крок — аркуші покажуть, що змінюється</span>
          <span className="cs-hint-touch">Торкніться кроку — аркуші покажуть, що змінюється</span>
        </p>
        <ol className="cs-steps">
          {steps.map((item, index) => (
            <li key={item.title} data-state={stateOf(index + 1, step)}>
              <button type="button" aria-pressed={index + 1 === step} onClick={() => choose(index + 1)} {...hover(index + 1)}>
                <span className="cs-node" aria-hidden="true">{index + 1}</span>
                <b>{item.title}</b>
                <span className="cs-detail">{item.detail}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
