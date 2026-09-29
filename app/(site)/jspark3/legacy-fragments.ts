import { SECTIONS } from './content';

export const legacyFragments = [...SECTIONS.flatMap(section => [section.id, ...section.legacyIds]), 'v180-results'];

export function legacyDestination(hash: string) {
  const id = hash.replace(/^#/, '');
  return legacyFragments.includes(id) ? `/jspark3/glm/v1.8.4/#${id}` : null;
}
