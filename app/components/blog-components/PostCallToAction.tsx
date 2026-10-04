import TransitionLink from '@/app/components/TransitionLink';
import { sitePath } from '@/app/lib/site-path';
import '@/app/css/post-cta.css';

const STYLES = ['primary', 'secondary', 'ghost'] as const;
type Style = (typeof STYLES)[number];

// A post's call to action (the callToAction block): one link, as wide as the
// column on a phone and as wide as its words beside the text on a wider
// screen. A page on this site opens in place with the site's page change; a
// page elsewhere opens a new tab, and the arrow and the link say so.
export default function PostCallToAction({ text, url, style }: { text: string; url: string; style?: string }) {
  const path = sitePath(url);
  const look: Style = STYLES.includes(style as Style) ? (style as Style) : 'primary';
  const className = `post-cta post-cta-${look}${path ? '' : ' post-cta-external'}`;
  const label = (
    <>
      <span className="post-cta-text">{text}</span>
      <span className="post-cta-arrow" aria-hidden="true">{path ? '→' : '↗'}</span>
      {path ? null : <span className="sr-only">(opens in a new tab)</span>}
    </>
  );
  return (
    <div className="post-cta-row">
      {path ? (
        <TransitionLink className={className} href={path} scroll={true}>{label}</TransitionLink>
      ) : (
        <a className={className} href={url} target="_blank" rel="noopener noreferrer">{label}</a>
      )}
    </div>
  );
}
