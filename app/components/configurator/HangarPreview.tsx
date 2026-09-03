'use client';

import type { CSSProperties } from 'react';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import {
  pointsAttr,
  projectIsometricScene,
  type DimensionGuide,
  type FrameLine,
  type Point,
  type ProjectedSegment,
} from '../../lib/configurator/isometricProjection';
import { buildTechnicalScene } from '../../lib/configurator/technicalSceneModel';
import { LAYER_DURATION_MS, layerStartOffsetMs, staggerDelayMs } from '../../lib/configurator/buildUpSequence';
import { useLayerHighlight } from './useLayerHighlight';
import { useLayerLifecycle, type LayerTransitionStyle } from './useLayerLifecycle';

const VIEWBOX_PADDING = 32;

function formatMetres(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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
      <text x={guide.label.x} y={guide.label.y} textAnchor={guide.anchor}>{guide.text}</text>
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

export function HangarPreview({ domain }: { domain: HangarDomainModel }) {
  const { dimensions, envelope, scope, gates } = domain;
  // State → Domain → ParametricBuildingModel (the single source of geometric truth) →
  // TechnicalSceneModel → this projection. A future 3D renderer branches at the parametric
  // model, NOT here — which is what stops the two views drawing different buildings.
  const technical = buildTechnicalScene(domain);
  const scene = projectIsometricScene(technical);
  const { ridgeHeightM } = technical.dimensions;

  const widthActive = useLayerHighlight(dimensions.widthM);
  const lengthActive = useLayerHighlight(dimensions.lengthM);
  const heightActive = useLayerHighlight(dimensions.eaveHeightM);

  const foundation = useLayerLifecycle(scope.foundation, LAYER_DURATION_MS.foundation, layerStartOffsetMs('foundation'));
  const columns = useLayerLifecycle(scope.frame, LAYER_DURATION_MS.columns, layerStartOffsetMs('columns'));
  const rafters = useLayerLifecycle(scope.frame, LAYER_DURATION_MS.rafters, layerStartOffsetMs('rafters'));
  const purlins = useLayerLifecycle(scope.frame, LAYER_DURATION_MS.purlins, layerStartOffsetMs('purlins'));
  const walls = useLayerLifecycle(scope.walls, LAYER_DURATION_MS.walls, layerStartOffsetMs('walls'));
  const roof = useLayerLifecycle(scope.roof, LAYER_DURATION_MS.roof, layerStartOffsetMs('roof'));
  const gateLayer = useLayerLifecycle(gates > 0, LAYER_DURATION_MS.gates, layerStartOffsetMs('gates'));

  const facadeActive = widthActive || heightActive;
  const sideActive = lengthActive || heightActive;
  const topActive = widthActive || lengthActive;

  const { minX, minY, maxX, maxY } = scene.bounds;
  const viewBox = `${minX - VIEWBOX_PADDING} ${minY - VIEWBOX_PADDING} ${maxX - minX + VIEWBOX_PADDING * 2} ${maxY - minY + VIEWBOX_PADDING * 2}`;

  // Painter's order for this fixed axonometric: the camera sees the FRONT gable (z=0) and the
  // RIGHT wall (x=widthM), so the rear gable and left wall are drawn first and end up occluded.
  const rearGable = scene.gableEnds.find((g) => g.face === 'rear');
  const frontGable = scene.gableEnds.find((g) => g.face === 'front');
  const leftWalls = scene.wallSegments.filter((w) => w.face === 'left');
  const rightWalls = scene.wallSegments.filter((w) => w.face === 'right');

  return (
    <svg
      className="hc-preview-svg"
      viewBox={viewBox}
      role="img"
      aria-label={`Схематичний ескіз ангара: ${dimensions.widthM} на ${dimensions.lengthM} метрів, висота стін ${dimensions.eaveHeightM} м, двосхила покрівля, висота в коньку приблизно ${formatMetres(ridgeHeightM)} м`}
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

      <polygon className="hc-terrain" points={pointsAttr(scene.terrain)} aria-hidden="true" />

      <polygon
        className={`hc-layer hc-buildlayer hc-foundation hc-phase-${foundation.phase}`}
        style={transitionStyle(foundation)}
        points={pointsAttr(scene.foundation.points)}
      />

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
      </g>

      <g className="hc-layer hc-purlins">
        {scene.frame.purlins.map((line, index) => (
          <FrameLineEl
            key={index}
            line={line}
            className={`hc-buildlayer hc-phase-${purlins.phase}`}
            style={transitionStyle(purlins, staggerDelayMs('purlins', index, scene.frame.purlins.length))}
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
