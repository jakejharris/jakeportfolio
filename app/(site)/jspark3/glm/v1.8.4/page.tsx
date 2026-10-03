import GlmPage from '../../v2/GlmPage';
import { projectMetadata } from '../../v2/metadata';
import { GLM_COPY, GLM_RELEASE } from '../../release-copy';
import { ENGINE, VERSION } from '../../glm-facts';
import { Fact } from '../../v2/Fact';
import '../../v2/glm.css';
import '../../v2/glm2.css';

/** v1.8.4 as it was published, kept whole now that a newer release leads /jspark3/glm/. */
export const metadata = projectMetadata(GLM_COPY.title, GLM_COPY.metaDescription, '/jspark3/glm/v1.8.4', GLM_RELEASE.social_image ?? '/og/jspark3-hub-v1.png');

export default function GlmV184Route() {
  return <GlmPage newer={<a href="/jspark3/glm/">Newer release: JSPARK3 <Fact slot={VERSION} /> on <Fact slot={ENGINE.provenance} /> →</a>} />;
}
