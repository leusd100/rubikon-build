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
  socialTitle?: string;
  socialDescription?: string;
};

export function createPageMetadata({
  path,
  title,
  description,
  image,
  imageAlt,
  socialTitle = title,
  socialDescription = description,
}: PageMetadataInput): Metadata {
  const pageUrl = new URL(path, siteUrl).toString();
  const imageUrl = new URL(image, siteUrl).toString();

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      type: 'website',
      locale: 'uk_UA',
      siteName,
      url: pageUrl,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description: socialDescription,
      images: [imageUrl],
    },
  };
}

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}
