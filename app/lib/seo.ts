import type { Metadata } from 'next';
import { company } from '../data/company';

export const siteUrl = company.siteUrl;
export const siteName = company.name;

export function brandedTitle(title: string) {
  return `${title} | ${siteName}`;
}

type BasicPageMetadataInput = {
  title: string;
  description: string;
  path?: string;
  robots?: Metadata['robots'];
};

type PageMetadataInput = {
  path: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  socialTitle?: string;
  socialDescription?: string;
};

export function createBasicPageMetadata({
  title,
  description,
  path,
  robots,
}: BasicPageMetadataInput): Metadata {
  return {
    title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    ...(robots ? { robots } : {}),
  };
}

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
    ...createBasicPageMetadata({ title, description, path }),
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
