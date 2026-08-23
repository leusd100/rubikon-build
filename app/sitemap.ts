import type { MetadataRoute } from 'next';

const liveUrl = 'https://rubikonbuild.com';
const lastModified = new Date('2026-08-23');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: liveUrl, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${liveUrl}/napryamky`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${liveUrl}/metalokonstruktsii`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${liveUrl}/angary`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${liveUrl}/pro-nas`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
  ];
}
