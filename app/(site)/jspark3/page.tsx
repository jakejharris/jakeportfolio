import HubPage from './v2/HubPage';
import LegacyFragments from './LegacyFragments';
import { projectMetadata } from './v2/metadata';
import { HUB_COPY } from './release-copy';
import '../../css/page.css';
import '../../css/hero.css';
import './v2/hub.css';

export const metadata = projectMetadata('JSPARK3 — Three Sparks, one model server', HUB_COPY.metaDescription, '/jspark3/', '/og/jspark3-hub-v1.png');

export default function JSpark3Page() {
  return <><LegacyFragments /><HubPage /></>;
}
