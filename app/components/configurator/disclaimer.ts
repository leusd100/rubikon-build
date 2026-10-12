import { keepShortWords } from '../../lib/typography';

/** The configurator's one disclaimer (UX pass 2026-10: it replaced five — over the model, under the sizes, the gates,
 *  in the summary and over the frame schemes). Reworded 10.10 (audit F106): «Межі розмірів і розміри воріт» said
 *  «розмір» twice, «орієнтовні, не будівельні норми» broke off, and the picture is a «попередня схема», as the sheet
 *  names it (F101) — no site visit promised. Short words kept with the next one (F103: «навантажень і / умов»). */
export const DISCLAIMER = keepShortWords(
  'Це попередня схема, а не проєктна документація. Діапазони габаритів і розміри воріт орієнтовні — це не будівельні '
  + 'норми. Конструкцію й фундамент визначає проєктувальник після розрахунку навантажень з урахуванням умов майданчика.',
);
