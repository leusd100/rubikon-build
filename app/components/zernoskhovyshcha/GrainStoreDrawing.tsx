// «Будівельна частина» on /zernoskhovyshcha as a drawing (owner, 06.10: the generated picture gives way to a scheme, as on
// the metal, concrete and roofing pages): half a cross-section of a framed floor grain store, from the outside of the wall
// to the axis of symmetry — the whole gable is the approach card's above, so this sheet does not repeat it. In the site's
// drawing dictionary: graphite lines, cut parts lightly filled, long dash for the partners' equipment (the fan, the ridge
// conveyor), dash-dot for axes only, the letter А on the wall's axis, a letter on the one angle. The four work points are
// four parts that light in copper with their step (direction-node.css, grain-editorial.css): 1 footing, wall, slab and
// the fan's pad — with the grain's pressure on the wall; 2 frame, cladding and roof; 3 the wall opening, the aeration
// channel and the embedded parts; 4 where the partners' equipment meets the building, with the air the fan drives up
// through the grain. Schematic only: no sizes and no scale. Units: the node's 1800 × 1200. One sheet per page, so the
// grain's dot pattern can keep a plain id.

/** The symmetry axis, the wall's faces and axis */
const AX = 1640;
const WO = 440;
const WI = 500;
const WA = 470;
/** Floor top and slab bottom inside, the ground outside (lower: the fan's opening sits above it), the wall's top */
const FL = 870;
const SB = 915;
const GR = 960;
const WT = 570;
/** The aeration channel along the section: open to the floor under its grate, from the wall to its end wall */
const CH_END = 1240;
const CH_BOTTOM = 934;
/** The opening through the wall into the channel */
const OPEN_TOP = 878;
const OPEN_BOTTOM = 930;
/** The rafter's top at the eave (x = WO − 6) and at the ridge; the grain's contact with the wall and its slope */
const EAVE_X = 434;
const EAVE_Y = 360;
const RIDGE_Y = 100;
const SLOPE = (EAVE_Y - RIDGE_Y) / (AX - EAVE_X);
const GRAIN_WALL_Y = 670;
const GRAIN_SLOPE = 0.364; // ≈ 20°: steeper than the roof, below the conveyor at the ridge
/** The fan: its scroll's centre and radius, on the pad outside the wall */
const FAN = { x: 300, y: 872, r: 54 };

const topY = (x: number) => EAVE_Y - SLOPE * (x - EAVE_X);
const bottomY = (x: number) => RIDGE_Y + 48 + SLOPE * (AX - x);
const grainY = (x: number) => GRAIN_WALL_Y - GRAIN_SLOPE * (x - WI);
const round = (value: number) => Math.round(value * 10) / 10;
const degrees = (slope: number) => round((Math.atan(slope) * 180) / Math.PI);

const PURLINS = [560, 740, 920, 1100, 1280, 1460, 1620];
/** The pressure diagram: arrows onto the wall's inner face, longer with depth */
const PRESSURE = [712, 750, 788, 826, 862].map((y) => ({ y, length: round((128 * (y - GRAIN_WALL_Y)) / (FL - GRAIN_WALL_Y)) }));
/** Air rising from the channel's grate through the grain */
const RISERS = [620, 780, 940, 1100];
const SOIL = Array.from({ length: 12 }, (_, index) => 110 + index * 28);
/** The conveyor's hangers on the rafters near the ridge */
const HANGERS = [1520, 1600];

export function GrainStore() {
  const rafter = `M494 ${round(topY(494))}L${AX} ${RIDGE_Y}V${RIDGE_Y + 48}L820 ${round(topY(820) + 48)}L494 ${round(topY(494) + 96)}Z`;
  const sheet = (lift: number) => `M376 ${round(topY(376) - lift)}L${AX} ${round(RIDGE_Y - lift)}`;
  const grain = `M${WI} ${FL}V${GRAIN_WALL_Y}L${AX} ${round(grainY(AX))}V${FL}Z`;
  // the angle of the grain's slope, measured from a level line at the wall's foot of the slope
  const alpha = { x: 560, y: round(grainY(560)), r: 150 };
  const alphaEnd = { x: round(alpha.x + alpha.r * Math.cos(Math.atan(GRAIN_SLOPE))), y: round(alpha.y - alpha.r * Math.sin(Math.atan(GRAIN_SLOPE))) };
  return (
    <>
      <defs>
        <pattern id="gsd-grain-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="5" r="2.3" />
          <circle cx="13" cy="13" r="1.9" />
        </pattern>
      </defs>

      {/* axes: the wall's (А) and the axis of symmetry with its two strokes at each end */}
      <path className="nd-axis" d={`M${WA} 300V1084M${AX} 26V1110`} />
      <path className="nd-line" d={`M${AX - 18} 34H${AX + 18}M${AX - 18} 46H${AX + 18}M${AX - 18} 1090H${AX + 18}M${AX - 18} 1102H${AX + 18}`} />
      <circle className="nd-line" cx={WA} cy="1116" r="30" />
      <text className="nd-axis-letter" x={WA} y="1129">А</text>

      {/* the ground outside, its hatch */}
      <path className="nd-line" d={`M96 ${GR}H${WO}`} />
      <path className="nd-hatch" d={SOIL.map((x) => `M${x} ${GR}l-18 26`).join('')} />

      {/* the grain: tinted, dotted, its surface at the natural slope from the wall up to the conveyor, and that angle */}
      <path className="gsd-grain" d={grain} />
      <path className="gsd-grain-dots" d={grain} />
      <path className="gsd-grain-line" d={`M${WI} ${GRAIN_WALL_Y}L${AX} ${round(grainY(AX))}`} />
      <path className="gsd-angle" d={`M${alpha.x} ${alpha.y}H${alpha.x + alpha.r + 40}M${alpha.x + alpha.r} ${alpha.y}A${alpha.r} ${alpha.r} 0 0 0 ${alphaEnd.x} ${alphaEnd.y}`} />
      <text className="nd-text gsd-angle-text" x={alpha.x + alpha.r + 14} y={alpha.y - 18}>α</text>

      {/* step 1 — the footing, the retaining wall (open at the floor for the channel), the slab with the channel's trough,
          and the fan's pad outside */}
      <g className="nd-part" data-part="1">
        <path pathLength={1} className="gsd-fill" d="M350 1000H590V1070H350Z" />
        <path pathLength={1} className="gsd-fill" d={`M${WO} ${WT}H${WI}V${OPEN_TOP}H${WO}Z`} />
        <path pathLength={1} className="gsd-fill" d={`M${WO} ${OPEN_BOTTOM}H${WI}V1000H${WO}Z`} />
        <path pathLength={1} className="gsd-fill" d={`M${WI} ${CH_BOTTOM}H${CH_END}V${FL}H${AX}V${SB}H${CH_END + 28}V962H${WI}Z`} />
        <path pathLength={1} className="gsd-fill" d={`M212 940H392V${GR}H212Z`} />
      </g>
      {/* …and what the wall holds: the grain's pressure, growing with depth */}
      <g className="gsd-press" data-show="1">
        <path pathLength={1} d={`M${WI} ${GRAIN_WALL_Y}L${WI + 128} ${FL - 4}`} />
        {PRESSURE.map(({ y, length }) => (
          <path pathLength={1} key={y} d={`M${WI + length} ${y}H${WI + 7}M${WI + 19} ${y - 8}L${WI + 7} ${y}L${WI + 19} ${y + 8}`} />
        ))}
      </g>
      <text className="gsd-note" data-show="1" x={WI + 152} y="790">тиск зерна</text>

      {/* step 2 — the column on the wall, its base plate and anchors, the haunched rafter, the purlins, the roof sheet with
          the gutter at the eave, the cladding over the wall */}
      <g className="nd-part" data-part="2">
        <path pathLength={1} className="gsd-fill" d={`M446 ${WT}V${round(topY(446))}L494 ${round(topY(494))}V${WT}Z`} />
        <path pathLength={1} className="gsd-fill" d={`M432 ${WT - 8}H508V${WT}H432Z`} />
        <path pathLength={1} d={`M456 ${WT - 18}V${WT + 46}M484 ${WT - 18}V${WT + 46}`} />
        <path pathLength={1} className="gsd-fill" d={rafter} />
        {PURLINS.map((x) => (
          <path pathLength={1} key={x} d="M9 0H-10V-30H9" transform={`translate(${x} ${round(topY(x))}) rotate(${-degrees(SLOPE)})`} />
        ))}
        <path pathLength={1} d={`${sheet(32)}${sheet(44)}`} />
        <path pathLength={1} d={`M360 ${round(topY(376) - 22)}a14 14 0 0 0 28 0`} />
        <path pathLength={1} d={`M434 ${WT}V${round(topY(434) - 30)}M440 ${WT}V${round(topY(440) - 30)}`} />
      </g>

      {/* step 3 — the opening through the wall, the channel under its grate and the grate's embedded angles, the fan
          pad's anchors */}
      <g className="nd-part" data-part="3">
        <path pathLength={1} d={`M${WO} ${OPEN_TOP}H${WI}M${WO} ${OPEN_BOTTOM}H${WI}`} />
        <path pathLength={1} d={`M${WI} ${FL + 4}V${CH_BOTTOM}H${CH_END}V${FL + 4}`} />
        <path pathLength={1} d={`M${WI} ${FL + 14}h14v-14M${CH_END} ${FL + 14}h-14v-14`} />
        <path pathLength={1} d="M236 930V956M368 930V956" />
      </g>
      {/* the grate over the channel: perforated, so drawn as a dashed line */}
      <path className="nd-dashed gsd-grate" d={`M${WI} ${FL}H${CH_END}`} />
      <text className="gsd-note" data-show="3" x="870" y="1018" textAnchor="middle">канал аерації</text>

      {/* the partners' equipment, long dash: the fan — its scroll, inlet and feet on the pad, its duct into the opening — and
          the ridge conveyor hung from the rafters, its belt on idlers and the spout over the grain */}
      <g className="gsd-equip">
        <path d={`M${WO} 884H${FAN.x + 50}A${FAN.r} ${FAN.r} 0 1 0 ${FAN.x} ${FAN.y + FAN.r + 4}H${WO}`} />
        <circle cx={FAN.x - 4} cy={FAN.y - 2} r="22" />
        <path d={`M${FAN.x - 34} ${FAN.y + 58}l-8 ${GR - 20 - FAN.y - 58}M${FAN.x + 26} ${FAN.y + 58}l8 ${GR - 20 - FAN.y - 58}`} />
        <path d={`M1490 186H${AX}V238H1490Z`} />
        <path d={`M1490 210H${AX}`} />
        <circle cx="1520" cy="222" r="9" />
        <circle cx="1580" cy="222" r="9" />
        <path d={HANGERS.map((x) => `M${x} ${round(bottomY(x))}V186`).join('')} />
        <path d={`M1612 238L1622 252H${AX}`} />
      </g>
      <text className="gsd-note" data-show="4" x={FAN.x} y="790" textAnchor="middle">вентилятор</text>
      <text className="gsd-note" data-show="4" x="1446" y="222" textAnchor="end">конвеєр</text>

      {/* step 4 — where the equipment meets the building: the duct at the opening, the hangers at the rafter, the fan on its
          pad; and the air it drives along the channel and up through the grain */}
      <g className="gsd-air" data-show="4">
        <path d={`M${FAN.x} 906H${CH_END - 30}`} />
        {RISERS.map((x) => <path key={x} d={`M${x} ${FL - 6}V${round(grainY(x) + 24)}`} />)}
      </g>
      <g className="gsd-joint" data-show="4">
        <circle cx={WO} cy="906" r="14" />
        {HANGERS.map((x) => <circle key={x} cx={x} cy={round(bottomY(x))} r="12" />)}
        <circle cx={FAN.x} cy={GR - 20} r="12" />
      </g>
    </>
  );
}
