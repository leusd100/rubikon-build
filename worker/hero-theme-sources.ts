// A stored theme's hero, in Safari too (28.11.2026). The server renders the System <picture> of a hero: its blue-hour
// sources carry the OS dark query, and an inline script points them at a stored theme while the <picture> is parsed
// (app/lib/heroThemeSources.ts). WebKit's preload scanner reads the sources before that script runs and fetches the OS
// theme's art, so a stored theme that differs from the OS fetched both heroes there. A stored theme is also a cookie
// (app/lib/theme.ts), and here the HTML gets the stored theme's media on its way out, so the scanner reads that instead:
// `<source data-dark="" media="M"` becomes `<source data-dark="M" media="storedThemeMedia(M)"`. The source keeps its own
// media in data-dark, which the inline script reads first, so a cookie that disagrees with the storage still ends with
// the stored theme's art. React's hydration warning is off on those sources (their media is the script's to change).
//
// Pages are served `no-store, must-revalidate` (production, 28.11), so no cache can hand one theme's HTML to the other; the rewrite runs on the way
// out, after vinext's own per-isolate cache.
//
// A byte-level stream stage, as in modulepreload-priority.ts (Node runs this Worker under `vinext start`, so no
// HTMLRewriter); only a possible start of a source, or one whose media the chunk cuts, is held back between chunks.

import { THEME_COOKIE } from '../app/lib/theme';
import { storedThemeMedia, type StoredTheme } from '../app/lib/heroThemeSources';
import { NOTHING, join, matchesAt } from './bytes';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SOURCE = encoder.encode('<source data-dark="" media="');
const OPEN = SOURCE[0];
const QUOTE = 0x22;
/** No hero's media is near this long; a longer run without a closing quote is not one of ours and is let through */
const MAX_MEDIA = 512;
const COOKIE = new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=(light|dark)(?:;|$)`);

/** The theme a request's cookie stores, or null for System (no cookie, or a value that is neither light nor dark) */
export function storedThemeOf(request: Request): StoredTheme | null {
  const match = COOKIE.exec(request.headers.get('Cookie') ?? '');
  return match ? (match[1] as StoredTheme) : null;
}

/** Points every System hero source in a byte stream of HTML at the stored theme, also when a chunk boundary cuts one */
export function heroThemeSourcesStream(theme: StoredTheme): TransformStream<Uint8Array, Uint8Array> {
  let pending = NOTHING;
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const bytes = pending.length ? join([pending, chunk]) : chunk;
      const parts: Uint8Array[] = [];
      let from = 0;
      pending = NOTHING;
      for (let at = bytes.indexOf(OPEN); at !== -1; at = bytes.indexOf(OPEN, at + 1)) {
        const left = bytes.length - at;
        if (left < SOURCE.length) {
          if (matchesAt(bytes, at, SOURCE, left)) { pending = bytes.slice(at); break; }
          continue;
        }
        if (!matchesAt(bytes, at, SOURCE, SOURCE.length)) continue;
        const start = at + SOURCE.length;
        const end = bytes.indexOf(QUOTE, start);
        if (end === -1) {
          // the chunk cuts the media: wait for the rest, unless this cannot be a hero's media
          if (bytes.length - start <= MAX_MEDIA) { pending = bytes.slice(at); break; }
          continue;
        }
        if (end - start > MAX_MEDIA) continue;
        const media = decoder.decode(bytes.subarray(start, end));
        parts.push(bytes.subarray(from, at), encoder.encode(`<source data-dark="${media}" media="${storedThemeMedia(theme, media)}`));
        from = end;
        at = end;
      }
      const end = bytes.length - pending.length;
      if (end > from) parts.push(bytes.subarray(from, end));
      if (parts.length) controller.enqueue(join(parts));
    },
    flush(controller) {
      if (pending.length) controller.enqueue(pending);
    },
  });
}

/** The HTML response with its hero sources pointed at the theme the request's cookie stores; any other as it was */
export function withHeroThemeSources(request: Request, response: Response) {
  const theme = storedThemeOf(request);
  const type = response.headers.get('Content-Type') ?? '';
  if (!theme || !response.body || !type.toLowerCase().startsWith('text/html')) return response;

  const headers = new Headers(response.headers);
  // the body grows by the media each source keeps in data-dark
  headers.delete('Content-Length');

  return new Response(response.body.pipeThrough(heroThemeSourcesStream(theme)), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
