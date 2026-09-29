// Places to find Jake off this site, as the About and Contact ledgers list
// them: what it is, then where.
export interface LedgerLink {
  label: string;
  detail: string;
  href: string;
}

export const EMAIL = 'jake@jjhdigital.com';

export const PROFILES = {
  calendar: { label: 'Book a call', detail: 'cal.com/jakejh', href: 'https://cal.com/jakejh' },
  linkedin: { label: 'LinkedIn', detail: 'in/jakejh', href: 'https://linkedin.com/in/jakejh' },
  x: { label: 'X', detail: '@jakeharrisdev', href: 'https://x.com/jakeharrisdev' },
  github: { label: 'GitHub', detail: 'jakejharris', href: 'https://github.com/jakejharris' },
} satisfies Record<string, LedgerLink>;
