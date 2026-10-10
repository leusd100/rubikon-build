// MP4 names are not content-hashed: keep the existing one-week media policy.
const VIDEO_CACHE_CONTROL = 'public, max-age=604800';

type ByteRange = { start: number; end: number } | 'unsatisfiable' | null;

function parseRange(value: string, length: number): ByteRange {
  // Ignore malformed/multiple ranges; serving the complete representation is
  // permitted and avoids multipart responses that our video players do not use.
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  if (!length) return 'unsatisfiable';
  if (!match[1]) {
    const suffix = Number(match[2]);
    return suffix === 0 ? 'unsatisfiable' : { start: Math.max(0, length - suffix), end: length - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : length - 1;
  if (match[2] && end < start) return null;
  if (start >= length) return 'unsatisfiable';
  return { start, end: Math.min(end, length - 1) };
}

function matchesIfRange(value: string | null, headers: Headers) {
  if (!value) return true;
  // HTTP dates require a known Last-Modified; never apply a stale byte offset.
  if (value.startsWith('"')) return value === headers.get('ETag');
  if (value.startsWith('W/')) return false;
  const modified = headers.get('Last-Modified');
  const date = Date.parse(value);
  return modified !== null && Number.isFinite(date) && Date.parse(modified) === date;
}

async function readRange(body: ReadableStream<Uint8Array>, start: number, end: number) {
  const bytes = new Uint8Array(end - start + 1);
  const reader = body.getReader();
  let offset = 0;
  let written = 0;
  try {
    while (offset <= end) {
      const { done, value } = await reader.read();
      if (done) throw new Error('Video asset ended before its build-time byte length');
      const from = Math.max(0, start - offset);
      const to = Math.min(value.byteLength, end + 1 - offset);
      if (to > from) {
        bytes.set(value.subarray(from, to), written);
        written += to - from;
      }
      offset += value.byteLength;
    }
  } finally {
    // Stop reading once the requested range is complete, including 0-1 probes.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return bytes;
}

export async function withVideoByteRange(request: Request, asset: Response, length: number): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return asset;
  // Preserve native 206, redirects, conditional 304 and error responses.
  if (asset.status !== 200 || !Number.isSafeInteger(length) || length < 0) return asset;
  if (asset.headers.has('Content-Encoding') && asset.headers.get('Content-Encoding') !== 'identity') return asset;
  const nativeLength = asset.headers.get('Content-Length');
  if (nativeLength !== null && Number(nativeLength) !== length) return asset;

  const headers = new Headers(asset.headers);
  headers.set('Cache-Control', VIDEO_CACHE_CONTROL);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(length));
  if (request.method === 'HEAD') {
    await asset.body?.cancel();
    return new Response(null, { status: 200, headers });
  }
  const value = request.headers.get('Range');
  const range = value && matchesIfRange(request.headers.get('If-Range'), headers) ? parseRange(value, length) : null;
  if (range === null || !asset.body) return new Response(asset.body, { status: 200, headers });
  if (range === 'unsatisfiable') {
    await asset.body.cancel();
    headers.set('Content-Range', `bytes */${length}`);
    headers.set('Content-Length', '0');
    headers.set('Cache-Control', 'no-store');
    return new Response(null, { status: 416, headers });
  }
  const bytes = await readRange(asset.body, range.start, range.end);
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${length}`);
  headers.set('Content-Length', String(bytes.byteLength));
  // A byte buffer gives Workers a known body length, unlike an arbitrary stream.
  // Only the requested bytes are retained; normal GET responses remain streamed.
  return new Response(bytes, { status: 206, headers });
}
