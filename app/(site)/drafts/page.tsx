import type { Metadata } from "next";
import { cookies } from "next/headers";
import PageLayout from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import { authenticateDrafts, enableDraftPostPreview } from "./actions";
import { getDraftsConfigStatus, isDraftsAuthed } from "@/app/lib/drafts-auth";
import {
  draftListPerspective,
  draftSanityFetch,
} from "@/app/lib/sanity.draft-client";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Drafts",
  robots: {
    index: false,
    follow: false,
  },
};

type DraftListRow = {
  title?: string | null;
  slug?: string | null;
  _updatedAt?: string | null;
  hasPublishedVersion?: boolean;
};

type DraftsPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const draftListQuery = `*[_type == "post" && _id in path("drafts.**")]{
  title,
  "slug": slug.current,
  _updatedAt
} | order(_updatedAt desc)`;

const publishedSlugQuery = `*[_type == "post" && slug.current in $slugs]{
  "slug": slug.current
}`;

function formatRelativeUpdatedTime(updatedAt?: string | null): string {
  if (!updatedAt) {
    return "Updated recently";
  }

  const updatedDate = new Date(updatedAt);
  const diffSeconds = Math.round((updatedDate.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, secondsInUnit] of units) {
    if (absoluteSeconds >= secondsInUnit) {
      return formatter.format(Math.round(diffSeconds / secondsInUnit), unit);
    }
  }

  return formatter.format(diffSeconds, "second");
}

async function getDraftRows(): Promise<DraftListRow[]> {
  const drafts = await draftSanityFetch<DraftListRow[]>({
    query: draftListQuery,
    perspective: draftListPerspective,
  });
  const slugs = drafts
    .map((draft) => draft.slug)
    .filter((slug): slug is string => Boolean(slug));

  if (slugs.length === 0) {
    return drafts;
  }

  const publishedRows = await draftSanityFetch<Array<{ slug?: string | null }>>({
    query: publishedSlugQuery,
    params: { slugs },
    perspective: "published",
  });
  const publishedSlugs = new Set(
    publishedRows
      .map((row) => row.slug)
      .filter((slug): slug is string => Boolean(slug))
  );

  return drafts.map((draft) => ({
    ...draft,
    hasPublishedVersion: draft.slug ? publishedSlugs.has(draft.slug) : false,
  }));
}

function PasscodeGate({
  showError,
  isConfigured,
}: {
  showError: boolean;
  isConfigured: boolean;
}) {
  return (
    <PageLayout center>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Drafts</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter the preview passcode to continue.
        </p>
        {!isConfigured && (
          <p className="mb-4 rounded-sm border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            Draft previews are unavailable right now.
          </p>
        )}
        {showError && isConfigured && (
          <p className="mb-4 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Incorrect passcode.
          </p>
        )}
        <form action={authenticateDrafts} className="space-y-3">
          <label className="sr-only" htmlFor="drafts-passcode">
            Passcode
          </label>
          <input
            id="drafts-passcode"
            name="passcode"
            type="password"
            autoComplete="current-password"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={!isConfigured}
            required
          />
          <Button type="submit" className="w-full" disabled={!isConfigured}>
            Continue
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}

function DraftList({ drafts }: { drafts: DraftListRow[] }) {
  return (
    <PageLayout>
      <div className="max-w-none">
        <h1 className="text-3xl font-bold mb-2">Drafts</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Select a draft to preview it at its post URL.
        </p>
        {drafts.length === 0 ? (
          <p className="rounded-sm border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            No drafts right now.
          </p>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {drafts.map((draft) => {
              const slug = draft.slug || "";
              const title = draft.title || "Untitled draft";

              return (
                <div
                  key={`${slug}-${draft._updatedAt || title}`}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h2 className="break-words text-base font-semibold leading-snug">
                      {title}
                    </h2>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatRelativeUpdatedTime(draft._updatedAt)}</span>
                      {draft.hasPublishedVersion && (
                        <span>Has published version</span>
                      )}
                    </div>
                  </div>
                  <form action={enableDraftPostPreview} className="sm:flex-none">
                    <input type="hidden" name="slug" value={slug} />
                    <Button type="submit" variant="outline" disabled={!slug}>
                      Preview
                    </Button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default async function DraftsPage({ searchParams }: DraftsPageProps) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const isConfigured = getDraftsConfigStatus().ready;

  if (!isConfigured || !isDraftsAuthed(cookieStore)) {
    return (
      <PasscodeGate
        showError={params?.error === "1"}
        isConfigured={isConfigured}
      />
    );
  }

  const drafts = await getDraftRows();

  return <DraftList drafts={drafts} />;
}
