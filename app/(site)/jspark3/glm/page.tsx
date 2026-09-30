import GlmV2Page from '../v2/GlmV2Page';
import { projectMetadata } from '../v2/metadata';
import { GLM_V2, V2_DESCRIPTION } from '../glm-v2';
import { SITE_URL, WEBSITE_ID, jsonLd, personRef } from '../../../lib/entity';
import '../v2/glm.css';
import './v2.css';

export const metadata = {
  ...projectMetadata(GLM_V2.title, V2_DESCRIPTION, '/jspark3/glm/', GLM_V2.social_image),
  robots: { index: false, follow: false },
};

const url = `${SITE_URL}/jspark3/glm/`;
const software = {
  '@type': 'SoftwareSourceCode', '@id': `${url}#software`,
  name: GLM_V2.title, description: V2_DESCRIPTION, url, version: 'v2.0.0',
  codeRepository: 'https://github.com/jakejharris/jspark3',
  sameAs: ['https://huggingface.co/jakejharris/jspark3'],
  author: personRef, isPartOf: { '@id': WEBSITE_ID },
};

export default function Page() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(software) }} />
    <GlmV2Page />
  </>;
}
