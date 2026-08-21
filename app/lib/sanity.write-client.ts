import "server-only";
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./sanity.config";

export const writeClient = createClient({
  projectId, dataset, apiVersion,
  perspective: "published",
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});
