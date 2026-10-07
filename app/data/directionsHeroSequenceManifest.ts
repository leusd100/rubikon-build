export type DirectionsHeroSequenceAsset = {
  fallbackSrc: string;
  srcSet: string;
  portraitSrcSet: string;
  width: number;
  height: number;
  focalPosition: string;
  mobileFocalPosition: string;
};

type ResponsiveVariants = readonly (readonly [width: number, hash: string])[];

const responsiveSrcSet = (name: string, variants: ResponsiveVariants, portrait = false) =>
  variants.map(([width, hash]) =>
    `/media-responsive/directions-sequence-${name}${portrait ? '-portrait' : ''}-${width}w.${hash}.webp ${width}w`,
  ).join(', ');

export const directionsHeroSequenceAssets: readonly DirectionsHeroSequenceAsset[] = [
  {
    fallbackSrc: '/media-responsive/directions-sequence-angary-1536w.3c8e8cc9.webp',
    srcSet: responsiveSrcSet('angary', [[480, '94e4a740'], [768, 'ca3d62f7'], [1200, '452a338b'], [1536, '3c8e8cc9'], [1896, '050ba3f4']]),
    portraitSrcSet: responsiveSrcSet('angary', [[320, '41c00eaa'], [480, 'eb1e77b6'], [622, '6e4983de']], true),
    width: 1896,
    height: 830,
    // Preserve the sky above the roof apex when wide screens crop the image vertically.
    focalPosition: '55% top',
    mobileFocalPosition: '50% top',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-zernoskhovyshcha-1536w.6945f8a6.webp',
    srcSet: responsiveSrcSet('zernoskhovyshcha', [[480, 'fa55a2fd'], [768, 'd080dd16'], [1200, '18ffadd1'], [1536, '6945f8a6'], [1897, 'ccffd996']]),
    portraitSrcSet: responsiveSrcSet('zernoskhovyshcha', [[320, '0a144acc'], [480, '9510e977'], [622, '06076313']], true),
    width: 1897,
    height: 829,
    focalPosition: '60% center',
    mobileFocalPosition: '50% center',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-metalokonstruktsii-1536w.8a84480d.webp',
    srcSet: responsiveSrcSet('metalokonstruktsii', [[480, '85ea0d2b'], [768, '9abe6e6d'], [1200, '33589eca'], [1536, '8a84480d'], [1896, '0ac262e3']]),
    portraitSrcSet: responsiveSrcSet('metalokonstruktsii', [[320, 'b56d8ce5'], [480, '897afad8'], [622, 'd7fff708']], true),
    width: 1896,
    height: 830,
    focalPosition: '58% center',
    mobileFocalPosition: '50% center',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-betonni-roboty-1536w.1a79bbe0.webp',
    srcSet: responsiveSrcSet('betonni-roboty', [[480, '3adf44c0'], [768, 'ad38b775'], [1200, '87a74886'], [1536, '1a79bbe0'], [1896, '29919ad1']]),
    portraitSrcSet: responsiveSrcSet('betonni-roboty', [[320, '20cf5818'], [480, '88e0e3eb'], [622, 'b8fd147d']], true),
    width: 1896,
    height: 830,
    focalPosition: '72% center',
    mobileFocalPosition: '50% center',
  },
  {
    fallbackSrc: '/media-responsive/directions-sequence-pokrivelni-roboty-1536w.622e9f02.webp',
    srcSet: responsiveSrcSet('pokrivelni-roboty', [[480, '33d6df46'], [768, '90478a2d'], [1200, 'cc2f8b08'], [1536, '622e9f02'], [1896, '6983fba3']]),
    portraitSrcSet: responsiveSrcSet('pokrivelni-roboty', [[320, '7eb1ec0a'], [480, 'fa139c18'], [622, '642d338e']], true),
    width: 1896,
    height: 830,
    focalPosition: '60% center',
    mobileFocalPosition: '50% center',
  },
];
