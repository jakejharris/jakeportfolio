import 'server-only';

import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from './sanity.config';

const POST_VIEW_ID_PREFIX = 'views.';

export function getPostViewId(slug: string): string {
  return `${POST_VIEW_ID_PREFIX}${slug}`;
}

function createPostViewReadClient(token: string) {
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    perspective: 'published',
    token,
  });
}

export async function getLivePostViewCounts(
  slugs: string[],
  { revalidate = 0 }: { revalidate?: number } = {}
): Promise<Record<string, number>> {
  if (slugs.length === 0) {
    return {};
  }

  const token = process.env.SANITY_API_READ_TOKEN;
  if (!token) {
    return {};
  }

  try {
    const docs = await createPostViewReadClient(token).fetch<
      Array<{ _id: string; count?: number }>
    >(
      `*[_type == "postView" && _id in $ids]{ _id, count }`,
      { ids: slugs.map(getPostViewId) },
      // Public pages can reuse a short snapshot. API/admin callers keep the
      // default live read so increments and corrections return current counts.
      revalidate > 0
        ? { next: { revalidate, tags: ['views'] } }
        : { cache: 'no-store' }
    );

    return Object.fromEntries(
      docs
        .filter((doc) => typeof doc.count === 'number')
        .map((doc) => [doc._id.slice(POST_VIEW_ID_PREFIX.length), doc.count as number])
    );
  } catch (error) {
    console.log(JSON.stringify({
      evt: 'viewcount',
      outcome: 'live-read-failed',
      reason: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
      ts: new Date().toISOString(),
    }));
    // An ISR failure retains the last successful page. With no prior render
    // (new slug/build), fail instead of caching a misleading baseline for all.
    if (revalidate > 0) throw error;
    return {};
  }
}
