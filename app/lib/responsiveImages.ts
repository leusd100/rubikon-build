import { responsiveWebpVariants } from '../data/responsiveImageManifest';

/**
 * Source selection for the pre-generated responsive WebP variants.
 *
 * Lives here, not next to the manifest it reads, so app/data/** stays declarative-only —
 * see the coverage boundary documented in vitest.config.ts and sonar-project.properties.
 */

/** Builds a srcSet string (webp variants only) for a known original image path.
 *  Returns undefined for any path without pre-generated variants, which is how
 *  ResponsiveImage decides to fall back to a plain unresized <img>. */
export function webpSrcSet(originalSrc: string): string | undefined {
  const variants = responsiveWebpVariants[originalSrc];
  if (!variants) return undefined;
  return `${variants.w480} 480w, ${variants.w768} 768w, ${variants.w1200} 1200w`;
}
