// Who the site is about, as structured data. Every page carries the WebSite
// and Person nodes from the site layout; pages that add their own nodes point
// back at them by @id, so search engines read one person across the site.

export const SITE_URL = 'https://jakejh.com';
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const ABOUT_URL = `${SITE_URL}/about/`;

/** The headshot, square, for the Person node. */
export const PERSON_IMAGE = `${SITE_URL}/images/jake-harris.jpg`;
/** The homepage share card: the headshot beside the name, 1200x630. */
export const SHARE_IMAGE = { url: '/og/jake-harris.jpg', width: 1200, height: 630, alt: 'Jake Harris' };

export const PERSON_DESCRIPTION =
  'Software engineer in Chicago who builds agent systems and JSPARK3, open serving recipes that run large open models on NVIDIA DGX Spark.';

/** Profiles that are also Jake, in the order the About page lists them. */
export const PROFILES = [
  { label: 'GitHub', handle: 'jakejharris', href: 'https://github.com/jakejharris' },
  { label: 'Hugging Face', handle: 'jakejharris', href: 'https://huggingface.co/jakejharris' },
  { label: 'X', handle: '@jakeharrisdev', href: 'https://x.com/jakeharrisdev' },
  { label: 'LinkedIn', handle: 'in/jakejh', href: 'https://www.linkedin.com/in/jakejh/' },
] as const;

export const websiteNode = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: 'Jake Harris',
  alternateName: 'jakejh',
  description: PERSON_DESCRIPTION,
  inLanguage: 'en-US',
  publisher: { '@id': PERSON_ID },
};

export const personNode = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Jake Harris',
  url: ABOUT_URL,
  image: PERSON_IMAGE,
  jobTitle: 'Software Engineer',
  description: PERSON_DESCRIPTION,
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'George Washington University', url: 'https://www.gwu.edu/' },
  knowsAbout: ['LLM inference', 'NVIDIA DGX Spark', 'Agent orchestration', 'Context engineering'],
  sameAs: PROFILES.map(profile => profile.href),
};

/** A pointer to the Person, with enough inline for readers that do not follow @id. */
export const personRef = { '@type': 'Person', '@id': PERSON_ID, name: 'Jake Harris', url: ABOUT_URL };

/** JSON-LD text safe to inline in a script tag: a "<" in CMS text cannot close it. */
export function jsonLd(...nodes: object[]) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
