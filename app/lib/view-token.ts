import { createHmac, timingSafeEqual } from 'node:crypto';

const VIEW_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const SIGNATURE_HEX_LENGTH = 64;

function sign(slug: string, issuedAtMs: number, secret: string) {
  return createHmac('sha256', secret)
    .update(`${slug}.${issuedAtMs}`)
    .digest('hex');
}

export function mintViewToken(slug: string): string {
  const secret = process.env.VIEWS_TOKEN_SECRET;

  if (!secret) {
    return '';
  }

  const issuedAtMs = Date.now();
  return `${issuedAtMs}.${sign(slug, issuedAtMs, secret)}`;
}

export function verifyViewToken(token: string, slug: string): boolean {
  const secret = process.env.VIEWS_TOKEN_SECRET;

  if (!secret) {
    return false;
  }

  const match = token.match(/^(\d+)\.([a-f0-9]{64})$/);
  if (!match) {
    return false;
  }

  const issuedAtMs = Number(match[1]);
  const now = Date.now();
  if (
    !Number.isSafeInteger(issuedAtMs) ||
    String(issuedAtMs) !== match[1] ||
    issuedAtMs > now ||
    now > issuedAtMs + VIEW_TOKEN_TTL_MS
  ) {
    return false;
  }

  const providedSignature = Buffer.from(match[2], 'hex');
  const expectedSignature = Buffer.from(sign(slug, issuedAtMs, secret), 'hex');

  if (
    providedSignature.length !== SIGNATURE_HEX_LENGTH / 2 ||
    providedSignature.length !== expectedSignature.length
  ) {
    return false;
  }

  return timingSafeEqual(providedSignature, expectedSignature);
}
