import { createClient } from '@sanity/client';
import { planPostViewSeeds } from './seed-postviews-lib.mjs';

const allowedArguments = new Set(['--commit']);
const unknownArguments = process.argv.slice(2).filter((argument) => !allowedArguments.has(argument));
if (unknownArguments.length > 0) {
  throw new Error(`Unknown argument(s): ${unknownArguments.join(', ')}`);
}

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
  token: shouldCommit ? token : undefined,
  useCdn: false,
});

const posts = await sanity.fetch(
  `*[_type == "post" && !(_id in path("drafts.**")) && defined(slug.current)]{
    _id,
    "slug": slug.current,
    viewCount
  } | order(slug asc)`
);
const seeds = planPostViewSeeds(posts);

console.log(JSON.stringify({
  mode: shouldCommit ? 'commit' : 'dry-run',
  dataset,
  postCount: seeds.length,
}, null, 2));

for (const seed of seeds) {
  console.log(JSON.stringify({
    slug: seed.slug,
    count: seed.count,
    id: seed.id,
    action: shouldCommit ? 'seed' : 'would-seed',
  }));
}

if (!shouldCommit) {
  console.log('Dry run only. Re-run with --commit while VIEW_WRITES_ENABLED is disabled.');
  process.exit(0);
}

if (seeds.length === 0) {
  console.log(JSON.stringify({ committed: false, noOp: true, seededPostCount: 0 }, null, 2));
  process.exit(0);
}

let transaction = sanity.transaction();
for (const seed of seeds) {
  transaction = transaction
    .createIfNotExists({ _id: seed.id, _type: 'postView', count: 0 })
    .patch(seed.id, { set: { count: seed.count } });
}

const result = await transaction.commit({ visibility: 'sync' });
console.log(JSON.stringify({
  committed: true,
  seededPostCount: seeds.length,
  transactionId: result.transactionId,
}, null, 2));
