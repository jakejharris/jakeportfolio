import { NextRequest, NextResponse } from 'next/server';
import { getLivePostViewCounts, getPostViewId } from '@/app/lib/live-post-views';
import { writeClient } from '@/app/lib/sanity.write-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;
const BOT_USER_AGENT = /(bot|crawl|spider|slurp|bingpreview|headless|phantom|curl|wget|python-requests|axios|facebookexternalhit|embedly|preview|monitor|pingdom|uptime)/i;
const THROTTLE_WINDOW_MS = 2_000;

// Best-effort only: this Map is per serverless instance and resets on cold starts.
const lastIncrements = new Map<string, number>();

async function skippedResponse(
  slug: string,
  reason: 'skipped' | 'throttled'
) {
  const counts = await getLivePostViewCounts([slug]);
  return NextResponse.json({
    viewCount: counts[slug] ?? 0,
    [reason]: true,
  });
}

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

  const { slug } = (body ?? {}) as { slug?: unknown };
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const userAgent = request.headers.get('user-agent') ?? '';
  if (!userAgent || BOT_USER_AGENT.test(userAgent)) {
    return skippedResponse(slug, 'skipped');
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const throttleKey = `${ip}:${slug}`;
  const now = Date.now();
  const lastIncrement = lastIncrements.get(throttleKey);

  if (lastIncrement !== undefined && now - lastIncrement < THROTTLE_WINDOW_MS) {
    return skippedResponse(slug, 'throttled');
  }

  const id = getPostViewId(slug);
  try {
    const documents = (await writeClient
      .transaction()
      .createIfNotExists({ _id: id, _type: 'postView', count: 0 })
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

    lastIncrements.set(throttleKey, Date.now());
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
