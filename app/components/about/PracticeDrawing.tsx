import type { CSSProperties } from 'react';

// /pro-nas «Досвід працює ще до початку робіт» as a technical drawing (UX pass 2026-10, owner: zooming the picture lost
// its quality and the magic). Vector, so every push-in of the tour stays sharp. In the image's 1440 × 1800 units: the
// frame going up at the top — footings, base plates, columns, the beam and its bolted joint — and the working drawing
// at the bottom. Parts that a step names carry data-part="1|2|3" and light in copper while it is shown (about.css).

const range = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step);

export function PracticeDrawing() {
  const boltRows = [456, 512, 548, 604];
  const gridX = [380, 560, 740, 920, 1100];
  return (
    <svg className="practice-drawing" viewBox="0 0 1440 1800" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Схема: від креслення — до каркаса на майданчику">
      {/* ── the frame going up ── */}
      <path className="pd-axis" d="M270 200V1000M1040 200V1000M150 530H1240" />
      {/* footings, with their top faces */}
      <path className="pd-cut" d="M170 900H370V980H170ZM940 900H1140V980H940Z" />
      <path className="pd-line" d="M170 900l30-24h200l-30 24M370 900l30-24M940 900l30-24h200l-30 24M1140 900l30-24" />
      <path className="pd-hatch" d={range(110, 1300, 40).map((x) => `M${x} 990l-16 22`).join('')} />
      <path className="pd-line" d="M90 990H1320" />
      {/* step 2 — the erection order: base plates, columns, the beam, and the numbered sequence */}
      <g className="pd-part" data-part="2">
        <path data-seq="1" pathLength={1} d="M200 878h140v12H200ZM970 878h140v12H970Z" />
        <path data-seq="2" pathLength={1} d="M240 878V300H300V878M252 878V300M288 878V300M1010 878V300H1070V878M1022 878V300M1058 878V300" />
        <path data-seq="3" pathLength={1} d="M300 470H992V490H300ZM300 570H992V590H300Z" />
      </g>
      <path className="pd-web" d="M300 490H992V570H300Z" />
      {/* step 3 — the bolted joint, drawn to be read up close: the end plate against the column flange, the column's
          stiffeners in line with the beam's flanges, four bolts through plate and flange (head, shank, nut) */}
      <g className="pd-part" data-part="3">
        <path pathLength={1} d="M992 440h18v180h-18zM1022 470H1058M1022 490H1058M1022 570H1058M1022 590H1058" />
        {boltRows.map((y, index) => (
          <path key={y} data-bolt pathLength={1} style={{ '--i': index } as CSSProperties} d={`M976 ${y}H1040M976 ${y - 9}h16v18h-16zM1022 ${y - 9}h14v18h-14z`} />
        ))}
      </g>
      {/* a dimension chain over the frame, letters only */}
      <path className="pd-dim" d="M270 240H1040M270 226v28M1040 226v28" />
      <text className="pd-text" x="640" y="226">L</text>
      <path className="pd-dim" d="M1180 470V590M1166 470h28M1166 590h28" />
      <text className="pd-text" x="1200" y="542">h</text>

      {/* ── step 1 — the working drawing: the sheet, its grid of axes, a dimension chain, the title block ── */}
      <g className="pd-sheet">
        <path className="pd-paper" d="M260 1060H1180V1600H260Z" />
        <g className="pd-part" data-part="1">
          <path pathLength={1} d={gridX.map((x) => `M${x} 1120V1440`).join('')} />
          <path pathLength={1} d="M330 1180H1150M330 1380H1150" />
          {gridX.map((x, index) => <circle key={x} cx={x} cy="1470" r="18" style={{ '--i': index } as CSSProperties} />)}
          <path pathLength={1} d="M380 1500H1100M380 1488v24M560 1488v24M740 1488v24M920 1488v24M1100 1488v24" />
        </g>
        {/* the frame drawn small on the sheet */}
        <path className="pd-line" d="M470 1360V1230H1010V1360M470 1255H1010" />
        {/* the title block */}
        <path className="pd-line" d="M880 1530H1180M880 1530V1600M980 1530V1600M880 1565H1180" />
      </g>
    </svg>
  );
}
