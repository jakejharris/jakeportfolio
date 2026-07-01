import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import localFont from 'next/font/local';

export const geistSans = GeistSans;
export const geistMono = GeistMono;

// Hero wordmark face (Fontshare, ITF Free Font License, self-hosted).
export const cabinetGrotesk = localFont({
  src: '../../public/fonts/CabinetGrotesk-Bold.woff2',
  weight: '700',
  style: 'normal',
  display: 'swap',
  variable: '--font-cabinet',
  adjustFontFallback: false,
});
