'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

const componentRegistry: Record<string, ComponentType> = {
  HeroCompression: dynamic(
    () => import('./compression-intelligence/HeroCompression'),
    { ssr: false }
  ),
};

interface InteractiveBlockProps {
  componentName: string;
  caption?: string;
}

export default function InteractiveBlock({ componentName, caption }: InteractiveBlockProps) {
  const Component = componentRegistry[componentName];

  if (!Component) {
    return (
      <div className="my-8 p-4 border border-dashed border-muted-foreground/30 rounded-lg text-center text-muted-foreground text-sm">
        Component &ldquo;{componentName}&rdquo; not found
      </div>
    );
  }

  return (
    <div className="my-8">
      <Component />
      {caption && (
        <p className="text-sm text-muted-foreground text-center mt-3 italic">
          {caption}
        </p>
      )}
    </div>
  );
}
