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
    fallbackSrc: '/media-responsive/directions-sequence-angary-1536w.ec149673.webp',
    srcSet: responsiveSrcSet('angary', { w480: '6d4f7f9b', w768: 'c246316c', w1200: '16a5481c', w1536: 'ec149673' }),
    focalPosition: '55% center',
    mobileFocalPosition: '58% center',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-zernoskhovyshcha-1536w.f2e9e6ee.webp',
    srcSet: responsiveSrcSet('zernoskhovyshcha', { w480: 'b0e41daa', w768: '6c117447', w1200: '3d667f36', w1536: 'f2e9e6ee' }),
    focalPosition: '57% center',
    mobileFocalPosition: '60% center',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-metalokonstruktsii-1536w.f68a46a9.webp',
    srcSet: responsiveSrcSet('metalokonstruktsii', { w480: 'dae71d68', w768: 'a531b57e', w1200: '6871257a', w1536: 'f68a46a9' }),
    focalPosition: '55% center',
    mobileFocalPosition: '57% center',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-betonni-roboty-1536w.4aea6812.webp',
    srcSet: responsiveSrcSet('betonni-roboty', { w480: 'dda69ddd', w768: '376a40f4', w1200: '73b67512', w1536: '4aea6812' }),
    focalPosition: '53% center',
    mobileFocalPosition: '55% center',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-pokrivelni-roboty-1536w.527623f0.webp',
    srcSet: responsiveSrcSet('pokrivelni-roboty', { w480: 'a8d86378', w768: 'b79e923a', w1200: '40a54a55', w1536: '527623f0' }),
    focalPosition: '55% center',
    mobileFocalPosition: '58% center',
  },
];
