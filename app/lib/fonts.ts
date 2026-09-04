import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import localFont from 'next/font/local';

export const geistSans = GeistSans;
export const geistMono = GeistMono;

// Hero wordmark face (Fontshare, ITF Free Font License, self-hosted).
// Sentient Bold: a warm serif with a calligraphic undertone — playful without
// tipping past professional. Replaced Cabinet Grotesk in the font round.
export const sentient = localFont({
  src: '../../public/fonts/Sentient-Bold.woff2',
  weight: '700',
  style: 'normal',
  // block, not swap: the wordmark is the one place a wrong serif is visible.
  // Its box is font-independent (nowrap, fixed line-height), so holding the
  // text invisible until the woff2 lands costs no layout; swap painted the
  // fallback serif and then re-set the glyphs mid entrance animation.
  display: 'block',
  variable: '--font-wordmark',
  // The generated fallback would be Times sized by an average-glyph ratio.
  // globals.css declares "Sentient Fallback" instead: Georgia Bold scaled to
  // the literal wordmark string, reached through --font-wordmark-stack.
  adjustFontFallback: false,
});
