import type { Metadata } from 'next';
import { company } from '../data/company';

export const siteUrl = company.siteUrl;
export const siteName = company.name;

type PageMetadataInput = {
  path: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

export function createPageMetadata({
  path,
  title,
  description,
  image,
  imageAlt,
}: PageMetadataInput): Metadata {
  const pageUrl = new URL(path, siteUrl).toString();
  const imageUrl = new URL(image, siteUrl).toString();

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'uk_UA',
      siteName,
      url: pageUrl,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}
