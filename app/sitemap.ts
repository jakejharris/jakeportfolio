import { MetadataRoute } from 'next';
import { siteConfig } from './lib/site.config';

interface PostSlug {
  slug: { current: string };
  _updatedAt: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages - always included
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${siteConfig.url}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  // Fetch blog posts if Sanity is configured
  let postPages: MetadataRoute.Sitemap = [];

  try {
    // Dynamic import to avoid build-time errors when env vars are missing
    const { client } = await import('./lib/sanity.client');

    const posts = await client.fetch<PostSlug[]>(
      `*[_type == "post"] | order(publishedAt desc) {
        slug,
        _updatedAt
      }`
    );

    postPages = posts.map((post) => ({
      url: `${siteConfig.url}/posts/${post.slug.current}`,
      lastModified: new Date(post._updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    // If Sanity is not configured, just return static pages
    console.warn('Sitemap: Could not fetch posts from Sanity:', error);
  }

  return [...staticPages, ...postPages];
}
