/**
 * Sanity configuration for the content API
 */

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2023-05-03';

const sanityConfig = {
  projectId,
  dataset,
  apiVersion,
};

export default sanityConfig; 