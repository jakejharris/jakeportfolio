import { createClient } from 'next-sanity';
import { planViewBaselineSeeds } from './seed-view-baseline-lib.mjs';

const shouldCommit = process.argv.includes('--commit');
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is required');
}

if (shouldCommit && !token) {
  throw new Error('SANITY_API_WRITE_TOKEN is required with --commit');
}

const sanity = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2023-05-03',
  perspective: 'published',
  token,
  useCdn: false,
});

const posts = await sanity.fetch(
  `*[_type == "post" && !(_id in path("drafts.**")) && defined(publishedAt)]{
    _id,
    title,
    "slug": slug.current,
    viewCount,
    viewCountBase,
    viewsCutoverAt
  } | order(title asc)`
);
const viewsCutoverAt = new Date().toISOString();
const { postsToSeed, skippedPosts } = planViewBaselineSeeds(
  posts,
  viewsCutoverAt
);

console.log(JSON.stringify({
  mode: shouldCommit ? 'commit' : 'dry-run',
  postCount: posts.length,
  seedPostCount: postsToSeed.length,
  skippedPostCount: skippedPosts.length,
  candidateViewsCutoverAt: viewsCutoverAt,
}, null, 2));

for (const post of skippedPosts) {
  console.log(JSON.stringify({
    _id: post._id,
    slug: post.slug,
    action: 'skip',
    reason: 'already-seeded',
    viewCountBase: post.viewCountBase ?? null,
    viewsCutoverAt: post.viewsCutoverAt ?? null,
  }));
}

for (const post of postsToSeed) {
  console.log(JSON.stringify({
    _id: post._id,
    slug: post.slug,
    action: shouldCommit ? 'seed' : 'would-seed',
    viewCountBase: post.seedValues.viewCountBase,
    viewsCutoverAt: post.seedValues.viewsCutoverAt,
  }));
}

if (!shouldCommit) {
  console.log('Dry run only. Re-run with --commit to write the batched mutation.');
  process.exit(0);
}

if (postsToSeed.length === 0) {
  console.log(JSON.stringify({
    committed: false,
    noOp: true,
    seededPostCount: 0,
    skippedPostCount: skippedPosts.length,
    reason: 'no-unseeded-posts',
  }, null, 2));
  process.exit(0);
}

let transaction = sanity.transaction();
for (const post of postsToSeed) {
  transaction = transaction.patch(post._id, {
    setIfMissing: post.seedValues,
  });
}

const result = await transaction.commit();
console.log(JSON.stringify({
  committed: true,
  seededPostCount: postsToSeed.length,
  skippedPostCount: skippedPosts.length,
  transactionId: result.transactionId,
  viewsCutoverAt,
}, null, 2));
