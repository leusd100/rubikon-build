import type { LucideIcon } from 'lucide-react';
import type { DirectionId } from '../data/directions';
import type { RelatedDirection } from '../data/relatedDirections';

// The 4th element is an optional trailing tuple member, not a forced 4-tuple: every existing
// 3-element item literal (across both overview.items and cost.items, every direction) stays
// valid with zero changes. Only entries that opt into an icon add it. Kept as a tuple rather
// than switching to an object shape so the ~30 existing array literals across
// data/directionPages.ts don't need a structural rewrite for an icon-only addition.
export type DirectionItem = readonly [string, string, string, LucideIcon?];
export type DirectionStep = readonly [string, string, string, LucideIcon];
export type DirectionFaqItem = readonly [string, string];

type DirectionOverview = {
  eyebrow: string;
  title: string;
  text?: string;
  items: readonly DirectionItem[];
  layout: 'features' | 'use-cases';
};

export type DirectionHeroAction = {
  label: string;
  href: string;
  className: string;
  /** ↓ for a tool further down this page, ↗ for the conversation. */
  arrow: '↓' | '↗';
};

export type DirectionPageConfig = {
  id: DirectionId;
  hero: {
    breadcrumbLabel: string;
    title: string;
    accent: string;
    intro: string;
    /**
     * Replaces the single «Обговорити проєкт ↗» link — for a page whose hero leads into its own
     * tool first. `sectionClassName` marks the hero variant the page's stylesheet targets.
     */
    actions?: {
      className: string;
      sectionClassName?: string;
      items: readonly DirectionHeroAction[];
    };
  };
  /** An extra class on <main>, for a page with a stylesheet of its own. */
  pageClassName?: string;
  /**
   * Related directions as the compact band; `items` replaces relatedDirections[id] for a page
   * composition that is not live yet, so the live page's list stays as it is.
   */
  related?: { compact?: boolean; items?: readonly RelatedDirection[] };
  /** Optional for a page whose own editorial architecture replaces the overview band. */
  overview?: DirectionOverview;
  editorial: {
    eyebrow: string;
    title: string;
    text: string;
    /** Work points listed under the text, in the copy column. */
    points?: readonly DirectionItem[];
    image: string;
    imageAlt: string;
  };
  process: {
    eyebrow?: string;
    title: string;
    text: string;
    steps: readonly DirectionStep[];
  };
  cost?: {
    title: string;
    text: string;
    items: readonly DirectionItem[];
  };
  faq?: {
    title: string;
    items: readonly DirectionFaqItem[];
    /** Answers behind <details> instead of always open. */
    collapsible?: boolean;
  };
  cta: {
    eyebrow: string;
    title: string;
  };
};
