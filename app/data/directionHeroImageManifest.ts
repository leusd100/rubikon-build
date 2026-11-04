/** A phone's window of the art at native size, 784 × 1024 (see DIRECTION_HERO_PORTRAIT_WIDTH in the generator). */
type PortraitSources = { avif: string; webp: string };

export type DirectionHeroImageAsset = {
  fallbackSrc: string;
  srcSet: string;
  portrait: PortraitSources;
  dark: { fallbackSrc: string; srcSet: string; portrait: PortraitSources };
  /** Optional phone-only art window; existing tablet and desktop compositions remain intact. */
  phoneCrop?: { light: PortraitSources; dark: PortraitSources; position: string };
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
    dark: blueHour('angary', ['71582417', '6a77e891', '02cc7516', 'c0b42098'], { avif: '16131ec7', webp: '12bde85e' }),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-angary-1536w.ff7e8c1a.webp',
    srcSet: responsiveSrcSet('angary', { w480: '7891bedb', w768: '78a42fed', w1200: 'c45ee5de', w1536: 'ff7e8c1a' }),
    portrait: portrait('direction-hero-photo-variant', 'angary', { avif: '49b633f8', webp: '476428bc' }),
    focalPosition: `56% ${ART_TOP}`,
    mobileFocalPosition: '58% center',
    artTop: ART_TOP,
  },
  zernoskhovyshcha: {
    dark: blueHour('zernoskhovyshcha', ['5a79f6ba', '2f78371a', '7ffff1ab', '9fe7da9c'], { avif: 'a1cbbcca', webp: 'd538b9fe' }),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-zernoskhovyshcha-1536w.90934f90.webp',
    srcSet: responsiveSrcSet('zernoskhovyshcha', {
      w480: 'be87c7d8', w768: '7c67f3ef', w1200: 'b394ed98', w1536: '90934f90',
    }),
    portrait: portrait('direction-hero-photo-variant', 'zernoskhovyshcha', { avif: '26cc2513', webp: '1f960375' }),
    focalPosition: '57% 8%',
    mobileFocalPosition: '62% center',
  },
  metalokonstruktsii: {
    dark: blueHour('metalokonstruktsii', ['e7aed6ee', '81efe464', 'e02e6b56', 'ec750520'], { avif: '6bd96938', webp: '3032c3f6' }),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-metalokonstruktsii-1536w.ec2184d1.webp',
    srcSet: responsiveSrcSet('metalokonstruktsii', { w480: '3ed1b208', w768: 'd09493a3', w1200: 'f005df53', w1536: 'ec2184d1' }),
    portrait: portrait('direction-hero-photo-variant', 'metalokonstruktsii', { avif: '2366c8f5', webp: 'd533bf1f' }),
    focalPosition: `55% ${ART_TOP}`,
    mobileFocalPosition: '58% center',
    artTop: ART_TOP,
  },
  'betonni-roboty': {
    dark: blueHour('betonni-roboty', ['0cb83a64', '45c050c5', '91423a3f', '49ecb41b'], { avif: 'f90f90fc', webp: 'fd178407' }),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-betonni-roboty-1536w.82ef0687.webp',
    srcSet: responsiveSrcSet('betonni-roboty', { w480: 'ac51425f', w768: '5b92afff', w1200: 'd89f0df8', w1536: '82ef0687' }),
    portrait: portrait('direction-hero-photo-variant', 'betonni-roboty', { avif: '7c3c6b2f', webp: '7f09c390' }),
    focalPosition: '53% 4%',
    mobileFocalPosition: '55% center',
  },
  'pokrivelni-roboty': {
    phoneCrop: {
      light: {
        avif: '/media-responsive/direction-hero-roof-mobile-light-784w.cadd63a3.avif',
        webp: '/media-responsive/direction-hero-roof-mobile-light-784w.a91d7c08.webp',
      },
      dark: {
        avif: '/media-responsive/direction-hero-roof-mobile-dark-784w.777cdb44.avif',
        webp: '/media-responsive/direction-hero-roof-mobile-dark-784w.173f83b4.webp',
      },
      position: '45% center',
    },
    dark: blueHour('pokrivelni-roboty', ['ad1d869e', 'e973dec4', 'd2853a0c', '9040f15b'], { avif: '777cdb44', webp: '173f83b4' }),
    fallbackSrc: '/media-responsive/direction-hero-photo-variant-pokrivelni-roboty-1536w.9e89e366.webp',
    srcSet: responsiveSrcSet('pokrivelni-roboty', {
      w480: 'a8e0dc26', w768: '8519ff54', w1200: '016676cf', w1536: '9e89e366',
    }),
    portrait: portrait('direction-hero-photo-variant', 'pokrivelni-roboty', { avif: '5e80d22b', webp: '01119a21' }),
    focalPosition: '55% 62%',
    mobileFocalPosition: '57% center',
  },
} as const satisfies Record<string, DirectionHeroImageAsset>;
