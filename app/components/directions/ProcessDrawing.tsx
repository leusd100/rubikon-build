import type { ReactNode } from 'react';
import type { ProcessDrawingKind } from '../../types/directionPage';

// What a client gets after each process step, drawn small on the process rail (DirectionProcess with `split`, owner
// 06.10: «B з мініатюрами результату»). In the 176 × 110 box the rail is the ground, at y = 92. In the page's key on the
// dark band: copper is what RUBIKON does or hands over, graphite the rest, long dash the specialists' equipment, the grain
// and the water in their colours. Decorative: the caption under each says the same.

const DRAWINGS: Record<ProcessDrawingKind, ReactNode> = {
  // grain — the description: a sheet with the complex sketched on it
  'grain-brief': (
    <>
      <path className="pd-ink" d="M50 10H112L126 24V92H50ZM112 10V24H126" />
      <path className="pd-partner" d="M64 80V36H100" />
      <path className="pd-grain" d="M80 79V58L86 54L92 58V79ZM96 79V58L102 54L108 58V79Z" />
      <path className="pd-ink" d="M78 80V56L86 50L94 56V80M94 80V56L102 50L110 56V80" />
      <path pathLength={1} className="pd-own" d="M74 80H114V85H74Z" />
    </>
  ),
  // the first conversation's outcome: what is known is ticked, what is missing is still open
  checklist: (
    <>
      <path className="pd-ink" d="M50 10H126V92H50ZM78 26H116M78 44H112M78 62H116M78 80H106" />
      <path pathLength={1} className="pd-own-line" d="M58 26l4 4l8 -9M58 44l4 4l8 -9" />
      <circle className="pd-ink" cx="64" cy="61" r="5" />
      <circle className="pd-ink" cx="64" cy="79" r="5" />
    </>
  ),
  // agreed with the project: a sheet, a section on it, its title block and the approval stamp
  'grain-project': (
    <>
      <path className="pd-ink" d="M36 12H140V92H36ZM50 64V44L76 30L102 44V64M44 64H108" />
      <path pathLength={1} className="pd-own" d="M108 74H140V92H108Z" />
      <path pathLength={1} className="pd-own-line" d="M108 80H140M124 74V92" />
      <circle pathLength={1} className="pd-own-line" cx="122" cy="40" r="11" />
      <circle pathLength={1} className="pd-own-line" cx="122" cy="40" r="6" />
    </>
  ),
  // the building part done: the store we built beside the specialists' silo and elevator
  'grain-built': (
    <>
      <path className="pd-grain" d="M40 92V74L70 62L100 74V92Z" />
      <path pathLength={1} className="pd-own" d="M28 92V54L70 34L112 54V92Z" />
      <path className="pd-partner" d="M122 92V42L134 32L146 42V92M156 92V18" />
    </>
  ),

  // metal — the initial data: a sheet with the section and its two letters
  'metal-data': (
    <>
      <path className="pd-ink" d="M50 10H112L126 24V92H50ZM112 10V24H126M62 32V72M58 32h8M58 72h8M72 82H106M72 78v8M106 78v8" />
      <path pathLength={1} className="pd-own" d="M72 32H106V38H92V66H106V72H72V66H86V38H72Z" />
      <text className="pd-letter" x="56" y="56">h</text>
      <text className="pd-letter" x="86" y="91">b</text>
    </>
  ),
  // agreed with the project: the frame on the sheet, its title block and stamp
  'metal-project': (
    <>
      <path className="pd-ink" d="M36 12H140V92H36ZM50 66V42L76 30L102 42V66M46 66H106" />
      <circle className="pd-ink" cx="50" cy="42" r="2.5" />
      <circle className="pd-ink" cx="102" cy="42" r="2.5" />
      <path pathLength={1} className="pd-own" d="M108 74H140V92H108Z" />
      <path pathLength={1} className="pd-own-line" d="M108 80H140M124 74V92" />
      <circle pathLength={1} className="pd-own-line" cx="122" cy="40" r="11" />
      <circle pathLength={1} className="pd-own-line" cx="122" cy="40" r="6" />
    </>
  ),
  // the elements made: beams stacked, an end plate with its bolts on the top one
  'metal-fabricated': (
    <>
      <path className="pd-cut" d="M28 92H148V84H28ZM34 82H142V74H34ZM40 72H136V64H40Z" />
      <path pathLength={1} className="pd-own" d="M136 56H146V80H136Z" />
      <circle pathLength={1} className="pd-own-line" cx="141" cy="62" r="2.4" />
      <circle pathLength={1} className="pd-own-line" cx="141" cy="74" r="2.4" />
    </>
  ),
  // erected: the frame stands, the hook still over its ridge
  'metal-erected': (
    <>
      <path pathLength={1} className="pd-own-line pd-heavy" d="M44 92V46M132 92V46M44 46L88 24L132 46" />
      <path className="pd-ink" d="M66 35V92M110 35V92" />
      <path className="pd-ink" d="M88 2V14M88 14a5 5 0 1 0 6 6" />
    </>
  ),

  // concrete — levels and marks: the instrument on its tripod, the sight line to the staff, the mark it gives
  'concrete-levels': (
    <>
      <path className="pd-ink" d={`M40 92L52 58M64 92L54 58M52 92V58M44 48H62V58H44ZM122 92V20${[28, 38, 48, 58, 68, 78].map((y) => `M122 ${y}h7`).join('')}`} />
      <path className="pd-sight" d="M62 52H120" />
      <path pathLength={1} className="pd-own" d="M92 40H106L99 48Z" />
      <path pathLength={1} className="pd-own-line" d="M86 40H112" />
    </>
  ),
  // ready to pour: formwork on its struts, the cage inside it
  'concrete-formwork': (
    <>
      <path className="pd-cut" d="M40 92V36H46V92ZM130 92V36H136V92Z" />
      <path className="pd-ink" d="M40 46L26 92M136 46L150 92" />
      <path pathLength={1} className="pd-own-line" d="M58 90V44M118 90V44M58 52H118M58 68H118M58 84H118" />
      <circle className="pd-own" cx="68" cy="84" r="2.5" />
      <circle className="pd-own" cx="88" cy="84" r="2.5" />
      <circle className="pd-own" cx="108" cy="84" r="2.5" />
    </>
  ),
  // poured: the pump's boom over the formwork, concrete in it
  'concrete-pour': (
    <>
      <path className="pd-cut" d="M44 92V50H50V92ZM126 92V50H132V92Z" />
      <path pathLength={1} className="pd-own" d="M50 92V64H126V92Z" />
      <path className="pd-ink" d="M14 40L56 16L96 30V44" />
      <path className="pd-partner" d="M96 44V62" />
    </>
  ),
  // checked: the straightedge on the slab, the gap that must stay small
  'concrete-check': (
    <>
      <path pathLength={1} className="pd-own" d="M24 92V74H152V92Z" />
      <path className="pd-ink" d="M34 70H142V64H34Z" />
      <path pathLength={1} className="pd-own-line" d="M88 50V60M84 56L88 60L92 56M88 82V76M84 78L88 74L92 78" />
    </>
  ),

  // roofing — the survey: the roof's outline, its slope measured
  'roof-survey': (
    <>
      <path className="pd-ink" d="M32 92V62L88 34L144 62V92" />
      <path pathLength={1} className="pd-own-line" d="M38 50L82 28M36 46l4 8M80 24l4 8" />
      <path className="pd-ink" d="M104 74H128V62Z" />
      <text className="pd-letter" x="54" y="32">i</text>
    </>
  ),
  // the kit: profiled sheets stacked, the top one ours to lay, and its fixings
  'roof-kit': (
    <>
      <path className="pd-ink" d={`M30 88${'l8 -6l8 6'.repeat(8)}M30 80${'l8 -6l8 6'.repeat(8)}`} />
      <path pathLength={1} className="pd-own-line" d={`M30 72${'l8 -6l8 6'.repeat(8)}`} />
      <path className="pd-ink" d="M150 92V70M146 70H154M147 76h6M147 82h6" />
    </>
  ),
  // laid: the sheet along the slope over its purlins, the flashing at the eave
  'roof-laid': (
    <>
      <path className="pd-ink" d="M38 80h10v8H38ZM78 66h10v8H78ZM118 53h10v8H118ZM30 92L154 51" />
      <path pathLength={1} className="pd-own-line pd-heavy" d="M24 86L156 42" />
      <path pathLength={1} className="pd-own-line" d="M24 86l-6 8" />
    </>
  ),
  // checked: water runs down the sheet into the gutter and away
  'roof-checked': (
    <>
      <path className="pd-ink" d="M40 92V66" />
      <path pathLength={1} className="pd-own-line pd-heavy" d="M30 62L150 22" />
      <path pathLength={1} className="pd-own-line" d="M18 64a8 8 0 0 0 16 0M26 72V92" />
      <path className="pd-water" d="M138 30L36 64M26 76V90" />
    </>
  ),

  // hangars — the brief: the configured frame on a sheet, its span and length as letters
  'hangar-brief': (
    <>
      <path className="pd-ink" d="M50 10H112L126 24V92H50ZM112 10V24H126M64 82H112M64 78v8M112 78v8" />
      <path pathLength={1} className="pd-own-line" d="M64 72V50L88 36L112 50V72M64 72H112" />
      <text className="pd-letter" x="85" y="91">B</text>
    </>
  ),
  // the proposal agreed: the estimate's sheet behind, the contract in front with its signature
  contract: (
    <>
      <path className="pd-ink" d="M44 14H108V80H44ZM54 28H96M54 40H90M54 52H96M54 64H82" />
      <path className="pd-cut" d="M68 26H132V92H68Z" />
      <path className="pd-ink" d="M78 40H120M78 50H116M78 60H120" />
      <path pathLength={1} className="pd-own-line" d="M80 80c6-10 10 6 16-2s8 6 14-2" />
    </>
  ),
  // handed over: the hangar stands, its gate in the end wall
  'hangar-built': (
    <>
      <path pathLength={1} className="pd-own" d="M30 92V52L88 26L146 52V92Z" />
      <path className="pd-ink" d="M68 92V60H108V92M88 60V92" />
    </>
  ),
};

export function ProcessDrawing({ kind }: Readonly<{ kind: ProcessDrawingKind }>) {
  return (
    <svg className="pd" viewBox="0 0 176 110" aria-hidden="true" focusable="false">
      {DRAWINGS[kind]}
    </svg>
  );
}
