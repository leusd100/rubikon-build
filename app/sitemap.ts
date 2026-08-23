import type { MetadataRoute } from 'next';

const liveUrl = 'https://rubikonbuild.com';
const lastModified = new Date('2026-08-23');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: liveUrl, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${liveUrl}/napryamky`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${liveUrl}/metalokonstruktsii`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${liveUrl}/angary`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${liveUrl}/zernoskhovyshcha`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${liveUrl}/betonni-roboty`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${liveUrl}/pokrivelni-roboty`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${liveUrl}/pro-nas`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${liveUrl}/polityka-konfidentsiinosti`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
