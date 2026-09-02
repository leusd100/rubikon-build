import type { HangarDomainModel } from './domainModel';
import type { EnvelopeChoice, GatesCount } from './types';

// Renderer-neutral description of the hangar scene, entirely in metres. No pixels, no SVG
// points, no Three.js vectors — a scene model is a fact about the *object*, not about how any
// particular renderer chooses to draw it. This is the layer both the SVG projector
// (isometricProjection.ts) and the R3F spike (app/r3f-spike) consume; neither renderer stores
// business state, and swapping renderers means writing a new consumer of this same type, not
// touching buildHangarScene() or anything upstream of it.
//
// Frame is deliberately split into columns *and* trusses as two distinct primitive kinds, even
// though the current SVG renderer only draws columns (see isometricProjection.ts — it ignores
// frame-truss on purpose, "no visual redesign" per this batch's scope). The R3F spike does
// render both, because a truss spanning the columns is what makes an assembly read as a real
// structure rather than a row of posts — that's exactly the kind of renderer-specific
// interpretation this split is meant to allow.

const FRAME_TARGET_SPACING_M = 6;
const FRAME_MIN_BAYS = 2;
const FRAME_MAX_BAYS = 10;
const GATE_HEIGHT_RATIO = 0.72;
const GATE_WIDTH_RATIO = 0.22;
const GATE_GAP_RATIO = 0.08;
const GATE_MARGIN_RATIO = 0.06;

/**
 * How many structural bays a span of this length gets — a visual-rhythm heuristic (target ~6m
 * spacing, clamped to a legible 2–10 bays), not a structural span calculation. Keep it framed
 * that way in any UI copy that ever references it, per the brief's "no false engineering
 * precision" rule.
 */
export function frameBayCount(spanMetres: number): number {
  const raw = Math.round(spanMetres / FRAME_TARGET_SPACING_M);
  return Math.min(FRAME_MAX_BAYS, Math.max(FRAME_MIN_BAYS, raw));
}

export type ScenePrimitive =
  // `visible` (not omission) mirrors envelope-panel/roof-plane below on purpose: the slab's
  // footprint always participates in scene bounds/framing, matching the pre-SceneModel
  // behaviour where the foundation polygon was always computed and only conditionally drawn.
  // Omitting the primitive entirely when scope.foundation is false would tighten the viewBox
  // whenever the slab is hidden — a real, if minor, visual change this batch is not meant to make.
  | { kind: 'foundation-slab'; visible: boolean; widthM: number; lengthM: number }
  | { kind: 'frame-column'; face: 'front' | 'side'; positionM: number; heightM: number }
  | { kind: 'frame-truss'; positionM: number; widthM: number; heightM: number }
  | { kind: 'envelope-panel'; face: 'front' | 'side'; hasFill: boolean; envelope: EnvelopeChoice; widthM: number; heightM: number }
  | { kind: 'roof-plane'; hasFill: boolean; envelope: EnvelopeChoice; widthM: number; lengthM: number }
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

/** Pure: HangarDomainModel in, a renderer-neutral SceneModel out. */
export function buildHangarScene(domain: HangarDomainModel): SceneModel {
  const { widthM, lengthM, heightM } = domain.dimensions;
  const primitives: ScenePrimitive[] = [];

  primitives.push({ kind: 'foundation-slab', visible: domain.scope.foundation, widthM, lengthM });

  if (domain.scope.frame) {
    const frontBays = frameBayCount(widthM);
    for (let i = 0; i <= frontBays; i += 1) {
      primitives.push({ kind: 'frame-column', face: 'front', positionM: (i / frontBays) * widthM, heightM });
    }
    const sideBays = frameBayCount(lengthM);
    for (let i = 0; i <= sideBays; i += 1) {
      primitives.push({ kind: 'frame-column', face: 'side', positionM: (i / sideBays) * lengthM, heightM });
    }
    for (let i = 0; i <= sideBays; i += 1) {
      primitives.push({ kind: 'frame-truss', positionM: (i / sideBays) * lengthM, widthM, heightM });
    }
  }

  primitives.push({ kind: 'envelope-panel', face: 'front', hasFill: domain.scope.walls, envelope: domain.envelope, widthM, heightM });
  primitives.push({ kind: 'envelope-panel', face: 'side', hasFill: domain.scope.walls, envelope: domain.envelope, widthM: lengthM, heightM });
  primitives.push({ kind: 'roof-plane', hasFill: domain.scope.roof, envelope: domain.envelope, widthM, lengthM });

  for (const gate of buildGatePlacements(domain.gates, widthM, heightM)) {
    primitives.push({ kind: 'opening-cutout', ...gate });
  }

  primitives.push({ kind: 'dimension-guide', axis: 'width', valueM: widthM });
  primitives.push({ kind: 'dimension-guide', axis: 'length', valueM: lengthM });
  primitives.push({ kind: 'dimension-guide', axis: 'height', valueM: heightM });

  return { dimensions: { widthM, lengthM, heightM }, primitives };
}
