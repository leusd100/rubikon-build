import type { CSSProperties, ReactNode } from 'react';
import type { GrainComplexModel } from '../../lib/grainComplex';

// The grain complex as one schematic elevation (2400 × 800 units), left to right the way the grain goes: a truck tips
// into the receiving pit, the bucket elevator lifts it to the gallery, the gallery drops it into the cleaning machine and
// the dryer (when chosen), then into the silos or the floor store, and an inclined conveyor takes it to the loading bin
// over a truck. In the page's key: copper is the building part RUBIKON does (pits, slabs, foundations, platforms,
// trestles, the floor store itself), long dash the specialists' equipment, the grain in its own colour; the dotted
// golden lines are the grain moving (GrainComplexBuilder runs them). A module not chosen stays as a faint ghost, so the
// chain keeps its places. Schematic only: no sizes, no scale — more silos or a longer store is a picture of size.

const GROUND = 600;
const STORE_X = 1330;
const BIN_W = 130;
const BIN_STEP = 154;
const SHIP_X = 2150;

/** A module's group: its order in the arrival (--d) and whether the visitor has it in the chain */
function Mod({ name, order, on = true, children }: Readonly<{ name: string; order: number; on?: boolean; children: ReactNode }>) {
  return (
    <g className={`gc-mod gc-mod-${name}${on ? '' : ' is-off'}`} style={{ '--o': order } as CSSProperties}>
      {children}
    </g>
  );
}

function footing(x: number, half = 14) {
  return `M${x - half} ${GROUND}H${x + half}V${GROUND + 14}H${x - half}Z`;
}

function Trestle({ x, order }: Readonly<{ x: number; order: number }>) {
  const zig = Array.from({ length: 8 }, (_, index) => `L${index % 2 ? x - 10 : x + 10} ${160 + index * 60}`).join('');
  return (
    <Mod name="trestle" order={order}>
      <path pathLength={1} className="gc-own gc-line" d={`M${x - 10} 94V${GROUND}M${x + 10} 94V${GROUND}M${x - 10} 120${zig}`} />
      <path pathLength={1} className="gc-own" d={footing(x, 24)} />
    </Mod>
  );
}

export function GrainComplexDrawing({ model, label }: Readonly<{ model: GrainComplexModel; label: string }>) {
  const { state, silos, floorLength } = model;
  const bins = Array.from({ length: silos }, (_, index) => STORE_X + index * BIN_STEP);
  const storeEnd = state.storage === 'silos' ? bins[bins.length - 1] + BIN_W + 10 : state.storage === 'floor' ? STORE_X - 10 + floorLength : 1910;
  const storeCentre = state.storage === 'silos' ? (STORE_X + storeEnd - 10) / 2 : state.storage === 'floor' ? STORE_X - 10 + floorLength / 2 : 1625;
  const galleryEnd = state.storage === 'silos' ? bins[bins.length - 1] + BIN_W / 2 + 20 : state.storage === 'floor' ? 1380 : 1640;
  const floorColumns = Array.from({ length: Math.floor(floorLength / 120) + 1 }, (_, index) => STORE_X - 10 + index * 120).filter((x) => x <= STORE_X - 10 + floorLength);

  return (
    <svg className="gc-drawing" viewBox="0 0 2400 800" role="img" aria-label={label}>
      {/* the ground, broken at the pits, and its hatch in the free stretches */}
      <path className="gc-ground" d={`M40 ${GROUND}H440M600 ${GROUND}H650M752 ${GROUND}H2370`} />
      <path className="gc-hatch" d={[60, 100, 140, 180, 220, 260, 300, 340, 800, 846, 892, 1228, 1270, 2080, 2120, 2320, 2356].map((x) => `M${x} ${GROUND + 18}l-14 20`).join('')} />

      {/* receiving: the truck tipping its body over the grate, the pit in concrete, the apron it stands on */}
      <Mod name="receiving" order={0}>
        <g className="gc-vehicle">
          <circle cx="170" cy="574" r="26" />
          <circle cx="360" cy="574" r="26" />
          <path d="M110 548H440M110 548V478Q110 466 122 466H180L196 500V548M124 476H172L182 498H124Z" />
          <path d="M200 468H430V548H200Z" transform="rotate(24 430 548)" />
        </g>
        <path pathLength={1} className="gc-own" d={`M96 ${GROUND}H420V${GROUND + 14}H96Z`} />
        <path pathLength={1} className="gc-own" d={`M420 ${GROUND}L486 712H554L620 ${GROUND}H600L542 692H498L440 ${GROUND}Z`} />
        <path className="gc-grate" d={`M440 ${GROUND}H600`} />
        <path className="gc-partner" d="M500 696H700M500 708H700" />
      </Mod>

      {/* the bucket elevator in its pit, its head at the gallery */}
      <Mod name="elevator" order={1}>
        <path pathLength={1} className="gc-own" d={`M650 ${GROUND}V742H752V${GROUND}H740V730H662V${GROUND}Z`} />
        <path className="gc-partner" d="M684 726V104M716 726V104M670 72H730V104H670ZM672 700H728V726H672Z" />
      </Mod>

      {/* the gallery conveyor along the top, on two trestles */}
      <Mod name="gallery" order={2}>
        <path className="gc-partner" d={`M730 80H${galleryEnd}M730 94H${galleryEnd}`} />
      </Mod>
      <Trestle x={990} order={2} />
      <Trestle x={1265} order={2} />

      {/* cleaning: the machine on its platform */}
      <Mod name="cleaning" order={3} on={state.cleaning} key={`cleaning-${state.cleaning}`}>
        <path pathLength={1} className="gc-own" d="M770 380H970V394H770Z" />
        <path pathLength={1} className="gc-own gc-line" d={`M790 394V${GROUND}M950 394V${GROUND}M790 470L950 540`} />
        <path pathLength={1} className="gc-own" d={`${footing(790)}${footing(950)}`} />
        <path className="gc-partner" d="M800 272H940V380H800ZM812 300L928 330M812 324L928 354M860 272V252H880V272" />
        <text className="gc-label" x="870" y="772">Очищення</text>
      </Mod>

      {/* drying: the dryer tower and its burner on a foundation */}
      <Mod name="drying" order={4} on={state.drying} key={`drying-${state.drying}`}>
        <path pathLength={1} className="gc-own" d="M1050 590H1210V620H1050Z" />
        <path className="gc-partner" d={`M1076 590V190H1184V590ZM1076 190L1130 158L1184 190M1184 470H1224V540H1184Z${[220, 270, 320, 370, 420, 470, 520].map((y) => `M1100 ${y}L1130 ${y + 22}L1160 ${y}`).join('')}`} />
        <text className="gc-label" x="1130" y="772">Сушіння</text>
      </Mod>

      {/* storage: silos on their slab, or the floor store cut open to its grain, or a place still to be decided */}
      {state.storage === 'silos' && (
        <Mod name="storage" order={5} key={`silos-${silos}`}>
          {bins.map((x) => <path key={`g${x}`} className="gc-grain" d={`M${x + 4} 596V336L${x + 65} 312L${x + 126} 336V596Z`} />)}
          <path className="gc-partner" d={bins.map((x) => `M${x} ${GROUND}V300L${x + 65} 252L${x + BIN_W} 300V${GROUND}`).join('')} />
          <path pathLength={1} className="gc-own" d={`M${STORE_X - 10} ${GROUND}H${storeEnd}V626H${STORE_X - 10}Z`} />
        </Mod>
      )}
      {state.storage === 'floor' && (
        <Mod name="storage" order={5} key={`floor-${floorLength}`}>
          <path pathLength={1} className="gc-own" d={`M${STORE_X - 10} 520H${storeEnd}V${GROUND}H${STORE_X - 10}Z`} />
          <path className="gc-grain" d={`M${STORE_X - 4} 596V552L${STORE_X + 60} 484H${storeEnd - 70}L${storeEnd - 6} 552V596Z`} />
          <path pathLength={1} className="gc-own gc-line" d={`${floorColumns.map((x) => `M${x} ${GROUND}V380`).join('')}M${STORE_X - 10} 380H${storeEnd}M${STORE_X + 10} 330H${storeEnd - 20}M${STORE_X - 10} 380L${STORE_X + 10} 330M${storeEnd} 380L${storeEnd - 20} 330`} />
          <path pathLength={1} className="gc-own" d={`M${STORE_X - 14} ${GROUND}H${storeEnd + 4}V616H${STORE_X - 14}Z`} />
          <path className="gc-partner" d={`M${STORE_X + 30} 348H${storeEnd - 40}M1372 94V348M1388 94V348`} />
        </Mod>
      )}
      {state.storage === 'unknown' && (
        <Mod name="storage" order={5} key="unknown">
          <path className="gc-unknown" d={`M1340 ${GROUND}V330H1910V${GROUND}`} />
          <text className="gc-unknown-mark" x="1625" y="500">?</text>
          <path pathLength={1} className="gc-own" d={`M1330 ${GROUND}H1910V616H1330Z`} />
        </Mod>
      )}

      {/* shipping: the inclined conveyor up to the loading bin, on its legs, over a truck */}
      <Mod name="shipping" order={6}>
        <path className="gc-partner" d={`M${storeEnd} 588L${SHIP_X + 12} 268M${storeEnd + 14} 600L${SHIP_X + 26} 280M${SHIP_X} 250H2290V360L2232 404H2208L${SHIP_X} 360Z`} />
        <path pathLength={1} className="gc-own gc-line" d={`M2160 360V${GROUND}M2280 360V${GROUND}M2160 430L2280 500M2280 430L2160 500`} />
        <path pathLength={1} className="gc-own" d={`${footing(2160)}${footing(2280)}`} />
        <g className="gc-vehicle">
          <circle cx="2165" cy="576" r="24" />
          <circle cx="2330" cy="576" r="24" />
          <path d="M2110 552H2372M2120 504H2300V552H2120ZM2300 552V482H2350L2368 512V552" />
        </g>
      </Mod>

      {/* the grain moving: tipped into the pit, along to the elevator, up, along the gallery, down into each chosen
          module and the storage, then up the incline into the loading bin and down into the truck */}
      <g className="gc-flows" aria-hidden="true">
        <path className="gc-flow" d="M452 512Q470 560 500 620L516 690H700" />
        <path className="gc-flow" d={`M700 712V88H${galleryEnd - 10}`} />
        {state.cleaning && <path className="gc-flow" d="M870 94V252" />}
        {state.drying && <path className="gc-flow" d="M1130 94V158" />}
        {state.storage === 'silos' && bins.map((x) => <path key={`f${x}`} className="gc-flow" d={`M${x + 65} 94V256`} />)}
        {state.storage === 'floor' && <path className="gc-flow" d={`M1380 94V340H${storeEnd - 50}`} />}
        {state.storage === 'unknown' && <path className="gc-flow" d="M1625 94V330" />}
        <path className="gc-flow" d={`M${storeEnd + 7} 594L${SHIP_X + 19} 274M2220 370V500`} />
      </g>

      {/* the labels under the ground: the chain's modules; the storage's follows its group */}
      <text className="gc-label" x="360" y="772">Приймання</text>
      <text className="gc-label" x={storeCentre} y="772">Зберігання</text>
      <text className="gc-label" x="2236" y="772">Відвантаження</text>
    </svg>
  );
}
