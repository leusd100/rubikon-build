export type DirectionsHeroSequenceAsset = {
  id: string;
  daylight: SequenceMedia;
  dark: SequenceMedia;
  focalPosition: string;
  mobileFocalPosition: string;
};

type SequenceMedia = {
  fallbackSrc: string;
  srcSet: string;
  portraitSrcSet: string;
  mobile: { avif: string; webp: string };
  width: number;
  height: number;
};
type ResponsiveVariants = readonly (readonly [width: number, hash: string])[];

const responsiveSrcSet = (style: string, name: string, variants: ResponsiveVariants, portrait = false) =>
  variants.map(([width, hash]) =>
    `/media-responsive/directions-sequence-${style}-${name}${portrait ? "-portrait" : ""}-${width}w.${hash}.webp ${width}w`,
  ).join(', ');

// Mobile 3:2 windows, 480/960 widths; WebP q82 / AVIF q58. Refreshed photographic masters
// already have that aspect ratio; the two retained daylight masters keep their existing crop.
const mobileSources: Record<string, { avif: string; webp: string }> = {
  'daylight/angary': {
    avif: '/media-responsive/mobile-directions-daylight-angary-480w.2b8f8804.avif 480w, /media-responsive/mobile-directions-daylight-angary-960w.81108f43.avif 960w',
    webp: '/media-responsive/mobile-directions-daylight-angary-480w.686ede44.webp 480w, /media-responsive/mobile-directions-daylight-angary-960w.caf2e6c9.webp 960w',
  },
  'daylight/zernoskhovyshcha': {
    avif: '/media-responsive/mobile-directions-daylight-zernoskhovyshcha-480w.75966812.avif 480w, /media-responsive/mobile-directions-daylight-zernoskhovyshcha-960w.8d8b610d.avif 960w',
    webp: '/media-responsive/mobile-directions-daylight-zernoskhovyshcha-480w.66a54628.webp 480w, /media-responsive/mobile-directions-daylight-zernoskhovyshcha-960w.8315478a.webp 960w',
  },
  'daylight/metalokonstruktsii': {
    avif: '/media-responsive/mobile-directions-daylight-metalokonstruktsii-480w.04482f5a.avif 480w, /media-responsive/mobile-directions-daylight-metalokonstruktsii-960w.94c5bb24.avif 960w',
    webp: '/media-responsive/mobile-directions-daylight-metalokonstruktsii-480w.391d51b1.webp 480w, /media-responsive/mobile-directions-daylight-metalokonstruktsii-960w.98485ab9.webp 960w',
  },
  'daylight/betonni-roboty': {
    avif: '/media-responsive/mobile-directions-daylight-betonni-roboty-480w.48cb73f5.avif 480w, /media-responsive/mobile-directions-daylight-betonni-roboty-960w.ce06ef21.avif 960w',
    webp: '/media-responsive/mobile-directions-daylight-betonni-roboty-480w.ab3bfce5.webp 480w, /media-responsive/mobile-directions-daylight-betonni-roboty-960w.652a6c19.webp 960w',
  },
  'daylight/pokrivelni-roboty': {
    avif: '/media-responsive/mobile-directions-daylight-pokrivelni-roboty-480w.18b6556f.avif 480w, /media-responsive/mobile-directions-daylight-pokrivelni-roboty-960w.005df7b6.avif 960w',
    webp: '/media-responsive/mobile-directions-daylight-pokrivelni-roboty-480w.8ff21b10.webp 480w, /media-responsive/mobile-directions-daylight-pokrivelni-roboty-960w.82f85427.webp 960w',
  },
  'blue-hour/angary': {
    avif: '/media-responsive/mobile-directions-blue-hour-angary-480w.45559f90.avif 480w, /media-responsive/mobile-directions-blue-hour-angary-960w.fa966e04.avif 960w',
    webp: '/media-responsive/mobile-directions-blue-hour-angary-480w.286cc310.webp 480w, /media-responsive/mobile-directions-blue-hour-angary-960w.b0a90674.webp 960w',
  },
  'blue-hour/zernoskhovyshcha': {
    avif: '/media-responsive/mobile-directions-blue-hour-zernoskhovyshcha-480w.98a02f5d.avif 480w, /media-responsive/mobile-directions-blue-hour-zernoskhovyshcha-960w.e1730bf6.avif 960w',
    webp: '/media-responsive/mobile-directions-blue-hour-zernoskhovyshcha-480w.7830dc4b.webp 480w, /media-responsive/mobile-directions-blue-hour-zernoskhovyshcha-960w.f95abcf2.webp 960w',
  },
  'blue-hour/metalokonstruktsii': {
    avif: '/media-responsive/mobile-directions-blue-hour-metalokonstruktsii-480w.41317933.avif 480w, /media-responsive/mobile-directions-blue-hour-metalokonstruktsii-960w.d78ccafb.avif 960w',
    webp: '/media-responsive/mobile-directions-blue-hour-metalokonstruktsii-480w.e6098ad9.webp 480w, /media-responsive/mobile-directions-blue-hour-metalokonstruktsii-960w.db8efc39.webp 960w',
  },
  'blue-hour/betonni-roboty': {
    avif: '/media-responsive/mobile-directions-blue-hour-betonni-roboty-480w.33874344.avif 480w, /media-responsive/mobile-directions-blue-hour-betonni-roboty-960w.8118e25c.avif 960w',
    webp: '/media-responsive/mobile-directions-blue-hour-betonni-roboty-480w.a6d3019f.webp 480w, /media-responsive/mobile-directions-blue-hour-betonni-roboty-960w.36b76772.webp 960w',
  },
  'blue-hour/pokrivelni-roboty': {
    avif: '/media-responsive/mobile-directions-blue-hour-pokrivelni-roboty-480w.ab7db993.avif 480w, /media-responsive/mobile-directions-blue-hour-pokrivelni-roboty-960w.2de4bdc5.avif 960w',
    webp: '/media-responsive/mobile-directions-blue-hour-pokrivelni-roboty-480w.75eefb51.webp 480w, /media-responsive/mobile-directions-blue-hour-pokrivelni-roboty-960w.501977d4.webp 960w',
  },
};

const media = (style: string, name: string, landscape: ResponsiveVariants, portrait: ResponsiveVariants, width = 1881, height = 836): SequenceMedia => ({
  fallbackSrc: `/media-responsive/directions-sequence-${style}-${name}-1536w.${landscape[3][1]}.webp`,
  srcSet: responsiveSrcSet(style, name, landscape),
  portraitSrcSet: responsiveSrcSet(style, name, portrait, true),
  mobile: mobileSources[`${style}/${name}`],
  width,
  height,
});

export const directionsHeroSequenceAssets: readonly DirectionsHeroSequenceAsset[] = [
  {
    id: 'angary',
    daylight: media('daylight', 'angary', [[480, 'dbb6a7c8'], [768, '315d6353'], [1200, 'f30866ab'], [1536, '582247a2']], [[320, '5189f1f1'], [480, '3af89cc9'], [768, 'a0204d18']], 1536, 1024),
    dark: media('blue-hour', 'angary', [[480, '71582417'], [768, '6a77e891'], [1200, '02cc7516'], [1536, 'c0b42098']], [[320, 'edd48bc0'], [480, '0c353270'], [768, 'da9e668e']], 1536, 1024),
    focalPosition: 'center top',
    mobileFocalPosition: 'center center',
  },
  {
    id: 'zernoskhovyshcha',
    daylight: media('daylight', 'zernoskhovyshcha', [[480, '6348680d'], [768, '366bb2b7'], [1200, 'c5cb0806'], [1536, '7812a6f2'], [1881, '38c8889a']], [[320, '4a4da95e'], [480, '28a6406e'], [627, '6f7116e6']]),
    dark: media('blue-hour', 'zernoskhovyshcha', [[480, '5a79f6ba'], [768, '2f78371a'], [1200, '7ffff1ab'], [1536, '9fe7da9c']], [[320, '9234f2ea'], [480, 'd4a88911'], [768, 'a91d6519']], 1536, 1024),
    focalPosition: 'center top',
    mobileFocalPosition: 'center center',
  },
  {
    id: 'metalokonstruktsii',
    daylight: media('daylight', 'metalokonstruktsii', [[480, '5c300ee7'], [768, 'd08e7744'], [1200, '4b4f2e95'], [1536, '00c18007']], [[320, 'ebe5f75f'], [480, 'b65df925'], [768, '938677fd']], 1536, 1024),
    dark: media('blue-hour', 'metalokonstruktsii', [[480, 'e7aed6ee'], [768, '81efe464'], [1200, 'e02e6b56'], [1536, 'ec750520']], [[320, '0cb3fe0f'], [480, 'c67aea54'], [768, '3c517870']], 1536, 1024),
    focalPosition: 'center top',
    mobileFocalPosition: 'center center',
  },
  {
    id: 'betonni-roboty',
    daylight: media('daylight', 'betonni-roboty', [[480, '1dc1616c'], [768, '73684b2d'], [1200, 'c549a0c6'], [1536, '5112ea15']], [[320, '216b33d0'], [480, '4be35d00'], [768, '21891cc2']], 1536, 1024),
    dark: media('blue-hour', 'betonni-roboty', [[480, '0cb83a64'], [768, '45c050c5'], [1200, '91423a3f'], [1536, '49ecb41b']], [[320, 'da929086'], [480, 'c744f574'], [768, '3e9e0094']], 1536, 1024),
    focalPosition: 'center top',
    mobileFocalPosition: 'center center',
  },
  {
    id: 'pokrivelni-roboty',
    daylight: media('daylight', 'pokrivelni-roboty', [[480, '7e080fde'], [768, '62fc287a'], [1200, '83e76d7b'], [1536, '2730c5cc'], [1881, '1d684146']], [[320, 'ea1423cc'], [480, '4ffaac9d'], [627, '55f23274']]),
    dark: media('blue-hour', 'pokrivelni-roboty', [[480, 'ad1d869e'], [768, 'e973dec4'], [1200, 'd2853a0c'], [1536, '9040f15b']], [[320, '332a2655'], [480, '5a819141'], [768, '15351707']], 1536, 1024),
    focalPosition: 'center top',
    mobileFocalPosition: 'center center',
  },
];
