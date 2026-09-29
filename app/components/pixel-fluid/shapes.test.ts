import assert from 'node:assert/strict';
import test from 'node:test';
import { isSea, seaOptions, waterShape } from './shapes';

test('each page gets the water it was designed with', () => {
  assert.equal(waterShape('/'), 'hero');
  assert.equal(waterShape('/jspark3/'), 'hub');
  assert.equal(waterShape('/jspark3'), 'hub');
  assert.equal(waterShape('/tags/agents/'), 'open');
  assert.equal(waterShape('/posts/joining-docusign/'), 'shore');
  assert.equal(waterShape('/about/'), 'shore');
  assert.equal(waterShape('/contact'), 'shore');
});

test('release pages and internal tools keep their own look', () => {
  assert.equal(waterShape('/jspark3/glm/'), 'none');
  assert.equal(waterShape('/jspark3/deepseek/'), 'none');
  assert.equal(waterShape('/viewadmin/'), 'none');
  assert.equal(waterShape('/drafts/'), 'none');
});

test('query strings and hashes do not change the shape', () => {
  assert.equal(waterShape('/?utm=1'), 'hero');
  assert.equal(waterShape('/about/#history'), 'shore');
});

test('the sea shapes keep the compositions the pages used before', () => {
  assert.deepEqual(seaOptions('hero'), { heroMode: true, quietShare: 0 });
  assert.deepEqual(seaOptions('hub'), { heroMode: true, quietShare: 0.75 });
  assert.deepEqual(seaOptions('open'), { heroMode: false, quietShare: 0 });
  assert.equal(isSea('shore'), false);
  assert.equal(isSea('none'), false);
});
