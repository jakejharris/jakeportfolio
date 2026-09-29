import GlmPage from '../v2/GlmPage';
import { projectMetadata } from '../v2/metadata';
import { GLM_COPY, GLM_RELEASE } from '../release-copy';
import { SITE_URL, WEBSITE_ID, jsonLd, personRef } from '../../../lib/entity';
import '../v2/glm.css';

/** The share card is the release's numbers card once it is rendered, else the neutral hub card. */
export const metadata = projectMetadata(GLM_COPY.title, GLM_COPY.metaDescription, '/jspark3/glm/', GLM_RELEASE.social_image ?? '/og/jspark3-hub-v1.png');

const url = `${SITE_URL}/jspark3/glm/`;

/** The project as its own entity, authored by the site's Person. */
const software = {
  '@type': 'SoftwareSourceCode',
  '@id': `${url}#software`,
  name: 'JSPARK3',
  description: GLM_COPY.metaDescription,
  url,
  version: GLM_RELEASE.tag,
  codeRepository: 'https://github.com/jakejharris/jspark3',
  sameAs: ['https://huggingface.co/jakejharris/jspark3'],
  author: personRef,
  isPartOf: { '@id': WEBSITE_ID },
};

export default function GlmRoute() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(software) }} />
    <GlmPage />
  </>;
}
