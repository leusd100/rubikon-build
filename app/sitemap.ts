import type { MetadataRoute } from 'next';
import { siteUrl } from './lib/seo';
import { directions } from './data/directions';
import { siteRoutes } from './data/navigation';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: 'monthly', priority: 1 },
    { url: `${siteUrl}${siteRoutes.directions}`, changeFrequency: 'monthly', priority: 0.9 },
    ...directions.map((direction) => ({
      url: `${siteUrl}${direction.href}`,
      changeFrequency: 'monthly' as const,
      priority: direction.id === 'betonni-roboty' || direction.id === 'pokrivelni-roboty' ? 0.8 : 0.9,
    })),
    { url: `${siteUrl}${siteRoutes.about}`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}${siteRoutes.privacy}`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
