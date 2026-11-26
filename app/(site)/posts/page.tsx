import '@/app/css/page.css';
import '@/app/css/animations.css';
import '@/app/css/hero.css';
import './posts.css';
import PageLayout from '@/app/components/PageLayout';
import TransitionLink from '@/app/components/TransitionLink';
import TagPill from '@/app/components/TagPill';
import { SITE_URL, jsonLd, personRef } from '@/app/lib/entity';
import { sanityFetch } from '@/app/lib/sanity.client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

type ArchivePost = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
  tags?: { title: string; slug: { current: string } }[];
};

const postsQuery = `*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  publishedAt,
  excerpt,
  "tags": tags[]->{title, slug}
}`;

export const metadata: Metadata = {
  title: 'Writing',
  description:
    'Every post on jakejh.com: AI integration, JSPARK3 and local inference, product engineering, and the things that broke along the way.',
  alternates: {
    canonical: `${SITE_URL}/posts/`,
    types: {
      'application/rss+xml': `${SITE_URL}/feed.xml`,
    },
  },
  openGraph: {
    title: 'Writing',
    description:
      'Every post on jakejh.com: AI integration, JSPARK3 and local inference, product engineering, and the things that broke along the way.',
    type: 'website',
    url: `${SITE_URL}/posts/`,
  },
  twitter: {
    card: 'summary',
    title: 'Writing',
    description:
      'Every post on jakejh.com: AI integration, JSPARK3 and local inference, product engineering, and the things that broke along the way.',
    site: '@jakeharrisdev',
    creator: '@jakeharrisdev',
  },
};

export default async function PostsIndexPage() {
  const posts = await sanityFetch<ArchivePost[]>({
    query: postsQuery,
    tags: ['post'],
  });

  const byYear = new Map<string, ArchivePost[]>();
  for (const post of posts) {
    const year = new Date(post.publishedAt).getFullYear().toString();
    const bucket = byYear.get(year) ?? [];
    bucket.push(post);
    byYear.set(year, bucket);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => Number(b) - Number(a));

  const blogSchema = {
    '@type': 'Blog',
    '@id': `${SITE_URL}/posts/#blog`,
    name: 'Jake Harris, writing',
    url: `${SITE_URL}/posts/`,
    description: 'Posts about AI integration, local inference, and product engineering.',
    author: personRef,
    blogPost: posts.slice(0, 20).map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `${SITE_URL}/posts/${post.slug.current}/`,
      datePublished: post.publishedAt,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(blogSchema) }}
      />
      <PageLayout>
        <div className="max-w-none">
          <header className="hero">
            <h1 className="hero-wordmark" data-fluid-island>
              Writing
            </h1>
            <p className="hero-standfirst" data-fluid-island>
              Every post, newest first.
            </p>
            <p className="archive-feed" data-fluid-island>
              <a href="/feed.xml" className="animated-underline-small-muted">
                RSS feed
              </a>
            </p>
          </header>

          {years.map((year, index) => (
            <section key={year} className={`archive-year page-enter-${Math.min(index + 2, 3)}`}>
              <h2 className="section-kicker mb-2">{year}</h2>
              <ul className="space-y-2">
                {(byYear.get(year) ?? []).map((post) => (
                  <li key={post._id} className="relative">
                    <TransitionLink
                      href={`/posts/${post.slug.current}#`}
                      className="pageLinkContainer block border p-3 group"
                      aria-label={`Read ${post.title}`}
                      scroll={true}
                      prefetch={false}
                    >
                      <div className="text-primary text-sm md:text-base font-medium mb-1 leading-tight">
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
                            {post.tags.map((tag) => (
                              <TagPill linked={false} tag={tag} key={tag.slug.current} />
                            ))}
                          </div>
                        )}
                      </div>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground mt-2 leading-snug">
                          {post.excerpt}
                        </p>
                      )}
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </PageLayout>
    </>
  );
}
