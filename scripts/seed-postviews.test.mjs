import assert from 'node:assert/strict';
import test from 'node:test';
import { getPostViewId, planPostViewSeeds } from './seed-postviews-lib.mjs';

test('builds deterministic postView IDs', () => {
  assert.equal(getPostViewId('compression-as-intelligence'), 'views.compression-as-intelligence');
});

test('plans current legacy counts and falls back to zero when missing', () => {
  assert.deepEqual(planPostViewSeeds([
    { _id: 'post-one', slug: 'compression-as-intelligence', viewCount: 364 },
    { _id: 'post-two', slug: 'new-post' },
    { _id: 'post-three', slug: 'zero-post', viewCount: 0 },
  ]), [
    { slug: 'compression-as-intelligence', id: 'views.compression-as-intelligence', count: 364 },
    { slug: 'new-post', id: 'views.new-post', count: 0 },
    { slug: 'zero-post', id: 'views.zero-post', count: 0 },
  ]);
});

test('rejects invalid slugs and counts before building a transaction', () => {
  assert.throws(
    () => planPostViewSeeds([{ _id: 'bad-slug', slug: 'Bad Slug', viewCount: 1 }]),
    /invalid slug/
  );
  assert.throws(
    () => planPostViewSeeds([{ _id: 'bad-count', slug: 'bad-count', viewCount: -1 }]),
    /invalid viewCount/
  );
});
