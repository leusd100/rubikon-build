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
 */
export const DIMENSION_BOUNDS: Record<keyof Dimensions, DimensionBounds> = {
  width: { min: 10, max: 60, step: 1 },
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
  envelope: 'insulated',
  // Profiled sheet is the more common, more economical choice for this product category —
  // sandwich panel is typically the upgrade, not the default.
  wallSystem: 'profiled-sheet',
  roofSystem: 'profiled-sheet',
  // Honest-by-default (see FoundationType's own doc comment): a fresh configurator has not had a
  // foundation engineered, so it should not silently claim "slab" on the customer's behalf.
  foundationType: 'engineeringDecision',
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
