/** The last edit, never earlier than publication. */
export function getPostModifiedAt(publishedAt: string, updatedAt: string): string {
  return Date.parse(updatedAt) > Date.parse(publishedAt) ? updatedAt : publishedAt;
}
