import { describe, expect, it, vi } from 'vitest';
import { withVideoByteRange } from '../../worker/video-range';

const source = Uint8Array.from({ length: 10 }, (_, i) => i);
function asset(headers: HeadersInit = {}) {
  // Deliberately omit Content-Length, as the local Cloudflare ASSETS binding does.
  return new Response(source, { headers: { 'Content-Type': 'video/mp4', ETag: '"video-v1"', ...headers } });
}
function request(range?: string, headers: HeadersInit = {}, method = 'GET') {
  return new Request('https://example.test/media/test.mp4', { method, headers: { ...(range ? { Range: range } : {}), ...headers } });
}
async function body(response: Response) {
  return [...new Uint8Array(await response.arrayBuffer())];
}

describe('video byte-range delivery', () => {
  it.each([
    ['bytes=0-1', [0, 1], 'bytes 0-1/10'],
    ['bytes=3-5', [3, 4, 5], 'bytes 3-5/10'],
    ['bytes=8-', [8, 9], 'bytes 8-9/10'],
    ['bytes=-3', [7, 8, 9], 'bytes 7-9/10'],
    ['bytes=8-999999999999999999999', [8, 9], 'bytes 8-9/10'],
    ['bytes=-999999999999999999999', [...source], 'bytes 0-9/10'],
  ])('serves %s with exact bytes and headers', async (range, expected, contentRange) => {
    const response = await withVideoByteRange(request(range), asset(), source.length);
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe(contentRange);
    expect(response.headers.get('Content-Length')).toBe(String(expected.length));
    expect(response.headers.get('Accept-Ranges')).toBe('bytes');
    expect(response.headers.get('Content-Type')).toBe('video/mp4');
    expect(response.headers.get('ETag')).toBe('"video-v1"');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=604800');
    expect(await body(response)).toEqual(expected);
  });

  it.each(['bytes=10-', 'bytes=20-30', 'bytes=-0'])('returns 416 for %s', async (range) => {
    const response = await withVideoByteRange(request(range), asset(), source.length);
    expect(response.status).toBe(416);
    expect(response.headers.get('Content-Range')).toBe('bytes */10');
    expect(response.headers.get('Content-Length')).toBe('0');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await body(response)).toEqual([]);
  });

  it.each(['bytes=2-1', 'bytes=-', 'bytes=foo', 'items=0-1', 'bytes=0-1,4-5'])('ignores unsupported %s', async (range) => {
    const response = await withVideoByteRange(request(range), asset(), source.length);
    expect(response.status).toBe(200);
    expect(response.headers.has('Content-Range')).toBe(false);
    expect(await body(response)).toEqual([...source]);
  });

  it('streams ordinary GETs without consuming the asset body', async () => {
    const original = asset();
    const response = await withVideoByteRange(request(), original, source.length);
    expect(response.body).toBe(original.body);
    expect(original.bodyUsed).toBe(false);
    expect(response.headers.get('Content-Length')).toBe('10');
    expect(await body(response)).toEqual([...source]);
  });

  it('ignores Range for HEAD and returns the full length with no body', async () => {
    const response = await withVideoByteRange(request('bytes=0-1', {}, 'HEAD'), asset(), source.length);
    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
    expect(response.headers.get('Content-Length')).toBe('10');
  });

  it.each(['"video-v0"', 'W/"video-v1"', 'Fri, 09 Oct 2026 10:00:00 GMT'])('returns the full body when If-Range %s cannot validate', async (value) => {
    const response = await withVideoByteRange(request('bytes=0-1', { 'If-Range': value }), asset(), source.length);
    expect(response.status).toBe(200);
    expect(await body(response)).toEqual([...source]);
  });

  it('honors a matching strong ETag', async () => {
    const response = await withVideoByteRange(request('bytes=0-1', { 'If-Range': '"video-v1"' }), asset(), source.length);
    expect(response.status).toBe(206);
  });

  it('requires an exact Last-Modified match for a date validator', async () => {
    const modified = 'Fri, 09 Oct 2026 10:00:00 GMT';
    const matching = await withVideoByteRange(request('bytes=0-1', { 'If-Range': modified }), asset({ 'Last-Modified': modified }), source.length);
    expect(matching.status).toBe(206);
    const newer = await withVideoByteRange(request('bytes=0-1', { 'If-Range': 'Fri, 09 Oct 2026 11:00:00 GMT' }), asset({ 'Last-Modified': modified }), source.length);
    expect(newer.status).toBe(200);
  });

  it.each([206, 304, 404, 405, 500])('preserves native status %s', async (status) => {
    const original = new Response(status === 304 ? null : source, { status });
    expect(await withVideoByteRange(request('bytes=0-1'), original, source.length)).toBe(original);
  });

  it('does not process POSTs or encoded/size-mismatched representations', async () => {
    const original = asset();
    expect(await withVideoByteRange(request('bytes=0-1', {}, 'POST'), original, 10)).toBe(original);
    const encoded = asset({ 'Content-Encoding': 'gzip' });
    expect(await withVideoByteRange(request('bytes=0-1'), encoded, 10)).toBe(encoded);
    const mismatched = asset({ 'Content-Length': '11' });
    expect(await withVideoByteRange(request('bytes=0-1'), mismatched, 10)).toBe(mismatched);
  });

  it('copies a range across chunk boundaries and cancels the unread remainder', async () => {
    let index = 0;
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(source.slice(index, index + 2));
        index += 2;
      },
      cancel,
    }, { highWaterMark: 0 });
    const response = await withVideoByteRange(request('bytes=1-4'), new Response(stream), 10);
    expect(await body(response)).toEqual([1, 2, 3, 4]);
    expect(index).toBe(6);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('rejects a truncated asset instead of reporting a successful partial body', async () => {
    await expect(withVideoByteRange(request('bytes=8-9'), new Response(source.slice(0, 5)), 10)).rejects.toThrow('ended before');
  });
});
