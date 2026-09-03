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
