import { describe, expect, it } from 'vitest';
import { DARK_MEDIA, HERO_THEME_SCRIPT, darkMedia, storedThemeMedia } from '../../app/lib/heroThemeSources';

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

describe('a source the Worker already pointed (data-dark holds its own media)', () => {
  // runScript's stand-in reads attributes by name; a pointed source has both
  function runOnPointed(preference: string, pointed: Array<{ dataDark: string; media: string }>) {
    const sources = pointed.map(({ dataDark, media }) => {
      const attributes: Record<string, string> = { 'data-dark': dataDark, media };
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
  const own = [darkMedia(PHONE), darkMedia()];

  it('agrees with the Worker: the script on a pointed source leaves its media as the Worker wrote it', () => {
    for (const theme of ['light', 'dark'] as const) {
      const pointed = own.map((media) => ({ dataDark: media, media: storedThemeMedia(theme, media) }));
      expect(runOnPointed(theme, pointed), theme).toEqual(own.map((media) => storedThemeMedia(theme, media)));
    }
  });

  it('a cookie that disagrees with the storage still ends with the stored theme (the script reads data-dark first)', () => {
    // the Worker pointed for a stored Light (cookie), the storage says Dark: the dark sources must match again
    const pointedLight = own.map((media) => ({ dataDark: media, media: storedThemeMedia('light', media) }));
    expect(runOnPointed('dark', pointedLight)).toEqual([PHONE, 'all']);
    const pointedDark = own.map((media) => ({ dataDark: media, media: storedThemeMedia('dark', media) }));
    expect(runOnPointed('light', pointedDark)).toEqual(['not all', 'not all']);
  });

  it('storedThemeMedia is the script\'s own rule on an unpointed source', () => {
    for (const theme of ['light', 'dark'] as const) {
      expect(runScript(theme, own), theme).toEqual(own.map((media) => storedThemeMedia(theme, media)));
    }
  });
});
