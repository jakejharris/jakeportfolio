import { ImageResponse } from 'next/og';
import { OG_CONTENT_TYPE, OG_SIZE, SiteCard, loadOgFonts } from '@/app/lib/og';

// Tag pages declare their own openGraph block (title, description, type),
// which replaces the (site) layout's and with it the inherited site card, so
// they would otherwise have no image at all. Give them the site card.
export const alt = 'Jake Harris, Full Stack Developer';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(<SiteCard />, { ...OG_SIZE, fonts: await loadOgFonts() });
}
