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
/** An FAQ answer the Delivery Model writes: the data keeps the visitor's question, the server fills in the text. */
/** turnkey: written from the formats; design / materials: the frozen statements of the same name, verbatim */
export type DeliveryModelFaqAnswer = { readonly deliveryModelAnswer: 'turnkey' | 'design' | 'materials' };
export type DirectionFaqItem = readonly [string, string | DeliveryModelFaqAnswer];

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
     * The lead on a phone (≤760 px), built from the intro's own sentences: the full intro there pushed the hero's call
     * below the first screen. The full intro stays on wider screens and in the page's structured data.
     */
    introPhone?: string;
    /** A phone-only line under the hero's actions — for a boundary the shorter lead moved out of the way. */
    notePhone?: string;
    /**
     * Replaces the single «Обговорити задачу ↗» link — for a page whose hero leads into its own
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
  related?: {
    compact?: boolean;
    items?: readonly RelatedDirection[];
    /**
     * 'after-inquiry': the related directions close the page after #inquiry instead of leading into it — for a page
     * whose related works are its own separate stages (/angary, owner 03.10). Other pages keep them before the form.
     */
    placement?: 'after-inquiry';
    /** The band's own heading in place of «Суміжні роботи» / «Пов’язані напрямки», with a supporting line */
    eyebrow?: string;
    title?: string;
    text?: string;
  };
  /** Leaves «Що буде після звернення» out of the page's #inquiry (the page tells the route itself) */
  hideJourney?: boolean;
  /** Optional for a page whose own editorial architecture replaces the overview band. */
  overview?: DirectionOverview;
  /** Roofing: the three situations people call with, each with its first step (UX pass 2026-10). Words only from the
   *  page's own overview, process and FAQ. */
  entry?: {
    eyebrow: string;
    title: string;
    text: string;
    items: readonly { situation: string; text: string; start: string }[];
  };
  editorial: {
    eyebrow: string;
    title: string;
    text: string;
    /** Work points listed under the text, in the copy column. */
    points?: readonly DirectionItem[];
    image: string;
    imageAlt: string;
    /**
     * «Вузол напряму»: the editorial picture as a three-step tour of one node — each step brackets its place on the
     * picture and the camera pushes in on it (DirectionNode). Steps only name what the page's own text already lists.
     */
    node?: DirectionNode;
  };
  process: {
    eyebrow?: string;
    title: string;
    text: string;
    steps: readonly DirectionStep[];
    /** A contextual explanation of this direction's scope, stages or estimate on the process page. */
    link?: { href: string; label: string };
    /**
     * «Ви · Ми» (owner, 06.10): each step's two sides — what you do over the rail, what RUBIKON does under it (the step's
     * own text) — and on the rail what you get, drawn small (ProcessDrawing) with its caption. Index-aligned with steps.
     */
    split?: readonly ProcessSplit[];
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
    /** The closing block's heading: short, two lines at most on a desktop. */
    title: string;
    /** The page's own question under it. */
    lead: string;
  };
};

export type ProcessDrawingKind =
  | 'grain-brief' | 'checklist' | 'grain-project' | 'grain-built'
  | 'metal-data' | 'metal-project' | 'metal-fabricated' | 'metal-erected'
  | 'concrete-levels' | 'concrete-formwork' | 'concrete-pour' | 'concrete-check'
  | 'roof-survey' | 'roof-kit' | 'roof-laid' | 'roof-checked'
  | 'hangar-brief' | 'contract' | 'hangar-built'
  | 'review' | 'handover';

/** A process step's other side and its outcome: what the client does, what they get after it, and its small drawing */
export type ProcessSplit = { you: string; result: string; drawing: ProcessDrawingKind };

/** One step of a direction's node tour: what it is, what the camera shows, and where on the picture. */
export type DirectionNodeStep = {
  title: string;
  text: string;
  /** Names what the camera shows, in the title block */
  caption: string;
  /** Picture pixels the camera centres on, and how far it pushes in */
  focus: readonly [number, number];
  zoom: number;
  /** The step's mark: an SVG path in picture pixels (drawn with pathLength 1) and where its number sits */
  mark: { d: string; badge: readonly [number, number] };
};

export type DirectionNode = {
  /** A technical drawing instead of the picture (NodeDrawing): vector, so the push-in stays sharp */
  drawing?: 'steel-joint' | 'footing' | 'eave' | 'grain-store';
  /** The picture's (or the drawing's) own size — the marks are drawn in it */
  width: number;
  height: number;
  /** What the overview (no step) shows, in the title block */
  overviewCaption: string;
  /** The drawing's key under the sheet, where its line types say who does what (the grain store: copper and long dash) */
  legend?: readonly { tone: 'own' | 'partner'; label: string }[];
  /** Three steps; the grain store's building part takes four (its four work points) */
  steps: readonly DirectionNodeStep[];
};
