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

/**
 * Under this length a token is kept whole and wraps as a unit onto its own line.
 * At and above it — the 40-character revision hashes, the sha256 digest, the long
 * repository paths — a token is allowed to break anywhere, because it cannot fit a
 * card column intact.
 */
const KEEP_WHOLE_BELOW = 40;

/**
 * Inline monospace for hashes, revisions, env vars and served model names.
 * Whole tokens are inline-block so they wrap as a unit rather than reading as
 * "NCCL_ALG / O", and are capped at the width of their container with their own
 * scroller, so a narrow card can never push the page sideways.
 */
export function Mono({ children }: { children: React.ReactNode }) {
  const keepWhole = typeof children === 'string' && children.length < KEEP_WHOLE_BELOW;
  return (
    <code
      className={`rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground ${
        keepWhole
          ? 'inline-block max-w-full overflow-x-auto whitespace-nowrap align-bottom'
          : 'break-all'
      }`}
    >
      {children}
    </code>
  );
}
