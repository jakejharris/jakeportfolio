/**
 * Type definitions for Sanity content
 */

import { PortableTextBlock } from '@portabletext/types';
import { SanityImageSource } from './sanity-image';

// Base interface for Sanity documents
export interface SanityDocument {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  _rev: string;
}

// Slug type
export interface Slug {
  current: string;
}

// Tag interface
export interface Tag extends SanityDocument {
  title: string;
  slug: Slug;
  description?: string;
  color?: string;
}

// Post interface for list views
export interface PostSummary extends SanityDocument {
  title: string;
  slug: Slug;
  publishedAt: string;
  viewCount?: number;
  viewCountBase?: number;
  viewsCutoverAt?: string;
  featured?: boolean;
  excerpt?: string;
  tags?: Tag[];
}

// Full post interface with content
export interface Post extends PostSummary {
  content?: PortableTextBlock[]; // Using PortableTextBlock for Portable Text content
  mainImage?: SanityImageSource; // Main image using proper image type
  externalLinks?: ExternalLink[];
  seo?: SEO;
}

// Interactive component block embedded in portable text
export interface InteractiveComponentValue {
  _type: 'interactiveComponent';
  _key: string;
  componentName: string;
  caption?: string;
}

// External link interface
export interface ExternalLink {
  title: string;
  url: string;
  icon: string;
}

// SEO metadata interface
export interface SEO {
  metaTitle?: string;
  metaDescription?: string;
  shareImage?: SanityImageSource; // Share image using proper image type
}

// Figure blocks a post can place between paragraphs. Each carries its own
// data, so any post can reuse them. Shared fields first.
interface PostFigureBase {
  _key: string;
  /** Monospace title, top left of the card. */
  title?: string;
  /** Unit or context, top right of the card. */
  label?: string;
  /** Caption below the card. */
  caption?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  /** Plain text after the linked source title, e.g. what was tested. */
  sourceDetail?: string;
}

export interface TimelineEvent {
  _key: string;
  /** 24-hour clock, "HH:MM". */
  start: string;
  /** For a span; later than start on the same day. */
  end?: string;
  /** One of the timeline's lanes. */
  lane: string;
  text: string;
  /** Overrides the time shown, e.g. "all afternoon". */
  timeLabel?: string;
}

export interface TimelineGap {
  _key: string;
  start: string;
  end: string;
  label: string;
}

export interface TimelineValue extends PostFigureBase {
  _type: 'timeline';
  /** One to three lane names, e.g. ["Kitchen", "Dining room"]. */
  lanes: string[];
  events: TimelineEvent[];
  gaps?: TimelineGap[];
}

export interface StatItem {
  _key: string;
  /** The big figure, e.g. "40" or "2.5". */
  value: string;
  /** Short word after the figure, e.g. "boats". */
  unit?: string;
  /** Short, in Title Case. */
  label: string;
  /** A sentence that explains the number. */
  detail?: string;
  note?: string;
  sourceTitle?: string;
  sourceUrl?: string;
}

export interface StatGridValue extends PostFigureBase {
  _type: 'statGrid';
  stats: StatItem[];
}

export interface StudyCard {
  _key: string;
  era?: 'then' | 'now';
  /** "1998" or "June 2024". */
  date: string;
  authors?: string;
  studyTitle: string;
  venue?: string;
  url?: string;
  stat?: string;
  statLabel?: string;
  finding: string;
  quote?: string;
  note?: string;
}

/** Each card carries its own source, so the block has none. */
export interface StudyCardsValue extends Omit<PostFigureBase, 'sourceTitle' | 'sourceUrl' | 'sourceDetail'> {
  _type: 'studyCards';
  cards: StudyCard[];
}

export interface OverlapGridValue extends PostFigureBase {
  _type: 'overlapGrid';
  /** Marks the numbers as made up to show an idea, not measured. */
  illustration?: boolean;
  /** Questions in each grid; 100 draws ten by ten. */
  total: number;
  aName: string;
  aMisses: number;
  bName: string;
  bMisses: number;
  /** Misses both have in common. */
  shared: number;
  /** Label for the third grid, what neither catches. */
  bothLabel?: string;
}

export interface BeforeAfterRow {
  _key: string;
  label: string;
  before: number;
  after: number;
}

export interface BeforeAfterValue extends PostFigureBase {
  _type: 'beforeAfter';
  beforeLabel?: string;
  afterLabel?: string;
  /** Appended to every value, e.g. "%". */
  valueSuffix?: string;
  scaleMin?: number;
  scaleMax?: number;
  rows: BeforeAfterRow[];
  /** A second line under the source, e.g. a related study. */
  note?: string;
  noteSourceTitle?: string;
  noteSourceUrl?: string;
}

export type PostFigureValue =
  | TimelineValue
  | StatGridValue
  | StudyCardsValue
  | OverlapGridValue
  | BeforeAfterValue;
