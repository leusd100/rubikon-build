import type { MetadataRoute } from 'next';
import { siteUrl } from './lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/logo-variants', '/configurator-preview'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
