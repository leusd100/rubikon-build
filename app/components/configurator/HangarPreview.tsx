'use client';

import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import { pointsAttr, projectIsometricScene, type DimensionGuide } from '../../lib/configurator/isometricProjection';
import { buildHangarScene } from '../../lib/configurator/sceneModel';
import { useLayerHighlight } from './useLayerHighlight';

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

export function HangarPreview({ domain }: { domain: HangarDomainModel }) {
  const { dimensions, envelope, scope, gates } = domain;
  // State → Domain (already done by the caller) → Scene (renderer-neutral, metres) → this SVG
  // projection (pixels). A future renderer consumes the same buildHangarScene() output and does
  // its own projection step instead of this one — see app/lib/configurator/sceneModel.ts.
  const scene = projectIsometricScene(buildHangarScene(domain));

  const widthActive = useLayerHighlight(dimensions.widthM);
  const lengthActive = useLayerHighlight(dimensions.lengthM);
  const heightActive = useLayerHighlight(dimensions.heightM);
  const foundationActive = useLayerHighlight(scope.foundation);
  const frameActive = useLayerHighlight(scope.frame);
  const wallsActive = useLayerHighlight(`${scope.walls}:${envelope}`);
  const roofActive = useLayerHighlight(scope.roof);
  const gatesActive = useLayerHighlight(gates);

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

      {scene.foundation && (
        <polygon
          className={`hc-layer hc-foundation ${foundationActive ? 'is-active' : ''}`}
          points={pointsAttr(scene.foundation)}
        />
      )}

      <g className={`hc-layer hc-top hc-envelope-${scene.box.top.envelope ?? envelope} ${topActive ? 'is-active' : ''} ${scene.box.top.hasFill ? 'has-roof' : 'no-roof'}`}>
        <polygon points={pointsAttr(scene.box.top.points)} />
      </g>

      <g className={`hc-layer hc-side hc-envelope-${scene.box.side.envelope ?? envelope} ${sideActive ? 'is-active' : ''} ${scene.box.side.hasFill ? 'has-walls' : 'no-walls'}`}>
        <polygon points={pointsAttr(scene.box.side.points)} />
      </g>

      <g className={`hc-layer hc-front hc-envelope-${scene.box.front.envelope ?? envelope} ${facadeActive ? 'is-active' : ''} ${scene.box.front.hasFill ? 'has-walls' : 'no-walls'}`}>
        <polygon points={pointsAttr(scene.box.front.points)} />
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

      {scope.frame && (
        <g className={`hc-layer hc-frame ${frameActive ? 'is-active' : ''}`}>
          {scene.frame.frontColumns.map(([a, b], index) => (
            <line key={`f${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ))}
          {scene.frame.sideColumns.map(([a, b], index) => (
            <line key={`s${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ))}
        </g>
      )}

      <DimensionGuideGroup guide={scene.dimensions.width} />
      <DimensionGuideGroup guide={scene.dimensions.length} />
      <DimensionGuideGroup guide={scene.dimensions.height} />
    </svg>
  );
}
