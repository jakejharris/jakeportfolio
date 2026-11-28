import assert from 'node:assert/strict';
import test from 'node:test';
import * as videoLoop from './video-loop';
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

test('Studio refuses alt text that is only spaces, which the page would drop', () => {
  assert.equal(checkVideoLoop({ alt: 'A square moves across the frame.' }), true);
  assert.match(String(checkVideoLoop({ alt: '   ' })), /Alt text/);
});

test('Studio refuses a file of the wrong type in either video field', () => {
  const mp4 = { asset: { _ref: 'file-abc123-mp4' } };
  assert.equal(checkVideoLoop({ mp4 }), true);
  assert.equal(checkVideoLoop({ mp4, webm: { asset: { _ref: 'file-def456-webm' } } }), true);
  assert.match(String(checkVideoLoop({ mp4: { asset: { _ref: 'file-abc123-pdf' } } })), /MP4/);
  assert.match(String(checkVideoLoop({ mp4, webm: { asset: { _ref: 'file-def456-mp4' } } })), /WebM/);
});

test('a source is offered only when its file is the type the player announces', () => {
  const { videoSource } = videoLoop as unknown as {
    videoSource: (field: unknown, type: 'mp4' | 'webm', p: typeof project) => string | undefined;
  };
  assert.equal(typeof videoSource, 'function');
  assert.equal(videoSource({ asset: { _ref: 'file-abc123-mp4' } }, 'mp4', project), 'https://cdn.sanity.io/files/abc123/production/abc123.mp4');
  assert.equal(videoSource({ asset: { _ref: 'file-abc123-pdf' } }, 'mp4', project), undefined);
  assert.equal(videoSource({ asset: { _ref: 'file-abc123-mp4' } }, 'webm', project), undefined);
  assert.equal(videoSource({ asset: { url: 'https://x.test/clip' } }, 'mp4', project), 'https://x.test/clip', 'an unknown type is left to the browser');
});

test('the Play/Pause press plays a paused clip muted and pauses a playing one', async () => {
  const { pressPlayPause } = videoLoop as unknown as {
    pressPlayPause: (video: { paused: boolean; muted: boolean; play(): Promise<void>; pause(): void }, onRefused?: () => void) => boolean;
  };
  assert.equal(typeof pressPlayPause, 'function');
  const clip = {
    paused: true,
    muted: false,
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
  };
  assert.equal(pressPlayPause(clip), true, 'playing again puts it back on autoplay');
  assert.deepEqual([clip.paused, clip.muted], [false, true]);
  assert.equal(pressPlayPause(clip), false, "a reader's pause takes it off autoplay");
  assert.equal(clip.paused, true);
  let refused = false;
  const blocked = { paused: true, muted: false, play: () => Promise.reject(new Error('blocked')), pause() {} };
  assert.equal(pressPlayPause(blocked, () => { refused = true; }), true);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(refused, true, 'a refused play is reported, so the button can show the real state');
});
