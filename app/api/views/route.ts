import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/app/lib/sanity.client';
import { writeClient } from '@/app/lib/sanity.write-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BOT_USER_AGENT = /(bot|crawl|spider|slurp|bingpreview|headless|phantom|curl|wget|python-requests|axios|facebookexternalhit|embedly|preview|monitor|pingdom|uptime)/i;
const THROTTLE_WINDOW_MS = 2_000;

// Best-effort only: this Map is per serverless instance and resets on cold starts.
const lastIncrements = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const slug = body && typeof body === 'object' && 'slug' in body
      ? body.slug
      : null;

    if (typeof slug !== 'string' || !slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const post = await client.fetch<{ _id: string; viewCount?: number } | null>(
      `*[_type == "post" && slug.current == $slug][0]{ _id, viewCount }`,
      { slug }
    );

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const userAgent = request.headers.get('user-agent') ?? '';
    if (!userAgent || BOT_USER_AGENT.test(userAgent)) {
      return NextResponse.json({
        viewCount: post.viewCount ?? 0,
        skipped: true,
      });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const throttleKey = `${ip}:${slug}`;
    const now = Date.now();
    const lastIncrement = lastIncrements.get(throttleKey);

    if (lastIncrement !== undefined && now - lastIncrement < THROTTLE_WINDOW_MS) {
      return NextResponse.json({
        viewCount: post.viewCount ?? 0,
        throttled: true,
      });
    }

    const updatedPost = await writeClient
      .patch(post._id)
      // viewCount may be null/absent on older docs; seed it so inc() can't fail.
      .setIfMissing({ viewCount: 0 })
      .inc({ viewCount: 1 })
      .commit();

    lastIncrements.set(throttleKey, Date.now());

    return NextResponse.json({ viewCount: updatedPost.viewCount });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return NextResponse.json(
      { error: 'Failed to increment view count' },
      { status: 500 }
    );
  }
}
