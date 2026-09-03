import { buildParametricModel, type ParametricBuildingModel, type Vec3 } from './parametricModel';
import type { HangarDomainModel } from './domainModel';

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
// Deliberately absent: roof overhang. It would change the building's silhouette, so it is a
// genuine geometric fact that belongs upstream in ParametricBuildingModel where BOTH renderers
// would see it — adding it here alone would recreate the exact flat-roof-vs-gable divergence
// Phase 3-0 was built to eliminate. Deferred rather than faked.

export type MaterialKey =
  | 'frame-primary'
  | 'frame-secondary'
  | 'wall'
  | 'roof'
  | 'slab'
  | 'gate-recess'
  | 'ground';

/** A structural member as a centre-line plus the section it should be DRAWN at. */
export type StrutMesh = {
  id: string;
  a: Vec3;
  b: Vec3;
  sectionM: number;
  material: MaterialKey;
};

/** A planar surface given real thickness. Corners come straight from the parametric model; the
 *  renderer derives the box basis from them (that transform is renderer mechanics). */
export type PanelMesh = {
  id: string;
  corners: [Vec3, Vec3, Vec3, Vec3];
  thicknessM: number;
  material: MaterialKey;
};

export type Point2 = { x: number; y: number };

/** A gable end extruded from its real pentagon profile, with gate openings as actual holes. */
export type GableMesh = {
  id: string;
  outline: Point2[];
  holes: Point2[][];
  /** Near edge of the extrusion along Z; the renderer extrudes toward +Z by `thicknessM`. */
  zM: number;
  thicknessM: number;
  material: MaterialKey;
};

export type SlabMesh = {
  id: string;
  corners: [Vec3, Vec3, Vec3, Vec3];
  thicknessM: number;
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
  /** Dark recessed planes behind each opening, so a gate reads as depth rather than a decal. */
  recesses: PanelMesh[];
  ground: { yM: number; sizeM: number };
  visible: { slab: boolean; frame: boolean; walls: boolean; roof: boolean };
  building: ParametricBuildingModel;
};

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
const WALL_THICKNESS_M = 0.16;
const ROOF_THICKNESS_M = 0.14;
const GATE_RECESS_INSET_M = 0.35;
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

  // ── Primary frame: two columns + two rafters per portal frame, straight from the model ──
  for (const frame of building.frames) {
    struts.push(
      { id: `col-l-${frame.index}`, a: frame.leftColumn.a, b: frame.leftColumn.b, sectionM: COLUMN_SECTION_M, material: 'frame-primary' },
      { id: `col-r-${frame.index}`, a: frame.rightColumn.a, b: frame.rightColumn.b, sectionM: COLUMN_SECTION_M, material: 'frame-primary' },
      { id: `raf-l-${frame.index}`, a: frame.leftRafter.a, b: frame.leftRafter.b, sectionM: RAFTER_SECTION_M, material: 'frame-primary' },
      { id: `raf-r-${frame.index}`, a: frame.rightRafter.a, b: frame.rightRafter.b, sectionM: RAFTER_SECTION_M, material: 'frame-primary' },
    );
  }

  // ── Secondary structure: side-wall girts, visually subordinate ──
  building.girts.forEach((girt, index) => {
    struts.push({ id: `girt-${index}`, a: girt.a, b: girt.b, sectionM: GIRT_SECTION_M, material: 'frame-secondary' });
  });

  // ── Envelope: side walls and both roof slopes, per bay ──
  for (const segment of building.envelope.wallSegments) {
    panels.push({
      id: `wall-${segment.face}-${segment.index}`,
      corners: segment.corners,
      thicknessM: WALL_THICKNESS_M,
      material: 'wall',
    });
  }
  for (const segment of building.envelope.roofSegments) {
    panels.push({
      id: `roof-${segment.slope}-${segment.index}`,
      corners: segment.corners,
      thicknessM: ROOF_THICKNESS_M,
      material: 'roof',
    });
  }

  // ── Gable ends, with the front one carrying the gate openings as real holes ──
  for (const gable of building.envelope.gableEnds) {
    const onThisFace = building.openings.filter((o) => o.face === gable.face);
    gables.push({
      id: `gable-${gable.face}`,
      outline: gable.outline.map((p) => ({ x: p.x, y: p.y })),
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
      material: 'wall',
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
  }

  const slab: SlabMesh = {
    id: 'slab',
    corners: building.slab.corners,
    thicknessM: building.slab.thicknessM,
    material: 'slab',
  };

  // Camera frames the BUILDING, not the staging ground — so framing does not jump when the
  // ground plane's own margin changes.
  const bounds = boundsOf([
    ...building.envelope.gableEnds.flatMap((g) => g.outline),
    ...building.envelope.wallSegments.flatMap((s) => s.corners),
    ...building.envelope.roofSegments.flatMap((s) => s.corners),
    ...building.slab.corners,
  ]);

  return {
    bounds,
    struts,
    panels,
    gables,
    slab,
    recesses,
    ground: { yM: -building.slab.thicknessM, sizeM: Math.max(widthM, lengthM) * (1 + GROUND_MARGIN_RATIO) },
    visible: {
      slab: domain.scope.foundation,
      frame: domain.scope.frame,
      walls: domain.scope.walls,
      roof: domain.scope.roof,
    },
    building,
  };
}
