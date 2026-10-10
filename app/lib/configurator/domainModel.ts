import {
  clampDoorSelection,
  clampGateSelection,
  clampRidgeHeightM,
  defaultRidgeHeightM,
  deriveStructuralVisualization,
  pitchDegForRidge,
} from './parametricModel';
import type { HangarPurpose, ObjectProfile } from './objectProfile';
import { CONFIRMED_TOPICS, DEFAULT_CONFIGURATOR_STATE, ENVELOPE_MATERIAL_PRESET, SCOPE_ORDER, envelopeMatchesPreset, withConfirmed } from './types';
import type {
  ScopeItem,
  CladdingSystem,
  ConfirmedTopic,
  ConfiguratorState,
  InternalSupports,
  ScopeMode,
  EnvelopeChoice,
  FoundationType,
  GateType,
  DoorCount,
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
  /** Personnel doors the customer asked for, re-clamped here the same way `gates` is: a door that
   *  cannot be placed clear of the corners, the gates and the centre-support line is dropped, so
   *  the model never carries a door the geometry then refuses to draw. */
  doors: DoorCount;
  /** Size class of those gates — a real, fixed real-world size (see GATE_DIMENSIONS_M), not an
   *  engineered specification. */
  gateType: GateType;
  areaSqm: number;
  /** «Об’єкт» answers, copied as given: business facts for the lead, nothing the geometry reads. */
  objectProfile: ObjectProfile;
  /** The groups the visitor answered (types.ts ConfirmedTopic): what the stamp and the lead may call their choice */
  confirmed: ConfirmedTopic[];
  sizesUnknown: boolean;
  internalSupports: InternalSupports;
  scopeMode: ScopeMode;
  /** The groups still the page's example: not answered, and holding the example's value (exampleTopics) */
  exampleTopics: ConfirmedTopic[];
  /** The openings as chosen, before the sizes held them to what fits */
  requestedOpenings: { gates: GatesCount; gateType: GateType; doors: DoorCount };
};

/**
 * The ridge the configuration stands for. Until the visitor edits it, the span rule's ridge for the current width and
 * eave height (defaultRidgeHeightM, snapped to the 0.1 m step), so changing only the width keeps a credible slope
 * instead of drifting to 5.9° at 50 m or 19.3° at 12 m (03.10). Once edited, the visitor's value, held inside the
 * range for the current footprint. The controls show and store this same value, so the field, the drawing, the
 * summary and the lead never disagree.
 */
export function resolveRidgeHeightM(state: Pick<ConfiguratorState, 'dimensions' | 'ridgeHeightM' | 'ridgeEdited'>): number {
  const { width, height } = state.dimensions;
  return state.ridgeEdited ? clampRidgeHeightM(state.ridgeHeightM, width, height) : defaultRidgeHeightM(width, height);
}

/**
 * The ridge the visitor sets (04.10): their value, kept as typed — or the span rule again when the value is the span
 * rule's own for these sizes. An edited ridge could never go back to following the width before.
 */
export function withRidge(state: ConfiguratorState, ridgeHeightM: number): ConfiguratorState {
  const { width, height } = state.dimensions;
  return { ...state, ridgeHeightM, ridgeEdited: ridgeHeightM !== defaultRidgeHeightM(width, height) };
}

/** «Підбирати ухил за шириною»: the ridge follows the span rule again */
export function withSpanRuleRidge(state: ConfiguratorState): ConfiguratorState {
  return { ...state, ridgeHeightM: defaultRidgeHeightM(state.dimensions.width, state.dimensions.height), ridgeEdited: false };
}

export function deriveDomainModel(state: ConfiguratorState): HangarDomainModel {
  const { width, length, height } = state.dimensions;
  const gateSelection = clampGateSelection(state.gates, state.gateType, width, height);
  // Width-derived, not read from state — see `structural`'s own doc comment above — except where the visitor said no
  // columns may stand inside (07.10): the span is then drawn clear, whatever the width's rule would draw. Resolved
  // first, because the door's place depends on it: it steps round a centre row only where one stands (09.10)
  const structural: HangarDomainModel['structural'] = state.internalSupports === 'not-allowed'
    ? { ...deriveStructuralVisualization(width), scheme: 'clearSpan' }
    : deriveStructuralVisualization(width);

  return {
    objectType: 'hangar',
    dimensions: { widthM: width, lengthM: length, eaveHeightM: height },
    // Resolved on every derivation: the legal ridge range moves when width or eave height change, so a ridge that was
    // legal at 24 m may not be at 50 m, and an unedited ridge follows the span rule. Resolving here rather than in the
    // control means the model is always self-consistent regardless of how state was produced.
    roof: { type: 'gable', pitchDeg: pitchDegForRidge(width, height, resolveRidgeHeightM(state)) },
    envelope: { walls: state.envelope, roof: state.envelope, wallSystem: state.wallSystem, roofSystem: state.roofSystem },
    foundation: { type: state.foundationType },
    structural,
    // «Комплекс робіт» and «Допоможіть визначити» draw the whole set; the list is the visitor's under «Окремі роботи»
    // only — and it is kept while they look at another mode (07.10: switching modes wiped it)
    scope: {
      foundation: drawnScope(state).includes('foundation'),
      frame: drawnScope(state).includes('frame'),
      walls: drawnScope(state).includes('walls'),
      roof: drawnScope(state).includes('roof'),
    },
    ...gateSelection,
    // Door placement reads the CLAMPED gate selection, not the raw state: if a gate was just
    // dropped for not fitting, the door's legal positions change with it.
    ...clampDoorSelection(state.doors, gateSelection.gates, gateSelection.gateType, width, structural.scheme === 'centerSupport'),
    areaSqm: Math.round(width * length),
    objectProfile: { ...state.objectProfile },
    confirmed: [...state.confirmed],
    sizesUnknown: state.sizesUnknown,
    internalSupports: state.internalSupports,
    scopeMode: state.scopeMode,
    exampleTopics: exampleTopics(state),
    // the openings as the visitor chose them: the summary says which of them the sizes leave no room for
    requestedOpenings: { gates: state.gates, gateType: state.gateType, doors: state.doors },
  };
}

/**
 * Whether the drawings show the front end wall's openings (09.10, audit F19): a gate or a door is a hole cut into a
 * wall, so none without walls in the request — and a door with no gates is still one. The general view and the 3D
 * both read this, so they cannot disagree again: the door alone was in the stamp, the 3D cut and the frame drawing,
 * but its layer waited for a gate, so the general view showed nothing and the 3D an empty hole.
 */
export function openingsShown(domain: Pick<HangarDomainModel, 'scope' | 'gates' | 'doors'>): boolean {
  return domain.scope.walls && (domain.gates > 0 || domain.doors > 0);
}

/** The works drawn: the visitor's list under «Окремі роботи», every work otherwise */
export function drawnScope(state: ConfiguratorState): ScopeItem[] {
  return state.scopeMode === 'partial' ? state.scope : [...SCOPE_ORDER];
}

/**
 * Where a value comes from (07.10, after the audit): a group is the page's example only while the visitor has not
 * answered it AND it still holds the example's value. A value that another answer set — the sandwich panels that
 * «Утеплений» brings, the gates the sizes leave no room for — is the consequence of the visitor's choice, not the
 * example's, and the stamp, the sheet, the cost notes and the lead all read it from here, so they never disagree.
 */
export function exampleTopics(state: ConfiguratorState): ConfirmedTopic[] {
  const base = DEFAULT_CONFIGURATOR_STATE;
  // the shell the page suggests for this purpose: the warm hangar for a cold store (10.10)
  const shell = exampleShellFor(state.objectProfile.purpose);
  const holds: Record<ConfirmedTopic, boolean> = {
    dimensions: state.dimensions.width === base.dimensions.width && state.dimensions.length === base.dimensions.length
      && state.dimensions.height === base.dimensions.height && !state.ridgeEdited,
    envelope: state.envelope === shell.envelope,
    cladding: state.wallSystem === shell.wallSystem && state.roofSystem === shell.roofSystem,
    openings: state.gates === base.gates && state.gateType === base.gateType && state.doors === base.doors,
    scope: state.scopeMode === base.scopeMode,
  };
  return CONFIRMED_TOPICS.filter((topic) => holds[topic] && !state.confirmed.includes(topic));
}

/** The sizes as the visitor gave them: their own, still the example's, or an orientation while they look for theirs */
export type SizesProvenance = 'own' | 'example' | 'approx';
export function sizesProvenance(domain: Pick<HangarDomainModel, 'sizesUnknown' | 'exampleTopics'>): SizesProvenance {
  if (domain.sizesUnknown) return 'approx';
  return domain.exampleTopics.includes('dimensions') ? 'example' : 'own';
}

/** The visitor answered something — a group of the drawing, the sizes' «not yet», or a question of the task */
export function anythingChosen(domain: HangarDomainModel): boolean {
  const profile = domain.objectProfile;
  return domain.exampleTopics.length < CONFIRMED_TOPICS.length || domain.sizesUnknown || domain.internalSupports !== 'unknown'
    || profile.purpose !== null || profile.project !== 'unknown' || profile.region !== 'unknown' || profile.lifting !== 'unknown';
}

// ── «Який ангар потрібен?» (10.10, owner) ───────────────────────────────────────────────────────────────────────────
// The insulation and the materials are one question now, asked from the client's side: «Холодний — профнастил»,
// «Теплий — сендвіч-панелі» or «Ще не знаю», with the walls and the roof one by one folded under «Налаштувати окремо».
// The answer names the material, so a preset answers both topics — the insulation and the cladding — and so does a
// material set in the fold: one question, one answer. Nothing the visitor has not touched is called theirs: the
// example's shell, and the warm one a cold store brings, stay «з прикладу» (exampleTopics) until answered.

type Shell = Pick<ConfiguratorState, 'envelope' | 'wallSystem' | 'roofSystem'>;

/**
 * The shell the page offers for a purpose before the visitor answers «Який ангар потрібен?»: the example's cold hangar
 * in profiled sheet, and for «Холодильний склад» the warm one in sandwich panels (10.10, owner). A suggestion, not an
 * engineering claim — no panel thickness, no insulation value; the manager hears the temperature and decides.
 */
export function exampleShellFor(purpose: HangarPurpose | null): Shell {
  if (purpose === 'coldStore') return { envelope: 'insulated', ...ENVELOPE_MATERIAL_PRESET.insulated };
  const base = DEFAULT_CONFIGURATOR_STATE;
  return { envelope: base.envelope, wallSystem: base.wallSystem, roofSystem: base.roofSystem };
}

/** Both topics of the one question answered */
const withShellConfirmed = (state: ConfiguratorState) => withConfirmed(withConfirmed(state, 'envelope'), 'cladding');

/**
 * «Для чого ангар?» answered. While the shell is not yet answered, it follows the purpose's example — a cold store
 * brings the warm hangar, another purpose takes the example's back — still unanswered, so still «з прикладу». A shell
 * the visitor answered is theirs whatever the purpose.
 */
export function withPurpose(state: ConfiguratorState, purpose: HangarPurpose | null): ConfiguratorState {
  const next = { ...state, objectProfile: { ...state.objectProfile, purpose } };
  if (state.confirmed.includes('envelope') || state.confirmed.includes('cladding')) return next;
  return { ...next, ...exampleShellFor(purpose) };
}

/**
 * The materials stand apart from the answer above them: changed under «Налаштувати окремо» from what the preset brings,
 * or — with «Ще не знаю», which brings none — set there at all. The fold opens by itself for them, and the chosen
 * preset's tile says «налаштовано окремо».
 */
export function materialsSetApart(state: ConfiguratorState): boolean {
  if (state.envelope === 'undecided') return state.confirmed.includes('cladding');
  return !envelopeMatchesPreset(state.envelope, state.wallSystem, state.roofSystem);
}

/**
 * A preset chosen. «Холодний» and «Теплий» bring their materials, both surfaces, and answer both topics: the tile says
 * «профнастил» or «сендвіч-панелі». «Ще не знаю» brings none: materials the visitor set apart stay theirs, and the ones a
 * preset brought go back to the purpose's example — unanswered again, «з прикладу» (it used to keep a preset's sandwich
 * panels, and the stamp said «У сендвіч-панелях» beside «Ще не знаю»).
 */
export function withShellAnswer(state: ConfiguratorState, envelope: ConfiguratorState['envelope']): ConfiguratorState {
  if (envelope !== 'undecided') return withShellConfirmed({ ...state, envelope, ...ENVELOPE_MATERIAL_PRESET[envelope] });
  if (materialsSetApart(state) && state.confirmed.includes('cladding')) return withConfirmed({ ...state, envelope }, 'envelope');
  const { wallSystem, roofSystem } = exampleShellFor(state.objectProfile.purpose);
  const confirmed = state.confirmed.filter((topic) => topic !== 'cladding');
  return withConfirmed({ ...state, envelope, wallSystem, roofSystem, confirmed }, 'envelope');
}

/** The chosen preset pressed again: an answer, changing nothing (07.10) — «Ще не знаю» answers the insulation alone */
export function withShellConfirmedAgain(state: ConfiguratorState): ConfiguratorState {
  return state.envelope === 'undecided' ? withConfirmed(state, 'envelope') : withShellConfirmed(state);
}

/** A surface's material set under «Налаштувати окремо»: the same question answered in detail */
export function withShellMaterial(state: ConfiguratorState, surface: 'wallSystem' | 'roofSystem', system: ConfiguratorState['wallSystem']): ConfiguratorState {
  return withShellConfirmed({ ...state, [surface]: system });
}
