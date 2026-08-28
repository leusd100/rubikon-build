import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
  "media-src 'self'",
  "font-src 'self' data:",
  `connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com${isDevelopment ? ' ws: http://localhost:*' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(!isDevelopment ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const cacheHeader = {
  key: 'Cache-Control',
  value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
};

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      ...['/', '/napryamky', '/metalokonstruktsii', '/angary', '/zernoskhovyshcha', '/betonni-roboty', '/pokrivelni-roboty', '/pro-nas', '/polityka-konfidentsiinosti'].map((source) => ({
        source,
        headers: [cacheHeader],
      })),
    ];
  },
};

export default nextConfig;
