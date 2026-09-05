import { ImageResponse } from 'next/og';
import { OG_CONTENT_TYPE, OG_SIZE, SiteCard, loadOgFonts } from '@/app/lib/og';

// Site-wide share card. Next applies it to every route under (site) whose
// metadata sets no openGraph.images of its own, so /jspark3 keeps its static
// PNG and posts with a Sanity share image keep that.
export const alt = 'Jake Harris, Full Stack Developer';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(<SiteCard />, { ...OG_SIZE, fonts: await loadOgFonts() });
}
