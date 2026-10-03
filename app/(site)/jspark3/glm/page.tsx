import GlmFactsPage from '../v2/GlmFactsPage';
import { projectMetadata } from '../v2/metadata';
import { ENGINE, HEADLINE, SOCIAL_IMAGE, TAG, VERSION } from '../glm-facts';
import { SITE_URL, WEBSITE_ID, jsonLd, personRef } from '../../../lib/entity';
import '../v2/glm.css';
import '../v2/glm2.css';

const title = `JSPARK3 ${VERSION.text}`;
/** The headline sentence once the release has written it; until then, the page's own plain description. */
const description = HEADLINE[0].pending
  ? `JSPARK3: GLM-5.3 Flash across three NVIDIA DGX Sparks${ENGINE.provenance.pending ? '' : ` on ${ENGINE.provenance.text}`}, with a pinned recipe and measured results.`
  : `${title}: ${HEADLINE[0].text}`;

/** The share card is the release's numbers card once it is rendered, else the neutral hub card. */
export const metadata = projectMetadata(title, description, '/jspark3/glm/', SOCIAL_IMAGE ?? '/og/jspark3-hub-v1.png');

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
