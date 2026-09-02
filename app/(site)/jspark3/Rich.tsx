import * as React from 'react';
import type { RichPart } from './content';

/**
 * Renders a verbatim run of copy that may carry inline code or emphasis.
 * The strings live in content.ts so they stay byte-for-byte as published.
 */
export default function Rich({ parts }: { parts: ReadonlyArray<RichPart> }) {
  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }
        if ('code' in part) {
          return <Mono key={index}>{part.code}</Mono>;
        }
        return (
          <strong key={index} className="font-semibold text-foreground">
            {part.strong}
          </strong>
        );
      })}
    </>
  );
}

/** Inline monospace for hashes, revisions, env vars and served model names. */
export function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}
