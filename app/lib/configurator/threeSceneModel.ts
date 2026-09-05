import { buildParametricModel, type ParametricBuildingModel, type Vec3 } from './parametricModel';
import type { HangarDomainModel } from './domainModel';
import type { CladdingSystem } from './types';

// The 3D VIEW's scene description — a sibling of technicalSceneModel.ts, not a consumer of it.
//
// Both read the same ParametricBuildingModel and emit whatever their own renderer needs: polylines
// and annotation placement for SVG, mesh descriptors for R3F. Neither derives the building.
//
// THE RULE THIS FILE EXISTS TO KEEP (Phase 3-0's whole point): every metre of geometry below is
// COPIED from the parametric model, never recomputed. There is no tan(), no ridge formula, no bay
// arithmetic and no footprint maths in this module — grep it and confirm. What this layer *does*
// add is presentation-only: which material a surface wears, how thick a member's section is drawn,
// and the bounding box a camera should frame. Those are renderer choices by explicit Phase 3-0
// decision (member sections are "renderer styling ... a member schedule would be a construction
// claim"), not building facts.
//
// Historical note on the rule above, not a caveat to it: roof overhang and the slab's own overhang
// both used to be absent, for exactly the reason the rule states — they change the building's
// silhouette, so a renderer inventing one alone would have recreated the flat-roof-vs-gable
// divergence Phase 3-0 was built to eliminate. Both now live upstream in ParametricBuildingModel
// (`roof.overhangM`, `slab.overhangM`) for that same reason, and this file still adds none of its
// own — `roofSegments`/`slab.corners` below are copied verbatim, overhang included.

/**
 * Phase 3F — `wall`/`roof` split into per-cladding-system variants (`-profiled`/`-sandwich`), so
 * the two systems can wear genuinely different material RESPONSE (roughness, metalness, micro-
 * detail — see materials.ts), not just different colour. Before this phase both systems shared one
 * `wall`/`roof` material instance and only the geometry (`PanelMesh.claddingSystem`, unchanged)
 * differed — which is exactly why "graphite profiled sheet" and "graphite sandwich panel" used to
 * look identical at normal camera distance (brief §3's own diagnosis). `claddingMaterialKey` below
 * is the ONE place that maps a `CladdingSystem` to its material key — never duplicate that mapping
 * at a call site.
 */
export type MaterialKey =
  | 'frame-primary'
  | 'frame-secondary'
  | 'wall-profiled'
  | 'wall-sandwich'
  | 'roof-profiled'
  | 'roof-sandwich'
  | 'slab'
  | 'footing'
  | 'gate'
  | 'gate-recess'
  | 'ground';

/** The single mapping from a cladding system to its material key — see `MaterialKey`'s own doc
 *  comment. `surface` picks the wall/roof half of the key; `system` picks the profiled/sandwich
 *  half. Used at every panel/gable push site below, and nowhere else computes this mapping. */
export function claddingMaterialKey(surface: 'wall' | 'roof', system: CladdingSystem): MaterialKey {
  const variant = system === 'sandwich-panel' ? 'sandwich' : 'profiled';
  return `${surface}-${variant}` as MaterialKey;
}

/** A structural member as a centre-line plus the section it should be DRAWN at.
 *
 * `role` is presentation grouping for the build-up animation (Phase 3B) — which independently
 * timed layer (per buildUpSequence.ts) a member belongs to. It is redundant with `material` today
 * (every column and rafter is `frame-primary`) but the two answer different questions: `material`
 * is "what does this look like", `role` is "when does this arrive". Keeping them separate means a
 * future material change can never silently break the build-up grouping by accident. */
export type StrutRole = 'column' | 'rafter' | 'girt' | 'internal-column' | 'truss-chord' | 'truss-web' | 'brace';

export type StrutMesh = {
  id: string;
  a: Vec3;
  b: Vec3;
  sectionM: number;
  material: MaterialKey;
  role: StrutRole;
};

/** A planar surface given real thickness. Corners come straight from the parametric model; the
 *  renderer derives the box basis from them (that transform is renderer mechanics).
 *
 *  `claddingSystem` is undefined for panels the cladding-system choice does not apply to (slab,
 *  gate-recess — carried on `PanelMesh` only because those share the type, not because they have
 *  a system). Present on every wall/roof panel: which surface pattern (profiled sheet vs sandwich
 *  panel — see CladdingSystem in types.ts) `ThreeHangarView` should build the panel's geometry
 *  with. Still presentation, not a building fact — same reasoning as `material` above — which is
 *  why this is a renderer-styling field here rather than something threading further upstream. */
export type PanelMesh = {
  id: string;
  corners: [Vec3, Vec3, Vec3, Vec3];
  thicknessM: number;
  material: MaterialKey;
  claddingSystem?: CladdingSystem;
};

export type Point2 = { x: number; y: number };

/** A gable end extruded from its real pentagon profile, with gate openings as actual holes.
 *  `claddingSystem` drives both the cladding colour/material AND (Phase 3D.1) a matching cladding
 *  overlay on the gable's own outward face — see ThreeHangarView's `Gable` component. */
export type GableMesh = {
  id: string;
  outline: Point2[];
  /** The same three numbers `outline`'s 5 points already encode, exposed directly rather than
   *  left for a consumer to re-derive by indexing into the outline array — Phase 3D.1's cladding
   *  overlay (`buildGableCladdingOverlay`) needs exactly these three to compute its own roofline
   *  clipping, and reading them from named fields is more robust than depending on point order. */
  widthM: number;
  eaveM: number;
  ridgeM: number;
  holes: Point2[][];
  /** Near edge of the extrusion along Z; the renderer extrudes toward +Z by `thicknessM`. */
  zM: number;
  thicknessM: number;
  material: MaterialKey;
  claddingSystem: CladdingSystem;
  /** Phase 3D.1: which local extrusion end is the OUTWARD (visible, cladding) face — front's is at
   *  local Z=0, rear's is at local Z=+thicknessM, because both gables extrude toward +Z (into the
   *  building) from wherever `zM` places them, but sit on opposite ends of the building's own
   *  length. `Gable` needs this to know which end its cladding overlay belongs flush against. */
  face: 'front' | 'rear';
};

export type SlabMesh = {
  id: string;
  corners: [Vec3, Vec3, Vec3, Vec3];
  thicknessM: number;
  material: MaterialKey;
};

/** A schematic isolated footing (pad + pedestal) under one column — see FootingGeometry's own doc
 *  comment in parametricModel.ts, which this copies verbatim (position, dimensions) with no maths
 *  of its own, matching this file's own rule at the top. */
export type FootingMesh = {
  id: string;
  xM: number;
  zM: number;
  padWidthM: number;
  padThicknessM: number;
  pedestalWidthM: number;
  pedestalHeightM: number;
  material: MaterialKey;
};

/**
 * Phase 3D.1 — the gate's own door leaf, sitting just inside `recesses`' existing dark backdrop.
 * Carries the opening's real width/height verbatim (no margin/banding maths here — see this file's
 * own header rule); `envelopePanelGeometry.ts`'s `buildGateLeafGeometry` turns those into an inset,
 * sectioned panel, the same "renderer decides the pattern, this file supplies the real dimensions"
 * split every other cladding surface already follows.
 */
export type GateLeafMesh = {
  id: string;
  xM: number;
  widthM: number;
  heightM: number;
  zM: number;
  material: MaterialKey;
};

export type ThreeSceneModel = {
  /** Axis-aligned bounds over the building's own parametric geometry — what the camera frames.
   *  Excludes the ground plane, which is staging, not the object. */
  bounds: { min: Vec3; max: Vec3; center: Vec3; size: Vec3 };
  struts: StrutMesh[];
  panels: PanelMesh[];
  gables: GableMesh[];
  slab: SlabMesh | null;
  /** Always populated (one per column) regardless of `foundation.type` — same "geometry is a
   *  fact, visibility is the renderer's business" rule `slab` already follows. Whether these are
   *  actually shown is `visible.footings`, driven by `domain.foundation.type === 'isolated'`. */
  footings: FootingMesh[];
  /** Dark recessed planes behind each opening, so a gate reads as depth rather than a decal. */
  recesses: PanelMesh[];
  /** Phase 3D.1 — the actual door leaf sitting in front of each recess. Always one-to-one with
   *  `recesses` (both come from `building.openings`), kept as a separate array rather than folded
   *  into `recesses` because the two are genuinely different meshes: a plain `PanelMesh` box for
   *  the dark backdrop, a banded/inset one for the leaf — see `GateLeafMesh`'s own doc comment. */
  leaves: GateLeafMesh[];
  ground: { yM: number; sizeM: number };
  /** `gates` mirrors SVG's own `gates > 0` boolean (buildUpSequence's `gates` layer trigger) —
   *  independent of `walls`, because a gate opening is only meaningful once there is an envelope
   *  to cut it into, but its OWN build-up layer fires off the gate count, not the walls toggle.
   *
   *  `slab` and `footings` are mutually exclusive foundation REPRESENTATIONS, not two independent
   *  scope items — see deriveFoundationVisibility below for exactly which `foundation.type` shows
   *  which, and why `engineeringDecision` renders as the slab rather than as nothing. */
  visible: { slab: boolean; footings: boolean; frame: boolean; walls: boolean; roof: boolean; gates: boolean };
  building: ParametricBuildingModel;
  /** Phase 3F — the two cladding systems in force, exposed at the top level (not just per-panel via
   *  `PanelMesh.claddingSystem`) for the ONE mesh that has no panel of its own to read it from: the
   *  ridge cap, which needs to know the roof's system to pick `roof-profiled` vs `roof-sandwich`
   *  without scanning `panels` for one. */
  envelope: { wallSystem: CladdingSystem; roofSystem: CladdingSystem };
};

/**
 * Isolated is the only foundation type this renderer draws differently. `slab` and
 * `engineeringDecision` share one representation deliberately (brief §7's own "engineering
 * honesty" section): a customer who has not had a foundation engineered yet still needs to see
 * SOMETHING under the building, and a generic flat foundation plane makes no claim about
 * ISOLATED-footing/column-spacing details the way rendering discrete pads would — it reads as
 * "there is a foundation here", not as "here is the answer".
 */
function deriveFoundationVisibility(foundationType: HangarDomainModel['foundation']['type']): { slab: boolean; footings: boolean } {
  return foundationType === 'isolated' ? { slab: false, footings: true } : { slab: true, footings: false };
}

// ── Presentation constants (renderer styling, NOT building facts) ───────────
// Section sizes exist only so a centre-line can be drawn as a solid. The ~2.7× primary-to-
// secondary ratio is deliberate: the previous R3F spike scored frame-only readability well below
// SVG partly because every member was drawn at a near-identical weight, so perspective overlap
// turned the frame into noise.
// Half of each primary section equals the envelope thickness it sits behind (0.32/2 = 0.16 wall,
// 0.28/2 = 0.14 roof), so the frame's outer face lands flush with the cladding's inner face
// instead of protruding through it.
const COLUMN_SECTION_M = 0.32;
const RAFTER_SECTION_M = 0.28;
const GIRT_SECTION_M = 0.12;
// Phase 3E — the internal support column and its king-post prop share the external columns' and
// rafters' own sections exactly: brief §5's "do not invent an engineered difference" applies to
// visual weight, not just footing size — a centre column is not a visually lesser member.
const INTERNAL_COLUMN_SECTION_M = COLUMN_SECTION_M;
const KING_POST_SECTION_M = RAFTER_SECTION_M;
// The truss's own bottom chord reads as strongly as the top chord it mirrors (brief §11: "rafters
// / truss chords" are both PRIMARY) — same section as a rafter. Webs are genuinely secondary in
// real truss design (they resist shear, not the primary bending the chords carry) but still need
// to stay clearly perceivable as "a truss, not a rafter" from every angle (brief §8) — using
// `frame-secondary`'s own much darker material would risk them disappearing against the sky the
// way girts already deliberately do; a thinner PRIMARY-material section reads as "real but
// lighter steel" without either problem.
const TRUSS_CHORD_SECTION_M = RAFTER_SECTION_M;
const TRUSS_WEB_SECTION_M = 0.16;
const WALL_THICKNESS_M = 0.16;
const ROOF_THICKNESS_M = 0.14;
// Phase 3D.1: shallower than the original 0.35 m — that depth was tuned back when the recess WAS
// the gate (brief §3A: "an opening is the absence of light"), reading as a loading-dock void. Now
// that a real door leaf (see `GateLeafMesh`, `leaves` below) sits in front of it at
// `GATE_LEAF_DEPTH_M`, this only has to stay visibly further back than the leaf's own face so the
// leaf's inset margin still reads as a shadowed reveal rather than z-fighting the leaf.
const GATE_RECESS_INSET_M = 0.16;
// How far in front of the wall's own outer cladding face the door leaf sits — a believable frame/
// jamb reveal depth, not the full recess depth above (a real sectional door sits close behind its
// opening, it does not sit at the back of a half-metre tunnel).
const GATE_LEAF_DEPTH_M = 0.08;
// Generous on purpose: at 0.55 the ground plane's own straight edge was visible inside the
// camera frame at default dimensions, which read as a stage prop rather than as ground.
const GROUND_MARGIN_RATIO = 3;

function boundsOf(points: Vec3[]) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of points) {
    min.x = Math.min(min.x, p.x); max.x = Math.max(max.x, p.x);
    min.y = Math.min(min.y, p.y); max.y = Math.max(max.y, p.y);
    min.z = Math.min(min.z, p.z); max.z = Math.max(max.z, p.z);
  }
  return {
    min,
    max,
    center: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 },
    size: { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z },
  };
}

/**
 * Pure: a HangarDomainModel in, mesh descriptors out. Geometry is delegated to
 * buildParametricModel(); this function only selects surfaces and assigns materials/sections.
 */
export function buildThreeScene(domain: HangarDomainModel): ThreeSceneModel {
  const building = buildParametricModel(domain);
  const { widthM, lengthM } = building.footprint;

  const struts: StrutMesh[] = [];
  const panels: PanelMesh[] = [];
  const gables: GableMesh[] = [];
  const recesses: PanelMesh[] = [];
  const leaves: GateLeafMesh[] = [];

  // ── Primary frame: two columns + two rafters per portal frame, straight from the model ──
  for (const frame of building.frames) {
    struts.push(
      { id: `col-l-${frame.index}`, a: frame.leftColumn.a, b: frame.leftColumn.b, sectionM: COLUMN_SECTION_M, material: 'frame-primary', role: 'column' },
      { id: `col-r-${frame.index}`, a: frame.rightColumn.a, b: frame.rightColumn.b, sectionM: COLUMN_SECTION_M, material: 'frame-primary', role: 'column' },
      { id: `raf-l-${frame.index}`, a: frame.leftRafter.a, b: frame.leftRafter.b, sectionM: RAFTER_SECTION_M, material: 'frame-primary', role: 'rafter' },
      { id: `raf-r-${frame.index}`, a: frame.rightRafter.a, b: frame.rightRafter.b, sectionM: RAFTER_SECTION_M, material: 'frame-primary', role: 'rafter' },
    );
  }

  // ── Secondary structure: side-wall girts, visually subordinate ──
  building.girts.forEach((girt, index) => {
    struts.push({ id: `girt-${index}`, a: girt.a, b: girt.b, sectionM: GIRT_SECTION_M, material: 'frame-secondary', role: 'girt' });
  });

  // ── Phase 3E: wall bracing — always a few bays, same secondary treatment as girts (brief §11:
  // "SECONDARY: purlins, wall girts, selected braces" groups all three) ──
  building.bracing.forEach((brace, index) => {
    struts.push(
      { id: `brace-${index}-a`, a: brace.diagonalA.a, b: brace.diagonalA.b, sectionM: GIRT_SECTION_M, material: 'frame-secondary', role: 'brace' },
      { id: `brace-${index}-b`, a: brace.diagonalB.a, b: brace.diagonalB.b, sectionM: GIRT_SECTION_M, material: 'frame-secondary', role: 'brace' },
    );
  });

  // ── Phase 3E: the centre support line — empty unless structuralScheme is centerSupport, see
  // buildInternalColumns's own doc comment in parametricModel.ts. ──
  for (const col of building.internalColumns) {
    struts.push({
      id: `col-c-${col.index}`,
      a: col.column.a,
      b: col.column.b,
      sectionM: INTERNAL_COLUMN_SECTION_M,
      material: 'frame-primary',
      role: 'internal-column',
    });
    if (col.ridgeProp) {
      struts.push({
        id: `col-c-${col.index}-prop`,
        a: col.ridgeProp.a,
        b: col.ridgeProp.b,
        sectionM: KING_POST_SECTION_M,
        material: 'frame-primary',
        role: 'internal-column',
      });
    }
  }

  // ── Phase 3E: the truss's own bottom chord + web, ONLY in truss mode — the top chord is
  // building.frames' own leftRafter/rightRafter, already pushed above; nothing to add there. ──
  if (domain.structural.roofStructure === 'truss') {
    for (const truss of building.trusses) {
      struts.push({
        id: `truss-bottom-${truss.index}`,
        a: truss.bottomChord.a,
        b: truss.bottomChord.b,
        sectionM: TRUSS_CHORD_SECTION_M,
        material: 'frame-primary',
        role: 'truss-chord',
      });
      truss.webs.forEach((web, webIndex) => {
        struts.push({
          id: `truss-web-${truss.index}-${webIndex}`,
          a: web.a,
          b: web.b,
          sectionM: TRUSS_WEB_SECTION_M,
          material: 'frame-primary',
          role: 'truss-web',
        });
      });
    }
  }

  // ── Envelope: side walls and both roof slopes, per bay ──
  for (const segment of building.envelope.wallSegments) {
    panels.push({
      id: `wall-${segment.face}-${segment.index}`,
      corners: segment.corners,
      thicknessM: WALL_THICKNESS_M,
      material: claddingMaterialKey('wall', domain.envelope.wallSystem),
      claddingSystem: domain.envelope.wallSystem,
    });
  }
  for (const segment of building.envelope.roofSegments) {
    panels.push({
      id: `roof-${segment.slope}-${segment.index}`,
      corners: segment.corners,
      thicknessM: ROOF_THICKNESS_M,
      material: claddingMaterialKey('roof', domain.envelope.roofSystem),
      claddingSystem: domain.envelope.roofSystem,
    });
  }

  // ── Gable ends, with the front one carrying the gate openings as real holes ──
  for (const gable of building.envelope.gableEnds) {
    const onThisFace = building.openings.filter((o) => o.face === gable.face);
    gables.push({
      id: `gable-${gable.face}`,
      outline: gable.outline.map((p) => ({ x: p.x, y: p.y })),
      widthM,
      eaveM: building.heights.eaveM,
      ridgeM: building.heights.ridgeM,
      holes: onThisFace.map((o) => [
        { x: o.rect.xM, y: o.rect.yM },
        { x: o.rect.xM + o.rect.widthM, y: o.rect.yM },
        { x: o.rect.xM + o.rect.widthM, y: o.rect.yM + o.rect.heightM },
        { x: o.rect.xM, y: o.rect.yM + o.rect.heightM },
      ]),
      // The front gable sits at z=0 and extrudes inward; the rear sits one thickness short of
      // the far face so its extrusion lands exactly on it.
      zM: gable.face === 'front' ? 0 : lengthM - WALL_THICKNESS_M,
      thicknessM: WALL_THICKNESS_M,
      material: claddingMaterialKey('wall', domain.envelope.wallSystem),
      claddingSystem: domain.envelope.wallSystem,
      face: gable.face,
    });
  }

  // ── Gate recesses: a dark plane set back behind each opening ──
  for (const opening of building.openings) {
    const { xM, yM, widthM: gw, heightM: gh } = opening.rect;
    const z = GATE_RECESS_INSET_M;
    recesses.push({
      id: `recess-${opening.index}`,
      corners: [
        { x: xM, y: yM + gh, z },
        { x: xM + gw, y: yM + gh, z },
        { x: xM + gw, y: yM, z },
        { x: xM, y: yM, z },
      ],
      thicknessM: 0.02,
      material: 'gate-recess',
    });
    leaves.push({
      id: `leaf-${opening.index}`,
      xM,
      widthM: gw,
      heightM: gh,
      zM: GATE_LEAF_DEPTH_M,
      material: 'gate',
    });
  }

  const slab: SlabMesh = {
    id: 'slab',
    corners: building.slab.corners,
    thicknessM: building.slab.thicknessM,
    material: 'slab',
  };

  const footings: FootingMesh[] = building.footings.map((f) => ({
    id: f.id,
    xM: f.xM,
    zM: f.zM,
    padWidthM: f.padWidthM,
    padThicknessM: f.padThicknessM,
    pedestalWidthM: f.pedestalWidthM,
    pedestalHeightM: f.pedestalHeightM,
    material: 'slab', // same concrete material as the slab — a different shape, not a different substance
  }));

  const foundationVisibility = deriveFoundationVisibility(domain.foundation.type);

  // Camera frames the BUILDING, not the staging ground — so framing does not jump when the
  // ground plane's own margin changes. Footings included alongside the slab for the same reason
  // slab always is: stable framing regardless of which foundation representation ends up visible.
  const bounds = boundsOf([
    ...building.envelope.gableEnds.flatMap((g) => g.outline),
    ...building.envelope.wallSegments.flatMap((s) => s.corners),
    ...building.envelope.roofSegments.flatMap((s) => s.corners),
    ...building.slab.corners,
    ...building.footings.map((f) => ({ x: f.xM, y: 0, z: f.zM })),
  ]);

  return {
    bounds,
    struts,
    panels,
    gables,
    slab,
    footings,
    recesses,
    leaves,
    ground: { yM: -building.slab.thicknessM, sizeM: Math.max(widthM, lengthM) * (1 + GROUND_MARGIN_RATIO) },
    visible: {
      slab: domain.scope.foundation && foundationVisibility.slab,
      footings: domain.scope.foundation && foundationVisibility.footings,
      frame: domain.scope.frame,
      walls: domain.scope.walls,
      roof: domain.scope.roof,
      // A gate is an opening cut INTO a wall — it cannot read as an opening with no wall to cut
      // into, so it's visible only when both are true. (Real bug caught live, not hypothetical:
      // this was `domain.gates > 0` alone, which left a gate recess on screen after switching
      // walls out of scope — same fix, same reasoning, in HangarPreview.tsx's `gateLayer`.)
      gates: domain.scope.walls && domain.gates > 0,
    },
    building,
    envelope: { wallSystem: domain.envelope.wallSystem, roofSystem: domain.envelope.roofSystem },
  };
}
