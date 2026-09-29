import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import fixture from '../../../scripts/fixtures/glm-release.synthetic.json';

// Load the real copy module in isolation with future release data, without writing the generated file.
function historyFor(tag: string) {
  const data = structuredClone(fixture);
  data.tag = data.install_tag = data.headline.build = tag;
  data.version = tag.replace(/\.\d+$/, '');
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--eval', `
    const file = require.resolve('./app/(site)/jspark3/glm-release.json');
    require.cache[file] = { exports: JSON.parse(require('node:fs').readFileSync(0, 'utf8')) };
    const { RELEASE, INTERNAL_BUILDS, GLM_COPY } = require('./app/(site)/jspark3/release-copy.ts');
    console.log(JSON.stringify({ release: RELEASE, internal: INTERNAL_BUILDS, note: GLM_COPY.internalBuilds }));
  `], { input: JSON.stringify(data), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

// The same isolated load with a measured tag and a possibly later install tag.
function installCopyFor(tag: string, installTag: string) {
  const data = structuredClone(fixture);
  const repo = 'https://github.com/jakejharris/jspark3';
  data.tag = data.headline.build = tag;
  data.install_tag = installTag;
  data.version = tag.replace(/\.\d+$/, '');
  data.links = { ...data.links, release: `${repo}/releases/tag/${installTag}`, source: `${repo}/tree/${installTag}`, install: `${repo}/blob/${installTag}/docs/INSTALL.md` };
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--eval', `
    const file = require.resolve('./app/(site)/jspark3/glm-release.json');
    require.cache[file] = { exports: JSON.parse(require('node:fs').readFileSync(0, 'utf8')) };
    const { INSTALL_NOTE, HUB_COPY, GLM_COPY } = require('./app/(site)/jspark3/release-copy.ts');
    console.log(JSON.stringify({ note: INSTALL_NOTE, hub: HUB_COPY.glmCard.installNote, hero: GLM_COPY.install.note, results: GLM_COPY.resultsNotes }));
  `], { input: JSON.stringify(data), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('a later install patch carries the measured-build note to the hub card and names the measured release notes', () => {
  const copy = installCopyFor('v1.8.0', 'v1.8.2');
  assert.equal(copy.note, 'The numbers were measured on v1.8.0. v1.8.2 fixes installation; its default settings have not been benchmarked yet.');
  assert.equal(copy.hub, copy.note);
  assert.equal(copy.hero, copy.note);
  assert.deepEqual(copy.results, { label: 'v1.8.0 release notes and full results ↗', href: 'https://github.com/jakejharris/jspark3/releases/tag/v1.8.0' });
});

test('when installers get the measured build there is no note and the results link is the release', () => {
  const copy = installCopyFor('v1.9.0', 'v1.9.0');
  assert.equal(copy.note, null);
  assert.equal(copy.hub, null);
  assert.equal(copy.hero, null);
  assert.deepEqual(copy.results, { label: 'Release notes and full results ↗', href: 'https://github.com/jakejharris/jspark3/releases/tag/v1.9.0' });
});

test('future measured releases preserve the known unpublished interval', () => {
  for (const tag of ['v1.8.1', 'v1.9.0', 'v1.8.0']) {
    const history = historyFor(tag);
    assert.equal(history.release, tag.replace(/\.0$/, ''));
    assert.deepEqual(history.internal, { first: 'v1.2', last: 'v1.7' });
    assert.match(history.note, /before the public v1\.8 release/);
  }
});

test('v1.8.4 installation keeps the historical results and shares the coop release note', () => {
  const copy = installCopyFor('v1.8.0', 'v1.8.4');
  assert.equal(copy.note, 'The numbers were measured on v1.8.0 with the cooperative MoE kernel on. v1.8.4 builds that kernel to the exact bytes we qualified and turns it on for every install. Its own measurements follow.');
  assert.equal(copy.hub, copy.note);
  assert.equal(copy.hero, copy.note);
  assert.deepEqual(copy.results, { label: 'v1.8.0 release notes and full results ↗', href: 'https://github.com/jakejharris/jspark3/releases/tag/v1.8.0' });
});

test('the v1.8.4 note does not make claims about another measured build or install patch', () => {
  for (const [tag, installTag] of [['v1.8.0', 'v1.8.5'], ['v1.8.1', 'v1.8.4']]) {
    const copy = installCopyFor(tag, installTag);
    assert.equal(copy.note, `The numbers were measured on ${tag}. ${installTag} fixes installation; its default settings have not been benchmarked yet.`);
  }
  assert.equal(installCopyFor('v1.8.4', 'v1.8.4').note, null);
});
