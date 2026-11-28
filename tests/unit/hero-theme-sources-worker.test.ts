import { describe, expect, it } from 'vitest';
import { heroThemeSourcesStream, storedThemeOf, withHeroThemeSources } from '../../worker/hero-theme-sources';
import { darkMedia, storedThemeMedia } from '../../app/lib/heroThemeSources';

// The Worker points the server's System hero sources at the theme the cookie stores (worker/hero-theme-sources.ts), so
// WebKit's preload scanner reads the stored theme's media: every dark source, wherever the stream happens to be cut,
// byte for byte nothing else.
const PHONE = '(max-width: 440px)';
const SOURCE = (media: string, srcSet: string) => `<source data-dark="" media="${media}" type="image/avif" srcSet="${srcSet}"/>`;
const POINTED = (theme: 'light' | 'dark', media: string, srcSet: string) =>
  `<source data-dark="${media}" media="${storedThemeMedia(theme, media)}" type="image/avif" srcSet="${srcSet}"/>`;
const DAY = `<source media="${PHONE}" type="image/avif" srcSet="/day-784w.avif"/><source type="image/avif" srcSet="/day-1536w.avif 1536w"/>`;
const PAGE = `<!DOCTYPE html><html><head></head><body><picture>${SOURCE(darkMedia(PHONE), '/dark-784w.avif')}`
  + `${SOURCE(darkMedia(), '/dark-1536w.avif 1536w')}${DAY}<img alt=""/></picture><p>«Темна» &lt;source data-dark</p></body></html>`;
const expected = (theme: 'light' | 'dark') => PAGE
  .replace(SOURCE(darkMedia(PHONE), '/dark-784w.avif'), POINTED(theme, darkMedia(PHONE), '/dark-784w.avif'))
  .replace(SOURCE(darkMedia(), '/dark-1536w.avif 1536w'), POINTED(theme, darkMedia(), '/dark-1536w.avif 1536w'));
const bytes = (text: string) => new TextEncoder().encode(text);
const text = (data: Uint8Array) => new TextDecoder().decode(data);

async function through(theme: 'light' | 'dark', chunks: Uint8Array[]) {
  const source = new ReadableStream<Uint8Array>({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } });
  const parts: Uint8Array[] = [];
  const reader = source.pipeThrough(heroThemeSourcesStream(theme)).getReader();
  for (let read = await reader.read(); !read.done; read = await reader.read()) parts.push(read.value);
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  parts.reduce((at, part) => { out.set(part, at); return at + part.length; }, 0);
  return out;
}

const html = (body: string) => new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': String(bytes(body).length) } });
const request = (cookie?: string) => new Request('https://rubikonbuild.com/angary', cookie ? { headers: { Cookie: cookie } } : {});

describe('hero sources pointed at the stored theme', () => {
  it('a stored Dark drops the OS condition, a stored Light switches the dark sources off; each keeps its own media', async () => {
    expect(text(await through('dark', [bytes(PAGE)]))).toBe(expected('dark'));
    expect(text(await through('dark', [bytes(PAGE)]))).toContain(`data-dark="${darkMedia(PHONE)}" media="${PHONE}"`);
    expect(text(await through('dark', [bytes(PAGE)]))).toContain(`data-dark="${darkMedia()}" media="all"`);
    expect(text(await through('light', [bytes(PAGE)]))).toBe(expected('light'));
    expect(text(await through('light', [bytes(PAGE)]))).not.toMatch(/data-dark="[^"]*" media="\([^"]*dark/);
  });

  it('finds a source that a chunk boundary cuts, at every byte, and in one-byte chunks', async () => {
    const page = bytes(PAGE);
    for (const theme of ['light', 'dark'] as const) {
      for (let cut = 1; cut < page.length; cut += 1) {
        expect(text(await through(theme, [page.slice(0, cut), page.slice(cut)])), `${theme}, cut at byte ${cut}`).toBe(expected(theme));
      }
      expect(text(await through(theme, [...page].map((byte) => Uint8Array.of(byte)))), theme).toBe(expected(theme));
    }
  });

  it('changes no other byte: a BOM, an invalid sequence, a source cut off at the end and a media with no closing quote', async () => {
    const odd = Uint8Array.of(0xef, 0xbb, 0xbf, 0xff, ...bytes(SOURCE(darkMedia(), '/d.avif')), ...bytes('<source data-dark="" med'));
    const out = await through('light', [odd.slice(0, 7), odd.slice(7)]);
    expect([...out]).toEqual([0xef, 0xbb, 0xbf, 0xff, ...bytes(POINTED('light', darkMedia(), '/d.avif')), ...bytes('<source data-dark="" med')]);
    const unclosed = `<source data-dark="" media="${'x'.repeat(600)}`;
    expect(text(await through('dark', [bytes(unclosed), bytes(' tail')]))).toBe(`${unclosed} tail`);
  });

  it('passes the stream on as it comes, holding back no more than a source whose media is still coming', async () => {
    const stream = heroThemeSourcesStream('dark');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    void writer.write(bytes('<p>head</p><source data-dark="" media="(prefers'));
    expect(text((await reader.read()).value!)).toBe('<p>head</p>');
    void writer.write(bytes('-color-scheme: dark)" srcSet="/d.avif"/>'));
    expect(text((await reader.read()).value!)).toBe('<source data-dark="(prefers-color-scheme: dark)" media="all" srcSet="/d.avif"/>');
    void writer.close();
    expect((await reader.read()).done).toBe(true);
  });
});

describe('the stored theme of a request', () => {
  it('is the cookie\'s light or dark; anything else is System', () => {
    expect(storedThemeOf(request('rubikon-theme=dark'))).toBe('dark');
    expect(storedThemeOf(request('a=1; rubikon-theme=light; b=2'))).toBe('light');
    for (const cookie of [undefined, '', 'rubikon-theme=system', 'rubikon-theme=darker', 'old-rubikon-theme=dark', 'rubikon-theme=']) {
      expect(storedThemeOf(request(cookie)), String(cookie)).toBeNull();
    }
  });

  it('rewrites the HTML only for a stored theme, and leaves any other response as it was', async () => {
    const none = html(PAGE);
    expect(withHeroThemeSources(request(), none)).toBe(none);
    const json = new Response(PAGE, { headers: { 'Content-Type': 'application/json' } });
    expect(withHeroThemeSources(request('rubikon-theme=dark'), json)).toBe(json);
    const rewritten = withHeroThemeSources(request('rubikon-theme=dark'), html(PAGE));
    expect(rewritten.headers.get('Content-Length')).toBeNull();
    expect(rewritten.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(await rewritten.text()).toBe(expected('dark'));
  });
});
