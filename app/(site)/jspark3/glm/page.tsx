import GlmFactsPage from '../v2/GlmFactsPage';
import { projectMetadata } from '../v2/metadata';
import { ENGINE, TAG, VERSION } from '../glm-facts';
import { HERO_SUMMARY, SHARE_IMAGE } from '../v2/remeasured-figures';
import { SITE_URL, WEBSITE_ID, jsonLd, personRef } from '../../../lib/entity';
import '../v2/glm.css';
import '../v2/glm2.css';

const title = `JSPARK3 ${VERSION.text}`;
/**
 * The hero's figures, each with its label, as the share card shows them; otherwise the page's own plain description.
 * Never the release's headline: its figures are for requests running at once, which link previews do not show.
 */
const description = HERO_SUMMARY
  ? `GLM-5.3 Flash on three NVIDIA DGX Sparks. ${HERO_SUMMARY}`
  : `JSPARK3: GLM-5.3 Flash across three NVIDIA DGX Sparks${ENGINE.provenance.pending ? '' : ` on ${ENGINE.provenance.text}`}, with a pinned recipe and measured results.`;

/** The share card is the hero's numbers card while it shows the hero's figures, else the neutral hub card. */
export const metadata = projectMetadata(title, description, '/jspark3/glm/', SHARE_IMAGE ?? '/og/jspark3-hub-v1.png');

const url = `${SITE_URL}/jspark3/glm/`;

/** The project as its own entity, authored by the site's Person. */
const software = {
  '@type': 'SoftwareSourceCode',
  '@id': `${url}#software`,
  name: 'JSPARK3',
  description,
  url,
  ...(TAG.pending ? {} : { version: TAG.text }),
  codeRepository: 'https://github.com/jakejharris/jspark3',
  sameAs: ['https://huggingface.co/jakejharris/jspark3'],
  author: personRef,
  isPartOf: { '@id': WEBSITE_ID },
};

export default function GlmRoute() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(software) }} />
    <GlmFactsPage />
  </>;
}
