import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/components/ui/collapsible';

/**
 * A block of the page folded behind its title and a one-line summary. The whole
 * row is the button, so the summary is as tappable as the title. When `level`
 * is given the title is a real heading, so the outline stays navigable while
 * the block is closed.
 */
export default function Fold({
  title,
  summary,
  level,
  className = '',
  children,
}: {
  title: string;
  summary: string;
  level?: 3 | 4;
  className?: string;
  children: React.ReactNode;
}) {
  const Heading = level === 3 ? 'h3' : level === 4 ? 'h4' : 'div';
  const titleSize = level === 3 ? 'text-lg md:text-xl' : 'text-[15px]';

  return (
    <Collapsible className={className}>
      <Heading className="m-0">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group/fold flex w-full items-start gap-3 rounded-md text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="min-w-0 flex-1">
              <span className={`block font-semibold ${titleSize}`}>{title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{summary}</span>
            </span>
            <span
              aria-hidden="true"
              className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors group-hover/fold:border-foreground/30 group-hover/fold:text-foreground"
            >
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none group-data-[state=open]/fold:rotate-180" />
            </span>
          </button>
        </CollapsibleTrigger>
      </Heading>
      <CollapsibleContent>
        <div className="pt-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
