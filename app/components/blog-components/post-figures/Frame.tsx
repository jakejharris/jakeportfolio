import '@/app/css/post-figures.css';

import type { ReactNode } from 'react';

import { safeHref } from '@/app/lib/post-figures';

/**
 * The card every post figure shares: monospace title top left, unit or
 * context top right, an optional source line, and the caption below.
 * Server rendered, so it reads in full without JavaScript.
 */
export function FigureFrame({
  kind,
  title,
  label,
  caption,
  sourceTitle,
  sourceUrl,
  sourceDetail,
  note,
  flush = false,
  motion = false,
  children,
}: {
  kind: string;
  title?: string;
  label?: string;
  caption?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  sourceDetail?: string;
  /** A second line under the source; render its links before passing it. */
  note?: ReactNode;
  /** The body draws its own edge to edge rows. */
  flush?: boolean;
  /** The figure moves while in view (see MotionGate); its HTML is still the settled state. */
  motion?: boolean;
  children: ReactNode;
}) {
  const hasHead = Boolean(title || label);
  const hasFoot = Boolean(sourceTitle || sourceDetail || note);
  return (
    <figure
      className="post-figure"
      data-post-figure={kind}
      data-pf-motion={motion ? '' : undefined}
      aria-label={caption ? undefined : title || undefined}
    >
      <div className="post-figure-card">
        {hasHead && (
          <div className="post-figure-head">
            {title && <span className="post-figure-title">{title}</span>}
            {label && <span className="post-figure-label">{label}</span>}
          </div>
        )}
        <div className={flush ? 'post-figure-body is-flush' : 'post-figure-body'}>{children}</div>
        {hasFoot && (
          <div className="post-figure-foot">
            {(sourceTitle || sourceDetail) && (
              <p>
                {sourceTitle && (
                  <>
                    Source: <SourceLink title={sourceTitle} url={sourceUrl} />
                    {sourceDetail ? '. ' : ''}
                  </>
                )}
                {sourceDetail}
              </p>
            )}
            {note && <p className={sourceTitle || sourceDetail ? 'mt-1.5' : undefined}>{note}</p>}
          </div>
        )}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** A source title, linked when its url is a web link. */
export function SourceLink({ title, url }: { title: string; url?: string }) {
  const href = safeHref(url);
  if (!href) return <cite className="not-italic">{title}</cite>;
  return (
    <a className="post-figure-link" href={href} target="_blank" rel="noopener noreferrer">
      {title}
    </a>
  );
}
