/**
 * Type definitions for Sanity content
 */

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
  excerpt?: string;
  tags?: Tag[];
}

// Full post interface with content
export interface Post extends PostSummary {
  content?: any; // Using 'any' for Portable Text content
  mainImage?: any; // Main image for the post detail page
  externalLinks?: ExternalLink[];
  seo?: SEO;
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
  shareImage?: any;
} 