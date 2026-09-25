'use client';

import { useEffect } from 'react';

/**
 * Opens the fold an anchor points into, so inbound links to the v1.1 sections
 * (and the hub's legacy fragments) land on open content. A legacy alias names
 * its fold with data-fold.
 */
export default function FoldAnchors() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      const fold = target instanceof HTMLDetailsElement ? target : target.closest('details') ?? (target.dataset.fold ? document.getElementById(target.dataset.fold) : null);
      if (fold instanceof HTMLDetailsElement && !fold.open) {
        fold.open = true;
        target.scrollIntoView({ block: 'start' });
      }
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);
  return null;
}
