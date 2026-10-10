// Manual derivative generation, not part of the build. Keep the existing WebP
// sources/crop and full 480/752 widths; only the optional delivery format changes.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.resolve('next/package.json'));
// Sharp is pinned by Next in pnpm-lock.yaml; do not install a second encoder.
const sharp = require('sharp');
for (const width of [480, 752]) {
  const base = fileURLToPath(new URL(`../public/media/home-v2/concepts/hero-mobile-band-${width}w`, import.meta.url));
  const result = await sharp(`${base}.webp`)
    .avif({ quality: 55, effort: 7, chromaSubsampling: '4:2:0' })
    .toFile(`${base}.avif`);
  console.log(`${width}w: ${result.size} B`);
}
