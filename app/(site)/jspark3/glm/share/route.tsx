import { ImageResponse } from 'next/og';
import { GLM_V2, V2_HIGHLIGHTS } from '../../glm-v2';

export const dynamic = 'force-static';
const size = { width: 1200, height: 630 };

export function GET() {
  return new ImageResponse(<div style={{ background: '#141619', color: '#ecebe6', width: '100%', height: '100%', padding: '48px 60px', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
    <div style={{ display: 'flex', color: '#d4b87c', fontSize: 24, letterSpacing: 2 }}>THREE SPARKS · ONE ENDPOINT</div>
    <div style={{ display: 'flex', fontSize: 55, marginTop: 20 }}>JSpark3 v2.0.0</div>
    <div style={{ display: 'flex', fontSize: 30, marginTop: 6 }}>(GLM-5.3-Flash, TP3)</div>
    <div style={{ display: 'flex', fontSize: 21, color: '#a9aba8', marginTop: 18 }}>{GLM_V2.pending.length ? 'RELEASE PREVIEW · PUBLICATION PENDING' : 'Measured ranges · one serving start · tok/s'}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 28, gap: 22 }}>
      {V2_HIGHLIGHTS.map(cell => <div key={cell.id} style={{ display: 'flex', flexDirection: 'column', width: 515, borderTop: '1px solid #373b40', paddingTop: 12 }}>
        <div style={{ display: 'flex', fontSize: 17, color: '#a9aba8' }}>{cell.label}</div>
        <div style={{ display: 'flex', fontSize: cell.value.length > 16 ? 26 : 34, color: '#d4b87c', marginTop: 4 }}>{cell.value}</div>
      </div>)}
    </div>
    <div style={{ display: 'flex', marginTop: 'auto', fontSize: 17, color: '#a9aba8' }}>DFlash2: non-commercial · MTP-only: not measured at TP=3</div>
    <div style={{ display: 'flex', marginTop: 10, fontSize: 17 }}>jakejh.com/jspark3/glm/</div>
  </div>, size);
}
