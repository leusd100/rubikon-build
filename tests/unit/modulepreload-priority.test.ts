import { describe, expect, it } from 'vitest';
import { lowPriorityModulePreloadStream, withLowPriorityModulePreloads } from '../../worker/modulepreload-priority';

// The Worker lowers the page's module preloads (worker/modulepreload-priority.ts, DebugBear Experiment 92313150): every one
// React writes, wherever the stream happens to be cut, and nothing else.
const PRELOAD = (href: string) => `<link rel="modulepreload" href="${href}" crossorigin=""/>`;
const LOW = (href: string) => `<link rel="modulepreload" fetchpriority="low" href="${href}" crossorigin=""/>`;
const BOOTSTRAP = '<link rel="modulepreload" fetchPriority="low" href="/_next/static/chunks/index-a.js"/>';
const PAGE = `<!DOCTYPE html><html><head>${BOOTSTRAP}${PRELOAD('/_next/static/chunks/a.js')}<link rel="stylesheet" href="/x.css"/>`
  + `${PRELOAD('/_next/static/chunks/b.js')}</head><body><p>Зателефонувати +38 068 261 42 64 — «модуль»</p></body></html>`;
const EXPECTED = PAGE.replace(PRELOAD('/_next/static/chunks/a.js'), LOW('/_next/static/chunks/a.js'))
  .replace(PRELOAD('/_next/static/chunks/b.js'), LOW('/_next/static/chunks/b.js'));

async function throughText(chunks: string[]) {
  const source = new ReadableStream<string>({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } });
  let out = '';
  const reader = source.pipeThrough(lowPriorityModulePreloadStream()).getReader();
  for (let read = await reader.read(); !read.done; read = await reader.read()) out += read.value;
  return out;
}

function htmlResponse(parts: Uint8Array[], headers: Record<string, string> = { 'Content-Type': 'text/html; charset=utf-8' }) {
  return new Response(new ReadableStream<Uint8Array>({ start(controller) { for (const part of parts) controller.enqueue(part); controller.close(); } }), { status: 200, headers });
}

describe('module preloads at low priority', () => {
  it('lowers every preload React writes and leaves the bootstrap link and the rest of the page as they were', async () => {
    expect(await throughText([PAGE])).toBe(EXPECTED);
  });

  it('finds a preload that a chunk boundary cuts, at every possible cut', async () => {
    for (let cut = 1; cut < PAGE.length; cut += 1) {
      expect(await throughText([PAGE.slice(0, cut), PAGE.slice(cut)]), `cut at ${cut}`).toBe(EXPECTED);
    }
    expect(await throughText([...PAGE])).toBe(EXPECTED);
  });

  it('passes the stream on as it comes, holding back no more than a possible start of a preload', async () => {
    const stream = lowPriorityModulePreloadStream();
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    void writer.write('<!DOCTYPE html><html><head><title>Rubikon</title>');
    expect((await reader.read()).value).toBe('<!DOCTYPE html><html><head><title>Rubikon</title>');
    void writer.write('<meta charset="utf-8"/><link rel="module');
    expect((await reader.read()).value).toBe('<meta charset="utf-8"/>');
    void writer.write('preload" href="/a.js"/>');
    expect((await reader.read()).value).toBe('<link rel="modulepreload" fetchpriority="low" href="/a.js"/>');
    void writer.close();
    expect((await reader.read()).done).toBe(true);
  });

  it('rewrites an HTML response, bytes split inside a Cyrillic letter, and drops a length that no longer holds', async () => {
    const bytes = new TextEncoder().encode(PAGE);
    const cyrillic = new TextEncoder().encode(PAGE).indexOf(0xd0);
    const response = withLowPriorityModulePreloads(htmlResponse(
      [bytes.slice(0, cyrillic + 1), bytes.slice(cyrillic + 1)],
      { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': String(bytes.length), 'X-Vinext-Cache': 'MISS' },
    ));
    expect(response.headers.get('Content-Length')).toBeNull();
    expect(response.headers.get('X-Vinext-Cache')).toBe('MISS');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(EXPECTED);
  });

  it('leaves anything but HTML untouched — the RSC payload of a navigation, a script, an empty answer', async () => {
    for (const type of ['text/x-component', 'application/javascript', 'application/json']) {
      const response = htmlResponse([new TextEncoder().encode(PAGE)], { 'Content-Type': type });
      expect(withLowPriorityModulePreloads(response)).toBe(response);
    }
    const empty = new Response(null, { status: 304, headers: { 'Content-Type': 'text/html' } });
    expect(withLowPriorityModulePreloads(empty)).toBe(empty);
  });
});
