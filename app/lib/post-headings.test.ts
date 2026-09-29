import assert from 'node:assert/strict';
import test from 'node:test';
import type { PortableTextBlock } from '@portabletext/types';
import { getPostHeadings } from './post-headings';

test('outline preserves heading order, marked spans and renderer anchor IDs', () => {
  const content = [
    { _type: 'block', _key: 'intro', style: 'normal', children: [{ text: 'Body excluded' }] },
    { _type: 'block', _key: 'a', style: 'h2', children: [{ text: ' A ' }, { text: 'heading ', marks: ['strong'] }] },
    { _type: 'codeSnippet', _key: 'code', code: 'Large code sample excluded' },
    { _type: 'block', _key: 'blank', style: 'h3', children: [{ text: '  ' }] },
    { _type: 'block', _key: 'b', style: 'h4', children: [{ text: 'Last' }] },
  ] as PortableTextBlock[];
  assert.deepEqual(getPostHeadings(content), [
    { text: 'A heading', id: 'section-a' },
    { text: 'Last', id: 'section-b' },
  ]);
});

test('external links retain labels, destinations and section anchor without article headings', () => {
  assert.deepEqual(getPostHeadings([], [{ title: 'Source', url: 'https://example.com' }]), [
    { text: 'External Links', id: 'external-links', isHeading: true },
    { text: 'Source', id: 'external-links', isExternalLink: true, url: 'https://example.com' },
  ]);
  assert.deepEqual(getPostHeadings([], []), []);
});
