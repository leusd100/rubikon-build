import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://rubicon-build.bronze-spoon-6603.chatgpt.site',
      lastModified: new Date('2026-08-22'),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
