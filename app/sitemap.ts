import { MetadataRoute } from "next";
import { sanityFetch } from "@/app/lib/sanity.client";

const BASE_URL = "https://jakejh.com";

type Post = {
  slug: { current: string };
  publishedAt: string;
  _updatedAt: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await sanityFetch<Post[]>({
    query: `*[_type == "post"] | order(publishedAt desc) { slug, publishedAt, _updatedAt }`,
    tags: ["post"],
  });

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about/`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact/`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/posts/${post.slug.current}/`,
    lastModified: new Date(post._updatedAt || post.publishedAt),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...postEntries];
}
