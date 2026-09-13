import HubPage from './v2/HubPage';
import LegacyFragments from './LegacyFragments';
import { projectMetadata } from './v2/metadata';
import '../../css/page.css';
import '../../css/hero.css';
import './v2/hub.css';

export const metadata = projectMetadata('JSPARK3 — Three Sparks, one model server', 'The current daily driver, release history, and measured results for three NVIDIA DGX Sparks.', '/jspark3/', '/og/jspark3-hub-v1.png');

export default function JSpark3Page() {
  return <><LegacyFragments /><HubPage /></>;
}
