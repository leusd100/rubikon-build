import { describe, expect, it } from 'vitest';
import { lowPriorityModulePreloadStream, withLowPriorityModulePreloads } from '../../worker/modulepreload-priority';

// The Worker lowers the page's module preloads (worker/modulepreload-priority.ts, DebugBear Experiment 92313150): every one
// React and vinext write, wherever the stream happens to be cut, byte for byte nothing else.
const PRELOAD = (href: string) => `<link rel="modulepreload" href="${href}" crossorigin=""/>`;
const LOW = (href: string) => `<link rel="modulepreload" fetchpriority="low" href="${href}" crossorigin=""/>`;
const BOOTSTRAP = '<link rel="modulepreload" fetchPriority="low" href="/_next/static/chunks/index-a.js"/>';
const PAGE = `<!DOCTYPE html><html><head>${BOOTSTRAP}${PRELOAD('/_next/static/chunks/a.js')}<link rel="stylesheet" href="/x.css"/>`
  + `${PRELOAD('/_next/static/chunks/b.js')}</head><body><p>Зателефонувати +38 068 261 42 64 — «модуль» &lt;link</p></body></html>`;
const EXPECTED = PAGE.replace(PRELOAD('/_next/static/chunks/a.js'), LOW('/_next/static/chunks/a.js'))
  .replace(PRELOAD('/_next/static/chunks/b.js'), LOW('/_next/static/chunks/b.js'));
const bytes = (text: string) => new TextEncoder().encode(text);
const text = (data: Uint8Array) => new TextDecoder().decode(data);

async function through(chunks: Uint8Array[]) {
  const source = new ReadableStream<Uint8Array>({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } });
  const parts: Uint8Array[] = [];
  const reader = source.pipeThrough(lowPriorityModulePreloadStream()).getReader();
  for (let read = await reader.read(); !read.done; read = await reader.read()) parts.push(read.value);
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  parts.reduce((at, part) => { out.set(part, at); return at + part.length; }, 0);
  return out;
}

function response(chunks: Uint8Array[], headers: HeadersInit = { 'Content-Type': 'text/html; charset=utf-8' }) {
  return new Response(new ReadableStream<Uint8Array>({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } }), { status: 200, headers });
}

describe('module preloads at low priority', () => {
  it('lowers every preload and leaves the bootstrap link and the rest of the page as they were', async () => {
    expect(text(await through([bytes(PAGE)]))).toBe(EXPECTED);
  });

  it('finds a preload that a chunk boundary cuts, at every byte, and in one-byte chunks', async () => {
    const page = bytes(PAGE);
    for (let cut = 1; cut < page.length; cut += 1) {
      expect(text(await through([page.slice(0, cut), page.slice(cut)])), `cut at byte ${cut}`).toBe(EXPECTED);
    }
    expect(text(await through([...page].map((byte) => Uint8Array.of(byte))))).toBe(EXPECTED);
  });

  it('changes no other byte: a BOM, an invalid sequence and a lone «<» at the end stay as they were', async () => {
    const odd = Uint8Array.of(0xef, 0xbb, 0xbf, 0x3c, 0xff, 0x3e, ...bytes(PRELOAD('/a.js')), 0x3c);
    const out = await through([odd.slice(0, 5), odd.slice(5)]);
    expect([...out]).toEqual([0xef, 0xbb, 0xbf, 0x3c, 0xff, 0x3e, ...bytes(LOW('/a.js')), 0x3c]);
  });

  it('passes the stream on as it comes, holding back no more than a possible start of a preload', async () => {
    const stream = lowPriorityModulePreloadStream();
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    const next = async () => text((await reader.read()).value!);
    void writer.write(bytes('<!DOCTYPE html><html><head><title>Rubikon</title>'));
    expect(await next()).toBe('<!DOCTYPE html><html><head><title>Rubikon</title>');
    void writer.write(bytes('<meta charset="utf-8"/><link rel="module'));
    expect(await next()).toBe('<meta charset="utf-8"/>');
    void writer.write(bytes('preload" href="/a.js"/><p>'));
    expect(await next()).toBe('<link rel="modulepreload" fetchpriority="low" href="/a.js"/><p>');
    void writer.close();
    expect((await reader.read()).done).toBe(true);
  });

  it('rewrites an HTML response as it streams, keeps its status and headers, and drops a length that no longer holds', async () => {
    const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': String(bytes(PAGE).length), 'X-Vinext-Cache': 'MISS' });
    headers.append('Set-Cookie', 'a=1');
    headers.append('Set-Cookie', 'b=2');
    let push!: (chunk: Uint8Array | null) => void;
    const source = new ReadableStream<Uint8Array>({ start(controller) { push = (chunk) => (chunk ? controller.enqueue(chunk) : controller.close()); } });
    const rewritten = withLowPriorityModulePreloads(new Response(source, { status: 404, headers }));
    expect(rewritten.status).toBe(404);
    expect(rewritten.headers.get('Content-Length')).toBeNull();
    expect(rewritten.headers.get('X-Vinext-Cache')).toBe('MISS');
    expect(rewritten.headers.getSetCookie()).toEqual(['a=1', 'b=2']);
    const reader = rewritten.body!.getReader();
    push(bytes('<!DOCTYPE html><head>'));
    expect(text((await reader.read()).value!)).toBe('<!DOCTYPE html><head>');
    push(bytes(PRELOAD('/a.js')));
    expect(text((await reader.read()).value!)).toBe(LOW('/a.js'));
    push(null);
    expect((await reader.read()).done).toBe(true);
  });

  it('leaves anything but HTML untouched — the RSC payload of a navigation, a script, an empty answer', async () => {
    for (const type of ['text/x-component', 'application/javascript', 'application/json']) {
      const untouched = response([bytes(PAGE)], { 'Content-Type': type });
      expect(withLowPriorityModulePreloads(untouched)).toBe(untouched);
    }
    const empty = new Response(null, { status: 304, headers: { 'Content-Type': 'text/html' } });
    expect(withLowPriorityModulePreloads(empty)).toBe(empty);
  });
});
