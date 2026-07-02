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
  display: 'swap',
  variable: '--font-wordmark',
  adjustFontFallback: false,
});
