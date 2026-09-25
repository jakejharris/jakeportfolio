'use client';

import { useEffect } from 'react';

/** Opens the fold that holds an anchor, and brings the anchor into view. */
function openFoldFor(id: string) {
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  const fold = target instanceof HTMLDetailsElement ? target : target.closest('details') ?? (target.dataset.fold ? document.getElementById(target.dataset.fold) : null);
  if (fold instanceof HTMLDetailsElement && !fold.open) {
    fold.open = true;
    target.scrollIntoView({ block: 'start' });
  }
}

/**
 * Opens the fold an anchor points into, so inbound links to the v1.1 sections
 * (and the hub's legacy fragments) land on open content. A legacy alias names
 * its fold with data-fold. In-page links are handled on click too: following a
 * link to the hash that is already current fires no hashchange.
 */
export default function FoldAnchors() {
  useEffect(() => {
    const fromHash = () => openFoldFor(decodeURIComponent(window.location.hash.slice(1)));
    const fromClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      const id = link?.getAttribute('href')?.slice(1);
      if (id) window.requestAnimationFrame(() => openFoldFor(decodeURIComponent(id)));
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    document.addEventListener('click', fromClick);
    return () => {
      window.removeEventListener('hashchange', fromHash);
      document.removeEventListener('click', fromClick);
    };
  }, []);
  return null;
}
