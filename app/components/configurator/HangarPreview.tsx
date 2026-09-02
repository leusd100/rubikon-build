'use client';

import type { CSSProperties } from 'react';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import {
  pointsAttr,
  projectIsometricScene,
  type DimensionGuide,
  type FrameLine,
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

export function HangarPreview({ domain }: { domain: HangarDomainModel }) {
  const { dimensions, envelope, scope, gates } = domain;
  // State → Domain (already done by the caller) → Scene (renderer-neutral, metres) → this SVG
  // projection (pixels). A future renderer consumes the same buildHangarScene() output and does
  // its own projection step instead of this one — see app/lib/configurator/sceneModel.ts. This
  // recomputes on every render purely from `domain`, so a dimension change updates geometry
  // immediately without touching any layer's animation phase below.
  const scene = projectIsometricScene(buildHangarScene(domain));

  const widthActive = useLayerHighlight(dimensions.widthM);
  const lengthActive = useLayerHighlight(dimensions.lengthM);
  const heightActive = useLayerHighlight(dimensions.heightM);
  const wallsActive = useLayerHighlight(`${scope.walls}:${envelope}`);
  const roofActive = useLayerHighlight(scope.roof);
  const gatesActive = useLayerHighlight(gates);
  // Purlins keep the simple flash-on-change treatment for this pass — full lifecycle build-up
  // for purlins/walls/roof/gates is Phase 2B, gated on foundation/columns/trusses (below) first
  // proving out stable across the full test run (see the Phase 2 brief's internal-gate note).
  const purlinsActive = useLayerHighlight(scope.frame);

  // Phase 2A core: foundation, columns and trusses each get the full materialize/dematerialize
  // lifecycle, staged in build order via layerStartOffsetMs. `scope.foundation`/`scope.frame` are
  // discrete booleans — flipping one of them is the only thing that (re)starts a transition here;
  // a dimension change never touches these hooks' first argument, so it can never replay one.
  const foundation = useLayerLifecycle(scope.foundation, LAYER_DURATION_MS.foundation, layerStartOffsetMs('foundation'));
  const columns = useLayerLifecycle(scope.frame, LAYER_DURATION_MS.columns, layerStartOffsetMs('columns'));
  const trusses = useLayerLifecycle(scope.frame, LAYER_DURATION_MS.trusses, layerStartOffsetMs('trusses'));

  const facadeActive = widthActive || heightActive || wallsActive;
  const sideActive = lengthActive || heightActive || wallsActive;
  const topActive = widthActive || lengthActive || roofActive;

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

      <g
        className={`hc-layer hc-top hc-envelope-${envelope} ${topActive ? 'is-active' : ''}`}
      >
        {scene.roofSegments.map((segment, index) => (
          <polygon
            key={index}
            className={segment.hasFill ? 'has-roof' : 'no-roof'}
            points={pointsAttr(segment.points)}
          />
        ))}
      </g>

      <g
        className={`hc-layer hc-side hc-envelope-${envelope} ${sideActive ? 'is-active' : ''}`}
      >
        {scene.wallSegments.side.map((segment, index) => (
          <polygon
            key={index}
            className={segment.hasFill ? 'has-walls' : 'no-walls'}
            points={pointsAttr(segment.points)}
          />
        ))}
      </g>

      <g
        className={`hc-layer hc-front hc-envelope-${envelope} ${facadeActive ? 'is-active' : ''}`}
      >
        {scene.wallSegments.front.map((segment, index) => (
          <polygon
            key={index}
            className={segment.hasFill ? 'has-walls' : 'no-walls'}
            points={pointsAttr(segment.points)}
          />
        ))}
        {scene.gates.map((gate, index) => (
          <polygon key={index} className="hc-gate" points={pointsAttr(gate.points)} />
        ))}
      </g>
      {scene.gates.length > 0 && (
        <g className={`hc-gate-outline ${gatesActive ? 'is-active' : ''}`} aria-hidden="true">
          {scene.gates.map((gate, index) => (
            <polygon key={index} points={pointsAttr(gate.points)} />
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

      <g className={`hc-layer hc-purlins ${purlinsActive ? 'is-active' : ''}`}>
        {scene.frame.purlins.map((line, index) => (
          <FrameLineEl key={index} line={line} className="" style={{}} />
        ))}
      </g>

      <DimensionGuideGroup guide={scene.dimensions.width} />
      <DimensionGuideGroup guide={scene.dimensions.length} />
      <DimensionGuideGroup guide={scene.dimensions.height} />
    </svg>
  );
}
