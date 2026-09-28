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

test('future measured releases preserve the known unpublished interval', () => {
  for (const tag of ['v1.8.1', 'v1.9.0', 'v1.8.0']) {
    const history = historyFor(tag);
    assert.equal(history.release, tag.replace(/\.0$/, ''));
    assert.deepEqual(history.internal, { first: 'v1.2', last: 'v1.7' });
    assert.match(history.note, /before the public v1\.8 release/);
  }
});
