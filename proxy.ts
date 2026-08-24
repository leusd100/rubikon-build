import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://*.google-analytics.com",
  "media-src 'self'",
  "font-src 'self' data:",
  "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ');

const responseHeaders = {
  'Content-Security-Policy': contentSecurityPolicy,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function proxy(request: NextRequest) {
  if (request.nextUrl.hostname === 'www.rubikonbuild.com') {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = 'https:';
    canonicalUrl.hostname = 'rubikonbuild.com';
    canonicalUrl.port = '';

    return NextResponse.redirect(canonicalUrl, 308);
  }

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(responseHeaders)) {
    response.headers.set(key, value);
  }

  if (request.headers.get('accept')?.includes('text/html')) {
    response.headers.set(
      'Cache-Control',
      'no-store, max-age=0, must-revalidate',
    );
    response.headers.set('CDN-Cache-Control', 'no-store');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
