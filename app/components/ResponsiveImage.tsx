/* eslint-disable @next/next/no-img-element -- deliberate: next/image's /_next/image
   resizing is a no-op in this vinext/Cloudflare deployment (redirects to the original
   file — see the Step 02 design report), so this component uses <picture>/<img> with
   pre-generated variants instead. Not an accidental regression. */
import { webpSrcSet } from '../lib/responsiveImages';

type ResponsiveImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
};

/**
 * Drop-in replacement for `<Image fill sizes=... />` on the Step 02 responsive-image
 * call sites, used only for the 12 images that have pre-generated WebP variants
 * (see app/data/responsiveImageManifest.ts). Reproduces next/image's `fill` layout
 * (absolute, inset:0, 100%/100%) so the existing `.direction-card img` /
 * `.promise-visual img` / `.direction-editorial-media img` CSS (object-fit,
 * object-position, filters, transitions) keeps working unchanged — only the
 * source-selection mechanism changes, not the visual result.
 *
 * Falls back to a plain unresized `<img>` (no srcSet) if `src` has no known
 * variants, so this component is safe to reuse even for images outside the
 * Step 02 scope without silently breaking them.
 */
export default function ResponsiveImage({ src, alt, sizes, className }: ResponsiveImageProps) {
  const srcSet = webpSrcSet(src);

  if (!srcSet) {
    // No pre-generated variants for this src — behave like a plain fill image.
    return (
      <img
        className={className}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    );
  }

  return (
    <picture>
      <source type="image/webp" srcSet={srcSet} sizes={sizes} />
      <img
        className={className}
        src={src}
        sizes={sizes}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </picture>
  );
}
