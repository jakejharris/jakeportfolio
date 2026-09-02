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

/** Below this length a token is kept whole; above it, it is allowed to break anywhere. */
const UNBREAKABLE_UP_TO = 24;

/**
 * Inline monospace for hashes, revisions, env vars and served model names.
 * Short tokens (env vars, file names, flags) stay on one line so they never read as
 * "NCCL_ALG / O"; long ones (hashes, digests, repository paths) still break anywhere,
 * because they are too wide to fit a card column intact.
 */
export function Mono({ children }: { children: React.ReactNode }) {
  const keepWhole = typeof children === 'string' && children.length <= UNBREAKABLE_UP_TO;
  return (
    <code
      className={`rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground ${
        keepWhole ? 'whitespace-nowrap' : 'break-all'
      }`}
    >
      {children}
    </code>
  );
}
