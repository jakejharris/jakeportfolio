import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/app/lib/sanity.client';
import { getPostViewsSnapshot } from '@/app/lib/post-views';
import { getLivePostViewCounts, getPostViewId } from '@/app/lib/live-post-views';

type ViewAdminPost = {
  _id: string;
  title: string;
  slug: { current: string };
  viewCount?: number;
  viewCountBase?: number;
  viewsCutoverAt?: string;
};

function getAuthFailure(request: NextRequest): NextResponse | null {
  const token = process.env.VIEWADMIN_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'View admin is unavailable' },
      { status: 503 }
    );
  }

  const expected = Buffer.from(`Bearer ${token}`);
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  const hasExpectedLength = actual.length === expected.length;
  const comparable = hasExpectedLength ? actual : Buffer.alloc(expected.length);
  const isAuthorized = timingSafeEqual(comparable, expected) && hasExpectedLength;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authFailure = getAuthFailure(request);
  if (authFailure) {
    return authFailure;
  }

  try {
    const posts = await client.fetch<ViewAdminPost[]>(
      `*[_type == "post"]{
        _id,
        title,
        slug,
        viewCount,
        viewCountBase,
        viewsCutoverAt
      } | order(title asc)`
    );
    const cutoverAt = posts.find((post) => post.viewsCutoverAt)?.viewsCutoverAt;
    const [gaSnapshot, liveViewCounts] = await Promise.all([
      getPostViewsSnapshot(cutoverAt),
      getLivePostViewCounts(posts.map((post) => post.slug.current)),
    ]);

    return NextResponse.json(posts.map((post) => {
      const viewCountBase = post.viewCountBase ?? 0;
      const gaDelta = post.viewsCutoverAt
        ? (gaSnapshot.counts[post.slug.current] ?? 0)
        : 0;

      return {
        ...post,
        viewCountBase,
        liveViewCount:
          liveViewCounts[post.slug.current] ?? post.viewCountBase ?? post.viewCount ?? 0,
        gaDelta,
        lastSuccessfulGaFetchAt: gaSnapshot.lastSuccessfulFetchAt,
        lastSuccessfulGaFetchAgeMs: gaSnapshot.lastSuccessfulFetchAgeMs,
        stale: gaSnapshot.stale,
      };
    }));
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authFailure = getAuthFailure(request);
  if (authFailure) {
    return authFailure;
  }

  try {
    const { postId, changeAmount } = await request.json();

    if (!postId || !Number.isInteger(changeAmount)) {
      return NextResponse.json(
        { error: 'postId and changeAmount (integer) are required' },
        { status: 400 }
      );
    }

    const post = await client.fetch<{
      slug?: { current: string };
      viewCount?: number;
      viewCountBase?: number;
    } | null>(
      `*[_type == "post" && _id == $postId][0]{ slug, viewCount, viewCountBase }`,
      { postId }
    );

    if (!post?.slug?.current) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const slug = post.slug.current;
    const id = getPostViewId(slug);
    const baseline = post.viewCountBase ?? post.viewCount ?? 0;
    const liveViewCounts = await getLivePostViewCounts([slug]);
    const newViewCount = (liveViewCounts[slug] ?? baseline) + changeAmount;

    if (newViewCount < 0) {
      return NextResponse.json(
        { error: 'View count cannot be negative' },
        { status: 400 }
      );
    }

    const documents = (await writeClient
      .transaction()
      .createIfNotExists({ _id: id, _type: 'postView', count: baseline })
      .patch(id, (patch) => patch.inc({ count: changeAmount }))
      .commit({ visibility: 'sync', returnDocuments: true })) as Array<{
      _id: string;
      count?: number;
    }>;

    const committed = documents
      .filter((doc) => doc._id === id && typeof doc.count === 'number')
      .at(-1)?.count;

    return NextResponse.json({
      viewCount: typeof committed === 'number' ? committed : newViewCount,
    });
  } catch (error: unknown) {
    console.error('Error updating view count:', error);
    const sanityError = error as { responseBody?: string; statusCode?: number };
    const errorMessage = sanityError.responseBody || 'Failed to update view count';
    const statusCode = sanityError.statusCode || 500;
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
