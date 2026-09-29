import type { PortableTextBlock } from '@portabletext/types';

export interface PostHeading {
  text: string;
  id: string;
  isExternalLink?: boolean;
  url?: string;
  isHeading?: boolean;
}

// Extract on the server: the interactive outline needs labels and anchors,
// not another serialized copy of the article, images and code samples.
export function getPostHeadings(
  content: PortableTextBlock[],
  externalLinks?: Array<{ title: string; url: string }>
): PostHeading[] {
  const headings: PostHeading[] = [];
  for (const block of content) {
    if (block._type !== 'block' || !['h1', 'h2', 'h3', 'h4'].includes(block.style || '')) continue;
    const text = block.children?.map((child) => child.text).join('').trim();
    if (text) headings.push({ text, id: `section-${block._key}` });
  }
  if (externalLinks?.length) {
    headings.push({ text: 'External Links', id: 'external-links', isHeading: true });
    headings.push(...externalLinks.map((link) => ({
      text: link.title, id: 'external-links', isExternalLink: true, url: link.url,
    })));
  }
  return headings;
}
