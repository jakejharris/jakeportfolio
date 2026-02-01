import PageLayout from '@/app/components/PageLayout';
import TransitionLink from '@/app/components/TransitionLink';
import { sanityFetch } from '@/app/lib/sanity.client';
import { PostSummary, Tag } from '@/app/types/sanity';
import { Eye } from 'lucide-react';
import { TagBadge } from '@/app/components/blog/TagBadge';
import ScrollToTop from '@/app/components/ScrollToTop';
import { siteConfig } from '@/app/lib/site.config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | Jake Harris',
  description: 'Articles and insights about web development, AI, and building digital experiences.',
  alternates: {
    canonical: `${siteConfig.url}/blog`,
  },
  openGraph: {
    title: 'Blog | Jake Harris',
    description: 'Articles and insights about web development, AI, and building digital experiences.',
    type: 'website',
    url: `${siteConfig.url}/blog`,
  },
};

// Query to fetch featured posts
const featuredPostsQuery = `*[_type == "post" && featured == true] | order(publishedAt desc) [0...3] {
  _id,
  title,
  slug,
  publishedAt,
  viewCount,
  featured,
  excerpt,
  "tags": tags[]->{ _id, title, slug, color }
}`;

// Query to fetch recent posts (excluding featured)
const recentPostsQuery = `*[_type == "post"] | order(publishedAt desc) [0...10] {
  _id,
  title,
  slug,
  publishedAt,
  viewCount,
  featured,
  excerpt,
  "tags": tags[]->{ _id, title, slug, color }
}`;

// Query to fetch all tags with post counts
const tagsQuery = `*[_type == "tag"] | order(title asc) {
  _id,
  title,
  slug,
  color,
  "postCount": count(*[_type == "post" && references(^._id)])
}`;

interface TagWithCount extends Tag {
  postCount: number;
}

export default async function BlogPage() {
  // Fetch data in parallel
  const [featuredPosts, recentPosts, tags] = await Promise.all([
    sanityFetch<PostSummary[]>({
      query: featuredPostsQuery,
      tags: ['post'],
    }),
    sanityFetch<PostSummary[]>({
      query: recentPostsQuery,
      tags: ['post'],
    }),
    sanityFetch<TagWithCount[]>({
      query: tagsQuery,
      tags: ['tag'],
    }),
  ]);

  // Filter out featured posts from recent posts to avoid duplicates
  const featuredIds = new Set(featuredPosts.map(p => p._id));
  const nonFeaturedPosts = recentPosts.filter(p => !featuredIds.has(p._id));

  return (
    <PageLayout>
      <ScrollToTop />
      <div className="max-w-none">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Blog</h1>
        <p className="text-muted-foreground mb-8">
          Articles and insights about web development, AI, and building digital experiences.
        </p>

        {/* Tag Cloud */}
        {tags.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Browse by topic</h2>
            <div className="flex flex-wrap gap-2">
              {tags.filter(tag => tag.postCount > 0).map(tag => (
                <TagBadge key={tag._id} tag={tag} size="md" />
              ))}
            </div>
          </div>
        )}

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-4">Featured</h2>
            <ul className="space-y-2">
              {featuredPosts.map(post => (
                <li key={post._id}>
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Recent Posts */}
        <section>
          <h2 className="text-lg font-semibold mb-4">
            {featuredPosts.length > 0 ? 'Recent Posts' : 'All Posts'}
          </h2>
          <ul className="space-y-2">
            {nonFeaturedPosts.map(post => (
              <li key={post._id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageLayout>
  );
}

function PostCard({ post }: { post: PostSummary }) {
  return (
    <TransitionLink
      href={`/posts/${post.slug.current}#`}
      className={`pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group ${post.featured ? 'pinnedLinkBorder' : ''}`}
      aria-label={`View ${post.title}`}
      scroll={true}
    >
      <div className="flex items-center gap-3">
        <div>
          <div className="text-primary text-sm md:text-base font-medium mb-1 leading-tight flex items-center gap-1">
            {post.title}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm text-muted-foreground">
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
              })}
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-1">
                {post.tags.map(tag => (
                  <span
                    key={tag._id}
                    className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                  >
                    {tag.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="ms-4 text-sm text-muted-foreground whitespace-nowrap flex items-center gap-1">
        {post.viewCount} <Eye className="h-4 w-4" />
      </div>
    </TransitionLink>
  );
}
