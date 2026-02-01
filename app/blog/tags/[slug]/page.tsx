import PageLayout from '@/app/components/PageLayout';
import TransitionLink from '@/app/components/TransitionLink';
import { sanityFetch, client } from '@/app/lib/sanity.client';
import { PostSummary, Tag } from '@/app/types/sanity';
import { Eye } from 'lucide-react';
import { notFound } from 'next/navigation';
import ScrollToTop from '@/app/components/ScrollToTop';
import { siteConfig } from '@/app/lib/site.config';
import type { Metadata } from 'next';

// Generate static params for all tags
export async function generateStaticParams() {
  try {
    const tags = await client.fetch<{ slug: { current: string } }[]>(
      `*[_type == "tag"] { slug }`
    );

    return tags.map((tag) => ({
      slug: tag.slug.current,
    }));
  } catch (error) {
    console.warn('generateStaticParams: Could not fetch tags from Sanity:', error);
    return [];
  }
}

// Generate dynamic metadata for each tag page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await sanityFetch<Tag | null>({
    query: `*[_type == "tag" && slug.current == $slug][0] {
      title,
      description
    }`,
    params: { slug },
    tags: ['tag'],
  });

  if (!tag) {
    return {
      title: 'Tag Not Found',
    };
  }

  const title = `${tag.title} | Jake Harris Blog`;
  const description = tag.description || `Posts tagged with ${tag.title}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/blog/tags/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteConfig.url}/blog/tags/${slug}`,
    },
  };
}

// Query to fetch tag details
const tagQuery = `*[_type == "tag" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  description,
  color
}`;

// Query to fetch posts with this tag
const postsQuery = `*[_type == "post" && references(*[_type == "tag" && slug.current == $slug][0]._id)] | order(publishedAt desc) {
  _id,
  title,
  slug,
  publishedAt,
  viewCount,
  featured,
  excerpt,
  "tags": tags[]->{ _id, title, slug, color }
}`;

type PageParams = {
  params: Promise<{ slug: string }>;
};

export default async function TagPage({ params }: PageParams) {
  const { slug } = await params;

  // Fetch tag and posts in parallel
  const [tag, posts] = await Promise.all([
    sanityFetch<Tag | null>({
      query: tagQuery,
      params: { slug },
      tags: ['tag'],
    }),
    sanityFetch<PostSummary[]>({
      query: postsQuery,
      params: { slug },
      tags: ['post', 'tag'],
    }),
  ]);

  if (!tag) {
    notFound();
  }

  return (
    <PageLayout>
      <ScrollToTop />
      <div className="max-w-none">
        <div className="mb-8">
          <TransitionLink
            href="/blog/tags"
            scroll={true}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; All Tags
          </TransitionLink>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">{tag.title}</h1>
        {tag.description && (
          <p className="text-muted-foreground mb-4">{tag.description}</p>
        )}
        <p className="text-sm text-muted-foreground mb-8">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </p>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">No posts found with this tag.</p>
        ) : (
          <ul className="space-y-2">
            {posts.map(post => (
              <li key={post._id}>
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
                            {post.tags.map(t => (
                              <span
                                key={t._id}
                                className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                              >
                                {t.title}
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageLayout>
  );
}
