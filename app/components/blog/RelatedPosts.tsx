import TransitionLink from '@/app/components/TransitionLink';
import { sanityFetch } from '@/app/lib/sanity.client';
import { PostSummary } from '@/app/types/sanity';
import { TagBadge } from './TagBadge';

interface RelatedPostsProps {
  currentPostId: string;
  tagIds: string[];
}

// Query to fetch related posts based on shared tags
const relatedPostsQuery = `*[_type == "post" && _id != $currentPostId && count((tags[]._ref)[@ in $tagIds]) > 0] | order(count((tags[]._ref)[@ in $tagIds]) desc, publishedAt desc) [0...3] {
  _id,
  title,
  slug,
  publishedAt,
  excerpt,
  "tags": tags[]->{ _id, title, slug, color }
}`;

export async function RelatedPosts({ currentPostId, tagIds }: RelatedPostsProps) {
  // If no tags, don't show related posts
  if (!tagIds || tagIds.length === 0) {
    return null;
  }

  const relatedPosts = await sanityFetch<PostSummary[]>({
    query: relatedPostsQuery,
    params: { currentPostId, tagIds },
    tags: ['post'],
  });

  // If no related posts found, don't render the section
  if (!relatedPosts || relatedPosts.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 pt-6 border-t">
      <h2 className="text-xl font-bold mb-4">Related Posts</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {relatedPosts.map(post => (
          <TransitionLink
            key={post._id}
            href={`/posts/${post.slug.current}#`}
            scroll={true}
            className="group block p-4 border rounded-lg hover:border-accent transition-colors"
          >
            <div className="mb-2">
              <h3 className="font-semibold text-sm md:text-base group-hover:text-accent-foreground transition-colors line-clamp-2">
                {post.title}
              </h3>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
              })}
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.tags.slice(0, 3).map(tag => (
                  <TagBadge key={tag._id} tag={tag} size="sm" interactive={false} />
                ))}
              </div>
            )}
          </TransitionLink>
        ))}
      </div>
    </section>
  );
}

export default RelatedPosts;
