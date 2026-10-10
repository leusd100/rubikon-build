import type { HangarDomainModel, SizesProvenance } from '../../lib/configurator/domainModel';
import { formatNumber } from '../../lib/configurator/formatNumber';

// The words on the configurator's drawing sheet (/angary, 03.10): its title block, the phone's mini readout and what a
// screen reader hears for the picture. Kept out of the components so the formatting is tested; decimals with a comma,
// as everywhere else on the page.

const fmt = (value: number) => formatNumber(value);

/** The three sizes as one unbreakable piece: on a narrow sheet a label wraps after «·», never inside the sizes */
const sizes = ({ widthM, lengthM, eaveHeightM }: HangarDomainModel['dimensions']) =>
  [fmt(widthM), fmt(lengthM), `${fmt(eaveHeightM)} м`].join(' × ');
/** «·» stays at the end of the line it closes: a wrapped line never starts with it */
const SEPARATOR = ' · ';

/** The word before the sizes, by where they come from (08.10, audit: «Точних розмірів ще немає» turned the example into
 *  «Ваш ангар · 24 × 60 × 8 м»; sizes the visitor typed stayed «Приклад» while the stamp said they were theirs) */
export const SIZES_PREFIX: Record<SizesProvenance, string> = { own: 'Ваш ангар', example: 'Приклад', approx: 'Орієнтовно' };

/** «Об’єкт»: «Приклад · 24 × 60 × 8 м», «Ваш ангар · …» or «Орієнтовно · …» — the frame drawing's title block says it
 *  the same way (FrameTour.tsx) */
export function sheetObjectLabel(provenance: SizesProvenance, dimensions: HangarDomainModel['dimensions']): string {
  return `${SIZES_PREFIX[provenance]}${SEPARATOR}${sizes(dimensions)}`;
}

/** The phone's mini drawing reads its sizes here, not off the drawing: «24 × 60 × 8 м», one line beside the view
 *  switch. (03.10: with the ridge and the gates it ran to three lines at 320 px, and the mini drawing covered 40 % of a
 *  short phone; the ridge is under «Розміри» and the gates in the «Прорізи» header the visitor is setting them in.) */
export function miniReadout(domain: HangarDomainModel): string {
  // «≈» while the sizes are an orientation (08.10)
  return `${domain.sizesUnknown ? '≈ ' : ''}${sizes(domain.dimensions)}`;
}

/** «метр», «метри», «метрів» after a whole number, «метра» after a fraction */
function metres(value: number): string {
  if (!Number.isInteger(value)) return 'метра';
  const lastTwo = value % 100;
  const last = value % 10;
  if (last === 1 && lastTwo !== 11) return 'метр';
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'метри';
  return 'метрів';
}

/** What a screen reader hears for the technical drawing and for the 3D view: the figures the sheet shows, with the
 *  same decimal comma (03.10: they read «10.6» and «7.5» while every visible number said «10,6») */
export function previewDescription(
  view: 'technical' | 'three',
  { widthM, lengthM, eaveHeightM }: HangarDomainModel['dimensions'],
  ridgeM: number,
): string {
  const figures = `${fmt(widthM)} на ${fmt(lengthM)} ${metres(lengthM)}, висота стін ${fmt(eaveHeightM)} м, двосхила покрівля, `
    + `висота в конику приблизно ${fmt(ridgeM)} м`;
  return view === 'three'
    ? `Тривимірна візуалізація ангара: ${figures}. Повний опис конфігурації — у полях керування та підсумку.`
    // the picture is the «креслення», its status a «попередня схема» (10.10, audit F101: it was «Схематичний ескіз»)
    : `Креслення ангара, попередня схема: ${figures}`;
}
