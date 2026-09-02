import type { Metadata } from 'next';
import { createPageMetadata } from './seo';
import { directionPages } from '../data/directionPages';
import { directions, type Direction, type DirectionId } from '../data/directions';
import type { DirectionPageConfig } from '../types/directionPage';

/**
 * Lookup and metadata helpers for the five direction pages.
 *
 * These live here rather than beside the data they read so that app/data/** stays what its
 * name claims — declarative content only, no executable logic — which is the boundary the
 * coverage configuration in vitest.config.ts and sonar-project.properties now relies on.
 */

/** Resolves a direction by id. Throws on an unknown id: every caller passes a literal
 *  DirectionId, so reaching the throw means the data and the routes have drifted apart. */
export function getDirection(id: DirectionId): Direction {
  const direction = directions.find((item) => item.id === id);

  if (!direction) {
    throw new Error(`Unknown direction: ${id}`);
  }

  return direction;
}

/** Page configuration (hero, overview, process, cost, FAQ, CTA) for one direction. */
export function getDirectionPage(id: DirectionId): DirectionPageConfig {
  return directionPages[id];
}

/** Builds a direction page's Next.js metadata from that direction's own SEO fields. */
export function createDirectionMetadata(id: DirectionId): Metadata {
  const direction = getDirection(id);
  return createPageMetadata({
    path: direction.href,
    title: direction.seoTitle,
    description: direction.seoDescription,
    image: direction.image,
    imageAlt: direction.imageAlt,
  });
}
