import type { MetadataRoute } from 'next';

const liveUrl = 'https://rubicon-build.bronze-spoon-6603.chatgpt.site';

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
