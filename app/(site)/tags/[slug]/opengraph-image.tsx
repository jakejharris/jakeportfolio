import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { sanityFetch } from '@/app/lib/sanity.client';
import { OG_CONTENT_TYPE, OG_SIZE, TagCard, loadOgFonts } from '@/app/lib/og';

export const alt = 'Posts by Jake Harris, ML Researcher';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = await sanityFetch<{ title: string } | null>({
    query: '*[_type == "tag" && slug.current == $slug][0]{ title }',
    params: { slug },
    tags: ['post'],
  });
  if (!tag) notFound();
  return new ImageResponse(<TagCard title={tag.title} />, { ...OG_SIZE, fonts: await loadOgFonts() });
}
