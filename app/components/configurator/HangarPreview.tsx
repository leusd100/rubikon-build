'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import {
  labelScaleToFit,
  pointsAttr,
  projectIsometricScene,
  viewBoxOf,
  type DimensionGuide,
  type FrameLine,
  type Point,
  type ProjectedSegment,
} from '../../lib/configurator/isometricProjection';
import { buildTechnicalScene } from '../../lib/configurator/technicalSceneModel';
import {
  BUILD_STAGE_ORDER,
  LAYER_DURATION_MS,
  isStageReleased,
  layerStartOffsetMs,
  staggerDelayMs,
  type BuildStage,
} from '../../lib/configurator/buildUpSequence';
import { previewDescription } from './sheetLabels';
import { useLayerHighlight } from './useLayerHighlight';
import { useLayerLifecycle, type LayerTransitionStyle } from './useLayerLifecycle';

type Box = { width: number; height: number };

/**
 * The drawing's content box while its dimension labels are on show, for `labelScaleToFit` — null until it is measured
 * (the server markup draws the labels at their base size) and in the phone's mini drawing, which hides the labels
 * (configurator-sheet.css) and so needs no room made for them. A new box only when it really changed: drawing the
 * labels larger changes the viewBox, never the box, so a measure cannot feed itself.
 */
function useLabelBox(svgRef: RefObject<SVGSVGElement | null>): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const label = svg.querySelector('.hc-dimension');
      const shown = label !== null && getComputedStyle(label).display !== 'none';
      const { width, height } = entry.contentRect;
      setBox((current) => {
        if (!shown) return null;
        if (current && Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5) return current;
        return { width, height };
      });
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [svgRef]);
  return box;
}

function DimensionGuideGroup({ guide }: { guide: DimensionGuide }) {
  const [a, b] = guide.line;
  return (
    <g className={`hc-dimension${guide.derived ? ' is-derived' : ''}`} aria-hidden="true">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <line x1={guide.ticks[0][0].x} y1={guide.ticks[0][0].y} x2={guide.ticks[0][1].x} y2={guide.ticks[0][1].y} />
      <line x1={guide.ticks[1][0].x} y1={guide.ticks[1][0].y} x2={guide.ticks[1][1].x} y2={guide.ticks[1][1].y} />
      {/* Text comes from the projection, not composed here: the bounds calculation has to know
          the label's width to keep it inside the viewBox, so one module owns the string. */}
      <text
        x={guide.label.x}
        y={guide.label.y}
        textAnchor={guide.anchor}
        transform={guide.rotated ? `rotate(-90 ${guide.label.x} ${guide.label.y})` : undefined}
        dominantBaseline={guide.rotated ? 'middle' : undefined}
      >
        {guide.text}
      </text>
    </g>
  );
}

function transitionStyle(layer: LayerTransitionStyle, extraDelayMs = 0): CSSProperties {
  return {
    transitionDuration: `${layer.transitionDurationMs}ms`,
    transitionDelay: `${layer.transitionDelayMs + (layer.reducedMotion ? 0 : extraDelayMs)}ms`,
  };
}

function FrameLineEl({ line, className, style }: { line: FrameLine; className: string; style: CSSProperties }) {
  const [a, b] = line.points;
  return <line className={className} style={style} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
}

function BuildLayerPolygon({
  points,
  className,
  style,
}: {
  points: Point[];
  className: string;
  style: CSSProperties;
}) {
  return <polygon className={className} style={style} points={pointsAttr(points)} />;
}

/** Shared renderer for any envelope surface (side wall bay, gable end, roof bay). */
function EnvelopeSurface({
  segment,
  phase,
  style,
  fillClass,
  emptyClass,
}: {
  segment: ProjectedSegment;
  phase: string;
  style: CSSProperties;
  fillClass: string;
  emptyClass: string;
}) {
  return (
    <BuildLayerPolygon
      points={segment.points}
      className={`hc-buildlayer hc-phase-${phase} ${segment.hasFill ? fillClass : emptyClass}`}
      style={style}
    />
  );
}

export function HangarPreview({
  domain,
  released = BUILD_STAGE_ORDER.length,
}: Readonly<{
  domain: HangarDomainModel;
  /** Build stages requested so far by /angary's first view (useFirstViewBuildUp): a stage still held back stays hidden
   *  whatever the scope says, then arrives through its usual lifecycle. All of them by default. */
  released?: number;
}>) {
  const { dimensions, envelope, scope, gates } = domain;
  const shown = (stage: BuildStage) => isStageReleased(stage, released);
  // State → Domain → ParametricBuildingModel (the single source of geometric truth) →
  // TechnicalSceneModel → this projection. A future 3D renderer branches at the parametric
  // model, NOT here — which is what stops the two views drawing different buildings.
  const technical = useMemo(() => buildTechnicalScene(domain), [domain]);
  // The labels keep a legible size on screen however small the drawing is shown (03.10: 6.9 px on a 390 px phone)
  const svgRef = useRef<SVGSVGElement>(null);
  const labelBox = useLabelBox(svgRef);
  const labelScale = useMemo(() => (labelBox ? labelScaleToFit(technical, labelBox) : 1), [technical, labelBox]);
  const scene = projectIsometricScene(technical, labelScale);
  const { ridgeHeightM } = technical.dimensions;

  const widthActive = useLayerHighlight(dimensions.widthM);
  const lengthActive = useLayerHighlight(dimensions.lengthM);
  const heightActive = useLayerHighlight(dimensions.eaveHeightM);

  const foundation = useLayerLifecycle(scope.foundation && shown('foundation'), LAYER_DURATION_MS.foundation, layerStartOffsetMs('foundation'));
  const columns = useLayerLifecycle(scope.frame && shown('frame'), LAYER_DURATION_MS.columns, layerStartOffsetMs('columns'));
  const rafters = useLayerLifecycle(scope.frame && shown('frame'), LAYER_DURATION_MS.rafters, layerStartOffsetMs('rafters'));
  const purlins = useLayerLifecycle(scope.frame && shown('frame'), LAYER_DURATION_MS.purlins, layerStartOffsetMs('purlins'));
  const walls = useLayerLifecycle(scope.walls && shown('walls'), LAYER_DURATION_MS.walls, layerStartOffsetMs('walls'));
  const roof = useLayerLifecycle(scope.roof && shown('roof'), LAYER_DURATION_MS.roof, layerStartOffsetMs('roof'));
  // A gate is an opening CUT INTO a wall — it cannot read as an opening with no wall to cut into,
  // so it materializes only when both are true. (Real bug, not a hypothetical: this used to be
  // `gates > 0` alone, letting a gate rectangle stay on screen after switching walls out of scope
  // — caught live by a user testing the running preview, on both this view and the 3D one, which
  // mirrored the same `gates > 0` condition in threeSceneModel.ts's `visible.gates`. Fixed in both
  // places with the same rule; see that file's matching comment.)
  const gateLayer = useLayerLifecycle(scope.walls && gates > 0 && shown('gates'), LAYER_DURATION_MS.gates, layerStartOffsetMs('gates'));

  const facadeActive = widthActive || heightActive;
  const sideActive = lengthActive || heightActive;
  const topActive = widthActive || lengthActive;

  const frame = viewBoxOf(scene.bounds);
  const viewBox = `${frame.x} ${frame.y} ${frame.width} ${frame.height}`;

  // Painter's order for this fixed axonometric: the camera sees the FRONT gable (z=0) and the
  // RIGHT wall (x=widthM), so the rear gable and left wall are drawn first and end up occluded.
  const rearGable = scene.gableEnds.find((g) => g.face === 'rear');
  const frontGable = scene.gableEnds.find((g) => g.face === 'front');
  const leftWalls = scene.wallSegments.filter((w) => w.face === 'left');
  const rightWalls = scene.wallSegments.filter((w) => w.face === 'right');

  return (
    <svg
      ref={svgRef}
      className="hc-preview-svg"
      viewBox={viewBox}
      role="img"
      aria-label={previewDescription('technical', dimensions, ridgeHeightM)}
      // the labels' type size follows the scale they were placed with (configurator.css .hc-dimension text)
      style={{ '--hc-label-scale': labelScale } as CSSProperties}
    >
      <defs>
        <pattern id="hc-pattern-insulated" width="10" height="16" patternUnits="userSpaceOnUse">
          <rect width="10" height="16" className="hc-pattern-base" />
          <line x1="0" y1="8" x2="10" y2="8" className="hc-pattern-line" />
        </pattern>
        <pattern id="hc-pattern-undecided" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" className="hc-pattern-base" />
          <line x1="0" y1="0" x2="0" y2="10" className="hc-pattern-line" />
        </pattern>
      </defs>

      {/* Terrain plane deliberately not drawn, for now: with the slab's own overhang widened and
          the slab itself flattened to a plain footprint outline (see isometricProjection.ts),
          the terrain's own outline sat right next to the slab's — two nested parallelogram
          outlines at the base read as a second, unrelated "box" the hangar sits on. Product call,
          not a data change: `scene.terrain` is still computed (isometricProjection.ts,
          technicalSceneModel.ts) and still deliberately excluded from bounds/framing exactly as
          before — only this one consumer stopped drawing it. */}

      <polygon
        className={`hc-layer hc-buildlayer hc-foundation hc-phase-${foundation.phase}`}
        style={transitionStyle(foundation)}
        points={pointsAttr(scene.foundation.points)}
      />

      {/* Phase 3D — isolated footings, the slab's alternative. Same `foundation` build-up layer:
          never both visible (see isometricProjection.ts/technicalSceneModel.ts), so sharing the
          one lifecycle is correct, not a coincidence — whichever representation is on screen
          follows the exact same scope.foundation timing the slab alone used to.
          Phase 3F.1 bug fix: this used to render every entry in `scene.footings` unconditionally,
          never reading `f.visible` (technicalSceneModel.ts's own `domain.scope.foundation &&
          domain.foundation.type === 'isolated'` computation, threaded through by
          isometricProjection.ts) — footing markers stayed on screen after switching to
          "Монолітна плита", since `scene.footings` is always populated regardless of which
          foundation representation is actually selected (footings are geometry, same "always
          present, visibility is the renderer's business" rule the slab polygon above already
          follows). Filtering on `f.visible` here — the one flag that already encodes the correct
          condition — rather than re-deriving `domain.foundation.type === 'isolated'` a second time. */}
      {scene.footings.filter((f) => f.visible).map((f) => (
        <polygon
          key={f.id}
          className={`hc-layer hc-buildlayer hc-footing hc-phase-${foundation.phase}`}
          style={transitionStyle(foundation)}
          points={pointsAttr(f.points)}
        />
      ))}

      {/* Occluded faces first (painter's order) — the rear gable and the left wall sit behind
          the building's own volume from this fixed viewpoint. */}
      {rearGable && (
        <g className={`hc-layer hc-gable hc-gable-rear hc-envelope-${envelope.walls}`}>
          <EnvelopeSurface
            segment={rearGable}
            phase={walls.phase}
            style={transitionStyle(walls)}
            fillClass="has-walls"
            emptyClass="no-walls"
          />
        </g>
      )}

      <g className={`hc-layer hc-side hc-side-left hc-envelope-${envelope.walls} ${sideActive ? 'is-active' : ''}`}>
        {leftWalls.map((segment, index) => (
          <EnvelopeSurface
            key={index}
            segment={segment}
            phase={walls.phase}
            style={transitionStyle(walls, staggerDelayMs('walls', index, leftWalls.length))}
            fillClass="has-walls"
            emptyClass="no-walls"
          />
        ))}
      </g>

      {/* Roof: two real slopes meeting at the ridge. Paint order is z-stacking, not build order
          (see buildUpSequence.ts) — the envelope goes down before the frame so columns and
          rafters always read on top of an enclosed shell. */}
      <g className={`hc-layer hc-top hc-envelope-${envelope.roof} ${topActive ? 'is-active' : ''}`}>
        {scene.roofSegments.map((segment, index) => (
          <EnvelopeSurface
            key={index}
            segment={segment}
            phase={roof.phase}
            style={transitionStyle(roof, staggerDelayMs('roof', index, scene.roofSegments.length))}
            fillClass="has-roof"
            emptyClass="no-roof"
          />
        ))}
      </g>

      <g className={`hc-layer hc-side hc-side-right hc-envelope-${envelope.walls} ${sideActive ? 'is-active' : ''}`}>
        {rightWalls.map((segment, index) => (
          <EnvelopeSurface
            key={index}
            segment={segment}
            phase={walls.phase}
            style={transitionStyle(walls, staggerDelayMs('walls', index, rightWalls.length))}
            fillClass="has-walls"
            emptyClass="no-walls"
          />
        ))}
      </g>

      <g className={`hc-layer hc-front hc-gable hc-gable-front hc-envelope-${envelope.walls} ${facadeActive ? 'is-active' : ''}`}>
        {frontGable && (
          <EnvelopeSurface
            segment={frontGable}
            phase={walls.phase}
            style={transitionStyle(walls)}
            fillClass="has-walls"
            emptyClass="no-walls"
          />
        )}
        {scene.gates.map((gate, index) => (
          <BuildLayerPolygon
            key={index}
            points={gate.points}
            className={`hc-buildlayer hc-phase-${gateLayer.phase} hc-gate`}
            style={transitionStyle(gateLayer, staggerDelayMs('gates', index, scene.gates.length))}
          />
        ))}
      </g>
      {scene.gates.length > 0 && (
        <g className="hc-gate-outline" aria-hidden="true">
          {scene.gates.map((gate, index) => (
            <BuildLayerPolygon
              key={index}
              points={gate.points}
              className={`hc-buildlayer hc-phase-${gateLayer.phase}`}
              style={transitionStyle(gateLayer, staggerDelayMs('gates', index, scene.gates.length))}
            />
          ))}
        </g>
      )}

      <g className="hc-layer hc-columns">
        {scene.frame.columns.map((line, index) => (
          <FrameLineEl
            key={index}
            line={line}
            className={`hc-buildlayer hc-phase-${columns.phase}`}
            style={transitionStyle(columns, staggerDelayMs('columns', index, scene.frame.columns.length))}
          />
        ))}
        {/* Phase 3E — the centre support line. Empty array unless structuralScheme is
            centerSupport (see InternalColumn's own doc comment), so no extra gating needed here —
            same SAME `columns` layer/phase as the external columns above (brief §14's own
            "columns arrive" grouping). */}
        {scene.frame.internalColumns.map((line, index) => (
          <FrameLineEl
            key={`internal-${index}`}
            line={line}
            className={`hc-buildlayer hc-phase-${columns.phase}`}
            style={transitionStyle(columns, staggerDelayMs('columns', index, scene.frame.internalColumns.length))}
          />
        ))}
        {scene.frame.internalColumnProps.map((line, index) => (
          <FrameLineEl
            key={`internal-prop-${index}`}
            line={line}
            className={`hc-buildlayer hc-phase-${columns.phase}`}
            style={transitionStyle(columns, staggerDelayMs('columns', index, scene.frame.internalColumnProps.length))}
          />
        ))}
      </g>

      <g className="hc-layer hc-rafters">
        {scene.frame.rafters.map((line, index) => (
          <FrameLineEl
            key={index}
            line={line}
            className={`hc-buildlayer hc-phase-${rafters.phase}`}
            style={transitionStyle(rafters, staggerDelayMs('rafters', index, scene.frame.rafters.length))}
          />
        ))}
        {/* Phase 3E — the truss's own bottom chord + web. `building.trusses` (and therefore this
            array) is ALWAYS populated regardless of roofStructure — same "geometry is a fact"
            rule TrussWebs itself follows — so the `visible` flag technicalSceneModel.ts already
            computed (frame scope AND roofStructure === 'truss') is what actually gates these,
            not omission. Same `rafters` layer/phase as the top chord above — one truss, one
            "roof framing arrives" moment. */}
        {domain.structural.roofStructure === 'truss' && scene.frame.trussChords.map((line, index) => (
          <FrameLineEl
            key={`truss-chord-${index}`}
            line={line}
            className={`hc-buildlayer hc-phase-${rafters.phase}`}
            style={transitionStyle(rafters, staggerDelayMs('rafters', index, scene.frame.trussChords.length))}
          />
        ))}
        {domain.structural.roofStructure === 'truss' && scene.frame.trussWebs.map((line, index) => (
          <FrameLineEl
            key={`truss-web-${index}`}
            line={line}
            className={`hc-buildlayer hc-phase-${rafters.phase} hc-truss-web`}
            style={transitionStyle(rafters, staggerDelayMs('rafters', index, scene.frame.trussWebs.length))}
          />
        ))}
      </g>

      <g className="hc-layer hc-purlins">
        {scene.frame.girts.map((line, index) => (
          <FrameLineEl
            key={index}
            line={line}
            className={`hc-buildlayer hc-phase-${purlins.phase}`}
            style={transitionStyle(purlins, staggerDelayMs('purlins', index, scene.frame.girts.length))}
          />
        ))}
        {/* 03.10 — the roof purlins, in the girts' own thin ink and the same layer/phase: the roof's
            secondary steel arrives with the walls'. */}
        {scene.frame.roofPurlins.map((line, index) => (
          <FrameLineEl
            key={`roof-purlin-${index}`}
            line={line}
            className={`hc-buildlayer hc-phase-${purlins.phase} hc-roof-purlin`}
            style={transitionStyle(purlins, staggerDelayMs('purlins', index, scene.frame.roofPurlins.length))}
          />
        ))}
        {/* Phase 3E, brief §13/§15 — a few restrained X marks, same `purlins` layer/phase as
            girts: both are secondary steel, always present, not a user control. */}
        {scene.frame.bracing.map((line, index) => (
          <FrameLineEl
            key={`brace-${index}`}
            line={line}
            className={`hc-buildlayer hc-phase-${purlins.phase} hc-brace`}
            style={transitionStyle(purlins, staggerDelayMs('purlins', index, scene.frame.bracing.length))}
          />
        ))}
        {/* 03.10 — the roof's crosses, in the wall bracing's bays and ink. */}
        {scene.frame.roofBracing.map((line, index) => (
          <FrameLineEl
            key={`roof-brace-${index}`}
            line={line}
            className={`hc-buildlayer hc-phase-${purlins.phase} hc-brace hc-roof-brace`}
            style={transitionStyle(purlins, staggerDelayMs('purlins', index, scene.frame.roofBracing.length))}
          />
        ))}
      </g>

      {/* The ridge is the gable's defining line — drawn with the roof layer, above the slopes. */}
      {scene.frame.ridge && (
        <g className="hc-layer hc-ridge">
          <FrameLineEl
            line={scene.frame.ridge}
            className={`hc-buildlayer hc-phase-${roof.phase}`}
            style={transitionStyle(roof)}
          />
        </g>
      )}

      <DimensionGuideGroup guide={scene.dimensions.width} />
      <DimensionGuideGroup guide={scene.dimensions.length} />
      <DimensionGuideGroup guide={scene.dimensions.eave} />
      <DimensionGuideGroup guide={scene.dimensions.ridge} />
    </svg>
  );
}
