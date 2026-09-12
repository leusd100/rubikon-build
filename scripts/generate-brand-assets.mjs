/**
 * Rebuild the approved RUBIKON BUILD identity from outlined vector masters.
 * The artwork is deterministic and has no font or external-file dependency.
 *
 * Legacy Frame assets intentionally remain in public/brand until every
 * downstream consumer has been audited and migrated.
 */
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next')] }));
const root = fileURLToPath(new URL('../', import.meta.url));
const brand = path.join(root, 'public/brand');
await mkdir(brand, { recursive: true });

const graphite = '#161A1B';
const ivory = '#F7F7F4';
const orangeDark = '#FF7415';
const orangeLight = '#B84A1E';
const dividerDark = '#A6A7A5';
const dividerLight = '#5A6062';

// One approved R master is shared by the horizontal lockup and platform icons.
// The two clean structural planes preserve the reference silhouette while the
// inset orange diagonal remains visually separate at both header and icon scale.
const markTop = 'M0 0H182C240 0 278 34 278 85C278 139 240 173 186 173H74V130H181C210 130 227 113 227 87C227 59 209 44 181 44H39Z';
const markBase = 'M0 130H139L278 280H208L115 181H52V280H0Z';
const markAccent = 'M79 190H117L203 280H161Z';

// The primary web treatment uses only lightweight gradients. The premium
// export adds a restrained brushed texture and shallow volume for large-format
// brand applications; favicons always use the flat master below.
const webMetalDefs = `<defs><linearGradient id="mark-steel" x1="0" y1="0" x2="1" y2=".18"><stop offset="0" stop-color="#FBFCFC"/><stop offset=".24" stop-color="#D5DBDE"/><stop offset=".48" stop-color="#F4F6F6"/><stop offset=".72" stop-color="#C3CBCF"/><stop offset="1" stop-color="#EDF0F1"/></linearGradient><linearGradient id="word-steel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#F8F9F9"/><stop offset=".52" stop-color="#E1E5E7"/><stop offset="1" stop-color="#F4F5F5"/></linearGradient><filter id="final-brushed" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".003 .68" numOctaves="1" seed="19" result="grain"/><feColorMatrix in="grain" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .04 0" result="soft-grain"/><feComposite in="soft-grain" in2="SourceAlpha" operator="in" result="clipped-grain"/><feBlend in="SourceGraphic" in2="clipped-grain" mode="soft-light"/></filter></defs>`;
const premiumMetalDefs = `<defs><linearGradient id="mark-premium" x1="0" y1="0" x2="1" y2=".18"><stop offset="0" stop-color="#FCFDFD"/><stop offset=".16" stop-color="#C9D0D4"/><stop offset=".34" stop-color="#F5F7F7"/><stop offset=".55" stop-color="#AEB8BE"/><stop offset=".73" stop-color="#E9EDEF"/><stop offset="1" stop-color="#C5CDD1"/></linearGradient><linearGradient id="word-premium" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#F7F8F8"/><stop offset=".5" stop-color="#D3D9DC"/><stop offset="1" stop-color="#ECEFF0"/></linearGradient><filter id="premium-finish" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".003 .56" numOctaves="1" seed="12" result="grain"/><feColorMatrix in="grain" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .065 0" result="soft-grain"/><feComposite in="soft-grain" in2="SourceAlpha" operator="in" result="clipped-grain"/><feBlend in="SourceGraphic" in2="clipped-grain" mode="soft-light"/><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity=".22"/></filter></defs>`;

// The approved reference lettering is outlined so production output never
// depends on a locally installed display font.
const wordmarkInk = 'M521 142L523 140L606 140L614 145L620 154L620 182L611 192L605 194L605 198L622 215L622 219L597 219L575 196L546 196L544 217L542 219L524 219L521 216ZM544 161L544 175L546 177L592 177L597 174L598 170L597 161L593 158L546 158ZM652 142L654 140L675 141L676 197L680 200L703 200L724 199L728 194L728 141L750 140L752 142L752 201L747 211L729 219L672 219L660 214L654 207L652 200ZM732 269L764 268L772 273L773 286L771 292L774 295L775 305L770 313L765 315L734 315L732 313ZM739 277L740 287L763 287L766 284L766 278L763 275L741 275ZM739 297L741 308L763 308L767 305L767 298L764 295L740 295ZM780 179L781 141L783 140L867 140L874 144L880 152L881 166L876 180L882 188L883 200L879 211L866 218L784 219L780 214ZM804 159L806 171L854 170L858 165L857 160L852 157L806 157ZM804 189L805 200L856 200L859 197L859 191L856 188L815 187ZM826 270L828 268L833 270L833 302L840 308L856 308L861 304L861 271L862 269L869 270L869 306L865 312L858 315L837 315L828 309L826 304ZM915 142L917 140L935 140L937 142L937 216L934 219L917 218L915 216ZM922 270L928 269L930 273L930 311L928 314L922 313ZM970 142L972 140L992 141L992 169L997 171L1037 140L1067 140L1066 144L1026 172L1020 177L1020 180L1065 212L1069 219L1039 219L996 187L992 189L992 217L990 219L971 218ZM983 270L985 268L990 269L990 306L992 308L1018 308L1018 314L986 315L984 313ZM1071 273L1073 268L1102 268L1111 272L1115 280L1115 301L1111 310L1101 315L1074 315L1071 309ZM1078 278L1078 306L1080 308L1103 307L1107 302L1107 282L1105 278L1102 276L1080 276ZM1089 159L1095 146L1105 140L1176 140L1183 144L1191 155L1191 203L1187 211L1171 219L1110 219L1101 216L1092 209L1090 204ZM1112 162L1112 196L1116 200L1163 200L1168 196L1167 160L1161 158L1116 159ZM1221 141L1247 140L1297 191L1300 189L1300 141L1322 141L1323 216L1319 219L1296 219L1292 217L1251 176L1248 170L1244 169L1243 217L1240 219L1223 218L1221 216Z';
const wordmarkAccent = 'M523 288L674 287L675 291L524 292ZM1172 288L1322 287L1323 291L1173 292Z';

function svg(width, height, content, label = 'RUBIKON BUILD', viewBox = `0 0 ${width} ${height}`) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill-rule="evenodd" role="img" aria-label="${label}">${content}</svg>\n`;
}

function markGroup(ink, accent, transform = '', inkGroupAttributes = '') {
  const transformAttribute = transform ? ` transform="${transform}"` : '';
  return `<g${transformAttribute}><g${inkGroupAttributes}><path fill="${ink}" d="${markTop}"/><path fill="${ink}" d="${markBase}"/></g><path fill="${accent}" d="${markAccent}"/></g>`;
}

function horizontalLockup(ink, accent, divider, options = {}) {
  const {
    defs = '',
    markFill = ink,
    wordFill = ink,
    markAttributes = '',
    label = 'RUBIKON BUILD',
  } = options;
  return svg(
    1270,
    272,
    `${defs}${markGroup(markFill, accent, 'translate(88 103) scale(.82)', markAttributes)}<rect x="429" y="98" width="7" height="247" rx="2" fill="${divider}"/><path fill="${wordFill}" d="${wordmarkInk}"/><path fill="${accent}" d="${wordmarkAccent}"/>`,
    label,
    '72 88 1270 272',
  );
}

function standaloneMark(ink, accent, options = {}) {
  const { defs = '', markFill = ink, markAttributes = '' } = options;
  return svg(320, 280, `${defs}${markGroup(markFill, accent, '', markAttributes)}`, 'RUBIKON BUILD');
}

// New names are deliberate: the previously shipped assets remain available
// while the application moves to this approved identity.
const horizontalDark = horizontalLockup(ivory, orangeDark, dividerDark, {
  defs: webMetalDefs,
  markFill: 'url(#mark-steel)',
  wordFill: 'url(#word-steel)',
  markAttributes: ' filter="url(#final-brushed)"',
  label: 'Final RUBIKON BUILD logo',
});
const horizontalLight = horizontalLockup(graphite, orangeLight, dividerLight);
const horizontalPremium = horizontalLockup(ivory, orangeDark, dividerDark, {
  defs: premiumMetalDefs,
  markFill: 'url(#mark-premium)',
  wordFill: 'url(#word-premium)',
  markAttributes: ' filter="url(#premium-finish)"',
});
const markDark = standaloneMark(ivory, orangeDark, {
  defs: webMetalDefs,
  markFill: 'url(#mark-steel)',
  markAttributes: ' filter="url(#final-brushed)"',
});
const markPremium = standaloneMark(ivory, orangeDark, {
  defs: premiumMetalDefs,
  markFill: 'url(#mark-premium)',
  markAttributes: ' filter="url(#premium-finish)"',
});

const variants = {
  'rubikon-build-horizontal-dark': {
    source: horizontalDark,
    rasterWidth: 2540,
  },
  'rubikon-build-horizontal-light': {
    source: horizontalLight,
    rasterWidth: 2540,
  },
  'rubikon-build-horizontal-premium': {
    source: horizontalPremium,
    rasterWidth: 2540,
  },
  'rubikon-mark-dark': {
    source: markDark,
    rasterWidth: 1280,
  },
  'rubikon-mark-light': {
    source: standaloneMark(graphite, orangeLight),
    rasterWidth: 1280,
  },
  'rubikon-mark-premium': {
    source: markPremium,
    rasterWidth: 1280,
  },
};

for (const [name, { source, rasterWidth }] of Object.entries(variants)) {
  await writeFile(path.join(brand, `${name}.svg`), source);
  await sharp(Buffer.from(source), { density: 288 })
    .resize({ width: rasterWidth })
    .png()
    .toFile(path.join(brand, `${name}.png`));
}

// Social artwork is opt-in (`--social`) so routine logo/icon regeneration does
// not silently change Open Graph media without explicit approval.
if (process.argv.includes('--social')) {
  const socialBackground = await readFile(path.join(brand, 'og-social-background.jpg'));
  const socialLogo = await sharp(Buffer.from(horizontalDark), { density: 288 })
    .resize({ width: 670 })
    .png()
    .toBuffer();
  const socialCover = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
      <defs>
        <filter id="soft-cover" x="-10%" y="-30%" width="120%" height="160%">
          <feGaussianBlur stdDeviation="12"/>
        </filter>
      </defs>
      <rect x="78" y="233" width="870" height="136" fill="#111416" filter="url(#soft-cover)"/>
    </svg>
  `);
  const socialPng = await sharp(socialBackground)
    .resize(1200, 630, { fit: 'cover' })
    .composite([
      { input: socialCover, top: 0, left: 0 },
      { input: socialLogo, top: 204, left: 110 },
    ])
    .png()
    .toBuffer();
  await writeFile(path.join(root, 'public/og.png'), socialPng);
  await sharp(socialPng).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(path.join(root, 'public/og.jpg'));
}

function icon(size, maskable = false) {
  const fraction = maskable ? 0.58 : size === 16 ? 0.78 : 0.74;
  const height = size * fraction;
  const width = height * (320 / 280);
  const scale = height / 280;
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  return svg(
    size,
    size,
    `<rect width="${size}" height="${size}" fill="${graphite}"/>${markGroup(ivory, orangeDark, `translate(${x} ${y}) scale(${scale})`)}`,
    'RUBIKON BUILD',
  );
}

const iconSvg = icon(64);
await writeFile(path.join(root, 'app/icon.svg'), iconSvg);
await writeFile(path.join(root, 'public/favicon.svg'), iconSvg);

const icoImages = [];
for (const size of [16, 32, 48, 180, 192, 512]) {
  const png = await sharp(Buffer.from(icon(size)), { density: 288 })
    .resize(size, size)
    .png()
    .toBuffer();
  const name = size <= 48
    ? `favicon-${size}x${size}.png`
    : size === 180
      ? 'apple-touch-icon.png'
      : `icon-${size}x${size}.png`;
  await writeFile(path.join(root, 'public', name), png);
  if (size <= 48) icoImages.push({ size, png });
}

await sharp(Buffer.from(icon(512, true)), { density: 288 })
  .resize(512, 512)
  .png()
  .toFile(path.join(root, 'public/icon-maskable-512x512.png'));

// ICO directory with PNG-compressed 16/32/48px entries.
const header = Buffer.alloc(6 + icoImages.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoImages.length, 4);
let offset = header.length;
icoImages.forEach(({ size, png }, index) => {
  const entry = 6 + index * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});
await writeFile(
  path.join(root, 'public/favicon.ico'),
  Buffer.concat([header, ...icoImages.map(({ png }) => png)]),
);

console.log('Generated refined horizontal lockups, standalone marks, and platform icons.');
