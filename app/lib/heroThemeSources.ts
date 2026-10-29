// One hero download per theme (MD-01). The server cannot know the visitor's theme, so the hero <picture> it renders is
// the System one: each blue-hour <source> carries DARK_MEDIA (and data-dark) before its daylight twin, and the browser
// picks one art on the first parse. A stored Light or Dark that differs from the OS would still pick the wrong art, so
// HERO_THEME_SCRIPT, inline between the sources and the <img>, runs while the <picture> is being parsed — after the
// sources exist, before the img selects one — and points the dark sources at the stored theme. THEME_INIT_SCRIPT has
// already set data-theme-preference in <head>. The client then swaps in the explicit picture, whose art is the same
// file, so no second request. Measured 29.10 (Chrome 156, 6 routes × 390 / 1440): see the handoff of this change.

export const DARK_MEDIA = '(prefers-color-scheme: dark)';

/** Narrows a media query to the OS dark theme, for the blue-hour twin of a daylight source. */
export function darkMedia(media?: string) {
  return media ? `${media} and ${DARK_MEDIA}` : DARK_MEDIA;
}

// Stored Dark: the dark sources drop the OS condition (or match everything); stored Light: they match nothing.
export const HERO_THEME_SCRIPT = `(function(s){var p=document.documentElement.dataset.themePreference;if(p!=='light'&&p!=='dark')return;var q=s.parentNode.querySelectorAll('source[data-dark]');for(var i=0;i<q.length;i++){var m=q[i].getAttribute('media')||'';q[i].setAttribute('media',p==='light'?'not all':(m.replace(' and ${DARK_MEDIA}','').replace('${DARK_MEDIA}','all')))}})(document.currentScript)`;
