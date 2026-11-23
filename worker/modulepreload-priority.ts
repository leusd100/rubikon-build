// The page's module preloads at low priority (DebugBear Experiment 92313150, 23.11.2026, HOME on its Mobile profile, 5 + 5
// runs): React writes ~50 `<link rel="modulepreload">` into the head at the default (high) priority, and on 1.6 Mbit/s their
// 200–280 KB of chunks share the line with the render-blocking CSS, the fonts and the hero photo. At low priority the browser
// still finds every chunk at once but lets those go first: FCP −1.3 s, LCP −1.9 s, TTI −0.3 s. ReactDOM.preloadModule takes no
// fetchPriority, so the attribute is added to the HTML on its way out — the bootstrap module's own link already carries one.
//
// A streaming text rewrite rather than HTMLRewriter: `vinext start` runs this Worker in Node (e2e, the perf lab), which has no
// HTMLRewriter, and the same code must run in both. The match is a fixed string, so only its length minus one characters
// are held back between chunks; the rest of the stream passes on as it arrives.

const PRELOAD = '<link rel="modulepreload" href="';
const LOW_PRIORITY_PRELOAD = '<link rel="modulepreload" fetchpriority="low" href="';

/** Rewrites every module preload in a stream of HTML text, also when a chunk boundary splits one */
export function lowPriorityModulePreloadStream(): TransformStream<string, string> {
  let pending = '';
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      const text = (pending + chunk).replaceAll(PRELOAD, LOW_PRIORITY_PRELOAD);
      // keep back what could be the start of a match cut off by the chunk's end
      let keep = Math.min(PRELOAD.length - 1, text.length);
      while (keep > 0 && !PRELOAD.startsWith(text.slice(text.length - keep))) keep -= 1;
      pending = text.slice(text.length - keep);
      const ready = text.slice(0, text.length - keep);
      if (ready) controller.enqueue(ready);
    },
    flush(controller) {
      if (pending) controller.enqueue(pending);
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
  const body = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(lowPriorityModulePreloadStream())
    .pipeThrough(new TextEncoderStream());

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
