import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/app/lib/sanity.client';
import { getPostViewId } from '@/app/lib/live-post-views';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;

export async function POST(request: NextRequest) {
  if (process.env.VIEW_WRITES_ENABLED !== '1') {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const { slug, seedCount } = (body ?? {}) as { slug?: unknown; seedCount?: unknown };
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }
  if (typeof seedCount !== 'number' || !Number.isSafeInteger(seedCount) || seedCount < 0) {
    return NextResponse.json(
      { error: 'seedCount must be a non-negative integer' },
      { status: 400 }
    );
  }

  const id = getPostViewId(slug);
  try {
    const documents = (await writeClient
      .transaction()
      .createIfNotExists({ _id: id, _type: 'postView', count: seedCount })
      .patch(id, (patch) => patch.inc({ count: 1 }))
      .commit({ visibility: 'sync', returnDocuments: true })) as Array<{
      _id: string;
      count?: number;
    }>;

    const committed = documents
      .filter((doc) => doc._id === id && typeof doc.count === 'number')
      .at(-1)?.count;

    if (typeof committed !== 'number') {
      throw new Error('Transaction response did not include the committed postView document');
    }

    return NextResponse.json({ viewCount: committed });
  } catch (error) {
    console.log(JSON.stringify({
      evt: 'viewcount',
      outcome: 'increment-failed',
      slug,
      reason: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
      ts: new Date().toISOString(),
    }));
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
  }
}
