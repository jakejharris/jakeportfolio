import assert from 'node:assert/strict';
import test from 'node:test';

require.extensions['.css'] = (module: NodeModule) => { module.exports = {}; };

async function render(name: string, props: object) {
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: Component } = await import(`./${name}`);
  return renderToStaticMarkup(React.createElement(Component, props));
}

const run = {
  _type: 'runChart',
  _key: 'r',
  title: 'A Short Run',
  label: 'One Morning',
  caption: 'Each bar is one turn.',
  start: '09:05',
  timeZone: 'Local Time',
  legendTitle: 'Maker',
  fullLabel: 'Work',
  thinLabel: 'Review',
  groups: [
    { _key: 'g1', key: 'me', label: 'Me' },
    { _key: 'g2', key: 'p1', label: 'Part 1', heading: 'Parts Side by Side' },
  ],
  categories: [
    { _key: 'c1', key: 'a', label: 'Maker A' },
    { _key: 'c2', key: 'b', label: 'Maker B' },
  ],
  lanes: [
    { _key: 'l1', key: 'me', label: 'Me', group: 'me' },
    { _key: 'l2', key: 'p1-1', label: 'Agent 1', group: 'p1' },
    { _key: 'l3', key: 'p1-2', label: 'Agent 2', group: 'p1', thin: true },
  ],
  spans: [
    { _key: 's1', lane: 'p1-1', start: '09:20', end: '10:05', category: 'a' },
    { _key: 's2', lane: 'p1-2', start: '10:10', end: '10:30', category: 'b' },
  ],
  markers: [
    { _key: 'm1', lane: 'me', time: '09:05', kind: 'accent', label: 'The Ask' },
    { _key: 'm2', lane: 'me', time: '10:40' },
  ],
  milestones: [
    { _key: 'x1', time: '10:05', label: 'First Result' },
    { _key: 'x2', time: '15:00', label: 'Much Later' },
  ],
};

test('a run chart draws each bar twice (dim and live) and opts into the motion gate', async () => {
  const html = await render('RunChart', { value: run });
  assert.match(html, /<figure class="post-figure" data-post-figure="runChart" data-pf-motion="">/);
  assert.equal(html.match(/data-pf-motion/g)?.length, 1, 'one motion root, the figure');
  assert.equal(html.match(/class="pf-run-bar /g)?.length, 4, 'two spans in two layers');
  assert.equal(html.match(/class="pf-run-layer is-live"/g)?.length, 1);
  assert.match(html, /pf-run-bar pf-run-c1 is-thin/);
  assert.match(html, /pf-run-dot is-accent/);
  assert.match(html, /<b>10:05 AM<\/b> First Result/);
  assert.match(html, /<b>3:00 PM<\/b> Much Later/, 'a milestone after the axis is listed');
  for (const text of ['A Short Run', 'One Morning', 'Each bar is one turn.', 'Maker A', 'Maker B', 'Work', 'Review', 'Local Time', 'Part 1', 'Parts Side by Side']) {
    assert.ok(html.includes(text), text);
  }
});

test('the run chart settles on its final readout and carries every fact as text', async () => {
  const html = await render('RunChart', { value: run });
  assert.match(html, /of 2 Turns Done/);
  const strip = html.slice(html.indexOf('pf-run-odo is-count'));
  assert.match(strip, /<span>0<\/span><span>0<\/span><span>2<\/span><\/span>/, 'one count per axis hour, ending on all done');
  const sr = html.slice(html.indexOf('class="sr-only"'));
  assert.match(sr, /3 rows and 2 bars, from 9:05 AM to 10:40 AM, Local Time\./);
  assert.match(sr, /Milestones: 10:05 AM First Result; 3:00 PM Much Later\./);
  assert.match(sr, /Me: marks at 9:05 AM \(The Ask\), 10:40 AM\./);
  assert.match(sr, /Parts Side by Side\. Part 1:<ul><li>Agent 1, Maker A: 9:20 to 10:05 AM\.<\/li><li>Agent 2, Maker B, Review: 10:10 to 10:30 AM\.<\/li>/);
  for (const part of ['pf-run-readout', 'pf-run-top', 'pf-run-chart', 'pf-run-bottom']) {
    assert.match(html, new RegExp(`class="${part}[^"]*"[^>]*aria-hidden="true"`), part);
  }
});

test('a run chart with nothing drawable renders nothing and never throws', async () => {
  assert.equal(await render('RunChart', { value: { _key: 'r', start: 'later' } }), '');
  assert.equal(await render('RunChart', { value: { ...run, spans: null, markers: 'x', lanes: [{}] } }), '');
  const odd = await render('RunChart', { value: { ...run, categories: [{ key: 'a', label: 'Maker A' }], milestones: null, groups: [...run.groups, null] } });
  assert.equal(odd.match(/class="pf-run-bar /g)?.length, 2, 'the span with an unknown category is dropped');
});

test('text fields that are not text are dropped, not thrown', async () => {
  const html = await render('RunChart', { value: { ...run, title: { a: 1 }, caption: 7, legendTitle: ['x'], timeZone: null, countLabel: 3 } });
  assert.match(html, /of 2 Turns Done/);
  assert.doesNotMatch(html, /figcaption/);
  const video = await render('VideoLoop', {
    value: { _key: 'v', title: 5, alt: { x: 1 }, mp4: { asset: { _ref: 'file-abc-mp4' } } },
    project: { projectId: 'p', dataset: 'd' },
  });
  assert.match(video, /aria-label="Video clip"/);
  assert.match(video, /<video/);
});

test('a looping video renders a native player with a poster and no autoplay until its script runs', async () => {
  const html = await render('VideoLoop', {
    value: {
      _type: 'videoLoop',
      _key: 'v',
      title: 'A Clip',
      label: 'Six Seconds',
      caption: 'The clip loops while it is on screen.',
      alt: 'A square moves across the frame.',
      mp4: { asset: { _ref: 'file-abc123-mp4' } },
      webm: { asset: { _ref: 'file-def456-webm' } },
      poster: { asset: { _ref: 'image-f00-1080x1350-png' } },
    },
    project: { projectId: 'proj1', dataset: 'production' },
  });
  assert.match(html, /<figure class="post-figure" data-post-figure="videoLoop" data-pf-motion="">/);
  assert.match(html, /<video[^>]* data-pf-autoplay=""/, 'MotionGate plays it in view');
  assert.match(html, /aspect-ratio:1080 \/ 1350/);
  assert.match(html, /<video[^>]* controls=""/);
  assert.match(html, /preload="none"/);
  assert.match(html, /playsinline=""/);
  assert.match(html, /loop=""/);
  assert.doesNotMatch(html.replace(/data-pf-autoplay/g, ''), /autoplay/i, 'no native autoplay');
  assert.match(html, /poster="https:\/\/cdn\.sanity\.io\/images\/proj1\/production\/f00-1080x1350\.png\?auto=format&amp;q=80"/);
  assert.ok(html.indexOf('def456.webm') < html.indexOf('abc123.mp4'), 'WebM is offered first');
  assert.match(html, /aria-label="A square moves across the frame\."/);
  assert.doesNotMatch(html, /pf-video-toggle/, 'the button arrives with the script');
  assert.match(html, /<\/video><\/div><div class="pf-video-bar"><\/div>/, 'its row under the clip is reserved on the server');
  assert.match(html, /The clip loops while it is on screen\./);
});

test('a looping video with no playable source renders nothing', async () => {
  assert.equal(await render('VideoLoop', { value: { _key: 'v', alt: 'x', poster: {} }, project: { projectId: 'p', dataset: 'd' } }), '');
});

test('the table of contents ignores both blocks', async () => {
  const { getPostHeadings } = await import('@/app/lib/post-headings');
  const headings = getPostHeadings([
    { _type: 'block', _key: 'h', style: 'h2', children: [{ _type: 'span', _key: 's', text: 'A Heading' }] },
    { _type: 'runChart', _key: 'r' },
    { _type: 'videoLoop', _key: 'v' },
  ] as never);
  assert.deepEqual(headings.map((h) => h.text), ['A Heading']);
});

const longRun = {
  _type: 'runChart',
  _key: 'r24',
  start: '08:30',
  groups: [{ _key: 'g1', key: 'g1', label: 'Part 1' }],
  categories: [{ _key: 'c1', key: 'c1', label: 'Maker A' }],
  lanes: [{ _key: 'l1', key: 'l1', label: 'Agent 1', group: 'g1' }],
  spans: [{ _key: 's1', lane: 'l1', start: '09:00', end: '08:15', category: 'c1' }],
};

test('a run of a day or more renders without React key clashes', async () => {
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  };
  try {
    await render('RunChart', { value: longRun });
  } finally {
    console.error = original;
  }
  assert.deepEqual(errors.filter((e) => /same key/i.test(e)), []);
  const html = await render('RunChart', { value: longRun });
  const track = html.slice(html.indexOf('pf-run-odo-track'), html.indexOf('</span></span>', html.indexOf('pf-run-odo-track')));
  assert.ok((track.match(/8 AM/g) ?? []).length >= 2, 'the clock strip repeats hours past a day');
});

test('the run chart legend is drawn for the eye; screen readers get the summary first', async () => {
  const html = await render('RunChart', { value: run });
  assert.match(html, /<div class="pf-run-legend" aria-hidden="true">/);
  assert.ok(html.indexOf('class="sr-only"') > 0);
});

// ---- the stylesheet: the same motion contract as post-figures.css

const css = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../../css/run-figures.css'), 'utf8') as string;

test('run figure labels are not set in capitals by the stylesheet', () => {
  assert.doesNotMatch(css, /text-transform:\s*uppercase/);
});

test('run chart animations touch only transform and opacity, and start and end on the settled frame', () => {
  const blocks = [...css.matchAll(/@keyframes ([\w-]+) \{([\s\S]*?)\n\}/g)];
  assert.equal(blocks.length, 4);
  for (const [, name, body] of blocks) {
    const steps = [...body.matchAll(/([\d.%, ]+)\{([^}]*)\}/g)].map((m) => ({
      at: m[1].split(',').map((x) => x.trim()),
      decls: m[2].trim().replace(/\s+/g, ' '),
    }));
    for (const step of steps) {
      for (const property of step.decls.split(';').map((d) => d.split(':')[0].trim()).filter(Boolean)) {
        assert.ok(['transform', 'opacity'].includes(property), `${name} animates ${property}`);
      }
    }
    const first = steps.find((x) => x.at.includes('0%'));
    const last = steps.find((x) => x.at.includes('100%'));
    assert.ok(first && last, `${name} has a first and last frame`);
    assert.equal(first.decls, last.decls, `${name} loops without a jump`);
  }
});

test('the run chart playhead is hidden in its static style, so a cancelled loop shows the settled chart', () => {
  const rule = css.match(/\.pf-run-playhead \{([^}]*)\}/g)?.find((r) => r.includes('animation:')) ?? '';
  assert.match(rule, /opacity: 0;/);
});

test('run chart animations run only without a reduced-motion preference, behind the gate', () => {
  const open = css.indexOf('@media (prefers-reduced-motion: no-preference) {');
  const gated = css.slice(open, css.indexOf('@media (forced-colors', open));
  const outside = css.replace(gated, '');
  assert.doesNotMatch(outside, /animation(-name)?:/, 'no animation is set outside the media block');
  const rules = [...gated.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*animation[^{}]*)\}/g)];
  assert.equal(rules.length, 4);
  for (const [, selector, body] of rules) {
    assert.match(selector.trim(), /^\[data-pf-js\] \[data-pf-motion\]/, selector.trim());
    assert.match(body, /animation-play-state: var\(--pf-play, paused\)/, selector.trim());
  }
});
