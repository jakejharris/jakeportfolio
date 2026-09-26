import GlmPage from '../v2/GlmPage';
import { projectMetadata } from '../v2/metadata';
import { GLM_COPY, GLM_RELEASE } from '../release-copy';
import '../v2/glm.css';

/** The share card is the release's numbers card once it is rendered, else the neutral hub card. */
export const metadata = projectMetadata(GLM_COPY.title, GLM_COPY.metaDescription, '/jspark3/glm/', GLM_RELEASE.social_image ?? '/og/jspark3-hub-v1.png');

export default GlmPage;
