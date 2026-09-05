import { ImageResponse } from 'next/og';
import { sanityFetch } from '@/app/lib/sanity.client';
import { OG_CONTENT_TYPE, OG_SIZE, PostCard, loadOgFonts } from '@/app/lib/og';

// Per-post share card: title, date and tags. generateMetadata in page.tsx
// sets openGraph.images only when the post has a Sanity share image or main
// image; Next uses this file for the rest, so no post falls back to a
// text-only summary card.
export const alt = 'Post by Jake Harris';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type OgPost = {
  title: string;
  publishedAt?: string;
  tags?: { title: string }[];
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await sanityFetch<OgPost | null>({
    query: `*[_type == "post" && slug.current == $slug][0]{ title, publishedAt, "tags": tags[]->{ title } }`,
    params: { slug },
    tags: ['post'],
  });

  const title = post?.title || 'Jake Harris';
  const date = post?.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : undefined;
  const tags = (post?.tags ?? []).map((tag) => tag.title).filter(Boolean).slice(0, 4);

  return new ImageResponse(<PostCard title={title} date={date} tags={tags} slug={slug} />, {
    ...OG_SIZE,
    fonts: await loadOgFonts(),
  });
}
