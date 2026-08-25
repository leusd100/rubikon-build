import type { MetadataRoute } from 'next';
import { siteUrl } from './lib/seo';

const lastModified = new Date('2026-08-23');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${siteUrl}/napryamky`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${siteUrl}/metalokonstruktsii`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${siteUrl}/angary`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${siteUrl}/zernoskhovyshcha`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${siteUrl}/betonni-roboty`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/pokrivelni-roboty`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/pro-nas`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/polityka-konfidentsiinosti`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
