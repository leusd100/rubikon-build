// Typed state for the hangar configurator POC. Kept isolated from every other data model in
// the app on purpose — this is a UX proof of concept, not a lead/pricing schema (see
// docs/configurator-poc.md for the boundary). The shape below is exactly what the brief asked
// for: dimensions / envelope / scope / openings, nothing more.

import { DEFAULT_OBJECT_PROFILE, type ObjectProfile } from './objectProfile';

export type Dimensions = {
  /** metres */
  width: number;
  /** metres */
  length: number;
  /** metres, wall height */
  height: number;
};

export type EnvelopeChoice = 'cold' | 'insulated' | 'undecided';

/**
 * The physical cladding SYSTEM — what the wall/roof surface is actually built from — as distinct
 * from `EnvelopeChoice` above, which is a THERMAL choice (cold/insulated/undecided) orthogonal to
 * it: a customer can want an insulated sandwich-panel building or an insulated profiled-sheet one
 * (with separate insulation behind it) equally validly. Phase 3D's own product question.
 *
 * Deliberately two options, matching the brief: profiled sheet (профнастил) and sandwich panel
 * (сендвіч-панель) cover RUBIKON's actual industrial/agricultural product line. Metal tile
 * (металочерепиця) is a residential-roofing convention this product category does not sell, so it
 * is intentionally absent rather than added for completeness.
 */
export type CladdingSystem = 'profiled-sheet' | 'sandwich-panel';

/**
 * Phase 3E, brief §18 — the DEFAULT wall/roof system a `cold`/`insulated` envelope choice starts
 * a customer at, not a rule this state enforces. `cold` → profiled sheet (the plainer, more
 * economical unheated-building product); `insulated` → sandwich panel (the common insulated-
 * envelope product). `undecided` has no entry — see `applyEnvelopePreset`'s own doc comment,
 * which is where this table is actually used, for why: picking "not yet decided" must never
 * silently pick materials on the customer's behalf either.
 *
 * This is intentionally the ONLY place `envelope` and `wallSystem`/`roofSystem` interact.
 * `CladdingSystem`'s own doc comment above still holds — the two remain genuinely orthogonal
 * domain facts, both stored independently, both able to diverge — this table only supplies a
 * sensible STARTING POINT when the high-level choice changes, per the brief's own explicit
 * "do NOT hard-lock mixed combinations" instruction.
 */
export const ENVELOPE_MATERIAL_PRESET: Record<'cold' | 'insulated', { wallSystem: CladdingSystem; roofSystem: CladdingSystem }> = {
  cold: { wallSystem: 'profiled-sheet', roofSystem: 'profiled-sheet' },
  insulated: { wallSystem: 'sandwich-panel', roofSystem: 'sandwich-panel' },
};

/**
 * Whether the CURRENT wallSystem/roofSystem still match what `envelope` would imply by default —
 * `undecided` trivially always "matches" (it never implied anything). Used by the summary layer
 * (see deriveSummary.ts) to stop claiming a simple "Холодний"/"Утеплений" label the moment a
 * customer manually overrides one system away from that preset — see brief §18's own "the state
 * must no longer claim a simple preset if that would be semantically misleading".
 */
export function envelopeMatchesPreset(envelope: EnvelopeChoice, wallSystem: CladdingSystem, roofSystem: CladdingSystem): boolean {
  if (envelope === 'undecided') return true;
  const preset = ENVELOPE_MATERIAL_PRESET[envelope];
  return wallSystem === preset.wallSystem && roofSystem === preset.roofSystem;
}

/**
 * Foundation TYPE — a real configuration fact (which product RUBIKON would actually quote/supply),
 * not a presentation choice, which is why it lives here next to `envelope`/`scope` rather than as
 * 3D-only state the way Phase 3C's colour presets do. See parametricModel.ts's own doc comment on
 * `buildFootings` for how "isolated" actually changes geometry, and domainModel.ts for why
 * `engineeringDecision` is not treated as a third material fact but a deferred one.
 *
 * `engineeringDecision` — "Визначити після розрахунку" — exists because this configurator does not
 * perform structural/foundation engineering (see the brief's own "engineering honesty" section) and
 * should never make it look like it silently picked a real answer on the customer's behalf. It is
 * NOT a residual/default value to route around; a real customer who has not had a foundation
 * engineered yet is expected to land here deliberately.
 */
export type FoundationType = 'slab' | 'isolated' | 'engineeringDecision';

/**
 * Phase 3E — the structural LAYOUT: whether the building has an internal support line, as
 * distinct from `RoofStructure` below (what spans between supports).
 *
 * Phase 3E.1 (the "structural auto-derivation" follow-up brief) removed the manual public control
 * for this: a customer no longer picks a scheme directly, and this is no longer stored in
 * `ConfiguratorState` at all. It is now DERIVED entirely from `dimensions.width` by
 * `deriveStructuralVisualization` in parametricModel.ts, every time the domain model is built —
 * see that function's own doc comment, and `STRUCTURAL_VISUALIZATION_THRESHOLDS` for why the
 * thresholds are a visualization heuristic, never an engineering requirement claim. There is no
 * `engineeringDecision` value any more for this specific fact: a width always resolves to a
 * concrete scheme, so there is nothing left "undecided" once the customer has entered a width.
 *
 * The type itself, and every geometry function keyed on it (`buildInternalColumns` and friends in
 * parametricModel.ts), still accept and produce BOTH values freely — the derivation is the only
 * thing that narrowed to a specific width-driven mapping; the underlying geometric capability
 * remains fully general and is exercised directly (bypassing the derivation) by tests that need a
 * combination the derivation itself never produces, e.g. `portalRafter` + `centerSupport`.
 */
export type StructuralScheme = 'clearSpan' | 'centerSupport';

/**
 * Phase 3E — what spans between supports, as distinct from `StructuralScheme` above. `truss` is
 * a visually distinct alternative to the existing portal/rafter system (see parametricModel.ts's
 * own `buildTrussWebs` doc comment for the schematic assumptions).
 *
 * Same Phase 3E.1 note as `StructuralScheme` above: no longer a stored, customer-facing choice —
 * derived from width by `deriveStructuralVisualization`, no `engineeringDecision` value left for
 * the same reason (a width always resolves to a concrete answer).
 */
export type RoofStructure = 'portalRafter' | 'truss';

export type ScopeItem = 'foundation' | 'frame' | 'walls' | 'roof';

/** 0, 1 or 2 gates on the front facade — deliberately not a general opening system (see brief). */
export type GatesCount = 0 | 1 | 2;
/** One standard personnel door, or none. Deliberately not a number: the product offers a single
 *  fixed-preset door, not a door count the customer tunes (see DOOR_DIMENSIONS_M). */
export type DoorCount = 0 | 1;

/**
 * Gate size class. `double` is the wide, tall opening used to drive equipment in — the case
 * customers ask about by name. It is a size choice, not a leaf-count claim: this tool does not
 * model hardware, and the drawing shows an opening, not a door.
 */
export type GateType = 'standard' | 'double';

export type ConfiguratorState = {
  dimensions: Dimensions;
  /**
   * Ridge height above the slab, in metres — the "коник".
   *
   * Held here rather than derived on the fly because it is now a user choice. Its legal range
   * depends on the current width and eave height (see parametricModel.ts's ridgeHeightRangeM),
   * which is exactly why it is NOT part of `dimensions`: DIMENSION_BOUNDS is a static table, and
   * this one moves. Roof pitch is derived from it, never stored.
   *
   * Until the visitor edits it (`ridgeEdited`), the ridge is the span rule's for the current width and eave height
   * (resolveRidgeHeightM in domainModel.ts): only clamping it let the slope drift with the width alone — 5.9° at
   * 50 m, 19.3° at 12 m — and the lead received a «Висота в конику» nobody had chosen (03.10). Once edited, this is
   * the visitor's value as typed: the sizes no longer rewrite it (04.10), resolveRidgeHeightM holds it in the range,
   * and it comes back when the range lets it.
   */
  ridgeHeightM: number;
  /** The visitor has set the ridge themselves; from then on it is clamped, no longer re-derived. Set back to false when
   *  they set the span rule's own value (withRidge, 04.10) or ask for it back. */
  ridgeEdited: boolean;
  envelope: EnvelopeChoice;
  /** Cladding system, independent of the thermal `envelope` choice above — see `CladdingSystem`. */
  wallSystem: CladdingSystem;
  roofSystem: CladdingSystem;
  foundationType: FoundationType;
  /** Which scope items are included in this request — a scope list, not a structural claim. */
  scope: ScopeItem[];
  /** The openings as the visitor chose them, kept while the sizes leave no room for them (04.10): deriveDomainModel
   *  places what fits, and the choice returns with the room. */
  gates: GatesCount;
  gateType: GateType;
  doors: DoorCount;
  /** «Об’єкт»: purpose, project, region, lifting equipment — see objectProfile.ts. */
  objectProfile: ObjectProfile;
  /** The groups the visitor answered (ConfirmedTopic); the rest is the example's */
  confirmed: ConfirmedTopic[];
  /** «Точних розмірів ще немає» (07.10): the drawn sizes are then only an orientation */
  sizesUnknown: boolean;
  internalSupports: InternalSupports;
  /** How the visitor answered the scope; `scope` stays the drawn list (all four unless «Окремі роботи») */
  scopeMode: ScopeMode;
};

/**
 * The groups the visitor answered themselves (07.10). Everything else in the state is the page's example — the
 * configurator starts from 24 × 60 × 8 м, cold, profiled sheet, one gate, the whole scope — and the stamp and the lead
 * must not call it «Ви обрали»: changing the width alone used to make every default the visitor's choice. A group is
 * confirmed by any change in it, or by choosing its current value again: an answer, not a difference.
 */
export type ConfirmedTopic = 'dimensions' | 'envelope' | 'cladding' | 'openings' | 'scope';
export const CONFIRMED_TOPICS: ConfirmedTopic[] = ['dimensions', 'envelope', 'cladding', 'openings', 'scope'];

/** The state with `topic` answered */
export function withConfirmed(state: ConfiguratorState, topic: ConfirmedTopic): ConfiguratorState {
  return state.confirmed.includes(topic) ? state : { ...state, confirmed: [...state.confirmed, topic] };
}

/** «Колони всередині ангара» (07.10): whether a row of columns may stand inside. Until answered, the drawing's centre row
 *  is the width's visualisation rule (deriveStructuralVisualization); «Не можна» draws the span clear. */
export type InternalSupports = 'allowed' | 'not-allowed' | 'unknown';
/** The answer as the stamp and the lead say it, under «Простір усередині» — the space the client asked about, not the
 *  engineer's «колони: не можна» (10.10, owner) */
export const INTERNAL_SUPPORTS_LABELS: Record<InternalSupports, string> = {
  allowed: 'Колони можна',
  'not-allowed': 'Без колон',
  unknown: 'Ще не знаю',
};
/** The question from the client's side, «Потрібен простір без колон усередині?», and its answers (10.10, owner): the
 *  space without columns first, as it is asked */
export const INTERNAL_SUPPORTS_ANSWERS: Record<InternalSupports, string> = {
  'not-allowed': 'Так, без колон',
  allowed: 'Колони можна',
  unknown: 'Ще не знаю',
};
export const INTERNAL_SUPPORTS_ORDER: InternalSupports[] = ['not-allowed', 'allowed', 'unknown'];

/** «Обсяг робіт» (07.10): the whole set, some of the works (the list), or help to decide */
export type ScopeMode = 'full' | 'partial' | 'help';
export const SCOPE_MODE_LABELS: Record<ScopeMode, string> = {
  full: 'Комплекс робіт',
  partial: 'Окремі роботи',
  help: 'Допоможіть визначити',
};
export const SCOPE_MODE_ORDER: ScopeMode[] = ['full', 'partial', 'help'];

export type DimensionBounds = { min: number; max: number; step: number };

/**
 * UX-only slider/input boundaries — not construction norms. Chosen to keep the isometric
 * preview legible across the whole range, not derived from any building code.
 *
 * `width.max` was lowered from 60 to 50 in the Phase 3E.1 follow-up brief — a deliberate scope
 * decision ("keeps the product within a deliberate scope... avoids implying that every extreme
 * industrial building can be represented by this preliminary tool"), not a bug fix. `clampDimension`
 * below is the ONLY place a stored width is ever reconciled against this bound, so lowering it here
 * is also the complete migration path for any width value that predates the change: the very next
 * render clamps it down to 50, the same way any other out-of-range value already gets handled.
 */
export const DIMENSION_BOUNDS: Record<keyof Dimensions, DimensionBounds> = {
  width: { min: 10, max: 50, step: 1 },
  length: { min: 10, max: 120, step: 1 },
  height: { min: 4, max: 15, step: 0.5 },
};

export const ENVELOPE_LABELS: Record<EnvelopeChoice, string> = {
  cold: 'Холодний',
  insulated: 'Утеплений',
  undecided: 'Ще не визначено',
};

export const CLADDING_SYSTEM_LABELS: Record<CladdingSystem, string> = {
  'profiled-sheet': 'Профнастил',
  'sandwich-panel': 'Сендвіч-панель',
};

export const CLADDING_SYSTEM_ORDER: CladdingSystem[] = ['profiled-sheet', 'sandwich-panel'];

// «Після розрахунку проєктувальника» (10.10, audit F43): it was «Визначити після розрахунку», an infinitive that read as
// an order to the reader, under the row name «Основа» — the ground under a foundation in ДБН, not the foundation
export const FOUNDATION_TYPE_LABELS: Record<FoundationType, string> = {
  engineeringDecision: 'Після розрахунку проєктувальника',
  slab: 'Монолітна плита',
  isolated: 'Окремі фундаменти під колони',
};

// Deliberately leads with the honest "not yet decided" option — see `FoundationType`'s own doc
// comment — rather than defaulting the display order to whichever reads most impressive.
export const FOUNDATION_TYPE_ORDER: FoundationType[] = ['engineeringDecision', 'slab', 'isolated'];

// Labels for the DERIVED result only now (Phase 3E.1) — there is no radiogroup to order any more,
// see StructuralScheme/RoofStructure's own doc comments, so the `_ORDER` arrays that used to drive
// those controls were removed along with them.
// «колони», the visitor's own word (10.10, audit F37): the step asks «Колони всередині ангара», and the stamp beside it
// said «Без внутрішніх опор»; «Ферма» as the step and the frame drawing name it, without «Металева»
export const STRUCTURAL_SCHEME_LABELS: Record<StructuralScheme, string> = {
  clearSpan: 'Без внутрішніх колон',
  centerSupport: 'Центральний ряд колон',
};

export const ROOF_STRUCTURE_LABELS: Record<RoofStructure, string> = {
  portalRafter: 'Рама',
  truss: 'Ферма',
};

// The works as the steps name them (10.10, audit F35): «Каркас» is the step's name, and «Стіни / огороджувальний контур»
// ran the scope to 2–4 lines while its «контур» took in the roof listed beside it
export const SCOPE_LABELS: Record<ScopeItem, string> = {
  foundation: 'Фундамент',
  frame: 'Каркас',
  walls: 'Стіни',
  roof: 'Покрівля',
};

export const SCOPE_ORDER: ScopeItem[] = ['foundation', 'frame', 'walls', 'roof'];

export const GATES_OPTIONS: GatesCount[] = [0, 1, 2];
export const DOOR_OPTIONS: DoorCount[] = [0, 1];
/** «Службові двері: Так / Ні» (10.10, owner): one switch — «Без дверей» and «1» read as a count to tune */
export const DOOR_LABELS: Record<DoorCount, string> = { 1: 'Так', 0: 'Ні' };
export const DOOR_SWITCH_ORDER: DoorCount[] = [1, 0];

export const GATE_TYPE_LABELS: Record<GateType, string> = {
  standard: 'Стандартні',
  double: 'Для заїзду техніки',
};

export const GATE_TYPE_ORDER: GateType[] = ['standard', 'double'];

/** 24×60×8 — the same reference object used as the brief's own "Ваш об'єкт" example. */
export const DEFAULT_CONFIGURATOR_STATE: ConfiguratorState = {
  dimensions: { width: 24, length: 60, height: 8 },
  // The span rule's own answer for 24 m × 8 m (12.04° → 10.56 m), snapped to the 0.1 m
  // adjustment step. Kept as a literal so this module stays free of geometry imports.
  ridgeHeightM: 10.6,
  ridgeEdited: false,
  // Phase 3E, brief §18: kept consistent with the wallSystem/roofSystem default right below —
  // 'insulated' here with 'profiled-sheet' materials was exactly the "Контур" no longer matches
  // the actual system" state this phase's own preset-drift logic exists to detect and label
  // honestly (envelopeMatchesPreset), which is the wrong thing for a FRESH configurator nobody
  // has touched yet to already be in. 'cold' is `ENVELOPE_MATERIAL_PRESET`'s own match for
  // profiled sheet.
  envelope: 'cold',
  // Profiled sheet is the more common, more economical choice for this product category —
  // sandwich panel is typically the upgrade, not the default.
  wallSystem: 'profiled-sheet',
  roofSystem: 'profiled-sheet',
  // Honest-by-default (see FoundationType's own doc comment): a fresh configurator has not had a
  // foundation engineered, so it should not silently claim "slab" on the customer's behalf.
  foundationType: 'engineeringDecision',
  // Structural scheme / roof structure are no longer stored here at all (Phase 3E.1) — they are
  // derived from `dimensions.width` on every render by deriveStructuralVisualization. At this
  // default 24 m width that derivation yields truss + centerSupport.
  scope: ['foundation', 'frame', 'walls', 'roof'],
  gates: 1,
  gateType: 'standard',
  // A personnel door is a real, common part of a hangar facade, but it is the customer's call —
  // defaulted off so a fresh configurator claims nothing that was not chosen.
  doors: 0,
  // Every «Об’єкт» answer starts unanswered — «Ще не знаю», no purpose — so the defaults stay «untouched»
  objectProfile: DEFAULT_OBJECT_PROFILE,
  // Nothing answered yet: every value above is the example's
  confirmed: [],
  sizesUnknown: false,
  internalSupports: 'unknown',
  scopeMode: 'full',
};

export function clampDimension(key: keyof Dimensions, value: number): number {
  const { min, max, step } = DIMENSION_BOUNDS[key];
  if (Number.isNaN(value)) return DEFAULT_CONFIGURATOR_STATE.dimensions[key];
  const clamped = Math.min(max, Math.max(min, value));
  // Snap to the nearest step so keyboard/arrow input and the slider agree on the same values.
  const steps = Math.round((clamped - min) / step);
  return Math.round((min + steps * step) * 100) / 100;
}

export function hasScopeItem(scope: ScopeItem[], item: ScopeItem): boolean {
  return scope.includes(item);
}

export function toggleScopeItem(scope: ScopeItem[], item: ScopeItem): ScopeItem[] {
  return hasScopeItem(scope, item) ? scope.filter((entry) => entry !== item) : [...scope, item];
}
