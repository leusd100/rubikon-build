'use client';

import type { CSSProperties } from 'react';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import {
  pointsAttr,
  projectIsometricScene,
  type DimensionGuide,
  type FrameLine,
  type Point,
} from '../../lib/configurator/isometricProjection';
import { buildHangarScene } from '../../lib/configurator/sceneModel';
import { LAYER_DURATION_MS, layerStartOffsetMs, staggerDelayMs } from '../../lib/configurator/buildUpSequence';
import { useLayerHighlight } from './useLayerHighlight';
import { useLayerLifecycle, type LayerTransitionStyle } from './useLayerLifecycle';

const VIEWBOX_PADDING = 48;

function DimensionGuideGroup({ guide }: { guide: DimensionGuide }) {
  const [a, b] = guide.line;
  return (
    <g className="hc-dimension" aria-hidden="true">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <line x1={guide.ticks[0][0].x} y1={guide.ticks[0][0].y} x2={guide.ticks[0][1].x} y2={guide.ticks[0][1].y} />
      <line x1={guide.ticks[1][0].x} y1={guide.ticks[1][0].y} x2={guide.ticks[1][1].x} y2={guide.ticks[1][1].y} />
      <text x={guide.label.x} y={guide.label.y} textAnchor={guide.anchor}>
        {guide.valueM} м
      </text>
    </g>
  );
}

/**
 * The inline transition timing for one element within a lifecycle-driven layer — folds the
 * layer's own base delay (its sequencing offset in the build order) together with this specific
 * instance's stagger-by-bay offset, so the JS completion timer and every individual element's CSS
 * transition read from the exact same numbers (see useLayerLifecycle.ts's doc comment). Under
 * reduced motion `layer.reducedMotion` is true and both of the layer's own numbers are already
 * zeroed — `extraDelayMs` (the per-instance stagger) is dropped too in that case, so nothing
 * staggers, matching the "no distracting stagger" requirement.
 */
function transitionStyle(layer: LayerTransitionStyle, extraDelayMs = 0): CSSProperties {
  return {
    transitionDuration: `${layer.transitionDurationMs}ms`,
    transitionDelay: `${layer.transitionDelayMs + (layer.reducedMotion ? 0 : extraDelayMs)}ms`,
  };
}

function FrameLineEl({
  line,
  className,
  style,
}: {
  line: FrameLine;
  className: string;
  style: CSSProperties;
}) {
  const [a, b] = line.points;
  return <line className={className} style={style} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
}

/** One lifecycle-driven segment/cutout polygon — the shared shape every per-bay wall/roof
 * segment and every gate cutout renders through, so there is exactly one place that turns
 * `{points, className, style}` into markup, whichever layer it belongs to. */
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

export function HangarPreview({ domain }: { domain: HangarDomainModel }) {
  const { dimensions, envelope, scope, gates } = domain;
  // State → Domain (already done by the caller) → Scene (renderer-neutral, metres) → this SVG
  // projection (pixels). A future renderer consumes the same buildHangarScene() output and does
  // its own projection step instead of this one — see app/lib/configurator/sceneModel.ts. This
  // recomputes on every render purely from `domain`, so a dimension change updates geometry
  // immediately without touching any layer's animation phase below.
  const scene = projectIsometricScene(buildHangarScene(domain));

  // Dimension changes keep the lightweight flash — never the full build-up lifecycle below, per
  // the brief's trigger rule. These stay the only `useLayerHighlight` consumers now that every
  // scope-driven layer (including walls/roof/purlins/gates as of Phase 2B) has its own lifecycle,
  // which already gives a scope toggle a much stronger signal than a colour flash — stacking a
  // flash on top of a materialize/dematerialize transition would just be visual noise.
  const widthActive = useLayerHighlight(dimensions.widthM);
  const lengthActive = useLayerHighlight(dimensions.lengthM);
  const heightActive = useLayerHighlight(dimensions.heightM);

  // Every scope-driven layer uses the exact same hook and the exact same per-layer timing table —
  // no per-layer special-casing, only the (visible, duration, sequencing-offset) inputs differ.
  // `scope.foundation`/`scope.frame`/`scope.walls`/`scope.roof` are discrete booleans and `gates`
  // is a small count; flipping one of these is the only thing that (re)starts a transition here.
  // A dimension change never touches any of these hooks' first argument, so it can never replay
  // one — geometry still updates immediately every render via `scene` above, independent of phase.
  const foundation = useLayerLifecycle(scope.foundation, LAYER_DURATION_MS.foundation, layerStartOffsetMs('foundation'));
  const columns = useLayerLifecycle(scope.frame, LAYER_DURATION_MS.columns, layerStartOffsetMs('columns'));
  const trusses = useLayerLifecycle(scope.frame, LAYER_DURATION_MS.trusses, layerStartOffsetMs('trusses'));
  const purlins = useLayerLifecycle(scope.frame, LAYER_DURATION_MS.purlins, layerStartOffsetMs('purlins'));
  const walls = useLayerLifecycle(scope.walls, LAYER_DURATION_MS.walls, layerStartOffsetMs('walls'));
  const roof = useLayerLifecycle(scope.roof, LAYER_DURATION_MS.roof, layerStartOffsetMs('roof'));
  // Gates only replay on the discrete "some gates exist" ↔ "no gates" transition — flipping the
  // count between 1 and 2 never touches this boolean, so it updates the two cutouts' positions
  // immediately without restarting the reveal (the same rule dimension changes get, applied to a
  // count instead of a continuous value).
  const gateLayer = useLayerLifecycle(gates > 0, LAYER_DURATION_MS.gates, layerStartOffsetMs('gates'));

  const facadeActive = widthActive || heightActive;
  const sideActive = lengthActive || heightActive;
  const topActive = widthActive || lengthActive;

  const { minX, minY, maxX, maxY } = scene.bounds;
  const viewBox = `${minX - VIEWBOX_PADDING} ${minY - VIEWBOX_PADDING} ${maxX - minX + VIEWBOX_PADDING * 2} ${maxY - minY + VIEWBOX_PADDING * 2}`;

  return (
    <svg
      className="hc-preview-svg"
      viewBox={viewBox}
      role="img"
      aria-label={`Схематичний ескіз ангара: ${dimensions.widthM} на ${dimensions.lengthM} метрів, висота стін ${dimensions.heightM} м`}
    >
      <defs>
        {/* Envelope state is never colour-only: "Утеплений" gets a ribbed panel texture,
            "Ще не визначився" a diagonal hatch — both real technical-drawing conventions for
            "insulated layer" and "not yet specified" respectively, not decoration. */}
        <pattern id="hc-pattern-insulated" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" className="hc-pattern-base" />
          <line x1="0" y1="3" x2="10" y2="3" className="hc-pattern-line" />
          <line x1="0" y1="7" x2="10" y2="7" className="hc-pattern-line" />
        </pattern>
        <pattern id="hc-pattern-undecided" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" className="hc-pattern-base" />
          <line x1="0" y1="0" x2="0" y2="10" className="hc-pattern-line" />
        </pattern>
      </defs>

      {/* Always-on ground reference — never scope-driven, never part of the build sequence. */}
      <polygon className="hc-terrain" points={pointsAttr(scene.terrain)} aria-hidden="true" />

      <polygon
        className={`hc-layer hc-buildlayer hc-foundation hc-phase-${foundation.phase}`}
        style={transitionStyle(foundation)}
        points={pointsAttr(scene.foundation.points)}
      />

      {/* Paint order here is z-stacking, not build order (see buildUpSequence.ts for the actual
          staged sequence) — walls/roof are painted before the frame specifically so columns/
          trusses/purlins always render on top of an enclosed shell, per the brief's "the
          structural logic should remain readable after enclosure appears" requirement. */}
      <g className={`hc-layer hc-top hc-envelope-${envelope} ${topActive ? 'is-active' : ''}`}>
        {scene.roofSegments.map((segment, index) => (
          <BuildLayerPolygon
            key={index}
            points={segment.points}
            className={`hc-buildlayer hc-phase-${roof.phase} ${segment.hasFill ? 'has-roof' : 'no-roof'}`}
            style={transitionStyle(roof, staggerDelayMs('roof', index, scene.roofSegments.length))}
          />
        ))}
      </g>

      <g className={`hc-layer hc-side hc-envelope-${envelope} ${sideActive ? 'is-active' : ''}`}>
        {scene.wallSegments.side.map((segment, index) => (
          <BuildLayerPolygon
            key={index}
            points={segment.points}
            className={`hc-buildlayer hc-phase-${walls.phase} ${segment.hasFill ? 'has-walls' : 'no-walls'}`}
            style={transitionStyle(walls, staggerDelayMs('walls', index, scene.wallSegments.side.length))}
          />
        ))}
      </g>

      <g className={`hc-layer hc-front hc-envelope-${envelope} ${facadeActive ? 'is-active' : ''}`}>
        {scene.wallSegments.front.map((segment, index) => (
          <BuildLayerPolygon
            key={index}
            points={segment.points}
            className={`hc-buildlayer hc-phase-${walls.phase} ${segment.hasFill ? 'has-walls' : 'no-walls'}`}
            style={transitionStyle(walls, staggerDelayMs('walls', index, scene.wallSegments.front.length))}
          />
        ))}
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
        {scene.frame.frontColumns.map((line, index) => (
          <FrameLineEl
            key={`f${index}`}
            line={line}
            className={`hc-buildlayer hc-phase-${columns.phase}`}
            style={transitionStyle(columns, staggerDelayMs('columns', index, scene.frame.frontColumns.length))}
          />
        ))}
        {scene.frame.sideColumns.map((line, index) => (
          <FrameLineEl
            key={`s${index}`}
            line={line}
            className={`hc-buildlayer hc-phase-${columns.phase}`}
            style={transitionStyle(columns, staggerDelayMs('columns', index, scene.frame.sideColumns.length))}
          />
        ))}
      </g>

      <g className="hc-layer hc-trusses">
        {scene.frame.trusses.map((line, index) => (
          <FrameLineEl
            key={index}
            line={line}
            className={`hc-buildlayer hc-phase-${trusses.phase}`}
            style={transitionStyle(trusses, staggerDelayMs('trusses', index, scene.frame.trusses.length))}
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

      <DimensionGuideGroup guide={scene.dimensions.width} />
      <DimensionGuideGroup guide={scene.dimensions.length} />
      <DimensionGuideGroup guide={scene.dimensions.height} />
    </svg>
  );
}
