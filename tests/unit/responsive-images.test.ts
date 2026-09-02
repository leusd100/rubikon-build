import { describe, expect, it } from 'vitest';
import { webpSrcSet } from '../../app/lib/responsiveImages';
import { responsiveWebpVariants } from '../../app/data/responsiveImageManifest';

const knownSources = Object.keys(responsiveWebpVariants);

describe('webpSrcSet', () => {
  it('returns undefined for a source with no pre-generated variants', () => {
    // ResponsiveImage relies on exactly this to fall back to a plain unresized <img>
    // instead of emitting a <source> that points at files which do not exist.
    expect(webpSrcSet('/media/not-in-the-manifest.jpg')).toBeUndefined();
  });

  it.each(knownSources)('builds ascending width descriptors for %s', (source) => {
    const variants = responsiveWebpVariants[source];

    expect(webpSrcSet(source)).toBe(
      `${variants.w480} 480w, ${variants.w768} 768w, ${variants.w1200} 1200w`,
    );
  });

  it('emits every variant width exactly once, smallest first', () => {
    const srcSet = webpSrcSet(knownSources[0]);
    const widths = [...(srcSet ?? '').matchAll(/ (\d+)w(?:,|$)/g)].map((m) => Number(m[1]));

    expect(widths).toEqual([480, 768, 1200]);
  });

  it('covers every image the manifest claims to know', () => {
    for (const source of knownSources) {
      expect(webpSrcSet(source)).toBeDefined();
    }
  });
});
