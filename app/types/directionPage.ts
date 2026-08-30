import type { LucideIcon } from 'lucide-react';
import type { DirectionId } from '../data/directions';

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

export type DirectionPageConfig = {
  id: DirectionId;
  hero: {
    breadcrumbLabel: string;
    title: string;
    accent: string;
    intro: string;
    video: string;
  };
  overview: DirectionOverview;
  editorial: {
    eyebrow: string;
    title: string;
    text: string;
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
  };
  cta: {
    eyebrow: string;
    title: string;
  };
};
