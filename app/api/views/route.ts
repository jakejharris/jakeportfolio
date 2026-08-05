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

type RejectReason =
  | 'origin'
  | 'bot'
  | 'token'
  | 'dedup'
  | 'slug'
  | 'json'
  | 'notfound'
  | 'error';

function getClientIp(request: NextRequest): string {
  // Vercel supplies the platform-specific headers. Off-platform, the nearest
  // trusted proxy is assumed to append its client as the final XFF hop.
  const platformIp =
    request.headers.get('x-vercel-forwarded-for')?.trim() ||
    request.headers.get('x-real-ip')?.trim();
  if (platformIp) {
    return platformIp.split(',')[0].trim();
  }

  return request.headers
    .get('x-forwarded-for')
    ?.split(',')
    .at(-1)
    ?.trim() ?? '';
}

function getIpHash(request: NextRequest): string | null {
  const secret = process.env.VIEWS_TOKEN_SECRET;
  if (!secret) {
    return null;
  }

  return createHash('sha256')
    .update(getClientIp(request) + secret)
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
    source: outcome === 'rej'
      ? (request.headers.get('origin') ?? request.headers.get('referer') ?? '').slice(0, 200)
      : undefined,
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

    const configuredPreviewHosts = [
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ]
      .filter((host): host is string => Boolean(host))
      .map((host) => host.toLowerCase());

    if (configuredPreviewHosts.includes(hostname)) {
      return true;
    }

    if (hostname.endsWith('.vercel.app')) {
      return (
        configuredPreviewHosts.length === 0 &&
        /^jakeportfolio-[a-z0-9-]+\.vercel\.app$/.test(hostname)
      );
    }

    return (
      process.env.NODE_ENV === 'development' &&
      (hostname === 'localhost' || hostname === '127.0.0.1')
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
      return reject(request, slug, 'json');
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

    const ipHash = getIpHash(request);
    if (!ipHash) {
      return reject(request, slug, 'token');
    }

    dedupKey = `${ipHash}:${slug}`;
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
      return reject(request, slug, 'notfound');
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
    console.error('Error incrementing view count:', error);
    return reject(request, slug, 'error');
  }
}
