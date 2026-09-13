/** Chromium CDP acceptance and screenshot evidence for the permitted static review. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out = process.argv[2];
if (!out) throw new Error('Usage: node scripts/verify-tempo-browser.mjs /path/to/website');
const base = process.env.TEMPO_PREVIEW_URL || 'http://127.0.0.1:8263';
const version = await (await fetch('http://127.0.0.1:9263/json/version')).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, {once:true}); ws.addEventListener('error', reject, {once:true}); });
let n = 0;
const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {const id = ++n; pending.set(id, {resolve, reject}); ws.send(JSON.stringify({id, method, params, sessionId}));});
const {targetId} = await call('Target.createTarget', {url:'about:blank'});
const {sessionId} = await call('Target.attachToTarget', {targetId, flatten:true});
const send = (m,p) => call(m,p,sessionId);
const run = async expression => {const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const pause = ms => new Promise(r=>setTimeout(r,ms));
await send('Page.enable');
await send('Emulation.setScrollbarsHidden',{hidden:true});
await send('Runtime.enable');
fs.mkdirSync(`${out}/shots`, {recursive:true});
const report = {base, browser:version.Browser, widths:{}, shots:[]};
async function viewport(width,height=900) {await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await pause(60);}
async function navigate(route) {await send('Page.navigate',{url:base+route});await pause(180);await run('document.fonts.ready.then(()=>true)');}
async function shot(name, selector) {
  await run("window.scrollTo(0,0)");
  await pause(30);
  let clip;
  if(selector) clip=await run(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);
  else {const {cssContentSize:r}=await send('Page.getLayoutMetrics');clip={x:0,y:0,width:r.width,height:r.height,scale:1};}
  const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});
  fs.writeFileSync(`${out}/shots/${name}.png`,Buffer.from(image.data,'base64'));report.shots.push(name+'.png');
}
const key = async (key, code, windowsVirtualKeyCode) => {for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode,...(key==='Enter'&&type==='keyDown'?{text:'\r'}:{})});await pause(30);};
await viewport(1440);
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await navigate('/jspark3/deepseek/');
report.reducedMotion=await run("({matches:matchMedia('(prefers-reduced-motion:reduce)').matches,root:getComputedStyle(document.documentElement).scrollBehavior})");
assert.equal(report.reducedMotion.root,'auto');
await send('Emulation.setEmulatedMedia',{features:[]});
await navigate('/jspark3/deepseek/');
await key('Tab','Tab',9);
report.skip=await run("({href:document.activeElement.getAttribute('href'),focus:document.activeElement.matches(':focus-visible')})");
assert.deepEqual(report.skip,{href:'#results',focus:true});
await shot('1440-keyboard-skip','.tempo-header');
await key('Enter','Enter',13);
report.skipDestination=await run('location.hash');
assert.equal(report.skipDestination,'#results');
await navigate('/jspark3/deepseek/');
for(const width of [1440,1280,1024,1001,1000,900,801,800,768,600,521,520,390,360,359,320]) {
  await viewport(width,width<600?844:900);
  report.widths[width]=await run(`(()=>{const bad=[...document.querySelectorAll('.tempo *')].filter(e=>!e.closest('svg')&&!e.matches('.tempo-skip,.tempo-sr-only')).map(e=>({tag:e.tagName,cls:e.className,r:e.getBoundingClientRect()})).filter(e=>e.r.width&&((e.r.right>innerWidth+.5)||(e.r.left<-.5))).map(e=>({tag:e.tag,cls:e.cls}));const ranges=[...document.querySelectorAll('.tempo-generation strong')].map(e=>{const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()].length});const tiny=[...document.querySelectorAll('.tempo p,.tempo a,.tempo label,.tempo dt,.tempo dd,.tempo figcaption')].filter(e=>e.getBoundingClientRect().height&&parseFloat(getComputedStyle(e).fontSize)<13).map(e=>e.className);return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,overflow:bad,ranges,tiny}})()`);
  const data=report.widths[width];assert.equal(data.scroll,width,`Overflow at ${width}`);assert.deepEqual(data.overflow,[],`Element overflow at ${width}`);assert.ok(data.ranges.every(x=>x===1),`Split range at ${width}`);assert.deepEqual(data.tiny,[]);
  if([1440,1024,768,390,320].includes(width)) {await shot(`${width}-tempo-full`);await shot(`${width}-tempo-hero`,'.tempo-hero');await shot(`${width}-tempo-charts`,'.tempo-charts');await shot(`${width}-tempo-generation`,'.tempo-generation');}
}
await viewport(1440);
await run("document.getElementById('tempo-64').focus()");
await key('ArrowRight','ArrowRight',39);
await run("document.getElementById('tempo-c6').focus()");
await key('ArrowLeft','ArrowLeft',37);
report.alternate=await run("({context:document.getElementById('tempo-76').checked,agents:document.getElementById('tempo-c3').checked,contextDisplay:getComputedStyle(document.querySelector('.tempo-context76')).display,agentsDisplay:getComputedStyle(document.querySelector('.tempo-work3')).display,focus:document.activeElement.matches(':focus-visible'),values:[...document.querySelectorAll('.tempo-context76 strong,.tempo-work3 .tempo-work-value')].map(e=>e.textContent)})");
assert.equal(report.alternate.context,true);assert.equal(report.alternate.agents,true);assert.equal(report.alternate.focus,true);assert.equal(report.alternate.contextDisplay,'block');assert.equal(report.alternate.agentsDisplay,'block');
await shot('1440-tempo-chart-alternate','.tempo-charts');
await viewport(390,844);await shot('390-tempo-chart-alternate','.tempo-charts');
await run("document.querySelector('#release summary').focus()");await key('Enter','Enter',13);
report.disclosure=await run("({open:document.getElementById('release').open,focus:document.activeElement.matches(':focus-visible'),width:innerWidth,scroll:document.documentElement.scrollWidth})");
assert.equal(report.disclosure.open,true);
await shot('390-tempo-disclosures','.tempo-notes');
await viewport(1440);await shot('1440-tempo-disclosures','.tempo-notes');
report.structure=await run("(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return {headings:document.querySelectorAll('h1').length,duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),brokenAnchors:[...document.querySelectorAll('a[href^=\"#\"]')].map(a=>a.hash).filter(hash=>!document.getElementById(hash.slice(1))),pendingExternalLinks:[...document.querySelectorAll('a')].map(a=>a.href).filter(h=>h.includes('jspark3-deepseek')||h.includes('jspark3-tempo'))}})()");
assert.equal(report.structure.headings,1);assert.deepEqual(report.structure.duplicateIds,[]);assert.deepEqual(report.structure.brokenAnchors,[]);assert.deepEqual(report.structure.pendingExternalLinks,[]);
report.hub={};
for(const width of [1440,1024,768,390,320]) {await viewport(width);await navigate('/jspark3/');report.hub[width]=await run('({width:innerWidth,scroll:document.documentElement.scrollWidth})');assert.ok(report.hub[width].scroll<=width);await shot(`${width}-hub-full`);}
await run("document.querySelector('a[href=\"/jspark3/deepseek/\"]').click()");await pause(180);
report.discovery=await run('location.pathname');assert.equal(report.discovery,'/jspark3/deepseek/');
await run("document.querySelector('a[href=\"#install\"]').click()");report.install=await run('location.hash');assert.equal(report.install,'#install');
await navigate('/jspark3/');
const hashes=['architecture','js3-architecture','benchmarks','evidence','js3-evidence','run','reproducibility','js3-reproducibility','provenance','js3-provenance','licensing','js3-licensing','credits','js3-credits'];
report.legacy=[];
for(const hash of hashes) {await navigate('/jspark3/#'+hash);const r=await run('({path:location.pathname,hash:location.hash,exists:!!document.getElementById(location.hash.slice(1))})');assert.equal(r.path,'/jspark3/glm/');assert.equal(r.hash,'#'+hash);assert.equal(r.exists,true);report.legacy.push(r);}
report.cadence={};
for(const width of [1440,1024,768,390,320]) {await viewport(width);await navigate('/jspark3/glm/');report.cadence[width]=await run('({width:innerWidth,scroll:document.documentElement.scrollWidth})');await shot(`${width}-cadence-full`);await shot(`${width}-cadence-header`,'header');}
await viewport(1200,630);await navigate('/social.html');await shot('tempo-social');
fs.copyFileSync(`${out}/shots/tempo-social.png`,'public/og/jspark3-tempo.png');
fs.writeFileSync(`${out}/BROWSER-VALIDATION.json`,JSON.stringify(report,null,2)+'\n');
await call('Target.closeTarget',{targetId});ws.close();
console.log(JSON.stringify({widths:Object.keys(report.widths).length,shots:report.shots.length,legacy:report.legacy.length,report:`${out}/BROWSER-VALIDATION.json`,cadence:report.cadence}));
