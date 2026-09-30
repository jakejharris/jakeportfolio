'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// The compression figures render on the server at their final size, so the
// post does not shift when their code arrives.
const componentRegistry: Record<string, ComponentType> = {
  HeroCompression: dynamic(() => import('./compression-intelligence/HeroCompression')),
  CompressionPyramid: dynamic(() => import('./compression-intelligence/CompressionPyramid')),
  ScalingTable: dynamic(() => import('./compression-intelligence/ScalingTable')),
  TokenCompression: dynamic(() => import('./compression-intelligence/TokenCompression')),
  AgentHierarchy: dynamic(() => import('./compression-intelligence/AgentHierarchy')),
  LossyDrift: dynamic(() => import('./compression-intelligence/LossyDrift')),
  SymphonyTimeline: dynamic(
    () => import('./symphony-anatomy/SymphonyTimeline'),
    { ssr: false }
  ),
  SymphonyFlow: dynamic(
    () => import('./symphony-anatomy/SymphonyFlow'),
    { ssr: false }
  ),
  RuleLedger: dynamic(
    () => import('./orchestrator-rule/RuleLedger'),
    { ssr: false }
  ),
  DispatchFlow: dynamic(
    () => import('./orchestrator-rule/DispatchFlow'),
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
