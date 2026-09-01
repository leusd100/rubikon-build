import { statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const MAX_RESPONSIVE_HERO_BYTES = 5_000_000;

const responsiveHeroVideos = [
  ['Home phone', '../../public/media/about/home-phone-montage.mp4'],
  ['Home tablet', '../../public/media/about/home-tablet-montage.mp4'],
  ['About phone', '../../public/media/about/about-phone-montage.mp4'],
  ['About tablet', '../../public/media/about/about-tablet-montage.mp4'],
] as const;

describe('Responsive hero media', () => {
  it.each(responsiveHeroVideos)('%s video stays within its 5 MB asset budget', (_, path) => {
    const size = statSync(new URL(path, import.meta.url)).size;

    expect(size).toBeLessThanOrEqual(MAX_RESPONSIVE_HERO_BYTES);
  });
});
