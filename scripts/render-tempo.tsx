/** Standalone review only: exact React components, local fonts, compiled project CSS. No Next server/build. */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ClusterIllustration from '../app/(site)/jspark3/v2/ClusterIllustration';
import TempoPage from '../app/(site)/jspark3/v2/TempoPage';
import HubPage from '../app/(site)/jspark3/v2/HubPage';
import { legacyDestination, legacyFragments } from '../app/(site)/jspark3/legacy-fragments';
import { NavbarScrollProvider } from '../app/components/NavbarScrollContext';

const require = createRequire(import.meta.url);
require.extensions['.css'] = () => {};
Object.assign(globalThis, { React });
const output = process.argv[2];
if (!output) throw new Error('Usage: tsx scripts/render-tempo.tsx /path/to/website-preview');
fs.mkdirSync(output, { recursive: true });
const font = (family: string, file: string, weight: string) => `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')}) format('woff2');font-weight:${weight};font-display:swap}`;
const fonts = font('JSPARK Geist', 'node_modules/geist/dist/fonts/geist-sans/Geist-Regular.woff2', '400') + font('JSPARK Geist', 'node_modules/geist/dist/fonts/geist-sans/Geist-Medium.woff2', '500 600') + font('JSPARK Mono', 'node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.woff2', '400') + font('JSPARK Sentient', 'public/fonts/Sentient-Bold.woff2', '700');
const css = fs.readFileSync('app/(site)/jspark3/v2/tempo.css', 'utf8');
const globalCss = fs.readFileSync(path.join(output, 'global.css'), 'utf8');
const wrapper = (title: string, body: string, extras = '', stylesheet = css) => `<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>${fonts}${globalCss}:root{--font-geist-sans:'JSPARK Geist';--font-geist-mono:'JSPARK Mono';--font-wordmark:'JSPARK Sentient';--font-wordmark-stack:'JSPARK Sentient',Georgia,serif;--accent-color:#d6eea2}body{margin:0}${stylesheet}</style></head><body><main>${body}</main>${extras}</body></html>`;
for (const route of ['jspark3', 'jspark3/deepseek', 'jspark3/glm']) fs.mkdirSync(path.join(output, route), { recursive: true });
const legacyScript = `<script>const legacyFragments=${JSON.stringify(legacyFragments)};const destination=${legacyDestination.toString()};const redirect=()=>{const next=destination(location.hash);if(next)location.replace(next)};redirect();addEventListener('hashchange',redirect);</script>`;
fs.writeFileSync(path.join(output, 'jspark3/index.html'), wrapper('JSPARK3 — Releases', renderToStaticMarkup(<HubPage />), legacyScript));
fs.writeFileSync(path.join(output, 'jspark3/deepseek/index.html'), wrapper('JSPARK3 v2 — Tempo', renderToStaticMarkup(<TempoPage />)));
const social = <article className="tempo tempo-social"><div><p className="tempo-kicker">JSPARK3 v2</p><h1>Tempo</h1><p className="tempo-lede">DeepSeek-V4.1 Flash<br />on three DGX Sparks.</p><p className="tempo-intro">Our current daily driver.</p></div><ClusterIllustration /></article>;
fs.writeFileSync(path.join(output, 'social.html'), wrapper('JSPARK3 v2 — Tempo', renderToStaticMarkup(social), '', css + '.tempo-social{width:1200px;height:630px;padding:64px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:32px}.tempo-social h1{font-size:108px}.tempo-social .tempo-lede{font-size:30px}.tempo-social .jsv-cluster figcaption{display:none}'));
// CSS imports are ignored in Node, then included explicitly below for the preserved Cadence page.
async function renderCadence() {
  const { default: CadencePage } = await import('../app/(site)/jspark3/CadencePage');
  const extras = ['app/(site)/jspark3/architecture.css', 'app/css/animations.css'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
  fs.writeFileSync(path.join(output, 'jspark3/glm/index.html'), wrapper('JSPARK3 v1.1 — Cadence', renderToStaticMarkup(<NavbarScrollProvider><CadencePage /></NavbarScrollProvider>), '', extras));
}
renderCadence().then(() => {
  for (const file of ['l5-benchmarks.html', 'l5-summary.json', 'tempo-summary.json', 'tempo-benchmarks.json']) fs.copyFileSync(`public/jspark3/${file}`, path.join(output, 'jspark3', file));
  console.log(JSON.stringify({output, routes: ['/jspark3/', '/jspark3/deepseek/', '/jspark3/glm/'], note: 'Static components. Cadence portfolio chrome and React hydration require CI preview verification.'}));
}).catch(error => { console.error(error); process.exitCode = 1; });
