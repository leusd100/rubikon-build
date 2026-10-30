import { describe, expect, it } from 'vitest';
import { DARK_MEDIA, HERO_THEME_SCRIPT, darkMedia } from '../../app/lib/heroThemeSources';

const PHONE = '(max-width: 440px)';

// The inline script as the browser runs it: on a <picture> whose dark sources the parser has just added
function runScript(preference: string | undefined, medias: string[]) {
  const sources = medias.map((media) => {
    const attributes: Record<string, string> = { media };
    return {
      getAttribute: (name: string) => attributes[name] ?? null,
      setAttribute: (name: string, value: string) => { attributes[name] = value; },
    };
  });
  const picture = { querySelectorAll: (selector: string) => (selector === 'source[data-dark]' ? sources : []) };
  const document = { documentElement: { dataset: { themePreference: preference } }, currentScript: { parentNode: picture } };
  new Function('document', HERO_THEME_SCRIPT)(document);
  return sources.map((source) => source.getAttribute('media'));
}

describe('darkMedia', () => {
  it('narrows a media query to the OS dark theme, or stands alone', () => {
    expect(darkMedia(PHONE)).toBe(`${PHONE} and ${DARK_MEDIA}`);
    expect(darkMedia()).toBe(DARK_MEDIA);
  });
});

describe('HERO_THEME_SCRIPT', () => {
  const medias = [darkMedia(PHONE), darkMedia()];

  it('leaves the System picture to the OS', () => {
    expect(runScript('system', medias)).toEqual(medias);
    expect(runScript(undefined, medias)).toEqual(medias);
  });

  it('a stored Dark drops the OS condition, so the dark sources win under a light OS', () => {
    expect(runScript('dark', medias)).toEqual([PHONE, 'all']);
  });

  it('a stored Light switches the dark sources off, so a dark OS cannot pick them', () => {
    expect(runScript('light', medias)).toEqual(['not all', 'not all']);
  });
});
