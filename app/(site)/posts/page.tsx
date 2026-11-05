import '@/app/css/page.css';
import '@/app/css/animations.css';
import '@/app/css/hero.css';
import './posts.css';
import PageLayout from '@/app/components/PageLayout';
import TransitionLink from '@/app/components/TransitionLink';
import PixelFluidBackground from '@/app/components/PixelFluidBackground';
import TagPill from '@/app/components/TagPill';
import { sanityFetch } from '@/app/lib/sanity.client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://jakejh.com';

type ArchivePost = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
  featured?: boolean;
  tags?: { title: string; slug: { current: string }; color?: string }[];
};

const postsQuery = `*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  publishedAt,
  excerpt,
  featured,
  "tags": tags[]->{title, slug, color}
}`;

export const metadata: Metadata = {
  title: 'Writing',
  description:
    'Every post on jakejh.com: AI integration, JSPARK3 and local inference, product engineering, and the things that broke along the way.',
  alternates: {
    canonical: `${BASE_URL}/posts/`,
    types: {
      'application/rss+xml': `${BASE_URL}/feed.xml`,
    },
  },
  openGraph: {
    title: 'Writing',
    description:
      'Every post on jakejh.com: AI integration, JSPARK3 and local inference, product engineering, and the things that broke along the way.',
    type: 'website',
    url: `${BASE_URL}/posts/`,
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
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${BASE_URL}/posts/#blog`,
    name: 'Jake Harris, writing',
    url: `${BASE_URL}/posts/`,
    description: 'Posts about AI integration, local inference, and product engineering.',
    author: { '@type': 'Person', name: 'Jake Harris', url: BASE_URL },
    blogPost: posts.slice(0, 20).map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `${BASE_URL}/posts/${post.slug.current}/`,
      datePublished: post.publishedAt,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <PixelFluidBackground />
      <PageLayout className="posts-page">
        <div className="max-w-none">
          <header className="hero">
            <h1 className="hero-wordmark" data-fluid-island>
              Writing
            </h1>
            <p className="hero-standfirst" data-fluid-island>
              Notes on agent orchestration, local inference, and the
              things that broke on the way. Every post, newest first,
              or take the{' '}
              <a href="/feed.xml" className="animated-underline-small-muted">
                RSS feed
              </a>
              .
            </p>
          </header>

          {years.map((year, index) => (
            <section key={year} className={`archive-year page-enter-${Math.min(index + 2, 4)}`}>
              <h2 className="section-kicker mb-2">{year}</h2>
              <ul className="space-y-2">
                {(byYear.get(year) ?? []).map((post) => (
                  <li key={post._id} className="relative">
                    <TransitionLink
                      href={`/posts/${post.slug.current}#`}
                      className={`pageLinkContainer block border p-3 group ${post.featured ? 'pinnedLinkBorder' : ''}`}
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
