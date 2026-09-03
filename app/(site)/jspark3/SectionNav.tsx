"use client";

import type { MouseEvent } from 'react';
import { useNavbarScroll } from '../../components/NavbarScrollContext';
import { SECTIONS } from './content';

/**
 * Scroll to the section without leaving a hash in the URL. A lingering hash makes
 * a refresh jump straight to the section, which reads as a snap on load.
 */
function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

/**
 * In-page section nav. TableOfContents is built for Portable Text blocks, so this
 * page uses a small sticky nav in the same visual language instead. It keeps plain
 * anchors and horizontal scrolling while following the global navbar's mobile motion.
 */
export default function SectionNav() {
  const { mobileVisible } = useNavbarScroll();

  return (
    <nav
      aria-label="On this page"
      className={`sticky z-30 -mx-4 mt-10 border-y border-border bg-background/80 px-4 backdrop-blur transition-[top] duration-300 md:top-16 ${
        mobileVisible ? 'top-16' : 'top-0'
      }`}
    >
      {/* Below md the row can outrun the viewport, so its right edge fades to say so.
          The mask is on the list itself, so it works over the nav's translucent ground. */}
      <ul className="flex items-center gap-1 overflow-x-auto py-2 max-md:[mask-image:linear-gradient(to_right,#000_calc(100%_-_28px),transparent)]">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={(event) => scrollToSection(event, section.id)}
              className="inline-block whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
