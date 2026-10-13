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
  width: number;
  height: number;
};
type ResponsiveVariants = readonly (readonly [width: number, hash: string])[];

const responsiveSrcSet = (style: string, name: string, variants: ResponsiveVariants, portrait = false) =>
  variants.map(([width, hash]) =>
    `/media-responsive/directions-sequence-${style}-${name}${portrait ? "-portrait" : ""}-${width}w.${hash}.webp ${width}w`,
  ).join(', ');

const media = (style: string, name: string, landscape: ResponsiveVariants, portrait: ResponsiveVariants): SequenceMedia => ({
  fallbackSrc: `/media-responsive/directions-sequence-${style}-${name}-1536w.${landscape[3][1]}.webp`,
  srcSet: responsiveSrcSet(style, name, landscape),
  portraitSrcSet: responsiveSrcSet(style, name, portrait, true),
  width: 1881,
  height: 836,
});

export const directionsHeroSequenceAssets: readonly DirectionsHeroSequenceAsset[] = [
  {
    id: 'angary',
    daylight: media('daylight', 'angary', [[480, '8c8c83e4'], [768, '645a2b14'], [1200, 'a17dc873'], [1536, '528c3107'], [1881, '08b5c021']], [[320, 'e1dd8b6b'], [480, '1edf8aa8'], [627, 'bd355c5d']]),
    dark: media('blue-hour', 'angary', [[480, 'cd16d316'], [768, 'a042958c'], [1200, '1cc95c83'], [1536, 'f3cca8bf'], [1881, '85bf3ba0']], [[320, '8c82be24'], [480, '0bec42e5'], [627, 'c24290a9']]),
    focalPosition: 'center center',
    mobileFocalPosition: 'center center',
  },
  {
    id: 'zernoskhovyshcha',
    daylight: media('daylight', 'zernoskhovyshcha', [[480, '6348680d'], [768, '366bb2b7'], [1200, 'c5cb0806'], [1536, '7812a6f2'], [1881, '38c8889a']], [[320, '4a4da95e'], [480, '28a6406e'], [627, '6f7116e6']]),
    dark: media('blue-hour', 'zernoskhovyshcha', [[480, 'bf5f2eae'], [768, 'd1b78999'], [1200, '1995b70f'], [1536, '345df3de'], [1881, '1c16e7f0']], [[320, '297f7301'], [480, '1a292946'], [627, '51085b7a']]),
    focalPosition: 'center center',
    mobileFocalPosition: 'center center',
  },
  {
    id: 'metalokonstruktsii',
    daylight: media('daylight', 'metalokonstruktsii', [[480, '30f66ff2'], [768, 'e65d437f'], [1200, '3be6b92c'], [1536, '10a376be'], [1881, '608e9934']], [[320, 'a27cbd7b'], [480, '79efc685'], [627, '98108f2d']]),
    dark: media('blue-hour', 'metalokonstruktsii', [[480, 'e01ee4cd'], [768, '3eaff5a3'], [1200, 'a17a32b2'], [1536, 'fcea5b4f'], [1881, 'e1886f2b']], [[320, '16fbee9c'], [480, '20d031ef'], [627, '9bd1dccc']]),
    focalPosition: 'center center',
    mobileFocalPosition: 'center center',
  },
  {
    id: 'betonni-roboty',
    daylight: media('daylight', 'betonni-roboty', [[480, 'ae994f77'], [768, '1c699528'], [1200, '7134f906'], [1536, 'a3d01f75'], [1881, 'c6fd5f90']], [[320, 'a2c8878e'], [480, '2364d901'], [627, '7c481e84']]),
    dark: media('blue-hour', 'betonni-roboty', [[480, '8ca1ce1c'], [768, '3d919ea4'], [1200, 'b265d189'], [1536, 'f7ece6a6'], [1881, '89a4cd12']], [[320, 'cceb9b50'], [480, '879f7e43'], [627, 'e72285ea']]),
    focalPosition: 'center center',
    mobileFocalPosition: 'center center',
  },
  {
    id: 'pokrivelni-roboty',
    daylight: media('daylight', 'pokrivelni-roboty', [[480, '7e080fde'], [768, '62fc287a'], [1200, '83e76d7b'], [1536, '2730c5cc'], [1881, '1d684146']], [[320, 'ea1423cc'], [480, '4ffaac9d'], [627, '55f23274']]),
    dark: media('blue-hour', 'pokrivelni-roboty', [[480, 'ca2de956'], [768, '10a0b0fc'], [1200, '1192ad0a'], [1536, '22729cc5'], [1881, 'de6ca572']], [[320, 'ab822391'], [480, '4a85d616'], [627, '7c79ca17']]),
    focalPosition: 'center center',
    mobileFocalPosition: 'center center',
  },
];
