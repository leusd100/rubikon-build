import type { MetadataRoute } from 'next';

const liveUrl = 'https://rubikonbuild.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/logo-variants',
    },
    sitemap: `${liveUrl}/sitemap.xml`,
    host: liveUrl,
  };
}
