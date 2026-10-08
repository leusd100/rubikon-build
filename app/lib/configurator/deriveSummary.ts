import type { HangarDomainModel } from './domainModel';
import { objectProfileLabels, type ObjectProfileLabels } from './objectProfile';
import { DOOR_DIMENSIONS_M, GATE_DIMENSIONS_M, gateHeightFits, ridgeHeightM } from './parametricModel';
import {
  CLADDING_SYSTEM_LABELS,
  FOUNDATION_TYPE_LABELS,
  ROOF_STRUCTURE_LABELS,
  SCOPE_LABELS,
  SCOPE_MODE_LABELS,
  SCOPE_ORDER,
  STRUCTURAL_SCHEME_LABELS,
  type GateType,
} from './types';

export type ConfiguratorSummary = {
  /** width × length, m² — the one derived number the brief signs off on for the POC. */
  areaSqm: number;
  /** «≈ 1 440 м²» */
  areaLabel: string;
  /** «24 × 60 × 8 м», with no-break spaces: a fixed field of the lead */
  dimensionsLabel: string;
  /** The brief's one line — «24 × 60 × 8 м · Холодний», the sizes alone when neither walls nor roof are in the request */
  headlineLabel: string;
  /** «Висота в конику» with the slope it makes — «10,6 м · ухил ≈ 12°» (decimal comma; 03.10: a ridge alone does not
   *  say how steep the roof is). The dimensions label stays width × length × wall height: it is a fixed field of the
   *  lead. (The ridge was dropped from the summary and the lead until 2026-10.) */
  ridgeHeightLabel: string;
  /** «ухил ≈ 12°» — the roof slope in whole degrees, derived from the ridge, never chosen. */
  roofSlopeLabel: string;
  /** «Об’єкт» answers as the lead reads them; null = not answered (no row, no stamp cell). */
  objectProfile: ObjectProfileLabels;
  envelopeLabel: string;
  /**
   * Phase 3D: cladding system, shown as one combined label when walls and roof agree (the common
   * case, and the only one either control currently produces on its own) — "Профнастил" rather
   * than "Профнастил / Профнастил" — and spelled out per-surface only when they genuinely differ.
   */
  claddingSystemLabel: string;
  foundationTypeLabel: string;
  /**
   * Phase 3E, brief §19: a real business-relevant configuration fact, same status as
   * `foundationTypeLabel` above — not a renderer-only detail (compare: panel count, web pattern,
   * section sizes — none of that belongs in a lead brief).
   *
   * Phase 3E.1: combined into ONE label (was two separate fields, `structuralSchemeLabel` +
   * `roofStructureLabel`) specifically because the brief's own §10 draws a hard line between USER
   * INPUT and DERIVED PRELIMINARY VISUALIZATION — two `dt`/`dd` rows reading "Конструктивна схема"
   * / "Несуча система покрівлі" look exactly like two things the customer picked, which is no
   * longer true for either. One row, headed "Попередня конструктивна схема", makes the derived,
   * preliminary nature of the whole value part of its own label rather than something a reader has
   * to already know.
   */
  structuralVisualizationLabel: string;
  /** Plain-language description of what the preliminary renderer currently shows. */
  structuralVisualizationDescription: string;
  /** Scope items in a fixed, readable order — not the order they were toggled in. */
  scopeLabels: string[];
  scopeSummaryLabel: string;
  /** `null` when walls are out of scope — the opening is not part of the request at all. */
  gatesLabel: string | null;
  /** `null` when walls are out of scope — see `gatesLabel`. */
  doorsLabel: string | null;
  /** One canonical editorial label for openings, derived from the same scope-aware facts. */
  openingsLabel: string;
};

export const OUT_OF_SCOPE_LABEL = 'Поза обсягом заявки';

/** U+00A0: a number never parts from its unit or from the «×» of a size (04.10: «4×4» and «7.5» broke off «м» at 320–360 px) */
export const NBSP = '\u00A0';

/** Metres with the decimal comma, as the fields, the drawings and the tour print them: 24, 7,5, 2,1 (04.10 — it was
 *  toFixed, so the stamp, the route, the cost note and the lead said «7.5» beside a field reading «7,5») */
export function formatMeters(value: number): string {
  return value.toLocaleString('uk-UA', { maximumFractionDigits: 1 });
}

/** «24 × 60 × 8 м», «4 × 4 м», «1 × 2,1 м» — one unbreakable piece, spaced «×» everywhere (it was «4×4» beside «24 × 60») */
export function formatSize(...valuesM: number[]): string {
  return `${valuesM.map(formatMeters).join(`${NBSP}×${NBSP}`)}${NBSP}м`;
}

/**
 * «ухил ≈ 12°», or «ухил ≈ 12° (22 %)» where there is room for the percent (the ridge hint). Whole degrees and whole
 * percent: the slope follows from a ridge set to 0.1 m, so a decimal would be false precision. A description of the
 * drawn roof, not a minimum slope for any roofing — those wait for Сергій Іванович (03.10).
 */
export function formatRoofSlope(pitchDeg: number, withPercent = false): string {
  const degrees = `ухил${NBSP}≈${NBSP}${Math.round(pitchDeg)}°`;
  if (!withPercent) return degrees;
  return `${degrees} (${Math.round(Math.tan((pitchDeg * Math.PI) / 180) * 100)}${NBSP}%)`;
}

/**
 * Phase 3F.2 — narrowed to the surfaces the customer is actually asking for.
 *
 * "Обсяг заявки" is the master fact: a cladding system for a surface nobody ordered is not part of
 * the request, and printing it made the brief contradict its own Обсяг line one row above. So the
 * label names only the surfaces in scope, and says so plainly when neither is.
 */
function formatCladdingSystemLabel(
  envelope: HangarDomainModel['envelope'],
  scope: HangarDomainModel['scope'],
): string {
  const wall = CLADDING_SYSTEM_LABELS[envelope.wallSystem];
  const roof = CLADDING_SYSTEM_LABELS[envelope.roofSystem];

  if (!scope.walls && !scope.roof) return OUT_OF_SCOPE_LABEL;
  if (!scope.walls) return `Покрівля: ${roof}`;
  if (!scope.roof) return `Стіни: ${wall}`;
  return wall === roof ? wall : `Стіни: ${wall}, покрівля: ${roof}`;
}

/**
 * «Утеплення» (07.10; until then «Контур»): the thermal answer on its own, beside the materials in «Огородження». A
 * changed material used to turn it into «Індивідуальна конфігурація», and the visitor could no longer tell which
 * thermal envelope they were asking for. Now: «Утеплений» or «Уточнимо» as answered; «Без утеплення» for a cold
 * building — unless a sandwich panel is asked for, which carries its own insulation, and then it says where.
 * With neither walls nor roof in the request it is «Поза обсягом заявки», as the controls say.
 */
function formatEnvelopeLabel(envelope: HangarDomainModel['envelope'], scope: HangarDomainModel['scope']): string {
  if (!scope.walls && !scope.roof) return OUT_OF_SCOPE_LABEL;
  if (envelope.walls === 'insulated') return 'Утеплений';
  // A sandwich panel carries its insulation whatever was answered: «Ще не знаю» with sandwich walls read «Уточнимо»
  // beside a legend saying «з утеплювачем» (07.10, audit)
  const sandwichWalls = scope.walls && envelope.wallSystem === 'sandwich-panel';
  const sandwichRoof = scope.roof && envelope.roofSystem === 'sandwich-panel';
  if (sandwichWalls && sandwichRoof) return 'У сендвіч-панелях';
  if (sandwichWalls) return 'Лише в стінах (сендвіч-панелі)';
  if (sandwichRoof) return 'Лише в покрівлі (сендвіч-панелі)';
  if (envelope.walls === 'undecided') return 'Уточнимо';
  return 'Без утеплення';
}

// Ворота and двері have no singular: «одні ворота», «двоє воріт», «одні двері», never «1 ворота» or «2 ворота» (04.10)
const GATES_COUNTED: Record<1 | 2, string> = { 1: 'одні', 2: 'двоє' };
/** The type's word after the numeral: «одні стандартні», «двоє стандартних»; «для заїзду техніки» does not change */
const GATE_TYPE_COUNTED: Record<GateType, Record<1 | 2, string>> = {
  standard: { 1: 'стандартні', 2: 'стандартних' },
  double: { 1: 'для заїзду техніки', 2: 'для заїзду техніки' },
};

/** «без воріт», «одні ворота», «двоє воріт» — the phone header and the mini readout, where the noun is not a row label */
export function gatesCountPhrase(gates: number): string {
  if (gates <= 0) return 'без воріт';
  return gates === 1 ? 'одні ворота' : 'двоє воріт';
}

/** «без дверей», «одні двері» — a door is one preset, never a count (DoorCount) */
export function doorsCountPhrase(doors: number): string {
  return doors <= 0 ? 'без дверей' : 'одні двері';
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Phase 3F.1, brief §D — includes the gate's own real, fixed size (GATE_DIMENSIONS_M) alongside
 * the count and type, after the brief's own worked example ("1 × стандартні, 4×4 м"), now said with the numeral
 * plural-only nouns take — «Одні стандартні, 4 × 4 м», «Двоє для заїзду техніки, 5 × 5 м» (04.10). Gate
 * count and type are customer inputs; the size that comes with a chosen type is a real product
 * fact worth carrying into a lead brief the same way `foundationTypeLabel` already is — not
 * manufacturer/model detail, just the dimension the type itself implies.
 */
/** Customer input, not derived visualization — the door is something the customer asked for, so
 *  it belongs in the summary (and in any future lead brief) with its real fixed size. */
function formatDoorsLabel(doors: HangarDomainModel['doors'], wallsInScope: boolean, asked: HangarDomainModel['doors']): string | null {
  if (!wallsInScope) return null;
  // a door the gates and the width leave no room for: asked, and said why it is not drawn
  if (asked > doors) return `Одні службові, ${formatSize(DOOR_DIMENSIONS_M.widthM, DOOR_DIMENSIONS_M.heightM)}${NBSP}— у схемі немає місця`;
  if (doors === 0) return 'Не передбачені';
  // «Одні службові, 1 × 2,1 м»: it read «1 × 1×2,1 м», a count and a size with the same sign (04.10)
  return `Одні службові, ${formatSize(DOOR_DIMENSIONS_M.widthM, DOOR_DIMENSIONS_M.heightM)}`;
}

/**
 * Phase 3F.2 — `null` when walls are out of scope, and null MEANS "not part of this request", not
 * "unknown". A gate and a door are openings cut INTO a wall, so neither can belong to a request
 * that excludes walls: there is nothing for them to be cut into, and quoting them would be quoting
 * work nobody asked for. The 3D renderer has refused to draw them in this state for phases, in its
 * own words — "a gate is an opening cut INTO a wall — it cannot read as an opening with no wall to
 * cut into" (threeSceneModel.ts). The summary and the lead brief did not know the rule, so a
 * request for foundation + frame + roof still announced "Ворота: 2 × стандартні" one line under
 * "Обсяг: Фундамент + Металокаркас + Покрівля".
 *
 * The customer's CHOICE is still kept — in the controls, which are disabled rather than cleared,
 * so putting walls back restores it. It just does not travel into a request that has no walls.
 *
 * Modelled as null rather than as a "поза обсягом" string on purpose: an absence should be an
 * absence, so every consumer has to decide what to do with it instead of accidentally printing a
 * caveat as though it were a line item.
 */
function formatGatesLabel(domain: HangarDomainModel): string | null {
  if (!domain.scope.walls) return null;
  const asked = domain.requestedOpenings;
  // Gates the sizes leave no room for are still the visitor's answer: the lead says what they asked and why the scheme
  // does not draw it (07.10, audit: «Без воріт» told the manager no gates were wanted)
  if (asked.gates > 0 && (asked.gates !== domain.gates || asked.gateType !== domain.gateType)) {
    const { widthM, heightM } = GATE_DIMENSIONS_M[asked.gateType];
    const reason = gateHeightFits(asked.gateType, domain.dimensions.eaveHeightM)
      ? `за ширини ${formatMeters(domain.dimensions.widthM)}${NBSP}м у схемі не вміщуються`
      : `під стіни ${formatMeters(domain.dimensions.eaveHeightM)}${NBSP}м у схемі не вміщуються`;
    const count = asked.gates as 1 | 2;
    return `${capitalise(GATES_COUNTED[count])} ${GATE_TYPE_COUNTED[asked.gateType][count]}, ${formatSize(widthM, heightM)}${NBSP}— ${reason}`;
  }
  if (domain.gates === 0) return 'Без воріт';
  const { widthM, heightM } = GATE_DIMENSIONS_M[domain.gateType];
  return `${capitalise(GATES_COUNTED[domain.gates])} ${GATE_TYPE_COUNTED[domain.gateType][domain.gates]}, ${formatSize(widthM, heightM)}`;
}

/** «Обсяг» said as answered, the same words in the stamp and the lead (07.10, audit: «Допоможіть визначити» read
 *  «Фундамент + Металокаркас + …» in the stamp, as if every work had been ordered) */
function formatScopeLabel(domain: HangarDomainModel, ordered: string[]): string {
  if (domain.scopeMode === 'help') return SCOPE_MODE_LABELS.help;
  const list = ordered.join(' + ');
  if (domain.scopeMode === 'full') return `${SCOPE_MODE_LABELS.full}: ${list}`;
  // under the row label «Обсяг» (04.10: «Обсяг: Обсяг робіт ще не обрано»)
  return ordered.length ? list : 'Ще не обрано';
}

function formatOpeningsLabel(gatesLabel: string | null, doorsLabel: string | null): string {
  if (gatesLabel === null || doorsLabel === null) return OUT_OF_SCOPE_LABEL;
  if (doorsLabel === 'Не передбачені') return `${gatesLabel} · двері не передбачені`;
  return `${gatesLabel} · двері: ${doorsLabel.toLowerCase()}`;
}

function formatStructuralVisualizationDescription(domain: HangarDomainModel): string {
  const roof = domain.structural.roofStructure === 'truss' ? 'ферму' : 'портальну раму';
  const supports = domain.structural.scheme === 'centerSupport'
    ? 'з центральним рядом опор'
    : 'без внутрішніх опор';
  return `Для ширини ${formatMeters(domain.dimensions.widthM)}${NBSP}м у попередній візуалізації показано ${roof} ${supports}.`;
}

/**
 * Pure: no DOM, no rounding surprises hidden in a component. Reads the already-resolved
 * `HangarDomainModel` (not raw ConfiguratorState) — the same domain object the scene model is
 * built from, so Summary and Scene never disagree about what "walls present" means. `areaSqm`
 * is computed once in deriveDomainModel(); this only formats it. See the brief's "IMPORTANT
 * PRODUCT RULE": no price, tonnage, load, concrete volume, or roof area without construction
 * assumptions this POC hasn't made.
 */
export function deriveSummary(domain: HangarDomainModel): ConfiguratorSummary {
  const { widthM, lengthM, eaveHeightM } = domain.dimensions;
  const orderedScope = SCOPE_ORDER.filter((item) => domain.scope[item]);
  const gatesLabel = formatGatesLabel(domain);
  const doorsLabel = formatDoorsLabel(domain.doors, domain.scope.walls, domain.requestedOpenings.doors);
  const ridge = formatMeters(ridgeHeightM(widthM, eaveHeightM, domain.roof.pitchDeg));
  const roofSlopeLabel = formatRoofSlope(domain.roof.pitchDeg);
  const dimensionsLabel = formatSize(widthM, lengthM, eaveHeightM);
  const envelopeLabel = formatEnvelopeLabel(domain.envelope, domain.scope);

  return {
    areaSqm: domain.areaSqm,
    areaLabel: `≈${NBSP}${domain.areaSqm.toLocaleString('uk-UA')}${NBSP}м²`,
    dimensionsLabel,
    // Without walls and roof there is no envelope to name, and «24 × 60 × 8 м · Поза обсягом заявки» read as if the
    // whole hangar were out of the request (04.10)
    // the «·» keeps to the sizes: it started a line at 1440 px (04.10)
    headlineLabel: domain.scope.walls || domain.scope.roof ? `${dimensionsLabel}\u00A0· ${envelopeLabel}` : dimensionsLabel,
    ridgeHeightLabel: `${ridge}${NBSP}м · ${roofSlopeLabel}`,
    roofSlopeLabel,
    objectProfile: objectProfileLabels(domain.objectProfile),
    envelopeLabel,
    claddingSystemLabel: formatCladdingSystemLabel(domain.envelope, domain.scope),
    foundationTypeLabel: FOUNDATION_TYPE_LABELS[domain.foundation.type],
    structuralVisualizationLabel: `${ROOF_STRUCTURE_LABELS[domain.structural.roofStructure]} · ${STRUCTURAL_SCHEME_LABELS[domain.structural.scheme]}`,
    structuralVisualizationDescription: formatStructuralVisualizationDescription(domain),
    scopeLabels: orderedScope.map((item) => SCOPE_LABELS[item]),
    scopeSummaryLabel: formatScopeLabel(domain, orderedScope.map((item) => SCOPE_LABELS[item])),
    gatesLabel,
    doorsLabel,
    openingsLabel: formatOpeningsLabel(gatesLabel, doorsLabel),
  };
}
