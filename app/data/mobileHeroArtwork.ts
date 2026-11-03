export type MobileHeroArtwork = Readonly<{ light: string; dark: string }>;

export const homeMobileArtwork: MobileHeroArtwork = {
  light: '/media/mobile-b1/home-light',
  dark: '/media/mobile-b1/home-dark',
};

export const aboutMobileArtwork: MobileHeroArtwork = {
  light: '/media/mobile-b1/about-light',
  dark: '/media/mobile-b1/about-dark',
};

export function mobileArtworkSrcSet(prefix: string) {
  return [480, 768, 1024].map((width) => `${prefix}-${width}w.webp ${width}w`).join(', ');
}
