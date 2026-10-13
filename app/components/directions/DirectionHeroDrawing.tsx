import type { DirectionPageConfig } from '../../types/directionPage';
import { Concrete, Roofing, Steel } from './DirectionSectionDrawing';

type DirectionId = DirectionPageConfig['id'];

const THEME_WORD: Record<DirectionId, string> = {
  angary: 'КАРКАС',
  zernoskhovyshcha: 'ЗБЕРІГАННЯ',
  metalokonstruktsii: 'ВУЗОЛ',
  'betonni-roboty': 'ОСНОВА',
  'pokrivelni-roboty': 'ПОКРІВЛЯ',
};

function HangarRhythm() {
  return (
    <g className="dhd-ink">
      <path className="dhd-structure" d="M28 220V112L180 34l152 78v108M54 220V126l126-64 126 64v94" />
      <path className="dhd-line" d="M82 220V140l98-50 98 50v80M110 220V154l70-36 70 36v66" />
      <path className="dhd-axis" d="M180 24v206M18 220h324M35 109l145 74 145-74" />
      <path className="dhd-accent" d="M28 112l152-78 152 78" />
    </g>
  );
}

function GrainRhythm() {
  return (
    <g className="dhd-ink">
      <path className="dhd-structure" d="M44 214V104a44 24 0 0 1 88 0v110M158 214V78a54 28 0 0 1 108 0v136M282 214V112a34 20 0 0 1 68 0v102" />
      <path className="dhd-line" d="M44 104a44 24 0 0 0 88 0M158 78a54 28 0 0 0 108 0M282 112a34 20 0 0 0 68 0M40 214h314M180 48v166M212 48v166M240 48v166" />
      <path className="dhd-axis" d="M20 226h340M146 56v170M274 90v136" />
      <path className="dhd-accent" d="M158 78a54 28 0 0 1 108 0" />
    </g>
  );
}

function DirectionGeometry({ id }: { id: DirectionId }) {
  switch (id) {
    case 'angary':
      return <HangarRhythm />;
    case 'zernoskhovyshcha':
      return <GrainRhythm />;
    case 'metalokonstruktsii':
      return <g className="dhd-existing"><Steel /></g>;
    case 'betonni-roboty':
      return <g className="dhd-existing"><Concrete /></g>;
    case 'pokrivelni-roboty':
      return <g className="dhd-existing"><Roofing /></g>;
  }
}

export function DirectionHeroDrawing({ id }: { id: DirectionId }) {
  return (
    <figure className="direction-hero-drawing" data-direction={id} aria-hidden="true">
      <svg viewBox="0 0 360 248" focusable="false" preserveAspectRatio="xMidYMid meet">
        <text className="dhd-theme-word" x="180" y="138" textAnchor="middle">{THEME_WORD[id]}</text>
        <DirectionGeometry id={id} />
      </svg>
    </figure>
  );
}
