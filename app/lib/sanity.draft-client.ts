import "server-only";

import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./sanity.config";

type DraftPerspective = "drafts" | "raw" | "published";

type DraftFetchOptions = {
  query: string;
  params?: Record<string, unknown>;
  perspective: DraftPerspective;
};

export const draftClientApiVersion = apiVersion;
export const draftRenderPerspective = "drafts";
export const draftListPerspective = "raw";

function hasDraftToken(): boolean {
  return Boolean(process.env.SANITY_API_READ_TOKEN);
}

function createDraftClient(perspective: DraftPerspective) {
  const token = process.env.SANITY_API_READ_TOKEN;

  return createClient({
    projectId,
    dataset,
    apiVersion: draftClientApiVersion,
    useCdn: false,
    perspective,
    ...(token ? { token } : {}),
  });
}

export async function draftSanityFetch<QueryResponse>({
  query,
  params = {},
  perspective,
}: DraftFetchOptions): Promise<QueryResponse> {
  const resolvedPerspective = hasDraftToken() ? perspective : "published";
  const client = createDraftClient(resolvedPerspective);

  return client.fetch(query, params, {
    cache: "no-store",
  }) as Promise<QueryResponse>;
}
