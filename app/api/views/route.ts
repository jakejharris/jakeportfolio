import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isbot } from 'isbot';
import { client, writeClient } from '@/app/lib/sanity.client';
import { verifyViewToken } from '@/app/lib/view-token';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000;
const DEDUP_MAX_ENTRIES = 5_000;

// Best-effort only: this per-lambda-instance memory resets on cold starts. It
// blunts tight repeat loops but does not guarantee global deduplication.
const recentViews = new Map<string, number>();

type RejectReason = 'origin' | 'bot' | 'token' | 'dedup' | 'slug';

function getIpHash(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '';
  const secret = process.env.VIEWS_TOKEN_SECRET ?? '';

  return createHash('sha256')
    .update(ip + secret)
    .digest('hex')
    .slice(0, 16);
}

function logRequest(
  request: NextRequest,
  slug: string,
  outcome: 'inc' | 'rej',
  reason: RejectReason | null
) {
  console.log(JSON.stringify({
    evt: 'views',
    slug: slug.slice(0, 128),
    outcome,
    reason,
    ua: (request.headers.get('user-agent') ?? '').slice(0, 120),
    ip: getIpHash(request),
    ts: new Date().toISOString(),
  }));
}

function reject(request: NextRequest, slug: string, reason: RejectReason) {
  logRequest(request, slug, 'rej', reason);
  return new NextResponse(null, { status: 204 });
}

function isAllowedSource(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (hostname === 'jakejh.com' || hostname === 'www.jakejh.com') {
      return true;
    }

    if (hostname.endsWith('.vercel.app')) {
      return true;
    }

    return (
      process.env.NODE_ENV === 'development' &&
      hostname === 'localhost' &&
      Boolean(url.port)
    );
  } catch {
    return false;
  }
}

function hasAllowedSource(request: NextRequest): boolean {
  const sources = [
    request.headers.get('origin'),
    request.headers.get('referer'),
  ];

  return sources.some((source) => source !== null && isAllowedSource(source));
}

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const previous = recentViews.get(key);

  if (previous !== undefined && now - previous < DEDUP_TTL_MS) {
    recentViews.delete(key);
    recentViews.set(key, previous);
    return true;
  }

  recentViews.delete(key);
  recentViews.set(key, now);

  while (recentViews.size > DEDUP_MAX_ENTRIES) {
    const oldestKey = recentViews.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    recentViews.delete(oldestKey);
  }

  return false;
}

export async function POST(request: NextRequest) {
  let slug = '';
  let dedupKey: string | null = null;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return reject(request, slug, 'slug');
    }

    if (typeof body !== 'object' || body === null) {
      return reject(request, slug, 'slug');
    }

    const candidateSlug = 'slug' in body ? body.slug : undefined;
    slug = typeof candidateSlug === 'string' ? candidateSlug : '';

    if (!SLUG_PATTERN.test(slug)) {
      return reject(request, slug, 'slug');
    }

    if (!hasAllowedSource(request)) {
      return reject(request, slug, 'origin');
    }

    const userAgent = request.headers.get('user-agent');
    if (!userAgent || isbot(userAgent)) {
      return reject(request, slug, 'bot');
    }

    const candidateToken = 'viewToken' in body ? body.viewToken : undefined;
    if (
      typeof candidateToken !== 'string' ||
      !verifyViewToken(candidateToken, slug)
    ) {
      return reject(request, slug, 'token');
    }

    dedupKey = `${getIpHash(request)}:${slug}`;
    if (isDuplicate(dedupKey)) {
      return reject(request, slug, 'dedup');
    }

    // Find the post by slug
    const post = await client.fetch<{ _id: string } | null>(
      `*[_type == "post" && slug.current == $slug][0]`,
      { slug }
    );

    if (!post) {
      recentViews.delete(dedupKey);
      return reject(request, slug, 'slug');
    }

    // Increment the view count using the writeClient
    const updatedPost = await writeClient
      .patch(post._id)
      .inc({ viewCount: 1 })
      .commit();

    logRequest(request, slug, 'inc', null);
    return NextResponse.json({
      viewCount: updatedPost.viewCount,
    });
  } catch (error) {
    if (dedupKey) {
      recentViews.delete(dedupKey);
    }
    logRequest(request, slug, 'rej', null);
    console.error('Error incrementing view count:', error);
    return NextResponse.json(
      { error: 'Failed to increment view count' },
      { status: 500 }
    );
  }
}
