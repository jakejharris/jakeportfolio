import GlmPage from '../../v2/GlmPage';
import { projectMetadata } from '../../v2/metadata';
import { GLM_RELEASE } from '../../release-copy';
import '../../v2/glm.css';

export const metadata = projectMetadata('JSpark3 v1.8.4 · release history', 'Preserved v1.8.4 measurements, including the complete code stream ladder.', '/jspark3/glm/v1.8.4/', GLM_RELEASE.social_image!);

export default function HistoricalGlmPage() {
  return <><aside className="glm" style={{ padding: '16px 24px', textAlign: 'center' }}>Historical release · <a href="/jspark3/glm/">JSpark3 v2.0.0 (GLM-5.3-Flash, TP3) →</a></aside><GlmPage /></>;
}
