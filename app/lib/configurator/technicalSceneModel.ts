import { buildParametricModel, type ParametricBuildingModel, type Vec3 } from './parametricModel';
import type { HangarDomainModel } from './domainModel';
import type { EnvelopeChoice } from './types';

// The TECHNICAL VIEW's scene description — what the 2D drawing needs, and nothing more.
//
// Phase 3-0 changed this layer's job. It used to be the "renderer-neutral scene model" that
// both renderers were meant to share, but it never actually carried the building's shape:
// wall/roof primitives held only an index and a fill flag, and the SVG projector rebuilt every
// corner from `dimensions` on its own. That is how the technical view ended up drawing a flat
// roof while the R3F spike drew a gable — two renderers, two independently-invented buildings.
//
// Now geometry comes from ParametricBuildingModel and every primitive below carries REAL METRE
// POINTS. This module only decides *what the technical drawing shows and how it is staged for
// the build-up animation* — segmentation, visibility, annotation. It derives no shape at all.
//
// A future ThreeSceneModel is a sibling of this file, not a consumer of it: it reads the same
// ParametricBuildingModel and emits meshes instead of polylines.

export type { Vec3 } from './parametricModel';
export { frameBayCount } from './parametricModel';

/** A closed polygon in building space, metres. */
export type Poly3 = Vec3[];

export type ScenePrimitive =
  // Always present, never scope-driven — a ground reference, not a business selection.
  | { kind: 'terrain-plane'; corners: Poly3 }
  // `visible` (not omission) on purpose: the slab's footprint always participates in scene
  // bounds/framing. Omitting it when out of scope tightened the viewBox — a real regression
  // this pattern exists to prevent. Flat by design — no `thicknessM` here, unlike
  // ParametricBuildingModel.slab: the technical view draws the footprint as a line drawing, not
  // an extruded box (see isometricProjection.ts's own comment at the one place this is drawn).
  | { kind: 'foundation-slab'; visible: boolean; corners: Poly3 }
  // Frame members as centre-lines. Section thickness is renderer styling (a stroke width here,
  // a box in 3D) — deliberately not modelled as geometry: this is object form, not a member schedule.
  | { kind: 'frame-column'; visible: boolean; face: 'left' | 'right'; index: number; a: Vec3; b: Vec3 }
  | { kind: 'frame-rafter'; visible: boolean; slope: 'left' | 'right'; index: number; a: Vec3; b: Vec3 }
  | { kind: 'frame-purlin'; visible: boolean; index: number; a: Vec3; b: Vec3 }
  // One primitive per structural bay so the envelope materialises section-by-section.
  | {
      kind: 'wall-segment';
      face: 'left' | 'right';
      index: number;
      segmentCount: number;
      hasFill: boolean;
      envelope: EnvelopeChoice;
      corners: Poly3;
    }
  // The gable ends are pentagons, not rectangles — the shape the previous model could not express.
  | {
      kind: 'gable-end';
      face: 'front' | 'rear';
      hasFill: boolean;
      envelope: EnvelopeChoice;
      outline: Poly3;
    }
  | {
      kind: 'roof-segment';
      slope: 'left' | 'right';
      index: number;
      segmentCount: number;
      hasFill: boolean;
      envelope: EnvelopeChoice;
      corners: Poly3;
    }
  | { kind: 'ridge-line'; visible: boolean; a: Vec3; b: Vec3 }
  | { kind: 'opening-cutout'; index: number; corners: Poly3 }
  | {
      kind: 'dimension-guide';
      axis: 'width' | 'length' | 'eave' | 'ridge';
      valueM: number;
      /** Ridge is DERIVED, not chosen by the user — the renderer labels it differently. */
      derived: boolean;
    };

export type TechnicalSceneModel = {
  dimensions: { widthM: number; lengthM: number; eaveHeightM: number; ridgeHeightM: number };
  building: ParametricBuildingModel;
  primitives: ScenePrimitive[];
};

/** How far the ground reference extends past the footprint — framing only, never scope-driven. */
const TERRAIN_MARGIN_RATIO = 0.15;

function terrainCorners(widthM: number, lengthM: number): Poly3 {
  const margin = Math.max(widthM, lengthM) * TERRAIN_MARGIN_RATIO;
  return [
    { x: -margin, y: 0, z: -margin },
    { x: widthM + margin, y: 0, z: -margin },
    { x: widthM + margin, y: 0, z: lengthM + margin },
    { x: -margin, y: 0, z: lengthM + margin },
  ];
}

/**
 * Pure: a HangarDomainModel in, the technical view's scene out. Geometry is delegated to
 * buildParametricModel(); this function only selects, segments and flags.
 */
export function buildTechnicalScene(domain: HangarDomainModel): TechnicalSceneModel {
  const building = buildParametricModel(domain);
  const { widthM, lengthM } = building.footprint;
  const { eaveM, ridgeM } = building.heights;
  const primitives: ScenePrimitive[] = [];

  primitives.push({ kind: 'terrain-plane', corners: terrainCorners(widthM, lengthM) });

  primitives.push({
    kind: 'foundation-slab',
    visible: domain.scope.foundation,
    corners: building.slab.corners,
  });

  const frameVisible = domain.scope.frame;

  for (const frame of building.frames) {
    primitives.push({
      kind: 'frame-column', visible: frameVisible, face: 'left', index: frame.index,
      a: frame.leftColumn.a, b: frame.leftColumn.b,
    });
    primitives.push({
      kind: 'frame-column', visible: frameVisible, face: 'right', index: frame.index,
      a: frame.rightColumn.a, b: frame.rightColumn.b,
    });
  }
  // Rafters are pushed after every column so the build-up's per-instance stagger indexes run
  // over a contiguous run of same-kind primitives, matching how columns are staged.
  for (const frame of building.frames) {
    primitives.push({
      kind: 'frame-rafter', visible: frameVisible, slope: 'left', index: frame.index,
      a: frame.leftRafter.a, b: frame.leftRafter.b,
    });
    primitives.push({
      kind: 'frame-rafter', visible: frameVisible, slope: 'right', index: frame.index,
      a: frame.rightRafter.a, b: frame.rightRafter.b,
    });
  }

  building.girts.forEach((girt, index) => {
    primitives.push({ kind: 'frame-purlin', visible: frameVisible, index, a: girt.a, b: girt.b });
  });

  for (const segment of building.envelope.wallSegments) {
    primitives.push({
      kind: 'wall-segment',
      face: segment.face as 'left' | 'right',
      index: segment.index,
      segmentCount: segment.segmentCount,
      hasFill: domain.scope.walls,
      envelope: building.envelope.walls,
      corners: segment.corners,
    });
  }

  for (const gable of building.envelope.gableEnds) {
    primitives.push({
      kind: 'gable-end',
      face: gable.face,
      hasFill: domain.scope.walls,
      envelope: building.envelope.walls,
      outline: gable.outline,
    });
  }

  for (const segment of building.envelope.roofSegments) {
    primitives.push({
      kind: 'roof-segment',
      slope: segment.slope,
      index: segment.index,
      segmentCount: segment.segmentCount,
      hasFill: domain.scope.roof,
      envelope: building.envelope.roofEnvelope,
      corners: segment.corners,
    });
  }

  primitives.push({
    kind: 'ridge-line',
    visible: domain.scope.roof,
    a: { x: widthM / 2, y: ridgeM, z: 0 },
    b: { x: widthM / 2, y: ridgeM, z: lengthM },
  });

  for (const opening of building.openings) {
    primitives.push({ kind: 'opening-cutout', index: opening.index, corners: opening.corners });
  }

  primitives.push({ kind: 'dimension-guide', axis: 'width', valueM: widthM, derived: false });
  primitives.push({ kind: 'dimension-guide', axis: 'length', valueM: lengthM, derived: false });
  primitives.push({ kind: 'dimension-guide', axis: 'eave', valueM: eaveM, derived: false });
  primitives.push({ kind: 'dimension-guide', axis: 'ridge', valueM: ridgeM, derived: true });

  return {
    dimensions: { widthM, lengthM, eaveHeightM: eaveM, ridgeHeightM: ridgeM },
    building,
    primitives,
  };
}
