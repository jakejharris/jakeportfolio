import HubPage from './v2/HubPage';
import LegacyFragments from './LegacyFragments';
import { projectMetadata } from './v2/metadata';
import '../../css/page.css';
import '../../css/hero.css';
import './v2/hub.css';

export const metadata = projectMetadata('JSPARK3 — Three Sparks, one model server', 'Tempo, our current DeepSeek-V4.1 Flash daily driver on three DGX Sparks, and the preserved GLM-5.3 Flash Cadence release.', '/jspark3/');

export default function JSpark3Page() {
  return <><LegacyFragments /><HubPage /></>;
}
