import assert from 'node:assert/strict';
import test from 'node:test';
import { checkVideoLoop, fileExtension, sanityFileUrl, sanityPoster, videoBox } from './video-loop';

const project = { projectId: 'abc123', dataset: 'production' };

test('file urls come from the reference, or from a resolved web url', () => {
  assert.equal(
    sanityFileUrl({ asset: { _ref: 'file-0a1b2c-mp4' } }, project),
    'https://cdn.sanity.io/files/abc123/production/0a1b2c.mp4'
  );
  assert.equal(sanityFileUrl({ asset: { url: 'https://cdn.example.com/c.webm' } }, project), 'https://cdn.example.com/c.webm');
  for (const bad of [undefined, null, {}, { asset: { _ref: 'image-a-1x1-png' } }, { asset: { url: 'javascript:x' } }]) {
    assert.equal(sanityFileUrl(bad, project), undefined, JSON.stringify(bad));
  }
  assert.equal(sanityFileUrl({ asset: { _ref: 'file-0a1b2c-mp4' } }, { projectId: '', dataset: 'production' }), undefined);
  assert.equal(fileExtension({ asset: { _ref: 'file-0a1b2c-webm' } }), 'webm');
  assert.equal(fileExtension({ asset: { url: 'https://x.test/a/clip.MP4?dl=1' } }), 'mp4');
});

test('posters carry their pixel size and are never upscaled', () => {
  const big = sanityPoster({ asset: { _ref: 'image-f00-1920x1080-png' } }, project)!;
  assert.equal(big.url, 'https://cdn.sanity.io/images/abc123/production/f00-1920x1080.png?w=1280&auto=format&q=80');
  assert.deepEqual([big.width, big.height], [1920, 1080]);
  const small = sanityPoster({ asset: { _ref: 'image-f00-800x800-jpg' } }, project)!;
  assert.equal(small.url, 'https://cdn.sanity.io/images/abc123/production/f00-800x800.jpg?auto=format&q=80');
  assert.deepEqual(sanityPoster({ asset: { url: 'https://x.test/p.png' } }, project), { url: 'https://x.test/p.png', width: 0, height: 0 });
  assert.equal(sanityPoster({}, project), undefined);
});

test('the frame takes the block size, then the poster size, then 16 by 9', () => {
  const poster = { url: 'u', width: 1080, height: 1350 };
  assert.deepEqual(videoBox({ width: 1280, height: 720 }, poster), { width: 1280, height: 720 });
  assert.deepEqual(videoBox({ width: 1280 }, poster), { width: 1080, height: 1350 });
  assert.deepEqual(videoBox({ width: -1, height: 2.5 }, poster), { width: 1080, height: 1350 });
  assert.deepEqual(videoBox(null), { width: 16, height: 9 });
  assert.deepEqual(videoBox({}, { url: 'u', width: 0, height: 0 }), { width: 16, height: 9 });
});

test('Studio asks for width and height together', () => {
  assert.equal(checkVideoLoop({}), true);
  assert.equal(checkVideoLoop({ width: 1280, height: 720 }), true);
  assert.match(String(checkVideoLoop({ width: 1280 })), /both/);
  assert.match(String(checkVideoLoop({ width: 0, height: 720 })), /whole pixels/);
});
