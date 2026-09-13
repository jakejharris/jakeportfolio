import { SECTIONS } from './content';

export const legacyFragments = SECTIONS.flatMap(section => [section.id, ...section.legacyIds]);

export function legacyDestination(hash: string) {
  const id = hash.replace(/^#/, '');
  return legacyFragments.includes(id) ? `/jspark3/glm/#${id}` : null;
}
