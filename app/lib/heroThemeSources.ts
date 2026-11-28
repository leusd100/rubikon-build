// One hero download per theme (MD-01). The server cannot know the visitor's theme, so the hero <picture> it renders is
// the System one: each blue-hour <source> carries DARK_MEDIA (and data-dark) before its daylight twin, and the browser
// picks one art on the first parse. A stored Light or Dark that differs from the OS would still pick the wrong art, so
// HERO_THEME_SCRIPT, inline between the sources and the <img>, runs while the <picture> is being parsed — after the
// sources exist, before the img selects one — and points the dark sources at the stored theme. THEME_INIT_SCRIPT has
// already set data-theme-preference in <head>. The client then swaps in the explicit picture, whose art is the same
// file, so no second request. Measured 29.10 (Chrome 156, 6 routes × 390 / 1440): see the handoff of this change.
//
// WebKit's preload scanner does not stop at that script: it reads the sources ahead of the parser, picks the one the OS
// theme matches and fetches it, and then the img takes the stored theme's art, so a stored theme that differs from the OS
// fetched both heroes in Safari (28.11 on production, 5 direction pages and /napryamky: +52…185 KB at 390, +177…328 KB at
// 1440; Chromium one). A stored theme is therefore also a cookie (app/lib/theme.ts), and the Worker writes the same media
// into the HTML on its way out (worker/hero-theme-sources.ts), so the scanner already reads the stored theme's media. It
// keeps each source's own media in data-dark, which the script reads first: a cookie that disagrees with the storage (set
// in another browser profile, say) still ends with the stored theme's art.

export const DARK_MEDIA = '(prefers-color-scheme: dark)';

/** Narrows a media query to the OS dark theme, for the blue-hour twin of a daylight source. */
export function darkMedia(media?: string) {
  return media ? `${media} and ${DARK_MEDIA}` : DARK_MEDIA;
}

export type StoredTheme = 'light' | 'dark';

/** The media a dark source takes under a stored theme. Stored Dark: the OS condition goes (or it matches everything);
 * stored Light: it matches nothing. The Worker and HERO_THEME_SCRIPT both apply this rule; a unit test holds them equal. */
export function storedThemeMedia(theme: StoredTheme, media: string) {
  if (theme === 'light') return 'not all';
  return media.replace(` and ${DARK_MEDIA}`, '').replace(DARK_MEDIA, 'all');
}

// The same rule, inline in each System <picture>. A source the Worker has already pointed carries its own media in data-dark.
export const HERO_THEME_SCRIPT = `(function(s){var p=document.documentElement.dataset.themePreference;if(p!=='light'&&p!=='dark')return;var q=s.parentNode.querySelectorAll('source[data-dark]');for(var i=0;i<q.length;i++){var m=q[i].getAttribute('data-dark')||q[i].getAttribute('media')||'';q[i].setAttribute('media',p==='light'?'not all':(m.replace(' and ${DARK_MEDIA}','').replace('${DARK_MEDIA}','all')))}})(document.currentScript)`;
