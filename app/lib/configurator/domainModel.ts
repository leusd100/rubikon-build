import { clampGateSelection, clampRidgeHeightM, deriveStructuralVisualization, pitchDegForRidge } from './parametricModel';
import type {
  CladdingSystem,
  ConfiguratorState,
  EnvelopeChoice,
  FoundationType,
  GateType,
  GatesCount,
  RoofStructure,
  StructuralScheme,
} from './types';

// The normalized, always-JSON-serializable business object derived from ConfiguratorState.
// This is the layer both the summary and the parametric building model read from — neither
// reads raw ConfiguratorState directly, so a future object type (grain storage, etc.) only
// needs its own deriveDomainModel-equivalent, not changes to Summary/Geometry consumers.
// Kept plain data on purpose: no functions, nothing renderer-specific.

export type RoofType = 'gable';

export type HangarDomainModel = {
  objectType: 'hangar';
  dimensions: {
    widthM: number;
    lengthM: number;
    /**
     * Wall / eave height — renamed from the previous ambiguous `heightM` in Phase 3-0.
     * With a real gable roof, "the height of the building" is no longer one number:
     * this is where the wall stops and the roof starts. Overall height is the ridge,
     * derived in parametricModel.ts and never stored here.
     */
    eaveHeightM: number;
  };
  /**
   * Roof form. `pitchDeg` is RESOLVED here (from the span rule in parametricModel.ts)
   * rather than left implicit, so the domain object stays a complete, serializable
   * description of the object — a future lead payload or saved configuration should not
   * have to re-run a geometry rule to know what was quoted.
   *
   * The user adjusts the RIDGE HEIGHT in metres (the "коник"), which is the number the drawing
   * annotates and the number a customer actually cares about for clearance. Pitch is derived from
   * it here, in degrees, because that is what the geometry needs — it is never stored, so the two
   * can never disagree.
   *
   * Phase 3-0 deliberately did not expose this at all, on the grounds that pitch is an engineering
   * outcome. That still holds for *pitch*; what changed is the control surface — a ridge height in
   * metres, held inside limits that keep the roof credible, is a proportion choice rather than a
   * structural claim. The schematic disclaimer is unchanged.
   */
  roof: { type: RoofType; pitchDeg: number };
  /**
   * Split into walls/roof in Phase 3-0. The UI still offers one choice and maps it to
   * both — but the *model* can now express "cold walls, insulated roof", which is a real
   * configuration RUBIKON sells and the previous single-value shape could not represent.
   */
  envelope: {
    walls: EnvelopeChoice;
    roof: EnvelopeChoice;
    /**
     * Phase 3D: the physical cladding system, orthogonal to the thermal choice above (see
     * `CladdingSystem`'s own doc comment in types.ts — a customer can want an insulated
     * sandwich-panel building or an insulated profiled-sheet one equally validly).
     */
    wallSystem: CladdingSystem;
    roofSystem: CladdingSystem;
  };
  /**
   * Phase 3D: a real configuration fact — which foundation RUBIKON would actually supply — not
   * presentation state, unlike Phase 3C's colour presets. See `FoundationType`'s own doc comment.
   */
  foundation: { type: FoundationType };
  /**
   * Phase 3E; re-derived from width in Phase 3E.1 (see below). A real configuration fact the same
   * way `foundation.type` is, not renderer styling — but, unlike every other field on this object,
   * NOT copied from `ConfiguratorState`: as of Phase 3E.1 it is computed fresh by
   * `deriveStructuralVisualization` every time this function runs, from `dimensions.widthM` alone.
   * See `StructuralScheme`/`RoofStructure`'s own doc comments in types.ts for why neither is a
   * customer-facing choice any more, and `deriveStructuralVisualization`'s own doc comment in
   * parametricModel.ts for why this is the one and only place that call happens.
   */
  structural: { scheme: StructuralScheme; roofStructure: RoofStructure };
  // Resolved booleans, not a raw scope[] array — every consumer asks "is walls present?",
  // not "does the array contain the string 'walls'?".
  scope: {
    foundation: boolean;
    frame: boolean;
    walls: boolean;
    roof: boolean;
  };
  /**
   * Phase 3F.1 — re-clamped here on every derivation, same pattern and rationale as `roof.pitchDeg`
   * above: a gate count/type combination that was legal at one width/eave height may not be at
   * another (fixed-size gates, brief §B1-B2 — see GATE_DIMENSIONS_M's own doc comment in
   * parametricModel.ts). Clamping here means the model is always self-consistent regardless of how
   * state was produced, the same guarantee `clampRidgeHeightM` already gives `roof.pitchDeg`.
   */
  gates: GatesCount;
  /** Size class of those gates — a real, fixed real-world size (see GATE_DIMENSIONS_M), not an
   *  engineered specification. */
  gateType: GateType;
  areaSqm: number;
};

export function deriveDomainModel(state: ConfiguratorState): HangarDomainModel {
  const { width, length, height } = state.dimensions;
  return {
    objectType: 'hangar',
    dimensions: { widthM: width, lengthM: length, eaveHeightM: height },
    // Re-clamped on every derivation: the legal ridge range moves when width or eave height
    // change, so a ridge that was legal at 24 m may not be at 60 m. Clamping here rather than in
    // the control means the model is always self-consistent regardless of how state was produced.
    roof: { type: 'gable', pitchDeg: pitchDegForRidge(width, height, clampRidgeHeightM(state.ridgeHeightM, width, height)) },
    envelope: { walls: state.envelope, roof: state.envelope, wallSystem: state.wallSystem, roofSystem: state.roofSystem },
    foundation: { type: state.foundationType },
    // Width-derived, not read from state — see `structural`'s own doc comment above.
    structural: deriveStructuralVisualization(width),
    scope: {
      foundation: state.scope.includes('foundation'),
      frame: state.scope.includes('frame'),
      walls: state.scope.includes('walls'),
      roof: state.scope.includes('roof'),
    },
    ...clampGateSelection(state.gates, state.gateType, width, height),
    areaSqm: Math.round(width * length),
  };
}
