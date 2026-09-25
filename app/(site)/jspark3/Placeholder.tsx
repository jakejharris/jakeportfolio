import React from 'react';
import { IS_PLACEHOLDER } from './release-copy';
import './placeholder.css';

/** Marks a value that is still a placeholder, so an unfilled page is obvious at a glance. */
export function Ph({ children, block = false }: { children: React.ReactNode; block?: boolean }) {
  if (!IS_PLACEHOLDER) return <>{children}</>;
  return <span className={block ? 'jspark-ph jspark-ph-block' : 'jspark-ph'} title="Placeholder until the release is published">{children}</span>;
}

const TOKENS = /(v1\.X(?:\.0)?|XX\.X)/;

/** A copy string with its placeholder tokens (v1.X, XX.X) marked. */
export function Marked({ text }: { text: string }) {
  if (!IS_PLACEHOLDER) return <>{text}</>;
  return <>{text.split(TOKENS).map((part, index) => (index % 2 ? <Ph key={index}>{part}</Ph> : part))}</>;
}
