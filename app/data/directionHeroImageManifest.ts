export type DirectionHeroImageAsset = {
  fallbackSrc: string;
  srcSet: string;
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
    fallbackSrc: '/media-responsive/direction-hero-angary-1536w.47bfb541.webp',
    srcSet: responsiveSrcSet('angary', {
      w480: '23e99ee3', w768: '854c045c', w1200: '89dd3d36', w1536: '47bfb541',
    }),
    focalPosition: '56% center',
    mobileFocalPosition: '58% center',
  },
  zernoskhovyshcha: {
    fallbackSrc: '/media-responsive/direction-hero-zernoskhovyshcha-1536w.e57d09e3.webp',
    srcSet: responsiveSrcSet('zernoskhovyshcha', {
      w480: '26cfa6cf', w768: '97b41ea1', w1200: 'b5a90c65', w1536: 'e57d09e3',
    }),
    focalPosition: '57% center',
    mobileFocalPosition: '62% center',
  },
  metalokonstruktsii: {
    fallbackSrc: '/media-responsive/direction-hero-metalokonstruktsii-1536w.75034445.webp',
    srcSet: responsiveSrcSet('metalokonstruktsii', {
      w480: '44943be4', w768: '0b06a47d', w1200: '2086add2', w1536: '75034445',
    }),
    focalPosition: '55% center',
    mobileFocalPosition: '58% center',
  },
  'betonni-roboty': {
    fallbackSrc: '/media-responsive/direction-hero-betonni-roboty-1536w.bc7db972.webp',
    srcSet: responsiveSrcSet('betonni-roboty', {
      w480: '5928b7fa', w768: 'fb8a66db', w1200: '7a5c01d2', w1536: 'bc7db972',
    }),
    focalPosition: '53% center',
    mobileFocalPosition: '55% center',
  },
  'pokrivelni-roboty': {
    fallbackSrc: '/media-responsive/direction-hero-pokrivelni-roboty-1536w.edda7a33.webp',
    srcSet: responsiveSrcSet('pokrivelni-roboty', {
      w480: '5bac4303', w768: '68f6457b', w1200: 'c7247b87', w1536: 'edda7a33',
    }),
    focalPosition: '55% center',
    mobileFocalPosition: '57% center',
  },
} as const satisfies Record<string, DirectionHeroImageAsset>;
