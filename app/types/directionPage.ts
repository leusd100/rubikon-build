import type { LucideIcon } from 'lucide-react';
import type { DirectionId } from '../data/directions';

export type DirectionItem = readonly [string, string, string];
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
