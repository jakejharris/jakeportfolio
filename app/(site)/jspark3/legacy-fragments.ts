import { SECTIONS } from './content';

/**
 * Anchors that live on the v1.8.4 page, which keeps every v1.x section as published: the v1.1 page's
 * sections with their earlier ids, and the v1.8 page's own history, community run and v1.8.0 results.
 */
export const legacyFragments = [...SECTIONS.flatMap(section => [section.id, ...section.legacyIds]), 'releases', 'community', 'v180-results', 'decode-race'];

export function legacyDestination(hash: string) {
  const id = hash.replace(/^#/, '');
  return legacyFragments.includes(id) ? `/jspark3/glm/v1.8.4#${id}` : null;
}
