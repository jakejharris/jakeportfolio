// Add type declaration for next-sanity
// @ts-expect-error - next-sanity type definitions are outdated
import { createClient } from 'next-sanity';
import imageUrlBuilder from '@sanity/image-url';
import { apiVersion, dataset, projectId } from './sanity.config';

// Define the configuration for the Sanity client
const clientConfig = {
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === 'production',
};

// Create a client for fetching data (read-only)
export const client = createClient(clientConfig);

// Create a client with write token for mutations
export const writeClient = createClient({
  ...clientConfig,
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false, // Never use CDN for write operations
});

// Helper function for generating image URLs with only the asset reference data
export const urlFor = (source: SanityImageSource) => {
  return imageUrlBuilder(client).image(source);
};

// Helper function for using GROQ to query content
export async function sanityFetch<QueryResponse>({
  query,
  params = {},
  tags = [],
}: {
  query: string;
  params?: Record<string, unknown>;
  tags: string[];
}): Promise<QueryResponse> {
  return client.fetch(query, params, {
    next: { tags },
  }) as Promise<QueryResponse>;
}

// Add type for SanityImageSource
type SanityImageSource = {
  asset: {
    _ref: string;
    _type: 'reference';
  };
  _type: 'image';
  [key: string]: unknown;
}; 