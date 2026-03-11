import React from 'react';
import { cn } from '../lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  center?: boolean;
}

export default function PageLayout({ 
  children, 
  className,
  center = false 
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        "min-h-[calc(100vh-8rem)]",
        center ? "flex items-center justify-center" : "pt-6 pb-8",
        "transition-all duration-200",
        className
      )}
    >
      <div className={cn("max-w-2xl mx-auto w-full", center ? "p-4" : "px-4")}>
        {children}
      </div>
    </div>
  );
} 