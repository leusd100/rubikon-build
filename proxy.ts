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

/**
 * Internal prototypes — the planner composition, the configurator's and the logo's review surfaces, the 3D spike — answer
 * 404 on the production domain. They carry noindex there, but robots.txt keeps crawlers from ever reading it, and
 * /planner-preview still shows an option the business has not settled (owner 24.10: OD-PX-33 (a); X-01 · PDO-29).
 * Locally, in the tests and on the preview builds they open as before.
 */
const PRODUCTION_HOST = 'rubikonbuild.com';
const PRODUCTION_HIDDEN = ['/planner-preview', '/configurator-preview', '/logo-variants', '/r3f-spike'] as const;
/** No route answers here, so a rewrite to it renders the site's own not-found page with its 404 */
const HIDDEN_TARGET = '/_hidden-prototype';

const hiddenOnProduction = ({ hostname, pathname }: URL) =>
  hostname === PRODUCTION_HOST && PRODUCTION_HIDDEN.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export function proxy(request: NextRequest) {
  if (request.nextUrl.hostname === 'www.rubikonbuild.com') {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = 'https:';
    canonicalUrl.hostname = 'rubikonbuild.com';
    canonicalUrl.port = '';

    return NextResponse.redirect(canonicalUrl, 308);
  }

  const response = hiddenOnProduction(request.nextUrl)
    ? NextResponse.rewrite(new URL(HIDDEN_TARGET, request.url))
    : NextResponse.next();

  for (const [key, value] of Object.entries(responseHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
