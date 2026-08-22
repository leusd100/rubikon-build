import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://rubicon-build.bronze-spoon-6603.chatgpt.site';
  const lastModified = new Date('2026-08-22');

  return [
    { url: baseUrl, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${baseUrl}/napryamky`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/metalokonstruktsii`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/angary`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/pro-nas`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
  ];
}
