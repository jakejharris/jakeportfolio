import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isViewBaselineSeeded,
  planViewBaselineSeeds,
} from './seed-view-baseline-lib.mjs';

test('treats either existing seed field as already seeded', () => {
  assert.equal(isViewBaselineSeeded({ viewCountBase: 0 }), true);
  assert.equal(
    isViewBaselineSeeded({ viewsCutoverAt: '2026-08-20T19:42:00.000Z' }),
    true
  );
  assert.equal(isViewBaselineSeeded({}), false);
});

test('plans only unseeded posts and preserves existing seed values', () => {
  const viewsCutoverAt = '2026-08-20T19:42:00.000Z';
  const posts = [
    {
      _id: 'already-seeded',
      slug: 'already-seeded',
      viewCount: 12,
      viewCountBase: 10,
      viewsCutoverAt: '2026-08-01T12:00:00.000Z',
    },
    {
      _id: 'new-post',
      slug: 'new-post',
      viewCount: 7,
    },
    {
      _id: 'new-post-without-legacy-count',
      slug: 'new-post-without-legacy-count',
    },
  ];

  const { postsToSeed, skippedPosts } = planViewBaselineSeeds(
    posts,
    viewsCutoverAt
  );

  assert.deepEqual(skippedPosts, [posts[0]]);
  assert.deepEqual(postsToSeed, [
    {
      ...posts[1],
      seedValues: { viewCountBase: 7, viewsCutoverAt },
    },
    {
      ...posts[2],
      seedValues: { viewCountBase: 0, viewsCutoverAt },
    },
  ]);
});
