import { client } from './sanity.client';

const POST_VIEW_ID_PREFIX = 'views.';

export function getPostViewId(slug: string): string {
  return `${POST_VIEW_ID_PREFIX}${slug}`;
}

export async function getLivePostViewCounts(
  slugs: string[]
): Promise<Record<string, number>> {
  if (slugs.length === 0) {
    return {};
  }

  try {
    const docs = await client.fetch<Array<{ _id: string; count?: number }>>(
      `*[_type == "postView" && _id in $ids]{ _id, count }`,
      { ids: slugs.map(getPostViewId) },
      { cache: 'no-store' }
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
    return {};
  }
}
