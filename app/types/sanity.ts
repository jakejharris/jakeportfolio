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
  viewCount: number;
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