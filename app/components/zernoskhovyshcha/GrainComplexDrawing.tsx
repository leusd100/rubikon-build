import type { CSSProperties, ReactNode } from 'react';
import type { GrainComplexModel, GrainCrop, GrainModuleKey } from '../../lib/grainComplex';

// The grain complex as one schematic elevation (2400 × 800 units), drawn the way the grain goes — one module after
// another (owner, 06.10: «чи не має це все по ланцюжку?»): a truck tips into the receiving pit; a conveyor in a tunnel
// carries the grain along under the ground; a bucket elevator lifts it into the cleaning machine and it falls back to
// the tunnel; the next elevator lifts it into the dryer and it falls through it; the last elevator lifts it to the
// gallery over the silos or the floor store; from their bottoms a conveyor takes it up to the loading bin over a truck.
// A module not chosen stays a faint ghost and the grain passes under it. In the page's key: copper is the building part
// RUBIKON does (pits, the tunnel, slabs, foundations, platforms, masts, the floor store itself), long dash the
// specialists' equipment, the grain in its crop's colour; the dotted golden line is the grain moving
// (GrainComplexBuilder runs it). Schematic only: no sizes, no scale — more silos or a longer store is a picture of size.

const G = 600;
/** The conveyor tunnel's bands and its belt, under the ground from the receiving pit to the last elevator */
const TUNNEL = { top: 656, bottom: 716, belt: 690, from: 476, to: 1340 };
const STORE_X = 1370;
const SHIP_X = 2150;

/** A silo's width and step: narrower as they get more, so the incline to the loading bin keeps its slope */
const binSize = (count: number) => (count >= 6 ? { w: 92, step: 112 } : count >= 4 ? { w: 108, step: 130 } : { w: 130, step: 154 });

/** A module's group: its turn in the arrival (--o) and whether the visitor has it in the chain */
function Mod({ name, order, on = true, hot = false, children }: Readonly<{ name: string; order: number; on?: boolean; hot?: boolean; children: ReactNode }>) {
  return (
    <g className={`gc-mod gc-mod-${name}${on ? '' : ' is-off'}${hot ? ' is-hot' : ''}`} style={{ '--o': order } as CSSProperties}>
      {children}
    </g>
  );
}

const footing = (x: number, half = 14) => `M${x - half} ${G}H${x + half}V${G + 14}H${x - half}Z`;

/** A steel mast beside an elevator, braced in a zigzag: the building part's support for the specialists' elevator */
function mast(x: number, top: number) {
  const zig = Array.from({ length: Math.floor((G - top - 20) / 46) }, (_, index) => `L${index % 2 ? x : x + 14} ${top + 30 + index * 46}`).join('');
  return `M${x} ${top}V${G}M${x + 14} ${top}V${G}M${x} ${top + 8}${zig}`;
}

/** A bucket elevator: its boot in the tunnel, two legs, the hooded head and its drive */
function elevator(x: number, head: number) {
  return [
    `M${x} ${TUNNEL.belt - 14}H${x + 48}V${TUNNEL.bottom + 4}H${x}Z`,
    `M${x + 6} ${TUNNEL.belt - 14}V${head}M${x + 20} ${TUNNEL.belt - 14}V${head}M${x + 28} ${TUNNEL.belt - 14}V${head}M${x + 42} ${TUNNEL.belt - 14}V${head}`,
    `M${x} ${head}V${head - 18}Q${x + 24} ${head - 42} ${x + 48} ${head - 18}V${head}Z`,
    `M${x + 48} ${head - 26}H${x + 68}V${head - 6}H${x + 48}Z`,
  ].join('');
}

/** The floor store's grain heap, its profile at a given x */
function heapY(x: number, from: number, to: number) {
  if (x < from + 64) return 552 - ((x - from) / 64) * 68;
  if (x > to - 64) return 552 - ((to - x) / 64) * 68;
  return 484;
}

function heapZone(from: number, to: number, x0: number, x1: number) {
  const corners = [from + 64, to - 64].filter((x) => x > x0 && x < x1);
  const points = [x0, ...corners, x1].map((x) => `L${x.toFixed(1)} ${heapY(x, from, to).toFixed(1)}`).join('');
  return `M${x0.toFixed(1)} 596${points}V596Z`;
}

const cropClass = (crop: GrainCrop | 'mixed') => `gc-grain gc-crop-${crop}`;

/** Where a module sits along the drawing (its units, 0–2400): a phone's sideways view is brought to it after a change */
export function grainModuleCentre(key: GrainModuleKey, model: GrainComplexModel) {
  const { w, step } = binSize(model.silos);
  const storeEnd = model.state.storage === 'silos' ? STORE_X + (model.silos - 1) * step + w + 10 : model.state.storage === 'floor' ? STORE_X - 10 + model.floorLength : 1920;
  const centres: Record<GrainModuleKey, number> = { receiving: 340, cleaning: 860, drying: 1140, feed: 1300, storage: (STORE_X + storeEnd) / 2, shipping: 2250 };
  return centres[key];
}

export type GrainDrawingPointer = {
  /** The module a pointer is on, and the one that just changed (it flashes) */
  hovered?: GrainModuleKey | null;
  flash?: GrainModuleKey | null;
  /** Counts the changes: the flashed module's hit area is drawn anew each time, so its flash replays */
  pulse?: number;
  onEnter?: (key: GrainModuleKey, pointerType: string) => void;
  onLeave?: (pointerType: string) => void;
  onPress?: (key: GrainModuleKey) => void;
};

export function GrainComplexDrawing({ model, label, hovered = null, flash = null, pulse = 0, onEnter, onLeave, onPress }: Readonly<{ model: GrainComplexModel; label: string } & GrainDrawingPointer>) {
  const { state, silos, floorLength, binCrops, zoneCrops } = model;
  const { w: binW, step: binStep } = binSize(silos);
  const bins = Array.from({ length: silos }, (_, index) => STORE_X + index * binStep);
  const storeEnd = state.storage === 'silos' ? bins[bins.length - 1] + binW + 10 : state.storage === 'floor' ? STORE_X - 10 + floorLength : 1920;
  const storeCentre = state.storage === 'silos' ? (STORE_X + storeEnd - 10) / 2 : state.storage === 'floor' ? STORE_X - 10 + floorLength / 2 : 1645;
  const galleryEnd = state.storage === 'silos' ? bins[bins.length - 1] + binW / 2 + 22 : state.storage === 'floor' ? 1420 : 1660;
  const dischargeEnd = storeEnd + 40;
  const floorColumns = Array.from({ length: Math.floor(floorLength / 120) + 1 }, (_, index) => STORE_X - 10 + index * 120).filter((x) => x <= STORE_X - 10 + floorLength);
  const zoneWidth = (floorLength - 12) / zoneCrops.length;
  const zones = zoneCrops.map((crop, index) => ({ crop, x0: STORE_X - 4 + index * zoneWidth, x1: STORE_X - 4 + (index + 1) * zoneWidth }));

  /** Each module's place for the pointer, in the drawing's units */
  const areas: readonly { key: GrainModuleKey; x: number; y: number; w: number; h: number }[] = [
    { key: 'receiving', x: 80, y: 400, w: 548, h: 330 },
    { key: 'cleaning', x: 632, y: 84, w: 350, h: 560 },
    { key: 'drying', x: 990, y: 80, w: 260, h: 566 },
    { key: 'feed', x: 1252, y: 16, w: 100, h: 620 },
    { key: 'storage', x: STORE_X - 14, y: state.storage === 'silos' ? 236 : 300, w: storeEnd - STORE_X + 28, h: state.storage === 'silos' ? 404 : 340 },
    { key: 'shipping', x: storeEnd + 22, y: 230, w: 2390 - storeEnd - 22, h: 400 },
  ];

  // The grain's one way through the chosen chain: into the pit, along the tunnel, up and through each chosen module and
  // back down, up the last elevator and along the gallery
  const route = [
    'M456 522Q482 584 523 652V690',
    state.cleaning ? 'H660V132L846 254L870 330L880 390V690' : '',
    state.drying ? 'H1024V118L1144 164L1150 204V594V690' : '',
    `H1304V58H${galleryEnd - 12}`,
  ].join('');

  return (
    <svg className="gc-drawing" viewBox="0 0 2400 800" role="img" aria-label={label}>
      {/* the ground, broken at the receiving pit, and its hatch in the free stretches */}
      <path className="gc-ground" d={`M40 ${G}H440M598 ${G}H2380`} />
      <path className="gc-hatch" d={[60, 100, 140, 180, 220, 260, 300, 340, 380, 1000, 1040, 2100, 2320, 2356].map((x) => `M${x} ${G + 18}l-14 20`).join('')} />

      {/* receiving: the apron, the pit in concrete under its grate, the truck tipping its body over it */}
      <Mod name="receiving" order={0} hot={hovered === 'receiving'}>
        <path pathLength={1} className="gc-own" d={`M76 ${G}H420V${G + 14}H76Z`} />
        <path pathLength={1} className="gc-own" d={`M420 ${G}L486 ${TUNNEL.top}H500L440 ${G}ZM598 ${G}L546 ${TUNNEL.top}H560L618 ${G}Z`} />
        <path className="gc-grate" d={`M440 ${G}H598`} />
        <g className="gc-vehicle">
          <circle cx="150" cy="576" r="24" /><circle cx="150" cy="576" r="8" />
          <circle cx="330" cy="576" r="24" /><circle cx="330" cy="576" r="8" />
          <circle cx="386" cy="576" r="24" /><circle cx="386" cy="576" r="8" />
          <path d="M104 540H440V552H104ZM104 540V474Q104 462 116 462H170L192 500V540M116 470H166L180 496H116ZM150 500V540M96 528H104V548H96ZM110 470H100V484" />
          <path d="M200 466H440V540H200ZM240 466V540M280 466V540M320 466V540M360 466V540M400 466V540" transform="rotate(26 440 540)" />
          <path d="M300 540L322 486" />
        </g>
      </Mod>

      {/* the tunnel under the ground and its belt, from the pit to the last elevator */}
      <Mod name="tunnel" order={1}>
        <path pathLength={1} className="gc-own" d={`M${TUNNEL.from} ${TUNNEL.top}H${TUNNEL.to}V${TUNNEL.top + 8}H${TUNNEL.from}ZM${TUNNEL.from} ${TUNNEL.bottom}H${TUNNEL.to}V${TUNNEL.bottom + 8}H${TUNNEL.from}ZM${TUNNEL.to - 8} ${TUNNEL.top}H${TUNNEL.to}V${TUNNEL.bottom + 8}H${TUNNEL.to - 8}Z`} />
        <path className="gc-partner" d={`M500 ${TUNNEL.belt + 10}H1290`} />
      </Mod>

      {/* cleaning: an elevator on its mast lifts the grain into the separator on its platform; it falls back to the tunnel */}
      <Mod name="cleaning" order={2} on={state.cleaning} hot={hovered === 'cleaning'} key={`cleaning-${state.cleaning}`}>
        <path pathLength={1} className="gc-own gc-line" d={mast(712, 150)} />
        <path pathLength={1} className="gc-own" d={footing(719, 18)} />
        <path className="gc-partner" d={elevator(636, 140)} />
        <path className="gc-partner gc-pipe" d="M690 134L840 248" />
        <path className="gc-partner" d="M796 266H948V372H796ZM836 266L844 248H860L868 266M808 290L936 312M808 316L936 338M808 342L936 364M916 266V244H948V256M864 372L872 388H888L896 372" />
        <path className="gc-partner gc-pipe" d={`M880 390V${TUNNEL.belt - 6}`} />
        <path pathLength={1} className="gc-own" d="M778 380H966V394H778Z" />
        <path pathLength={1} className="gc-own gc-line" d={`M796 394V${G}M948 394V${G}M796 440L948 540M948 440L796 540`} />
        <path pathLength={1} className="gc-own" d={`${footing(796)}${footing(948)}`} />
        <text className="gc-label" x="872" y="772">Очищення</text>
      </Mod>

      {/* drying: the next elevator lifts the grain into the dryer's top; it falls through the louvred tower; the burner
          beside it; all on a foundation */}
      <Mod name="drying" order={3} on={state.drying} hot={hovered === 'drying'} key={`drying-${state.drying}`}>
        <path pathLength={1} className="gc-own gc-line" d={mast(1072, 138)} />
        <path pathLength={1} className="gc-own" d={footing(1079, 18)} />
        <path className="gc-partner" d={elevator(1000, 128)} />
        <path className="gc-partner gc-pipe" d="M1054 122L1140 160" />
        <path className="gc-partner" d={`M1100 580V200H1200V580ZM1100 200L1150 164L1200 200M1110 580L1144 594H1156L1190 580M1106 580V${G}M1194 580V${G}${[222, 264, 306, 348, 390, 432, 474, 516].map((y) => `M1112 ${y}L1128 ${y + 16}L1144 ${y}M1156 ${y}L1172 ${y + 16}L1188 ${y}`).join('')}M1200 452H1244V560H1200ZM1230 452V418H1240V452`} />
        <circle className="gc-partner" cx="1222" cy="490" r="14" />
        <path className="gc-partner gc-pipe" d={`M1150 594V${TUNNEL.belt - 6}`} />
        <path pathLength={1} className="gc-own" d={`M1086 ${G}H1214V${G + 28}H1086Z`} />
        <text className="gc-label" x="1150" y="772">Сушіння</text>
      </Mod>

      {/* the last elevator, on its mast, up to the gallery over the storage */}
      <Mod name="feed" order={4} hot={hovered === 'feed'}>
        <path pathLength={1} className="gc-own gc-line" d={mast(1252, 80)} />
        <path pathLength={1} className="gc-own" d={footing(1259, 18)} />
        <path className="gc-partner" d={elevator(1280, 72)} />
        <path className="gc-partner" d={`M1328 56H${galleryEnd}M1328 70H${galleryEnd}`} />
      </Mod>

      {/* storage: silos on their slab — rings, roofs, inlets, each with its crop — over the discharge tunnel; or the floor
          store cut open to its heap, in a zone per crop; or a place still to be decided */}
      {state.storage === 'silos' && (
        <Mod name="storage" order={5} hot={hovered === 'storage'} key={`silos-${silos}-${binCrops.join()}`}>
          {bins.map((x, index) => <path key={`g${x}`} className={cropClass(binCrops[index])} d={`M${x + 4} 596V334L${x + binW / 2} 312L${x + binW - 4} 334V596Z`} />)}
          <path className="gc-partner" d={bins.map((x) => `M${x} ${G}V298L${x + binW / 2} 254L${x + binW} 298V${G}M${x + binW / 2 - 9} 254V244H${x + binW / 2 + 9}V254`).join('')} />
          <path className="gc-ring" d={bins.map((x) => Array.from({ length: 6 }, (_, ring) => `M${x} ${322 + ring * 46}H${x + binW}`).join('')).join('')} />
          <path className="gc-partner gc-pipe" d={bins.map((x) => `M${x + binW / 2} ${G}V${TUNNEL.belt - 6}`).join('')} />
          <path pathLength={1} className="gc-own" d={`M${STORE_X - 10} ${G}H${storeEnd}V${G + 26}H${STORE_X - 10}Z`} />
        </Mod>
      )}
      {state.storage === 'floor' && (
        <Mod name="storage" order={5} hot={hovered === 'storage'} key={`floor-${floorLength}-${zoneCrops.join()}`}>
          <path pathLength={1} className="gc-own" d={`M${STORE_X - 10} 520H${storeEnd}V${G}H${STORE_X - 10}Z`} />
          {zones.map((zone) => <path key={zone.x0} className={cropClass(zone.crop)} d={heapZone(STORE_X - 4, storeEnd - 6, zone.x0, zone.x1)} />)}
          {zones.length > 1 && <path pathLength={1} className="gc-own gc-line" d={zones.slice(1).map((zone) => `M${zone.x0.toFixed(1)} ${G}V470`).join('')} />}
          <path pathLength={1} className="gc-own gc-line" d={`${floorColumns.map((x) => `M${x} ${G}V380`).join('')}M${STORE_X - 10} 380H${storeEnd}M${STORE_X + 10} 330H${storeEnd - 20}M${STORE_X - 10} 380L${STORE_X + 10} 330M${storeEnd} 380L${storeEnd - 20} 330`} />
          <path pathLength={1} className="gc-own" d={`M${STORE_X - 14} ${G}H${storeEnd + 4}V616H${STORE_X - 14}Z`} />
          <path className="gc-partner" d={`M${STORE_X + 40} 348H${storeEnd - 40}M1414 70V348`} />
        </Mod>
      )}
      {state.storage === 'unknown' && (
        <Mod name="storage" order={5} hot={hovered === 'storage'} key="unknown">
          <path className="gc-unknown" d={`M1380 ${G}V330H1920V${G}`} />
          <text className="gc-unknown-mark" x="1650" y="500">?</text>
          <path pathLength={1} className="gc-own" d={`M1370 ${G}H1920V616H1370Z`} />
          <path className="gc-partner" d="M1660 70V330" />
        </Mod>
      )}
      {/* the discharge tunnel under the storage and its belt */}
      <Mod name="discharge" order={5} key={`discharge-${dischargeEnd}`}>
        <path pathLength={1} className="gc-own" d={`M${STORE_X - 10} ${TUNNEL.top}H${dischargeEnd}V${TUNNEL.top + 8}H${STORE_X - 10}ZM${STORE_X - 10} ${TUNNEL.bottom}H${dischargeEnd}V${TUNNEL.bottom + 8}H${STORE_X - 10}Z`} />
        <path className="gc-partner" d={`M${STORE_X} ${TUNNEL.belt + 10}H${dischargeEnd - 10}`} />
      </Mod>

      {/* shipping: the incline up from the discharge tunnel to the loading bin, on its frame, over a truck */}
      <Mod name="shipping" order={6} hot={hovered === 'shipping'}>
        <path className="gc-partner" d={`M${dischargeEnd - 10} ${TUNNEL.belt - 8}L${SHIP_X + 12} 262M${dischargeEnd + 6} ${TUNNEL.belt + 4}L${SHIP_X + 28} 274M${SHIP_X} 250H2290V356L2234 400H2206L${SHIP_X} 356ZM2206 400V412H2234V400`} />
        <path pathLength={1} className="gc-own gc-line" d={`M2146 356H2294M2160 356V${G}M2280 356V${G}M2160 420L2280 500M2280 420L2160 500`} />
        <path pathLength={1} className="gc-own" d={`${footing(2160)}${footing(2280)}`} />
        <g className="gc-vehicle">
          <circle cx="2168" cy="576" r="24" /><circle cx="2168" cy="576" r="8" />
          <circle cx="2220" cy="576" r="24" /><circle cx="2220" cy="576" r="8" />
          <circle cx="2338" cy="576" r="24" /><circle cx="2338" cy="576" r="8" />
          <path d="M2116 540H2374V552H2116ZM2124 490H2300V540H2124ZM2168 490V540M2212 490V540M2256 490V540M2300 540V474H2350L2370 508V540M2312 482H2346L2358 504H2312Z" />
        </g>
      </Mod>

      {/* the grain moving: the one way through the chain; then into each silo or along the store; then out of the bottoms,
          up the incline and down into the truck */}
      <g className="gc-flows" aria-hidden="true">
        <path className="gc-flow" d={route} />
        {state.storage === 'silos' && bins.map((x) => <path key={`f${x}`} className="gc-flow" d={`M${x + binW / 2} 70V250`} />)}
        {state.storage === 'floor' && <path className="gc-flow" d={`M1414 70V340H${storeEnd - 50}`} />}
        {state.storage === 'unknown' && <path className="gc-flow" d="M1660 70V330" />}
        <path className="gc-flow" d={`M${state.storage === 'silos' ? bins[0] + binW / 2 : STORE_X + 20} ${TUNNEL.belt}H${dischargeEnd}L${SHIP_X + 20} 268M2220 412V500`} />
      </g>

      {/* the labels under the ground; the storage's follows its group */}
      <text className="gc-label" x="300" y="772">Приймання</text>
      <text className="gc-label" x={storeCentre} y="772">Зберігання</text>
      {/* the last label ends at the drawing's edge: at a phone's larger size a centred one ran past it */}
      <text className="gc-label gc-label-end" x="2384" y="772">Відвантаження</text>

      {/* the modules a pointer can find: a press adds or removes cleaning and drying or swaps the storage, and every one
          names who builds what in it (GrainComplexBuilder's tip). The chips under the sheet do the same for a keyboard. */}
      <g className="gc-hits" aria-hidden="true">
        {areas.map(({ key, x, y, w, h }) => (
          <rect
            key={flash === key ? `${key}-${pulse}` : key}
            className={`gc-hit${hovered === key ? ' is-hover' : ''}${flash === key ? ' is-flash' : ''}`}
            data-module={key}
            x={x}
            y={y}
            width={w}
            height={h}
            rx="14"
            onPointerEnter={(event) => onEnter?.(key, event.pointerType)}
            onPointerLeave={(event) => onLeave?.(event.pointerType)}
            onClick={() => onPress?.(key)}
          />
        ))}
      </g>
    </svg>
  );
}
