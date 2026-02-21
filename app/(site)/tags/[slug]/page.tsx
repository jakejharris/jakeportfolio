import '@/app/css/page.css';
import PageLayout from '@/app/components/PageLayout';
import TransitionLink from '@/app/components/TransitionLink';
import { sanityFetch } from '@/app/lib/sanity.client';
import { Eye } from 'lucide-react';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/app/components/hover-card';
import ScrollToTop from '@/app/components/ScrollToTop';
import TagPill from '@/app/components/TagPill';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type TagData = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  color?: string;
};

type TagPost = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
  featured?: boolean;
  mainImage?: { asset: { _ref: string } };
  viewCount: number;
  tags?: { title: string; slug: { current: string } }[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await sanityFetch<TagData | null>({
    query: `*[_type == "tag" && slug.current == $slug][0]{ _id, title, slug, description, color }`,
    params: { slug },
    tags: ['post'],
  });

  if (!tag) {
    return { title: 'Tag Not Found' };
  }

  const title = `Posts tagged "${tag.title}"`;
  const description = tag.description || `Browse all posts tagged with ${tag.title}`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://jakejh.com/tags/${slug}/`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      site: '@jakeharrisdev',
      creator: '@jakeharrisdev',
    },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tag = await sanityFetch<TagData | null>({
    query: `*[_type == "tag" && slug.current == $slug][0]{ _id, title, slug, description, color }`,
    params: { slug },
    tags: ['post'],
  });

  if (!tag) {
    notFound();
  }

  const posts = await sanityFetch<TagPost[]>({
    query: `*[_type == "post" && references($tagId)] | order(featured desc, publishedAt desc) {
      _id,
      title,
      slug,
      publishedAt,
      excerpt,
      featured,
      mainImage,
      viewCount,
      "tags": tags[]->{title, slug, color}
    }`,
    params: { tagId: tag._id },
    tags: ['post'],
  });

  return (
    <PageLayout>
      <ScrollToTop />
      <div className="max-w-none">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{tag.title}</h1>
          {tag.description && (
            <p className="text-muted-foreground">{tag.description}</p>
          )}
        </div>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">No posts found with this tag.</p>
        ) : (
          <ul className="space-y-2 mb-8">
            {posts.map((post) => (
              <li key={post._id} className="relative">
                <HoverCard>
                  <HoverCardTrigger asChild>
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
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-muted-foreground">
                              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                              })}
                            </div>
                            {post.tags && post.tags.length > 0 && (
                              <div className="hidden md:flex gap-1">
                                {post.tags.map((t) => (
                                  <TagPill linked={false} tag={t} key={t.slug.current} />
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
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 hidden md:block">
                    <div className="space-y-2">
                      {post.featured && (
                        <div className="flex h-2 items-center text-black bg-accent rounded-[1px] mb-3">
                        </div>
                      )}
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground">
                          {post.excerpt}
                        </p>
                      )}
                      <TransitionLink href={`/posts/${post.slug.current}#`} scroll={true} className="animated-underline-small-muted pt-2 text-xs text-muted-foreground">
                        Click to read full post
                      </TransitionLink>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageLayout>
  );
}
