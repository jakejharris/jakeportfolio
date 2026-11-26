import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import React, { type ReactNode } from 'react';
import { JH_MARK_PATHS, JH_MARK_VIEWBOX } from '../components/JHMark';
import { SITE_URL } from './entity';

// The generated OpenGraph cards (post and tag opengraph-image routes) share this ground, ink and
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
    <svg width={width} height={height} viewBox={JH_MARK_VIEWBOX} fill={color}>
      {JH_MARK_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * The card shell, the same skeleton as the JSpark3 cards: corner mark and
 * wordmark, the main block vertically centred, and a mono receipt line above
 * the site host.
 */
function OgFrame({ children, receipt }: { children: ReactNode; receipt?: string }) {
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
        <span style={{ fontFamily: 'Sentient', fontSize: 28, lineHeight: 1, letterSpacing: '-0.01em' }}>
          Jake Harris
        </span>
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
        <span style={{ color: OG_INK.fg }}>{OG_HOST}</span>
      </div>
    </div>
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
}: {
  title: string;
  date?: string;
  tags: string[];
}) {
  return (
    <OgFrame receipt={date}>
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

/** A tag collection uses the same typography as post cards. */
export function TagCard({ title }: { title: string }) {
  return <PostCard title={`Posts tagged “${title}”`} date="Jake Harris · AI Researcher" tags={[]} />;
}
