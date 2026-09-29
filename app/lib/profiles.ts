import { PROFILES } from './entity';

// Places to find Jake off this site, as the About and Contact ledgers list
// them: what it is, then where.
export interface LedgerLink {
  label: string;
  detail: string;
  href: string;
  rel?: string;
}

export const EMAIL = 'jake@jjhdigital.com';

export const CALENDAR_LINK: LedgerLink = {
  label: 'Book a call', detail: 'cal.com/jakejh', href: 'https://cal.com/jakejh',
};

export const PROFILE_LINKS: LedgerLink[] = PROFILES.map(({ label, handle, href }) => ({
  label,
  detail: handle,
  href,
  rel: 'me',
}));
