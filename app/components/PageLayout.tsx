import React from 'react';
import { cn } from '../lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("page-layout", className)}>
      <div className="page-content max-w-2xl mx-auto w-full px-4">
        {children}
      </div>
    </div>
  );
}
