// /pro-nas «Досвід працює ще до початку робіт» as a technical drawing (UX pass 2026-10, owner: zooming the picture lost
// its quality and the magic). Vector, so every push-in of the tour stays sharp. In the image's 1440 × 1800 units: the
// frame going up at the top — footings, base plates, columns, the beam and its bolted joint — and the working drawing
// at the bottom. Parts that a step names carry data-part="1|2|3" and light in copper while it is shown (about.css).

const range = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step);

export function PracticeDrawing() {
  const bolts = [480, 530, 580].flatMap((y) => [982, 1000].map((x) => [x, y] as const));
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
        <path d="M200 878h140v12H200ZM970 878h140v12H970Z" />
        <path d="M240 878V300H300V878M1010 878V300H1070V878" />
        <path d="M300 470H990V490H300ZM300 570H990V590H300Z" />
      </g>
      <path className="pd-web" d="M300 490H990V570H300Z" />
      {/* step 3 — the bolted joint at the column: end plate and six bolts */}
      <g className="pd-part" data-part="3">
        <path d="M972 450h18v160h-18z" />
        {bolts.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="7" />)}
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
          <path d={gridX.map((x) => `M${x} 1120V1440`).join('')} />
          <path d="M330 1180H1150M330 1380H1150" />
          {gridX.map((x) => <circle key={x} cx={x} cy="1470" r="18" />)}
          <path d="M380 1500H1100M380 1488v24M560 1488v24M740 1488v24M920 1488v24M1100 1488v24" />
        </g>
        {/* the frame drawn small on the sheet */}
        <path className="pd-line" d="M470 1360V1230H1010V1360M470 1255H1010" />
        {/* the title block */}
        <path className="pd-line" d="M880 1530H1180M880 1530V1600M980 1530V1600M880 1565H1180" />
      </g>
    </svg>
  );
}
