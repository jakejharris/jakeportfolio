import "server-only";

import crypto from "crypto";

export const DRAFTS_AUTH_COOKIE_NAME = "__Host-drafts_auth";

const COOKIE_VERSION = "v1";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const COOKIE_DOMAIN_TAG = "cookie:";
const PASSCODE_DOMAIN_TAG = "pw:";

type CookieStore = {
  get(name: string): { value?: string } | undefined;
};

type DraftsConfigStatus = {
  ready: boolean;
};

function getCookieSecret(): Buffer | null {
  const secret = process.env.DRAFTS_COOKIE_SECRET;

  if (!secret || secret.length < 64 || secret.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(secret)) {
    return null;
  }

  return Buffer.from(secret, "hex");
}

export function getDraftsConfigStatus(): DraftsConfigStatus {
  return {
    ready: Boolean(
      process.env.DRAFTS_PASSCODE &&
      process.env.SANITY_API_READ_TOKEN &&
      getCookieSecret()
    ),
  };
}

function hmacHex(domainTag: string, value: string, secret: Buffer): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${domainTag}${value}`)
    .digest("hex");
}

function constantTimeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function isDraftsAuthed(cookieStore: CookieStore): boolean {
  const secret = getCookieSecret();
  if (!secret) {
    return false;
  }

  const cookieValue = cookieStore.get(DRAFTS_AUTH_COOKIE_NAME)?.value;
  if (!cookieValue) {
    return false;
  }

  const [version, expiry, signature] = cookieValue.split(".");
  if (version !== COOKIE_VERSION || !expiry || !signature || !/^\d+$/.test(expiry)) {
    return false;
  }

  const expiresAt = Number(expiry);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = hmacHex(COOKIE_DOMAIN_TAG, expiry, secret);
  return constantTimeEqualHex(signature, expectedSignature);
}

export function verifyDraftsPasscode(passcode: string): boolean {
  const secret = getCookieSecret();
  const expectedPasscode = process.env.DRAFTS_PASSCODE;

  if (!secret || !expectedPasscode) {
    return false;
  }

  const providedSignature = hmacHex(PASSCODE_DOMAIN_TAG, passcode, secret);
  const expectedSignature = hmacHex(PASSCODE_DOMAIN_TAG, expectedPasscode, secret);

  return constantTimeEqualHex(providedSignature, expectedSignature);
}

export function createDraftsAuthCookie() {
  const secret = getCookieSecret();
  if (!secret) {
    return null;
  }

  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SECONDS;
  const expiry = String(expiresAt);
  const signature = hmacHex(COOKIE_DOMAIN_TAG, expiry, secret);

  // Revocation is handled by rotating DRAFTS_COOKIE_SECRET.
  return {
    name: DRAFTS_AUTH_COOKIE_NAME,
    value: `${COOKIE_VERSION}.${expiry}.${signature}`,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: "strict" as const,
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    },
  };
}
