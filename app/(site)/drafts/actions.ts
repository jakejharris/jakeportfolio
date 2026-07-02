"use server";

import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";
import {
  createDraftsAuthCookie,
  getDraftsConfigStatus,
  isDraftsAuthed,
  verifyDraftsPasscode,
} from "@/app/lib/drafts-auth";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function authenticateDrafts(formData: FormData) {
  const passcodeValue = formData.get("passcode");
  const passcode = typeof passcodeValue === "string" ? passcodeValue : "";
  const cookie = createDraftsAuthCookie();

  if (getDraftsConfigStatus().ready && cookie && verifyDraftsPasscode(passcode)) {
    const cookieStore = await cookies();
    cookieStore.set(cookie.name, cookie.value, cookie.options);
    redirect("/drafts");
  }

  // v1 has NO per-IP rate limiting; the passcode is the defense.
  await sleep(750);
  redirect("/drafts?error=1");
}

export async function enableDraftPostPreview(formData: FormData) {
  const cookieStore = await cookies();
  const slugValue = formData.get("slug");
  const slug = typeof slugValue === "string" ? slugValue : "";

  if (!getDraftsConfigStatus().ready || !isDraftsAuthed(cookieStore) || !SLUG_PATTERN.test(slug)) {
    redirect("/drafts");
  }

  (await draftMode()).enable();
  redirect(`/posts/${slug}`);
}
