import { ImageResponse } from 'next/og';
import { GLM_V2, V2_HIGHLIGHTS } from '../../glm-v2';

export const dynamic = 'force-static';
const size = { width: 1200, height: 630 };

export function GET() {
  return new ImageResponse(<div style={{ background: '#141619', color: '#ecebe6', width: '100%', height: '100%', padding: '48px 60px', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
    <div style={{ display: 'flex', color: '#d4b87c', fontSize: 24, letterSpacing: 2 }}>TENSORFOLD · THREE SPARKS</div>
    <div style={{ display: 'flex', fontSize: 55, marginTop: 20 }}>JSpark3 v2.0.0</div>
    <div style={{ display: 'flex', fontSize: 30, marginTop: 6 }}>(GLM-5.3-Flash, TP3)</div>
    <div style={{ display: 'flex', fontSize: 20, color: '#a9aba8', marginTop: 18 }}>RELEASE PREVIEW · PUBLICATION PENDING</div>
    <div style={{ display: 'flex', fontSize: 23, marginTop: 20 }}>{GLM_V2.quality?.claim ?? 'Multi-stream results and candidate qualification pending.'}</div>
    {GLM_V2.quality ? <div style={{ display: 'flex', fontSize: 15, color: '#a9aba8', marginTop: 8 }}>{GLM_V2.quality.scope}</div> : null}
    <div style={{ display: 'flex', marginTop: 28, gap: 24 }}>
      {V2_HIGHLIGHTS.map(cell => <div key={cell.id} style={{ display: 'flex', flexDirection: 'column', width: 344, borderTop: '1px solid #373b40', paddingTop: 12 }}>
        <div style={{ display: 'flex', fontSize: 17, color: '#a9aba8' }}>{cell.label}</div>
        <div style={{ display: 'flex', fontSize: 34, color: '#d4b87c', marginTop: 4 }}>{cell.value}</div>
      </div>)}
    </div>
    <div style={{ display: 'flex', fontSize: 16, color: '#a9aba8', marginTop: 12 }}>{GLM_V2.multistream.every(row => row.status === 'measured') ? 'Single-stream medians · tok/s' : 'Earlier sealed single-stream medians · tok/s'}</div>
    <div style={{ display: 'flex', marginTop: 'auto', fontSize: 17, color: '#a9aba8' }}>Default DFlash2 drafter: non-commercial. No mode cleared for commercial use.</div>
    <div style={{ display: 'flex', marginTop: 10, fontSize: 17 }}>jakejh.com/jspark3/glm/</div>
  </div>, size);
}
