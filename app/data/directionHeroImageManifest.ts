export type DirectionHeroImageAsset = {
  fallbackSrc: string;
  srcSet: string;
  dark: { fallbackSrc: string; srcSet: string };
  /** Desktop object-position. The y keeps the structure's top in frame: the image starts under the header and a wide
   *  window crops it top and bottom (UX pass 2026-10 — the hangar and the steel frame lost their roofs). */
  focalPosition: string;
  mobileFocalPosition: string;
};

const responsiveSrcSet = (name: string, variants: { w480: string; w768: string; w1200: string; w1536: string }) =>
  [
    `/media-responsive/direction-hero-photo-variant-${name}-480w.${variants.w480}.webp 480w`,
    `/media-responsive/direction-hero-photo-variant-${name}-768w.${variants.w768}.webp 768w`,
    `/media-responsive/direction-hero-photo-variant-${name}-1200w.${variants.w1200}.webp 1200w`,
    `/media-responsive/direction-hero-photo-variant-${name}-1536w.${variants.w1536}.webp 1536w`,
  ].join(', ');

const blueHour = (name: string, hashes: readonly string[]) => {
  const widths = [480, 768, 1200, 1536];
  const sources = widths.map((width, index) =>
    `/media-responsive/direction-hero-blue-hour-${name}-${width}w.${hashes[index]}.webp`);
  return {
    fallbackSrc: sources[3],
    srcSet: sources.map((src, index) => `${src} ${widths[index]}w`).join(', '),
  };
};

export const directionHeroImageAssets = {
  angary: {
    dark: blueHour('angary', ['a576a977', '4d31470a', '71bd21db', '244cc20d']),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-angary-1536w.b4e0c501.webp',
    srcSet: responsiveSrcSet('angary', {
      w480: 'e1c31e55', w768: '9908c455', w1200: '6e7f3686', w1536: 'b4e0c501',
    }),
    focalPosition: '56% 6%',
    mobileFocalPosition: '58% center',
  },
  zernoskhovyshcha: {
    dark: blueHour('zernoskhovyshcha', ['262dafeb', 'cea9cba2', 'c879a152', '731f0864']),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-zernoskhovyshcha-1536w.90934f90.webp',
    srcSet: responsiveSrcSet('zernoskhovyshcha', {
      w480: 'be87c7d8', w768: '7c67f3ef', w1200: 'b394ed98', w1536: '90934f90',
    }),
    focalPosition: '57% 8%',
    mobileFocalPosition: '62% center',
  },
  metalokonstruktsii: {
    dark: blueHour('metalokonstruktsii', ['4c1ae364', '18ffb0d1', '8e156e55', '2213066e']),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-metalokonstruktsii-1536w.d2fbc0e0.webp',
    srcSet: responsiveSrcSet('metalokonstruktsii', {
      w480: 'f09543fd', w768: '6df1407d', w1200: 'c4c53f5e', w1536: 'd2fbc0e0',
    }),
    focalPosition: '55% 6%',
    mobileFocalPosition: '58% center',
  },
  'betonni-roboty': {
    dark: blueHour('betonni-roboty', ['fd4ed433', '2a32c945', '9a9fb729', 'de3f3916']),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-betonni-roboty-1536w.23e60c07.webp',
    srcSet: responsiveSrcSet('betonni-roboty', {
      w480: '27aabc64', w768: 'a5cfbf73', w1200: 'bb20c5f9', w1536: '23e60c07',
    }),
    focalPosition: '53% 4%',
    mobileFocalPosition: '55% center',
  },
  'pokrivelni-roboty': {
    dark: blueHour('pokrivelni-roboty', ['98a4ea3b', '690f84d1', '6fd2fef5', '25db180e']),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-pokrivelni-roboty-1536w.9e89e366.webp',
    srcSet: responsiveSrcSet('pokrivelni-roboty', {
      w480: 'a8e0dc26', w768: '8519ff54', w1200: '016676cf', w1536: '9e89e366',
    }),
    focalPosition: '55% 62%',
    mobileFocalPosition: '57% center',
  },
} as const satisfies Record<string, DirectionHeroImageAsset>;
