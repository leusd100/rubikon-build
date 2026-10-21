/** A phone's window of the art at native size, 784 × 1024 (see DIRECTION_HERO_PORTRAIT_WIDTH in the generator). */
type PortraitSources = { avif: string; webp: string };

export type DirectionHeroImageAsset = {
  fallbackSrc: string;
  srcSet: string;
  portrait: PortraitSources;
  dark: { fallbackSrc: string; srcSet: string; portrait: PortraitSources };
  /** Desktop object-position (from 761 px). The y keeps the structure's top in frame: a wide window crops the art top
   *  and bottom (UX pass 2026-10 — the hangar and the steel frame lost their roofs). Since the picture starts at y 0
   *  behind the 92 % header (PDO-18, «Збалансована» 21.10), the hangar's apex and the frame's top node sat under it at
   *  every width from 768 to 1920 px: their y is a length, ART_TOP, which sets the art's top edge that far down, so the
   *  apex clears the 101 px header with room to spare whatever the window's shape. */
  focalPosition: string;
  mobileFocalPosition: string;
  /** The art's top edge when it is set down (ART_TOP): the art fades in over the 44 px under it (globals.css), so the strip
   *  above it — the hero's own graphite, under the header — leaves no seam through the 92 % header. */
  artTop?: string;
};

/** How far the hangar's and the steel frame's art is set down under the header from 761 px (see focalPosition) */
const ART_TOP = '56px';

const responsiveSrcSet = (name: string, variants: { w480: string; w768: string; w1200: string; w1536: string }) =>
  [
    `/media-responsive/direction-hero-photo-variant-${name}-480w.${variants.w480}.webp 480w`,
    `/media-responsive/direction-hero-photo-variant-${name}-768w.${variants.w768}.webp 768w`,
    `/media-responsive/direction-hero-photo-variant-${name}-1200w.${variants.w1200}.webp 1200w`,
    `/media-responsive/direction-hero-photo-variant-${name}-1536w.${variants.w1536}.webp 1536w`,
  ].join(', ');

const portrait = (prefix: string, name: string, hashes: PortraitSources): PortraitSources => ({
  avif: `/media-responsive/${prefix}-${name}-portrait-784w.${hashes.avif}.avif`,
  webp: `/media-responsive/${prefix}-${name}-portrait-784w.${hashes.webp}.webp`,
});

const blueHour = (name: string, hashes: readonly string[], portraitHashes: PortraitSources) => {
  const widths = [480, 768, 1200, 1536];
  const sources = widths.map((width, index) =>
    `/media-responsive/direction-hero-blue-hour-${name}-${width}w.${hashes[index]}.webp`);
  return {
    fallbackSrc: sources[3],
    srcSet: sources.map((src, index) => `${src} ${widths[index]}w`).join(', '),
    portrait: portrait('direction-hero-blue-hour', name, portraitHashes),
  };
};

export const directionHeroImageAssets = {
  angary: {
    dark: blueHour('angary', ['a576a977', '4d31470a', '71bd21db', '244cc20d'], { avif: '32d5e6e4', webp: 'cd0dde67' }),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-angary-1536w.b4e0c501.webp',
    srcSet: responsiveSrcSet('angary', {
      w480: 'e1c31e55', w768: '9908c455', w1200: '6e7f3686', w1536: 'b4e0c501',
    }),
    portrait: portrait('direction-hero-photo-variant', 'angary', { avif: 'fc8f2270', webp: '9643c898' }),
    focalPosition: `56% ${ART_TOP}`,
    mobileFocalPosition: '58% center',
    artTop: ART_TOP,
  },
  zernoskhovyshcha: {
    dark: blueHour('zernoskhovyshcha', ['262dafeb', 'cea9cba2', 'c879a152', '731f0864'], { avif: '104a3372', webp: '8c9c8882' }),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-zernoskhovyshcha-1536w.90934f90.webp',
    srcSet: responsiveSrcSet('zernoskhovyshcha', {
      w480: 'be87c7d8', w768: '7c67f3ef', w1200: 'b394ed98', w1536: '90934f90',
    }),
    portrait: portrait('direction-hero-photo-variant', 'zernoskhovyshcha', { avif: '26cc2513', webp: '1f960375' }),
    focalPosition: '57% 8%',
    mobileFocalPosition: '62% center',
  },
  metalokonstruktsii: {
    dark: blueHour('metalokonstruktsii', ['4c1ae364', '18ffb0d1', '8e156e55', '2213066e'], { avif: 'e397bcbb', webp: '09c9ea0e' }),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-metalokonstruktsii-1536w.d2fbc0e0.webp',
    srcSet: responsiveSrcSet('metalokonstruktsii', {
      w480: 'f09543fd', w768: '6df1407d', w1200: 'c4c53f5e', w1536: 'd2fbc0e0',
    }),
    portrait: portrait('direction-hero-photo-variant', 'metalokonstruktsii', { avif: 'c6e7a820', webp: '65df7e70' }),
    focalPosition: `55% ${ART_TOP}`,
    mobileFocalPosition: '58% center',
    artTop: ART_TOP,
  },
  'betonni-roboty': {
    dark: blueHour('betonni-roboty', ['fd4ed433', '2a32c945', '9a9fb729', 'de3f3916'], { avif: 'bb4408e1', webp: '7066e860' }),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-betonni-roboty-1536w.23e60c07.webp',
    srcSet: responsiveSrcSet('betonni-roboty', {
      w480: '27aabc64', w768: 'a5cfbf73', w1200: 'bb20c5f9', w1536: '23e60c07',
    }),
    portrait: portrait('direction-hero-photo-variant', 'betonni-roboty', { avif: 'e05e8267', webp: '83fd957c' }),
    focalPosition: '53% 4%',
    mobileFocalPosition: '55% center',
  },
  'pokrivelni-roboty': {
    dark: blueHour('pokrivelni-roboty', ['98a4ea3b', '690f84d1', '6fd2fef5', '25db180e'], { avif: 'fdead887', webp: 'efc25e91' }),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-pokrivelni-roboty-1536w.9e89e366.webp',
    srcSet: responsiveSrcSet('pokrivelni-roboty', {
      w480: 'a8e0dc26', w768: '8519ff54', w1200: '016676cf', w1536: '9e89e366',
    }),
    portrait: portrait('direction-hero-photo-variant', 'pokrivelni-roboty', { avif: '5e80d22b', webp: '01119a21' }),
    focalPosition: '55% 62%',
    mobileFocalPosition: '57% center',
  },
} as const satisfies Record<string, DirectionHeroImageAsset>;
