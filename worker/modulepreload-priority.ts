// The page's module preloads at low priority (DebugBear Experiment 92313150, 23.11.2026, HOME on its Mobile profile, 5 + 5
// runs): React and vinext write ~50 `<link rel="modulepreload">` into the head at the default (high) priority, and on
// 1.6 Mbit/s their chunks (200–280 KB transferred before the first paint, DebugBear 22.11) share the line with the
// render-blocking CSS, the fonts and the hero photo. At low priority the browser still finds every chunk at once but lets
// those go first: FCP −1.3 s, LCP −1.9 s, TTI −0.3 s. ReactDOM.preloadModule takes no fetchPriority, so the attribute is added
// to the HTML on its way out; React's own bootstrap link already carries one and does not match.
//
// A byte-level rewrite in one stream stage rather than HTMLRewriter or a decode/encode round trip: `vinext start` runs this
// Worker in Node (e2e, the perf lab), which has no HTMLRewriter, and the text streams cost ~7–14 ms CPU per page there (review
// 23.11) and would re-encode bytes (a BOM, invalid UTF-8). The match is ASCII and UTF-8 never repeats an ASCII byte inside
// a multi-byte letter, so bytes are matched as they are; only a possible start of a match is held back between chunks.

import { NOTHING, join, matchesAt } from './bytes';

const encoder = new TextEncoder();
const PRELOAD = encoder.encode('<link rel="modulepreload" href="');
/** Where the attribute goes: right after `rel="modulepreload"` */
const AFTER_REL = '<link rel="modulepreload"'.length;
const LOW_PRIORITY = encoder.encode(' fetchpriority="low"');
const OPEN = PRELOAD[0];

/** Rewrites every module preload in a byte stream of HTML, also when a chunk boundary splits one */
export function lowPriorityModulePreloadStream(): TransformStream<Uint8Array, Uint8Array> {
  let pending = NOTHING;
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const bytes = pending.length ? join([pending, chunk]) : chunk;
      const parts: Uint8Array[] = [];
      let from = 0;
      pending = NOTHING;
      for (let at = bytes.indexOf(OPEN); at !== -1; at = bytes.indexOf(OPEN, at + 1)) {
        const left = bytes.length - at;
        if (left < PRELOAD.length) {
          // a possible start of a preload cut off by the chunk's end waits for the next chunk
          if (matchesAt(bytes, at, PRELOAD, left)) { pending = bytes.slice(at); break; }
          continue;
        }
        if (!matchesAt(bytes, at, PRELOAD, PRELOAD.length)) continue;
        parts.push(bytes.subarray(from, at + AFTER_REL), LOW_PRIORITY);
        from = at + AFTER_REL;
        at += PRELOAD.length - 1;
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

/** The HTML response with its module preloads at low priority; any other response as it was */
export function withLowPriorityModulePreloads(response: Response) {
  const type = response.headers.get('Content-Type') ?? '';
  if (!response.body || !type.toLowerCase().startsWith('text/html')) return response;

  const headers = new Headers(response.headers);
  // the body grows by the attributes it gains
  headers.delete('Content-Length');

  return new Response(response.body.pipeThrough(lowPriorityModulePreloadStream()), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
