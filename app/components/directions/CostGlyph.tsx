import type { DirectionPageConfig } from '../../types/directionPage';

// The cost factors' line glyphs on the direction pages (UX pass 2026-10, owner: «поцікавіше обіграти з анімаціями»): one
// small drawing per factor, in the «Переріз» line language — graphite strokes, one copper detail — drawn in when the
// list comes into view (direction-template.css). Decorative: the row's title says the same.

type GlyphKind =
  | 'tonnage' | 'joint' | 'coating' | 'erection'
  | 'footing' | 'rebar' | 'flatness' | 'pour'
  | 'roof-area' | 'roof-layers' | 'deck' | 'gutter'
  | 'grain-capacity' | 'grain-preparation' | 'grain-handling' | 'grain-site' | 'grain-scope';

/** Each direction's cost factors, in their order on the page (four; the grain complex's five) */
export const COST_GLYPHS: Partial<Record<DirectionPageConfig['id'], readonly GlyphKind[]>> = {
  metalokonstruktsii: ['tonnage', 'joint', 'coating', 'erection'],
  'betonni-roboty': ['footing', 'rebar', 'flatness', 'pour'],
  'pokrivelni-roboty': ['roof-area', 'roof-layers', 'deck', 'gutter'],
  zernoskhovyshcha: ['grain-capacity', 'grain-preparation', 'grain-handling', 'grain-site', 'grain-scope'],
};

/** [graphite lines, copper detail] in a 48 × 48 box */
const GLYPHS: Record<GlyphKind, readonly [string, string]> = {
  // a stack of I-sections
  tonnage: ['M8 36h32M8 40h32M14 36v4M34 36v4M8 26h32M8 30h32M14 26v4M34 26v4', 'M8 16h32M8 20h32M14 16v4M34 16v4'],
  // two plates and four bolts
  joint: ['M10 10h28v28H10zM24 6v36', 'M14.8 17a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M28.8 17a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M14.8 31a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M28.8 31a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0'],
  // a plate under coats
  coating: ['M8 34h32v6H8z', 'M8 28h32M8 22h32'],
  // a mast, a jib, a hanging element
  erection: ['M14 42V8M8 42h12M14 8h26M14 16l8-8', 'M34 8v12M28 24h12v6H28z'],
  // a pedestal on its footing, ground line
  footing: ['M4 18h12M32 18h12M20 8h8v18h12v14H8V26h12z', 'M12 36h24'],
  // a bar grid
  rebar: ['M10 14h28M10 24h28M10 34h28M14 10v28M24 10v28M34 10v28', 'M20.8 24a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0'],
  // a slab and the straightedge over it
  flatness: ['M6 34h36v6H6z', 'M8 28h32M8 24v8M40 24v8'],
  // a pump boom pouring into formwork
  pour: ['M6 40h36M10 40V30M38 40V30M10 30h28', 'M8 10h16l10 6v8M34 24l-2 4h4z'],
  // a roof outline with its span marked
  'roof-area': ['M6 32l18-16 18 16M10 32v8M38 32v8', 'M6 42h36M6 40v4M42 40v4'],
  // the layers of a roof build-up along the slope
  'roof-layers': ['M6 34L42 16M6 38L42 20M6 42L42 24', 'M6 30l4-4 4 2 4-4 4 2 4-4 4 2 4-4 4 2 4-4'],
  // a deck on its purlins, one board marked
  deck: ['M6 20h36M6 26h36M12 26v12M36 26v12', 'M20 20v6M28 20v6'],
  // an eave, a gutter and the pipe down
  gutter: ['M6 12l24 12', 'M30 24a6 6 0 0 0 12 0M36 30v14'],
  // grain (/zernoskhovyshcha): a silo and the level of its grain
  'grain-capacity': ['M14 42V14L24 7L34 14V42M8 42h32', 'M14 27h20'],
  // a dryer tower, its louvers marked
  'grain-preparation': ['M17 42V11h14v31M11 42h26', 'M20 19l4 3 4-3M20 29l4 3 4-3'],
  // a bucket elevator and the gallery off its head, grain on the belt
  'grain-handling': ['M8 42V9h8v33M16 12h26v6H16M4 42h16', 'M23 15h2M30 15h2M37 15h2'],
  // ground layers, a footing set into them
  'grain-site': ['M4 20h40M4 31h40M4 42h40', 'M18 20V34h12V20'],
  // a silo above, the slab it stands on — the slab is the building part
  'grain-scope': ['M15 37V15L24 9L33 15V37', 'M8 37h32v5H8z'],
};

export function CostGlyph({ kind }: Readonly<{ kind: GlyphKind }>) {
  const [lines, detail] = GLYPHS[kind];
  return (
    <svg className="cost-glyph" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path className="cost-glyph-line" d={lines} pathLength={1} />
      <path className="cost-glyph-detail" d={detail} pathLength={1} />
    </svg>
  );
}
