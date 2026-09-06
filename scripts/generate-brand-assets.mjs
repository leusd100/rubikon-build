/** Rebuild the approved 01 / Frame identity. All lettering is outlined; no font dependency. */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next')] }));
const root = fileURLToPath(new URL('../', import.meta.url));
const brand = path.join(root, 'public/brand');
await mkdir(brand, { recursive: true });
const copper = '#BF8868', graphite = '#161A1B', ivory = '#F4F1EA';
// The separated column, chamfered upper member and diagonal are the approved silhouette.
const mark = 'M0 0H18V100H0Z M21 0H78L89 11V44L78 55H21V39H71V16H21Z M21 59H44L89 100H64Z';
const glyphs = {
  R: [64, 'M0 0H46Q60 0 60 14V32Q60 46 46 46H39L64 76H43L18 46H16V76H0Z M16 15V31H42Q44 31 44 29V17Q44 15 42 15Z'],
  U: [60, 'M0 0H16V56Q16 61 21 61H39Q44 61 44 56V0H60V60Q60 76 44 76H16Q0 76 0 60Z'],
  B: [60, 'M0 0H44Q60 0 60 16V23Q60 33 51 37Q60 41 60 51V60Q60 76 44 76H0Z M16 15V30H39Q44 30 44 25V20Q44 15 39 15Z M16 45V61H39Q44 61 44 56V50Q44 45 39 45Z'],
  I: [16, 'M0 0H16V76H0Z'],
  K: [64, 'M0 0H16V30L43 0H64L30 37L64 76H43L16 45V76H0Z'],
  O: [64, 'M17 0H47Q64 0 64 17V59Q64 76 47 76H17Q0 76 0 59V17Q0 0 17 0Z M22 15Q16 15 16 21V55Q16 61 22 61H42Q48 61 48 55V21Q48 15 42 15Z'],
  N: [64, 'M0 0H16L48 47V0H64V76H48L16 29V76H0Z'],
  L: [52, 'M0 0H16V61H52V76H0Z'],
  D: [64, 'M0 0H40Q64 0 64 24V52Q64 76 40 76H0Z M16 15V61H37Q48 61 48 50V26Q48 15 37 15Z'],
};
function word(text, gap) {
  let x = 0;
  return [...text].map(letter => {
    const [width, d] = glyphs[letter];
    const result = `<path transform="translate(${x} 0)" d="${d}"/>`;
    x += width + gap;
    return result;
  }).join('');
}
function svg(width, height, content, label = 'RUBIKON BUILD') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill-rule="evenodd" role="img" aria-label="${label}">${content}</svg>\n`;
}
function lockup(ink, accent) {
  return svg(471, 100, `<path fill="${accent}" d="${mark}"/><g fill="${ink}" transform="translate(135 0) scale(.72)">${word('RUBIKON', 12)}</g><g fill="${accent}" transform="translate(135 77.2) scale(.3)">${word('BUILD', 130)}</g>`);
}
const variants = {
  'rubikon-build-dark': lockup(ivory, copper),
  'rubikon-build-light': lockup(graphite, '#9B6245'),
  'rubikon-build-black': lockup(graphite, graphite),
  'rubikon-build-white': lockup('#FFFFFF', '#FFFFFF'),
  'rubikon-mark-copper': svg(89, 100, `<path fill="${copper}" d="${mark}"/>`),
  'rubikon-mark-black': svg(89, 100, `<path fill="${graphite}" d="${mark}"/>`),
  'rubikon-mark-white': svg(89, 100, `<path fill="#FFFFFF" d="${mark}"/>`),
};
for (const [name, source] of Object.entries(variants)) {
  await writeFile(path.join(brand, `${name}.svg`), source);
  await sharp(Buffer.from(source)).resize({ width: name.includes('build') ? 1884 : 356 }).png().toFile(path.join(brand, `${name}.png`));
}
// 16px uses an optically opened gap; larger icons use the unchanged master mark.
const tinyMark = 'M0 0H18V100H0Z M25 0H78L89 11V44L78 55H25V38H71V17H25Z M25 63H46L89 100H65Z';
function icon(size, maskable = false) {
  const fraction = maskable ? .58 : .75;
  const h = size * fraction, w = h * .89;
  return svg(size, size, `<rect width="${size}" height="${size}" fill="${graphite}"/><path transform="translate(${(size-w)/2} ${(size-h)/2}) scale(${h/100})" fill="${copper}" d="${size === 16 ? tinyMark : mark}"/>`);
}
const iconSvg = icon(64);
await writeFile(path.join(root, 'app/icon.svg'), iconSvg);
await writeFile(path.join(root, 'public/favicon.svg'), iconSvg);
const icoImages = [];
for (const size of [16, 32, 48, 180, 192, 512]) {
  const source = Buffer.from(icon(size));
  const png = await sharp(source, { density: 288 }).resize(size, size).png().toBuffer();
  const name = size <= 48 ? `favicon-${size}x${size}.png` : size === 180 ? 'apple-touch-icon.png' : `icon-${size}x${size}.png`;
  await writeFile(path.join(root, 'public', name), png);
  if (size <= 48) icoImages.push({ size, png });
}
await sharp(Buffer.from(icon(512, true))).png().toFile(path.join(root, 'public/icon-maskable-512x512.png'));
// ICO directory with PNG-compressed 16/32/48px entries, understood by current browsers/OSes.
const header = Buffer.alloc(6 + icoImages.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(icoImages.length, 4);
let offset = header.length;
icoImages.forEach(({ size, png }, i) => {
  const entry = 6 + i * 16;
  header[entry] = size; header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});
await writeFile(path.join(root, 'public/favicon.ico'), Buffer.concat([header, ...icoImages.map(({ png }) => png)]));
console.log('Generated outlined logos, transparent PNGs, SVG/ICO favicons and app icons.');
