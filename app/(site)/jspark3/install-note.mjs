/** The same measured-build caveat on the pages and their generated share image. */
export function installNote(tag, installTag) {
  if (installTag === tag) return null;
  // This release restores coop by default; its measurements are still pending.
  if (tag === 'v1.8.0' && installTag === 'v1.8.4') {
    return 'The numbers were measured on v1.8.0 with the cooperative MoE kernel on. v1.8.4 builds that kernel to the exact bytes we qualified and turns it on for every install. Its own measurements follow.';
  }
  return `The numbers were measured on ${tag}. ${installTag} fixes installation; its default settings have not been benchmarked yet.`;
}
