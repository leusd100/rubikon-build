import type { NextConfig } from 'next';


// Content-Security-Policy is not set here: proxy.ts sends the one policy from app/lib/security/csp.ts.
const securityHeaders = [
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
