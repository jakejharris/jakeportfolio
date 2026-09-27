"use client";

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function PortfolioChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()?.replace(/\/$/, '');
  if (pathname === '/jspark3/deepseek' || pathname === '/jspark3/glm') return null;
  return children;
}
