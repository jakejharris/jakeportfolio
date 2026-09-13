"use client";

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function PortfolioChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()?.replace(/\/$/, '');
  if (pathname === '/jspark3' || pathname === '/jspark3/deepseek') return null;
  return children;
}
