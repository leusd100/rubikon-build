'use client';

import { computeScene, pointsAttr, type DimensionGuide } from '../../lib/configurator/isometricGeometry';
import type { ConfiguratorState } from '../../lib/configurator/types';
import { useLayerHighlight } from './useLayerHighlight';

const VIEWBOX_PADDING = 48;

function DimensionGuideGroup({ guide, label }: { guide: DimensionGuide; label: string }) {
  const [a, b] = guide.line;
  return (
    <g className="hc-dimension" aria-hidden="true">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <line x1={guide.ticks[0][0].x} y1={guide.ticks[0][0].y} x2={guide.ticks[0][1].x} y2={guide.ticks[0][1].y} />
      <line x1={guide.ticks[1][0].x} y1={guide.ticks[1][0].y} x2={guide.ticks[1][1].x} y2={guide.ticks[1][1].y} />
      <text x={guide.label.x} y={guide.label.y} textAnchor={guide.anchor}>
        {label}
      </text>
    </g>
  );
}

export function HangarPreview({ state }: { state: ConfiguratorState }) {
  const { dimensions, envelope, scope, gates } = state;
  const scene = computeScene(dimensions, gates);

  const hasFoundation = scope.includes('foundation');
  const hasFrame = scope.includes('frame');
  const hasWalls = scope.includes('walls');
  const hasRoof = scope.includes('roof');

  const widthActive = useLayerHighlight(dimensions.width);
  const lengthActive = useLayerHighlight(dimensions.length);
  const heightActive = useLayerHighlight(dimensions.height);
  const foundationActive = useLayerHighlight(hasFoundation);
  const frameActive = useLayerHighlight(hasFrame);
  const wallsActive = useLayerHighlight(`${hasWalls}:${envelope}`);
  const roofActive = useLayerHighlight(hasRoof);
  const gatesActive = useLayerHighlight(gates);

  const facadeActive = widthActive || heightActive || wallsActive;
  const sideActive = lengthActive || heightActive || wallsActive;
  const topActive = widthActive || lengthActive || roofActive;

  const { minX, minY, maxX, maxY } = scene.bounds;
  const viewBox = `${minX - VIEWBOX_PADDING} ${minY - VIEWBOX_PADDING} ${maxX - minX + VIEWBOX_PADDING * 2} ${maxY - minY + VIEWBOX_PADDING * 2}`;

  const envelopeClass = `hc-envelope-${envelope}`;

  return (
    <svg
      className="hc-preview-svg"
      viewBox={viewBox}
      role="img"
      aria-label={`Схематичний ескіз ангара: ${dimensions.width} на ${dimensions.length} метрів, висота стін ${dimensions.height} м`}
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

      {hasFoundation && (
        <polygon
          className={`hc-layer hc-foundation ${foundationActive ? 'is-active' : ''}`}
          points={pointsAttr(scene.foundation ?? [])}
        />
      )}

      <g className={`hc-layer hc-top ${envelopeClass} ${topActive ? 'is-active' : ''} ${hasRoof ? 'has-roof' : 'no-roof'}`}>
        <polygon points={pointsAttr(scene.box.top)} />
      </g>

      <g className={`hc-layer hc-side ${envelopeClass} ${sideActive ? 'is-active' : ''} ${hasWalls ? 'has-walls' : 'no-walls'}`}>
        <polygon points={pointsAttr(scene.box.side)} />
      </g>

      <g className={`hc-layer hc-front ${envelopeClass} ${facadeActive ? 'is-active' : ''} ${hasWalls ? 'has-walls' : 'no-walls'}`}>
        <polygon points={pointsAttr(scene.box.front)} />
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

      {hasFrame && (
        <g className={`hc-layer hc-frame ${frameActive ? 'is-active' : ''}`}>
          {scene.frame.frontColumns.map(([a, b], index) => (
            <line key={`f${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ))}
          {scene.frame.sideColumns.map(([a, b], index) => (
            <line key={`s${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ))}
        </g>
      )}

      <DimensionGuideGroup guide={scene.dimensions.width} label={`${dimensions.width} м`} />
      <DimensionGuideGroup guide={scene.dimensions.length} label={`${dimensions.length} м`} />
      <DimensionGuideGroup guide={scene.dimensions.height} label={`${dimensions.height} м`} />
    </svg>
  );
}
