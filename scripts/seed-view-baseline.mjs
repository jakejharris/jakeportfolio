import { createClient } from 'next-sanity';

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
    viewCount
  } | order(title asc)`
);
const viewsCutoverAt = new Date().toISOString();

console.log(JSON.stringify({
  mode: shouldCommit ? 'commit' : 'dry-run',
  postCount: posts.length,
  viewsCutoverAt,
}, null, 2));

for (const post of posts) {
  console.log(JSON.stringify({
    _id: post._id,
    slug: post.slug,
    viewCountBase: post.viewCount ?? 0,
    viewsCutoverAt,
  }));
}

if (!shouldCommit) {
  console.log('Dry run only. Re-run with --commit to write the batched mutation.');
  process.exit(0);
}

let transaction = sanity.transaction();
for (const post of posts) {
  transaction = transaction.patch(post._id, {
    set: {
      viewCountBase: post.viewCount ?? 0,
      viewsCutoverAt,
    },
  });
}

const result = await transaction.commit();
console.log(JSON.stringify({
  committed: true,
  postCount: posts.length,
  transactionId: result.transactionId,
  viewsCutoverAt,
}, null, 2));
