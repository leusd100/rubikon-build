import { describe, expect, it } from 'vitest';
import {
  createDirectionMetadata,
  getDirection,
  getDirectionPage,
} from '../../app/lib/directions';
import { directions, type DirectionId } from '../../app/data/directions';
import { siteUrl } from '../../app/lib/seo';

const directionIds = directions.map((direction) => direction.id);

describe('getDirection', () => {
  it.each(directionIds)('resolves %s to the matching direction record', (id) => {
    expect(getDirection(id).id).toBe(id);
  });

  it('throws a named error for an id that is not in the data', () => {
    // The routes and the data are meant to stay in sync; reaching this branch means they
    // have drifted, so the message has to say which id was missing.
    expect(() => getDirection('nonexistent' as DirectionId)).toThrowError(
      'Unknown direction: nonexistent',
    );
  });
});

describe('getDirectionPage', () => {
  it.each(directionIds)('returns the page config whose own id is %s', (id) => {
    expect(getDirectionPage(id).id).toBe(id);
  });

  it('gives every direction a hero and a CTA to render', () => {
    for (const id of directionIds) {
      const config = getDirectionPage(id);

      expect(config.hero.title.length).toBeGreaterThan(0);
      expect(config.cta.title.length).toBeGreaterThan(0);
    }
  });
});

describe('createDirectionMetadata', () => {
  it.each(directionIds)('derives %s metadata from that direction own SEO fields', (id) => {
    const direction = getDirection(id);
    const metadata = createDirectionMetadata(id);

    expect(metadata.title).toBe(direction.seoTitle);
    expect(metadata.description).toBe(direction.seoDescription);
  });

  it.each(directionIds)('points %s at its own canonical route', (id) => {
    const direction = getDirection(id);

    expect(createDirectionMetadata(id).alternates?.canonical).toBe(direction.href);
  });

  it.each(directionIds)('absolutises the %s social image and page URL', (id) => {
    const direction = getDirection(id);
    const openGraph = createDirectionMetadata(id).openGraph as
      | { url?: string; images?: Array<{ url?: string; alt?: string }> }
      | undefined;

    expect(openGraph?.url).toBe(new URL(direction.href, siteUrl).toString());
    expect(openGraph?.images?.[0]?.url).toBe(new URL(direction.image, siteUrl).toString());
    expect(openGraph?.images?.[0]?.alt).toBe(direction.imageAlt);
  });

  it('gives each direction a distinct title and description', () => {
    const titles = directionIds.map((id) => createDirectionMetadata(id).title);
    const descriptions = directionIds.map((id) => createDirectionMetadata(id).description);

    expect(new Set(titles).size).toBe(directionIds.length);
    expect(new Set(descriptions).size).toBe(directionIds.length);
  });
});
