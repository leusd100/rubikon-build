export type DirectionsHeroSequenceAsset = {
  fallbackSrc: string;
  srcSet: string;
  focalPosition: string;
  mobileFocalPosition: string;
};

const responsiveSrcSet = (name: string, variants: { w480: string; w768: string; w1200: string; w1536: string }) =>
  [
    `/media-responsive/directions-sequence-${name}-480w.${variants.w480}.webp 480w`,
    `/media-responsive/directions-sequence-${name}-768w.${variants.w768}.webp 768w`,
    `/media-responsive/directions-sequence-${name}-1200w.${variants.w1200}.webp 1200w`,
    `/media-responsive/directions-sequence-${name}-1536w.${variants.w1536}.webp 1536w`,
  ].join(', ');

export const directionsHeroSequenceAssets: readonly DirectionsHeroSequenceAsset[] = [
  {
    fallbackSrc: '/media-responsive/directions-sequence-angary-1536w.4dd73b27.webp',
    srcSet: responsiveSrcSet('angary', { w480: '6f62fdd8', w768: 'f07212a8', w1200: 'bf92dcbc', w1536: '4dd73b27' }),
    focalPosition: '55% center',
    mobileFocalPosition: '58% center',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-zernoskhovyshcha-1536w.751d0123.webp',
    srcSet: responsiveSrcSet('zernoskhovyshcha', { w480: '03a1718d', w768: '3c75f1a3', w1200: 'f931cad1', w1536: '751d0123' }),
    focalPosition: '57% center',
    mobileFocalPosition: '60% center',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-metalokonstruktsii-1536w.9ddbe89c.webp',
    srcSet: responsiveSrcSet('metalokonstruktsii', { w480: 'd3b96058', w768: 'ce7e1e20', w1200: '5666a11e', w1536: '9ddbe89c' }),
    focalPosition: '55% center',
    mobileFocalPosition: '57% center',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-betonni-roboty-1536w.900a2db6.webp',
    srcSet: responsiveSrcSet('betonni-roboty', { w480: '95e7c04d', w768: 'd8d9056e', w1200: '0fb7b01f', w1536: '900a2db6' }),
    focalPosition: '53% center',
    mobileFocalPosition: '55% center',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-pokrivelni-roboty-1536w.d77cd44b.webp',
    srcSet: responsiveSrcSet('pokrivelni-roboty', { w480: 'e5e75dc5', w768: '7a6b55a2', w1200: '105b1e2d', w1536: 'd77cd44b' }),
    focalPosition: '55% center',
    mobileFocalPosition: '58% center',
  },
];
