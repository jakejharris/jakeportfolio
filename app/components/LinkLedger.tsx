import TransitionLink from './TransitionLink';
import type { LedgerLink } from '../lib/profiles';
import '../css/link-ledger.css';

// A ruled list of links, one per row: what it is, where it goes, and an
// arrow that says whether it leaves the site.
export default function LinkLedger({ links }: { links: LedgerLink[] }) {
  return (
    <ul className="link-ledger">
      {links.map(({ label, detail, href, rel }) => {
        const external = !href.startsWith('/');
        const row = (
          <>
            <span className="link-ledger-label">{label}</span>
            <span className="link-ledger-detail">{detail}</span>
            <span className="link-ledger-arrow" aria-hidden="true">{external ? '↗' : '→'}</span>
            {external ? <span className="sr-only">(opens in a new tab)</span> : null}
          </>
        );
        return (
          <li key={href}>
            {external ? (
              <a className="link-ledger-row" href={href} target="_blank" rel={[rel, 'noopener noreferrer'].filter(Boolean).join(' ')}>
                {row}
              </a>
            ) : (
              <TransitionLink className="link-ledger-row" href={href} scroll={true}>
                {row}
              </TransitionLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}
