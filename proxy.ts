import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildContentSecurityPolicy } from './app/lib/security/csp';

const isDevelopment = process.env.NODE_ENV === 'development';

const contentSecurityPolicy = buildContentSecurityPolicy({ development: isDevelopment });

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

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
