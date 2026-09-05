import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { SITE_URL } from './site';

// The generated OpenGraph cards (app/(site)/opengraph-image.tsx and
// app/(site)/posts/[slug]/opengraph-image.tsx) share this ground, ink and
// type. Every colour is a token from app/globals.css in dark mode with the
// neutral accent, the same ink scripts/social/theme.mjs uses for the JSpark3
// social images, so a share card reads as the site.
export const OG_INK = {
  ground: 'hsl(0 0% 3.9%)', // .dark --background
  fg: 'hsl(0 0% 98%)', // .dark --foreground
  muted: 'hsl(0 0% 63.9%)', // .dark --muted-foreground
  rule: 'hsl(0 0% 14.9%)', // .dark --border
};

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

/** The host as the cards print it: the site's origin without the www. */
export const OG_HOST = new URL(SITE_URL).hostname.replace(/^www\./, '');

/**
 * The site's stack: Sentient for the wordmark and titles, Geist for copy,
 * Geist Mono for the receipt line. Satori reads TTF, OTF and WOFF but not
 * WOFF2, so Sentient is the WOFF next to the WOFF2 the pages serve, and Geist
 * comes from the static TTFs the geist package ships. The literal
 * process.cwd() paths are what Next's file tracing follows into the function.
 */
export async function loadOgFonts() {
  const [sentient, geist, geistMono] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/Sentient-Bold.woff')),
    readFile(join(process.cwd(), 'node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf')),
    readFile(join(process.cwd(), 'node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf')),
  ]);
  return [
    { name: 'Sentient', data: sentient, weight: 700 as const, style: 'normal' as const },
    { name: 'Geist', data: geist, weight: 500 as const, style: 'normal' as const },
    { name: 'Geist Mono', data: geistMono, weight: 400 as const, style: 'normal' as const },
  ];
}

/** The JH monogram from app/components/JHMark.tsx at a given height. */
function OgMark({ height, color }: { height: number; color: string }) {
  const width = Math.round((height * 194) / 151);
  return (
    <svg width={width} height={height} viewBox="145 10 194 151" fill={color}>
      <path d="M253.1,13.1v86.1c0,24.9-5.5,35.6-14.3,44.8-10.1,10.5-21.7,15.8-38.2,15.8s-26.6-1.5-39.4-15.6c-11.3-12.7-13.9-22.9-14.3-39.8,0-1,.8-1.9,1.8-1.9h31.8c1,0,1.8.8,1.8,1.7.2,3.9.8,8.2,2.3,12.1h0s0,0,0,0c2.9,6.5,8,9.8,15.4,9.8s12.8-3,15.2-9c2.3-5.4,2.3-12.4,2.3-18V13.1c0-1,.8-1.8,1.8-1.8h31.8c1,0,1.8.8,1.8,1.9Z" />
      <path d="M256.5,69.3c0-1,.8-1.7,1.8-1.7s0,0,0,0h41.7c1,0,1.8-.8,1.8-1.9V13.1c0-1,.8-1.9,1.8-1.9h33.5c1,0,1.8.8,1.8,1.9v145.1c0,1-.8,1.9-1.8,1.9h-33.5c-1,0-1.8-.8-1.8-1.9v-54.6c0-1-.8-1.9-1.8-1.9h-41.7s0,0,0,0c-1,0-1.8-.7-1.8-1.7v-30.7Z" />
    </svg>
  );
}

/**
 * The card shell, the same skeleton as the JSpark3 cards: corner mark (plus
 * the wordmark on post cards), the main block vertically centred, and a mono
 * receipt line above the site host.
 */
function OgFrame({
  children,
  wordmark = true,
  receipt,
  host,
}: {
  children: ReactNode;
  wordmark?: boolean;
  receipt?: string;
  host: string;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '60px 68px 56px',
        background: OG_INK.ground,
        color: OG_INK.fg,
        fontFamily: 'Geist',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <OgMark height={30} color={OG_INK.fg} />
        {wordmark && (
          <span style={{ fontFamily: 'Sentient', fontSize: 28, lineHeight: 1, letterSpacing: '-0.01em' }}>
            Jake Harris
          </span>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
        {children}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 48,
          paddingTop: 22,
          borderTop: `1px solid ${OG_INK.rule}`,
          fontFamily: 'Geist Mono',
          fontSize: 19,
          lineHeight: 1.35,
          color: OG_INK.muted,
        }}
      >
        <span>{receipt ?? ''}</span>
        <span style={{ color: OG_INK.fg }}>{host}</span>
      </div>
    </div>
  );
}

/** Site-wide card: the hero masthead (wordmark and standfirst) on the dark ground. */
export function SiteCard() {
  return (
    <OgFrame wordmark={false} receipt="Full Stack Developer" host={OG_HOST}>
      <div style={{ fontFamily: 'Sentient', fontSize: 152, lineHeight: 0.95, letterSpacing: '-0.01em' }}>
        Jake Harris
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: 30,
          fontSize: 34,
          lineHeight: 1.3,
          color: OG_INK.muted,
        }}
      >
        <span>Building agent orchestration systems and</span>
        <span>the apps they make possible.</span>
      </div>
    </OgFrame>
  );
}

/** Sentient is set large; step the size down with the title length so three lines always fit. */
function titleSize(title: string) {
  const n = title.length;
  if (n <= 32) return 88;
  if (n <= 56) return 74;
  if (n <= 84) return 62;
  return 52;
}

/** Per-post card: title, date and tags under the mark and wordmark. */
export function PostCard({
  title,
  date,
  tags,
  slug,
}: {
  title: string;
  date?: string;
  tags: string[];
  slug: string;
}) {
  return (
    <OgFrame receipt={date} host={`${OG_HOST}/posts/${slug}`}>
      <div
        style={{
          display: 'block',
          fontFamily: 'Sentient',
          fontSize: titleSize(title),
          lineHeight: 1.04,
          letterSpacing: '-0.01em',
          lineClamp: 3,
        }}
      >
        {title}
      </div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 32 }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 21,
                lineHeight: 1,
                padding: '10px 14px',
                borderRadius: 8,
                // .tag-pill: foreground at 12% over the ground, 20% for the edge
                background: 'rgba(250, 250, 250, 0.06)',
                border: '1px solid rgba(250, 250, 250, 0.14)',
                color: OG_INK.muted,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </OgFrame>
  );
}
