import PageLayout from '@/app/components/PageLayout';
import TransitionLink from '@/app/components/TransitionLink';
import { sanityFetch } from '@/app/lib/sanity.client';
import { Tag } from '@/app/types/sanity';
import ScrollToTop from '@/app/components/ScrollToTop';
import { siteConfig } from '@/app/lib/site.config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tags | Jake Harris Blog',
  description: 'Browse all topics and tags on Jake Harris Blog.',
  alternates: {
    canonical: `${siteConfig.url}/blog/tags`,
  },
  openGraph: {
    title: 'Tags | Jake Harris Blog',
    description: 'Browse all topics and tags on Jake Harris Blog.',
    type: 'website',
    url: `${siteConfig.url}/blog/tags`,
  },
};

// Query to fetch all tags with post counts
const tagsQuery = `*[_type == "tag"] | order(title asc) {
  _id,
  title,
  slug,
  description,
  color,
  "postCount": count(*[_type == "post" && references(^._id)])
}`;

interface TagWithCount extends Tag {
  postCount: number;
}

export default async function TagsIndexPage() {
  const tags = await sanityFetch<TagWithCount[]>({
    query: tagsQuery,
    tags: ['tag'],
  });

  // Filter to only show tags with at least one post
  const activeTags = tags.filter(tag => tag.postCount > 0);

  return (
    <PageLayout>
      <ScrollToTop />
      <div className="max-w-none">
        <div className="mb-8">
          <TransitionLink
            href="/blog"
            scroll={true}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Blog
          </TransitionLink>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">Tags</h1>
        <p className="text-muted-foreground mb-8">
          Browse articles by topic.
        </p>

        {activeTags.length === 0 ? (
          <p className="text-muted-foreground">No tags found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeTags.map(tag => (
              <TransitionLink
                key={tag._id}
                href={`/blog/tags/${tag.slug.current}`}
                scroll={true}
                className="group block p-4 border rounded-lg hover:border-accent transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-lg group-hover:text-accent-foreground transition-colors">
                    {tag.title}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {tag.postCount} {tag.postCount === 1 ? 'post' : 'posts'}
                  </span>
                </div>
                {tag.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tag.description}
                  </p>
                )}
              </TransitionLink>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
