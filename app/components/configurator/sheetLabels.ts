import type { HangarDomainModel } from '../../lib/configurator/domainModel';

// The words on the configurator's drawing sheet (/angary, 03.10): its title block, the phone's mini readout and what a
// screen reader hears for the picture. Kept out of the components so the formatting is tested; decimals with a comma,
// as everywhere else on the page.

const fmt = (value: number) => value.toLocaleString('uk-UA', { maximumFractionDigits: 1 });

/** The three sizes as one unbreakable piece: on a narrow sheet a label wraps after «·», never inside the sizes */
const sizes = ({ widthM, lengthM, eaveHeightM }: HangarDomainModel['dimensions']) =>
  [fmt(widthM), fmt(lengthM), `${fmt(eaveHeightM)} м`].join(' × ');
/** «·» stays at the end of the line it closes: a wrapped line never starts with it */
const SEPARATOR = ' · ';

/** «Об’єкт»: «Приклад · 24 × 60 × 8 м» while the configuration is the default, «Ваш ангар · …» once it is the
 *  visitor's — the frame drawing's title block says it the same way (FrameTour.tsx) */
export function sheetObjectLabel(own: boolean, dimensions: HangarDomainModel['dimensions']): string {
  return `${own ? 'Ваш ангар' : 'Приклад'}${SEPARATOR}${sizes(dimensions)}`;
}

/** The phone's mini drawing reads its sizes here, not off the drawing: «24 × 60 × 8 м», one line beside the view
 *  switch. (03.10: with the ridge and the gates it ran to three lines at 320 px, and the mini drawing covered 40 % of a
 *  short phone; the ridge is under «Розміри» and the gates in the «Прорізи» header the visitor is setting them in.) */
export function miniReadout(domain: HangarDomainModel): string {
  return sizes(domain.dimensions);
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
    : `Схематичний ескіз ангара: ${figures}`;
}
