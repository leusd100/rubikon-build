// Typed state for the hangar configurator POC. Kept isolated from every other data model in
// the app on purpose — this is a UX proof of concept, not a lead/pricing schema (see
// docs/configurator-poc.md for the boundary). The shape below is exactly what the brief asked
// for: dimensions / envelope / scope / openings, nothing more.

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
   */
  ridgeHeightM: number;
  envelope: EnvelopeChoice;
  /** Cladding system, independent of the thermal `envelope` choice above — see `CladdingSystem`. */
  wallSystem: CladdingSystem;
  roofSystem: CladdingSystem;
  foundationType: FoundationType;
  /** Which scope items are included in this request — a scope list, not a structural claim. */
  scope: ScopeItem[];
  gates: GatesCount;
  gateType: GateType;
};

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
  undecided: 'Ще не визначився',
};

export const CLADDING_SYSTEM_LABELS: Record<CladdingSystem, string> = {
  'profiled-sheet': 'Профнастил',
  'sandwich-panel': 'Сендвіч-панель',
};

export const CLADDING_SYSTEM_ORDER: CladdingSystem[] = ['profiled-sheet', 'sandwich-panel'];

export const FOUNDATION_TYPE_LABELS: Record<FoundationType, string> = {
  engineeringDecision: 'Визначити після розрахунку',
  slab: 'Монолітна плита',
  isolated: 'Окремі фундаменти під колони',
};

// Deliberately leads with the honest "not yet decided" option — see `FoundationType`'s own doc
// comment — rather than defaulting the display order to whichever reads most impressive.
export const FOUNDATION_TYPE_ORDER: FoundationType[] = ['engineeringDecision', 'slab', 'isolated'];

// Labels for the DERIVED result only now (Phase 3E.1) — there is no radiogroup to order any more,
// see StructuralScheme/RoofStructure's own doc comments, so the `_ORDER` arrays that used to drive
// those controls were removed along with them.
export const STRUCTURAL_SCHEME_LABELS: Record<StructuralScheme, string> = {
  clearSpan: 'Без внутрішніх опор',
  centerSupport: 'Центральний ряд опор',
};

export const ROOF_STRUCTURE_LABELS: Record<RoofStructure, string> = {
  portalRafter: 'Рама',
  truss: 'Металева ферма',
};

export const SCOPE_LABELS: Record<ScopeItem, string> = {
  foundation: 'Фундамент',
  frame: 'Металокаркас',
  walls: 'Стіни / огороджувальний контур',
  roof: 'Покрівля',
};

export const SCOPE_ORDER: ScopeItem[] = ['foundation', 'frame', 'walls', 'roof'];

export const GATES_OPTIONS: GatesCount[] = [0, 1, 2];

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
