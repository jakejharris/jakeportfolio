import React from 'react';
import type { Slot } from '../glm-facts';
import '../placeholder.css';

/** Facts text with its `code` spans (API fields, flags) set as code. */
function Text({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/);
  // Keep short words such as "--weights" together; CSS lets a word wider than its column wrap. Text copies unchanged.
  const unbroken = (code: string) => code.split(/( +)/).map((word, index) => (index % 2 || !word ? word : <span key={index} className="glm2-nobreak">{word}</span>));
  return parts.length === 1 ? <>{text}</> : <>{parts.map((part, index) => (index % 2 ? <code key={index}>{unbroken(part)}</code> : part))}</>;
}

/** A facts value as written, or, while the release still owes it, a marked slot that says what is missing. */
export function Fact({ slot, block = false }: { slot: Slot; block?: boolean }) {
  if (!slot.pending) return <Text text={slot.text} />;
  return <span className={`jspark-ph jspark-tbd${block ? ' jspark-ph-block' : ''}`} title="Not in the release facts yet"><Text text={slot.text} /></span>;
}

/**
 * A link whose address comes from the facts. While the address is pending it keeps the link's layout
 * but goes nowhere, and is marked as pending.
 */
export function FactLink({ href, className, children }: { href: Slot; className?: string; children: React.ReactNode }) {
  if (href.pending) return <a className={className} data-pending="" aria-disabled="true" title={href.text}>{children}</a>;
  return <a className={className} href={href.text}>{children}</a>;
}
