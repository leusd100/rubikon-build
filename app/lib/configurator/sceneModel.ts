import type { HangarDomainModel } from './domainModel';
import type { EnvelopeChoice, GatesCount } from './types';

// Renderer-neutral description of the hangar scene, entirely in metres. No pixels, no SVG
// points, no Three.js vectors — a scene model is a fact about the *object*, not about how any
// particular renderer chooses to draw it. This is the layer both the SVG projector
// (isometricProjection.ts) and the R3F spike (app/r3f-spike) consume; neither renderer stores
// business state, and swapping renderers means writing a new consumer of this same type, not
// touching buildHangarScene() or anything upstream of it.
//
// Layer order below matches the confirmed build-up sequence: terrain (always-on context, not a
// build step) → foundation → columns → trusses (primary frame) → purlins (secondary structure)
// → walls → roof → gates. Frame is split into three distinct primitive kinds (column/truss/
// purlin) specifically so the build-up animation can stage them as three separate visual
// moments — "the frame is now complete" has to mean something more than "some lines faded in."

const FRAME_TARGET_SPACING_M = 6;
const FRAME_MIN_BAYS = 2;
const FRAME_MAX_BAYS = 10;
const GATE_HEIGHT_RATIO = 0.72;
const GATE_WIDTH_RATIO = 0.22;
const GATE_GAP_RATIO = 0.08;
const GATE_MARGIN_RATIO = 0.06;
// Purlins are a stylised "a few horizontal members exist here", not real spacing — 2 levels,
// evenly spaced between the ground and the eave, deliberately restrained (see docs on why this
// is a visual heuristic, not a structural claim).
const PURLIN_LEVELS = [1 / 3, 2 / 3] as const;

/**
 * How many structural bays a span of this length gets — a visual-rhythm heuristic (target ~6m
 * spacing, clamped to a legible 2–10 bays), not a structural span calculation. Keep it framed
 * that way in any UI copy that ever references it, per the brief's "no false engineering
 * precision" rule. Also drives wall/roof segmentation counts, so cladding seams land on the
 * same rhythm as the frame bays behind them.
 */
export function frameBayCount(spanMetres: number): number {
  const raw = Math.round(spanMetres / FRAME_TARGET_SPACING_M);
  return Math.min(FRAME_MAX_BAYS, Math.max(FRAME_MIN_BAYS, raw));
}

export type ScenePrimitive =
  // Always present, never scope-driven — a ground reference, not a business selection. See the
  // "dependency rules" note in docs/hangar-build-up-phase-2.md: a layer shown purely for visual
  // context must never be silently treated as selected scope. Carries the object's real
  // footprint (not pre-enlarged) — how far the ground plane extends past that footprint is a
  // rendering choice, not a fact about the object, so that margin lives in the SVG projector.
  | { kind: 'terrain-plane'; widthM: number; lengthM: number }
  // `visible` (not omission) mirrors wall-segment/roof-segment below on purpose: the slab's
  // footprint always participates in scene bounds/framing, matching the pre-SceneModel
  // behaviour where the foundation polygon was always computed and only conditionally drawn.
  // Omitting the primitive entirely when scope.foundation is false would tighten the viewBox
  // whenever the slab is hidden — a real, if minor, visual change this batch is not meant to make.
  | { kind: 'foundation-slab'; visible: boolean; widthM: number; lengthM: number }
  // `visible` mirrors foundation-slab/wall-segment/roof-segment: the frame's geometry is always
  // computed so a dematerialize transition has real column/truss positions to fade *from* the
  // instant scope.frame flips false, instead of the elements vanishing with nothing left to
  // animate — the same class of bug the foundation-bounds regression was.
  | { kind: 'frame-column'; visible: boolean; face: 'front' | 'side'; positionM: number; heightM: number }
  | { kind: 'frame-truss'; visible: boolean; positionM: number; widthM: number; heightM: number }
  // Secondary structure — horizontal members along the eave wall, at a couple of height levels.
  | { kind: 'frame-purlin'; visible: boolean; positionM: number; lengthM: number }
  // One primitive per structural bay (segmentCount matches frameBayCount for that face), so the
  // wall can materialise section-by-section instead of as one flat panel.
  | {
      kind: 'wall-segment';
      face: 'front' | 'side';
      index: number;
      segmentCount: number;
      hasFill: boolean;
      envelope: EnvelopeChoice;
    }
  | { kind: 'roof-segment'; index: number; segmentCount: number; hasFill: boolean; envelope: EnvelopeChoice }
  | { kind: 'opening-cutout'; positionM: number; widthM: number; heightM: number }
  | { kind: 'dimension-guide'; axis: 'width' | 'length' | 'height'; valueM: number };

export type SceneModel = {
  dimensions: { widthM: number; lengthM: number; heightM: number };
  primitives: ScenePrimitive[];
};

function buildGatePlacements(gates: GatesCount, widthM: number, heightM: number) {
  if (gates === 0) return [];
  const gateHeightM = heightM * GATE_HEIGHT_RATIO;
  const gateWidthM = widthM * GATE_WIDTH_RATIO;
  const gapM = widthM * GATE_GAP_RATIO;
  const marginM = widthM * GATE_MARGIN_RATIO;
  const usableM = widthM - marginM * 2;
  const totalWidthM = gates * gateWidthM + (gates - 1) * gapM;
  const startM = marginM + Math.max(0, (usableM - totalWidthM) / 2);

  return Array.from({ length: gates }, (_, i) => ({
    positionM: startM + i * (gateWidthM + gapM),
    widthM: gateWidthM,
    heightM: gateHeightM,
  }));
}

function buildWallSegments(
  face: 'front' | 'side',
  spanM: number,
  hasFill: boolean,
  envelope: EnvelopeChoice,
): Extract<ScenePrimitive, { kind: 'wall-segment' }>[] {
  const segmentCount = frameBayCount(spanM);
  return Array.from({ length: segmentCount }, (_, index) => ({
    kind: 'wall-segment' as const,
    face,
    index,
    segmentCount,
    hasFill,
    envelope,
  }));
}

function buildRoofSegments(
  lengthM: number,
  hasFill: boolean,
  envelope: EnvelopeChoice,
): Extract<ScenePrimitive, { kind: 'roof-segment' }>[] {
  const segmentCount = frameBayCount(lengthM);
  return Array.from({ length: segmentCount }, (_, index) => ({
    kind: 'roof-segment' as const,
    index,
    segmentCount,
    hasFill,
    envelope,
  }));
}

/** Pure: HangarDomainModel in, a renderer-neutral SceneModel out. */
export function buildHangarScene(domain: HangarDomainModel): SceneModel {
  const { widthM, lengthM, heightM } = domain.dimensions;
  const primitives: ScenePrimitive[] = [];

  primitives.push({ kind: 'terrain-plane', widthM, lengthM });

  primitives.push({ kind: 'foundation-slab', visible: domain.scope.foundation, widthM, lengthM });

  const frameVisible = domain.scope.frame;
  const frontBays = frameBayCount(widthM);
  for (let i = 0; i <= frontBays; i += 1) {
    primitives.push({ kind: 'frame-column', visible: frameVisible, face: 'front', positionM: (i / frontBays) * widthM, heightM });
  }
  const sideBays = frameBayCount(lengthM);
  for (let i = 0; i <= sideBays; i += 1) {
    primitives.push({ kind: 'frame-column', visible: frameVisible, face: 'side', positionM: (i / sideBays) * lengthM, heightM });
  }
  for (let i = 0; i <= sideBays; i += 1) {
    primitives.push({ kind: 'frame-truss', visible: frameVisible, positionM: (i / sideBays) * lengthM, widthM, heightM });
  }
  for (const level of PURLIN_LEVELS) {
    primitives.push({ kind: 'frame-purlin', visible: frameVisible, positionM: level * heightM, lengthM });
  }

  primitives.push(...buildWallSegments('front', widthM, domain.scope.walls, domain.envelope));
  primitives.push(...buildWallSegments('side', lengthM, domain.scope.walls, domain.envelope));
  primitives.push(...buildRoofSegments(lengthM, domain.scope.roof, domain.envelope));

  for (const gate of buildGatePlacements(domain.gates, widthM, heightM)) {
    primitives.push({ kind: 'opening-cutout', ...gate });
  }

  primitives.push({ kind: 'dimension-guide', axis: 'width', valueM: widthM });
  primitives.push({ kind: 'dimension-guide', axis: 'length', valueM: lengthM });
  primitives.push({ kind: 'dimension-guide', axis: 'height', valueM: heightM });

  return { dimensions: { widthM, lengthM, heightM }, primitives };
}
