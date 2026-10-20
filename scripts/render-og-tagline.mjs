/**
 * Render the Open Graph tagline layer: public/brand/og-tagline-uk.png, 1200 × 630, transparent.
 *
 * The background artwork (og-social-background.jpg) has an older wordmark and tagline baked in; generate-brand-assets.mjs
 * --social covers both with its soft graphite band and composites this layer under the logo. The text is set in the
 * site's own IBM Plex Sans Condensed Medium (app/fonts), embedded here, and the result is committed — the brand
 * build keeps its rule of never depending on a font installed on the machine that runs it.
 *
 * Re-run only when the approved tagline changes (owner, 20.10, OD-PX-13 A; review 18.10, PDO-32): «ПІД КЛЮЧ» is not a claim the site
 * makes without limits (PUBLIC_CLAIM_MATRIX). An English preview, when EN ships, gets its own layer and image file.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const fonts = path.join(root, 'app/fonts/ibm-plex-sans-condensed');
const fontUrl = async (file) => `data:font/woff2;base64,${(await readFile(path.join(fonts, file))).toString('base64')}`;

// Where the old tagline stood: caps from y 372, starting at x 122 — the composition is kept, only the words change
const TAGLINE = ['ПРОМИСЛОВЕ БУДІВНИЦТВО', 'ДНІПРО'];
const LEFT = 122;
const CAP_TOP = 372;
// Medium at 30 px with wide tracking keeps the old tagline's quiet, spaced tone under the logo
const FONT_SIZE = 30;
const TRACKING = 0.16;
// The logo's own orange (generate-brand-assets.mjs `orangeDark`) for the separator, the words in the logo's ivory
const IVORY = '#F7F7F4';
const ORANGE = '#FF7415';

const html = `<!doctype html><html><head><style>
  @font-face { font-family: Plex; font-weight: 500; src: url(${await fontUrl('IBMPlexSansCondensed-Medium-Cyrillic.woff2')}); }
  @font-face { font-family: Plex; font-weight: 500; src: url(${await fontUrl('IBMPlexSansCondensed-Medium-Latin1.woff2')}); unicode-range: U+0000-00FF, U+2000-206F; }
  html, body { margin: 0; background: transparent; }
  #t { position: absolute; left: ${LEFT}px; top: 0; font: 500 ${FONT_SIZE}px/1 Plex; letter-spacing: ${TRACKING}em; color: ${IVORY}; white-space: nowrap; }
  #t b { font-weight: 500; color: ${ORANGE}; padding: 0 .1em; }
</style></head><body><div id="t">${TAGLINE[0]} <b>·</b> ${TAGLINE[1]}</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
// Put the top of the capitals at CAP_TOP: measure the glyphs' ink, then move the line
const capOffset = await page.evaluate(() => {
  const t = document.getElementById('t');
  const c = document.createElement('canvas');
  const x = c.getContext('2d');
  x.font = getComputedStyle(t).font;
  return x.measureText('П').fontBoundingBoxAscent - x.measureText('П').actualBoundingBoxAscent;
});
await page.evaluate(({ top }) => { document.getElementById('t').style.top = `${top}px`; }, { top: Math.round(CAP_TOP - capOffset) });
const png = await page.screenshot({ omitBackground: true, type: 'png' });
await browser.close();
await writeFile(path.join(root, 'public/brand/og-tagline-uk.png'), png);
console.log(`Rendered og-tagline-uk.png: «${TAGLINE.join(' · ')}», caps at y ${CAP_TOP}.`);
