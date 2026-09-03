import { SECTIONS } from './content';

/**
 * In-page section nav. TableOfContents is built for Portable Text blocks, so this
 * page uses a small sticky nav in the same visual language instead: plain anchors,
 * no client JavaScript, and its own horizontal scroll on narrow screens.
 */
export default function SectionNav() {
  return (
    <nav
      aria-label="On this page"
      className="sticky top-16 z-30 -mx-4 mt-10 border-y border-border bg-background/80 px-4 backdrop-blur"
    >
      {/* Below md the row can outrun the viewport, so its right edge fades to say so.
          The mask is on the list itself, so it works over the nav's translucent ground. */}
      <ul className="flex items-center gap-1 overflow-x-auto py-2 max-md:[mask-image:linear-gradient(to_right,#000_calc(100%_-_28px),transparent)]">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
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
