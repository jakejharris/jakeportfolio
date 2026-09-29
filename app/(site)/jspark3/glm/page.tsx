import GlmV2Page from '../v2/GlmV2Page';
import { projectMetadata } from '../v2/metadata';
import { GLM_V2, V2_DESCRIPTION } from '../glm-v2';
import '../v2/glm.css';
import './v2.css';

export const metadata = {
  ...projectMetadata(GLM_V2.title, V2_DESCRIPTION, '/jspark3/glm/', GLM_V2.social_image),
  robots: { index: false, follow: false },
};

export default GlmV2Page;
