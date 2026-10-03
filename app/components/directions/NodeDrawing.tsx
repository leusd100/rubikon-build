// «Вузол напряму» as a technical drawing (UX pass 2026-10, owner: zooming into a stock picture lost its quality and the
// magic). Vector lines stay sharp at any push-in. Each drawing is in the node's own 1800 × 1200 units; every part that a
// step names carries data-part="1|2|3" and lights in copper while that step is shown (direction-node.css). Schematic
// only: no sizes and no scale — letters on the dimension lines, as on the «Переріз» drawings.

export type NodeDrawingKind = 'steel-joint' | 'footing' | 'eave';

const range = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step);

function SteelJoint() {
  const rows = [360, 470, 730, 840];
  const holes = rows.flatMap((y) => [1365, 1495].map((x) => [x, y] as const));
  return (
    <>
      {/* axes */}
      <path className="nd-axis" d="M340 60V1140M200 600H1160M1430 260V940" />
      {/* the column: two flanges, the web between, stiffeners at the beam's flanges */}
      <path className="nd-cut" d="M260 100H290V1100H260ZM390 100H420V1100H390Z" />
      <path className="nd-web" d="M290 100H390V1100H290Z" />
      <path className="nd-line" d="M290 380H390M290 410H390M290 790H390M290 820H390" />
      {/* the beam, broken off on the right */}
      <path className="nd-web" d="M460 410H1100V790H460Z" />
      <path className="nd-cut" d="M460 380H1100V410H460ZM460 790H1100V820H460Z" />
      <path className="nd-line" d="M1100 360l-14 40 28 40-14 40V760l-14 40 28 40-14 40" />
      {/* the end plate */}
      <path className="nd-cut" d="M420 330H460V870H420Z" />
      {/* step 2 — the bolts through the plate and the column flange: shank, head, nut */}
      <g className="nd-part" data-part="2">
        {rows.map((y) => (
          <path pathLength={1} key={y} d={`M372 ${y}H484M460 ${y - 15}h20v30h-20zM372 ${y - 15}h18v30h-18z`} />
        ))}
      </g>
      {/* step 3 — the welds: fillets at both flanges, a seam down the web, and the weld sign */}
      <g className="nd-part nd-weld" data-part="3">
        <path pathLength={1} d="M460 380h22l-22-22zM460 410h22l-22 22zM460 790h22l-22-22zM460 820h22l-22 22z" />
        <path pathLength={1} d="M460 432h8v336h-8z" />
        <path pathLength={1} className="nd-leader" d="M474 366L560 280H700M600 280l14-18 14 18" />
      </g>
      {/* the beam's depth */}
      <path className="nd-dim" d="M1150 380V820M1138 380h24M1138 820h24" />
      <text className="nd-text" x="1172" y="612">h</text>
      {/* view A: the end plate seen from the beam, its holes and their spacing */}
      <path className="nd-line" d="M560 210L470 300M470 300l6-24M470 300l24-6" />
      <text className="nd-text" x="572" y="206">А</text>
      <text className="nd-title" x="1430" y="296" textAnchor="middle">Вид А</text>
      <path className="nd-cut" d="M1300 330H1560V870H1300Z" />
      <path className="nd-hidden" d="M1300 380H1560M1300 410H1560M1300 790H1560M1300 820H1560" />
      <g className="nd-part" data-part="1">
        {holes.map(([x, y]) => <circle pathLength={1} key={`${x}-${y}`} cx={x} cy={y} r="20" />)}
        <path pathLength={1} d="M1365 920H1495M1365 906v28M1495 906v28" />
        <path pathLength={1} d="M1610 360V840M1596 360h28M1596 470h28M1596 730h28M1596 840h28" />
      </g>
      <text className="nd-text" x="1422" y="962">g</text>
      <text className="nd-text" x="1630" y="424">p</text>
      <text className="nd-text" x="1630" y="794">p</text>
    </>
  );
}

function Footing() {
  const bottomBars = range(440, 1360, 46);
  const topBars = range(460, 1340, 80);
  return (
    <>
      <path className="nd-axis" d="M900 120V1060" />
      {/* the ground, cut back for the pit */}
      <path className="nd-line" d="M90 420H300M1500 420H1710" />
      <path className="nd-hatch" d={[...range(100, 280, 30), ...range(1510, 1690, 30)].map((x) => `M${x} 420l-18 26`).join('')} />
      {/* lean concrete, the pad, the pedestal */}
      <path className="nd-hatch-fill" d="M380 900H1420V930H380Z" />
      <path className="nd-cut" d="M400 640H780V300H1020V640H1400V900H400Z" />
      {/* step 1 — the cage: bottom and top bars (in section), the pedestal's verticals and stirrups, the cover a */}
      <g className="nd-part" data-part="1">
        {bottomBars.map((x) => <circle pathLength={1} key={`b${x}`} cx={x} cy="862" r="7" />)}
        {topBars.map((x) => <circle pathLength={1} key={`t${x}`} cx={x} cy="678" r="6" />)}
        <path pathLength={1} d="M812 330V862H860M988 330V862H940" />
        <path pathLength={1} d={[360, 430, 500, 570].map((y) => `M800 ${y}H1000V${y + 18}H800Z`).join('')} />
        <path pathLength={1} d="M1384 862V900M1372 862h24M1372 900h24" />
      </g>
      <text className="nd-text" x="1404" y="892">a</text>
      {/* step 2 — the anchor group: the bolts with their hooks, nuts and washers above the pedestal */}
      <g className="nd-part" data-part="2">
        <path pathLength={1} d="M852 170V560h46M948 170V560h-46" />
        <path pathLength={1} d="M834 236h36v14h-36zM930 236h36v14h-36zM826 256h52M922 256h52" />
        <path className="nd-dashed" d="M780 268H1020V300H780" />
      </g>
      {/* step 3 — the formwork: boards and braces round the pad and the pedestal, the level marks */}
      <g className="nd-part" data-part="3">
        <path pathLength={1} d="M370 630V910M1430 630V910M750 290V630M1050 290V630" />
        <path pathLength={1} d="M370 700L300 900M1430 700L1500 900M750 360L690 600M1050 360L1110 600" />
        <path pathLength={1} d="M1520 640H1640M1540 640l-14-20h28zM1520 300H1640M1540 300l-14-20h28z" />
      </g>
    </>
  );
}

function Eave() {
  const loops = 'q16 -34 32 0 t32 0 '.repeat(21);
  const masonry = range(100, 1110, 46);
  // The story is the water's (UX pass 2026-10, owner: the roof node «краще, але треба подумати, як зробити краще»):
  // the build-up is laid bottom-up, water runs down the wall over the flashing, then down the sheet, off the drip into
  // the gutter and away down the pipe. The building under the eave is drawn too, so gutter and pipe hang on something.
  return (
    <>
      {/* the higher wall the roof meets */}
      <path className="nd-cut" d="M1530 40H1640V1160H1530Z" />
      <path className="nd-hatch" d={masonry.map((y) => `M1530 ${y + 40}L1640 ${y}`).join('')} />
      {/* the outer wall under the eave */}
      <path className="nd-cut" d="M400 944L460 929V1200H400Z" />
      {/* the build-up along the slope, turned to it: deck, barrier, insulation, sheet — step 1 lays them bottom-up */}
      <g transform="translate(260 670) rotate(-14)">
        <g className="nd-part" data-part="1">
          <path data-seq="1" pathLength={1} d="M-20 108H1310V136H-20Z" />
          <path data-seq="2" className="nd-dashed" d="M-20 100H1310" />
          <path data-seq="3" pathLength={1} d="M-20 10H1310M-20 92H1310" />
          <path data-seq="3" pathLength={1} className="nd-loops" d={`M-20 51 ${loops}`} />
          {/* the profiled sheet cut along the fall: its pan, and the crest of the rib beyond */}
          <path data-seq="4" pathLength={1} d="M-60 0H1310M-60 -26H1310M-60 0V-26" />
        </g>
        {/* purlins on the rafter */}
        <path className="nd-line" d="M180 136h48v96h-48zM600 136h48v96h-48zM1020 136h48v96h-48z" />
        <path className="nd-line" d="M-40 232H1300M-40 300H1300M-40 232V300" />
        {/* step 3 — the drip under the sheet's end, its lip into the gutter */}
        <g className="nd-part nd-copper" data-part="3"><path pathLength={1} d="M40 6H-48l-14 40" /></g>
      </g>
      {/* step 2 — the flashing at the wall: out of its chase, down the wall's face, onto the sheet along the slope */}
      <g className="nd-part nd-copper" data-part="2"><path pathLength={1} d="M1566 216L1530 240V320L1414 348" /></g>
      {/* step 3 — the gutter and the downpipe, round the rafter's end and onto the wall under the eave */}
      <g className="nd-part nd-copper" data-part="3">
        <path pathLength={1} d="M146 712a54 54 0 0 0 108 0" />
        <path pathLength={1} d="M186 762V1006L356 1062V1200M214 762V994L384 1050V1200M384 1110h16M384 1170h16" />
      </g>
      {/* the water: down the wall and over the flashing (step 2); down the sheet, into the gutter, down the pipe (step 3) */}
      <path className="nd-rain" data-rain="2" d="M1522 60V316L1414 342" />
      <path className="nd-rain" data-rain="3" d="M1414 376L200 679V1000L370 1056V1200" />
    </>
  );
}

export function NodeDrawing({ kind, label }: Readonly<{ kind: NodeDrawingKind; label: string }>) {
  return (
    <svg className={`node-drawing node-drawing-${kind}`} viewBox="0 0 1800 1200" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      {kind === 'steel-joint' && <SteelJoint />}
      {kind === 'footing' && <Footing />}
      {kind === 'eave' && <Eave />}
    </svg>
  );
}
