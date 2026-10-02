export type DirectionHeroImageAsset = {
  fallbackSrc: string;
  srcSet: string;
  /** Desktop object-position. The y keeps the structure's top in frame: the image starts under the header and a wide
   *  window crops it top and bottom (UX pass 2026-10 — the hangar and the steel frame lost their roofs). */
  focalPosition: string;
  mobileFocalPosition: string;
};

const responsiveSrcSet = (name: string, variants: { w480: string; w768: string; w1200: string; w1536: string }) =>
  [
    `/media-responsive/direction-hero-${name}-480w.${variants.w480}.webp 480w`,
    `/media-responsive/direction-hero-${name}-768w.${variants.w768}.webp 768w`,
    `/media-responsive/direction-hero-${name}-1200w.${variants.w1200}.webp 1200w`,
    `/media-responsive/direction-hero-${name}-1536w.${variants.w1536}.webp 1536w`,
  ].join(', ');

export const directionHeroImageAssets = {
  angary: {
    fallbackSrc: '/media-responsive/direction-hero-angary-1536w.57aba1e2.webp',
    srcSet: responsiveSrcSet('angary', {
      w480: '7bb0c38f', w768: 'aa4c3e1e', w1200: 'af5582fd', w1536: '57aba1e2',
    }),
    focalPosition: '56% 6%',
    mobileFocalPosition: '58% center',
  },
  zernoskhovyshcha: {
    fallbackSrc: '/media-responsive/direction-hero-zernoskhovyshcha-1536w.b0718f9a.webp',
    srcSet: responsiveSrcSet('zernoskhovyshcha', {
      w480: '0be99307', w768: 'e3fdf670', w1200: 'ede647fb', w1536: 'b0718f9a',
    }),
    focalPosition: '57% 8%',
    mobileFocalPosition: '62% center',
  },
  metalokonstruktsii: {
    fallbackSrc: '/media-responsive/direction-hero-metalokonstruktsii-1536w.092948f6.webp',
    srcSet: responsiveSrcSet('metalokonstruktsii', {
      w480: '989d697b', w768: '07e7e67b', w1200: '5867185c', w1536: '092948f6',
    }),
    focalPosition: '55% 6%',
    mobileFocalPosition: '58% center',
  },
  'betonni-roboty': {
    fallbackSrc: '/media-responsive/direction-hero-betonni-roboty-1536w.e75f8937.webp',
    srcSet: responsiveSrcSet('betonni-roboty', {
      w480: '48f602f0', w768: 'eeda364e', w1200: 'b64d57cf', w1536: 'e75f8937',
    }),
    focalPosition: '53% 4%',
    mobileFocalPosition: '55% center',
  },
  'pokrivelni-roboty': {
    fallbackSrc: '/media-responsive/direction-hero-pokrivelni-roboty-1536w.b4fc3fbd.webp',
    srcSet: responsiveSrcSet('pokrivelni-roboty', {
      w480: '75079011', w768: 'c0aec093', w1200: '8e01c17b', w1536: 'b4fc3fbd',
    }),
    focalPosition: '55% 62%',
    mobileFocalPosition: '57% center',
  },
} as const satisfies Record<string, DirectionHeroImageAsset>;
