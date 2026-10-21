import test from 'node:test';
import assert from 'node:assert/strict';
import { PROMPTS } from './prompts';

test('every prompt has its own slug, usable as an anchor', () => {
  const slugs = PROMPTS.map(({ slug }) => slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('the text starts and ends on the prompt, with one blank line between paragraphs', () => {
  for (const { text } of PROMPTS) {
    assert.ok(text.length > 0);
    assert.equal(text, text.trim());
    assert.doesNotMatch(text, /\n[ \t]*\n[ \t]*\n|\n[ \t]+\n/);
  }
});
