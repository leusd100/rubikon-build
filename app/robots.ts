import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://rubicon-build.bronze-spoon-6603.chatgpt.site/sitemap.xml',
  };
}
