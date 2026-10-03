import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import { deriveSummary } from '../../lib/configurator/deriveSummary';
import { ridgeHeightM } from '../../lib/configurator/parametricModel';

// The words on the configurator's drawing sheet (/angary, 03.10): its title block and the phone's mini readout. Kept
// out of the components so the formatting is tested; decimals with a comma, as everywhere else on the page.

const fmt = (value: number) => value.toLocaleString('uk-UA', { maximumFractionDigits: 1 });

/** The three sizes as one unbreakable piece: on a narrow sheet a label wraps after «·», never inside the sizes */
const sizes = ({ widthM, lengthM, eaveHeightM }: HangarDomainModel['dimensions']) =>
  [fmt(widthM), fmt(lengthM), `${fmt(eaveHeightM)}\u00A0м`].join('\u00A0×\u00A0');
/** «·» stays at the end of the line it closes: a wrapped line never starts with it */
const SEPARATOR = '\u00A0· ';

/** «Об’єкт»: «Приклад · 24 × 60 × 8 м» while the configuration is the default, «Ваш ангар · …» once it is the
 *  visitor's — the frame drawing's title block says it the same way (FrameTour.tsx) */
export function sheetObjectLabel(own: boolean, dimensions: HangarDomainModel['dimensions']): string {
  return `${own ? 'Ваш ангар' : 'Приклад'}${SEPARATOR}${sizes(dimensions)}`;
}

/** The phone's mini drawing reads its sizes here, not off the drawing: «24 × 60 × 8 м · коник 10,6 м · 1 ворота». The
 *  gates follow the summary's rule — no walls, no gates in the request — and are left out then. Each part is one
 *  piece: beside the view switch the row wraps between parts, never inside one. */
export function miniReadout(domain: HangarDomainModel): string {
  const { widthM, eaveHeightM } = domain.dimensions;
  const parts = [sizes(domain.dimensions), `коник ${fmt(ridgeHeightM(widthM, eaveHeightM, domain.roof.pitchDeg))} м`];
  if (deriveSummary(domain).gatesLabel !== null) parts.push(domain.gates ? `${domain.gates} ворота` : 'без воріт');
  return parts.map((part) => part.replaceAll(' ', '\u00A0')).join(SEPARATOR);
}
