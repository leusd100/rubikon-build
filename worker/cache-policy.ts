export const IMMUTABLE_CACHE_CONTROL =
  'public, max-age=31536000, immutable';

const RESPONSIVE_MEDIA_PATH =
  /^\/media-responsive\/[^/]+\.[0-9a-f]{8}\.webp$/;

export function isImmutableAssetPathname(pathname: string) {
  return (
    pathname.startsWith('/_next/static/') ||
    RESPONSIVE_MEDIA_PATH.test(pathname)
  );
}

export function withImmutableCacheControl(response: Response) {
  if (!response.ok && response.status !== 304) return response;

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', IMMUTABLE_CACHE_CONTROL);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
