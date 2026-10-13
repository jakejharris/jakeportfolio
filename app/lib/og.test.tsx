import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ImageResponse } from 'next/og';
import { PostCard, TagCard, OG_SIZE, loadOgFonts } from './og';

test('social cards render PNGs with packaged fonts and long titles', async () => {
  const fonts = await loadOgFonts();
  const cards = [
    <PostCard title="Recipe.sh" tags={[]} />,
    <PostCard title={'A very long post title about language models and practical applications. '.repeat(4)} date="October 13, 2026" tags={['AI', 'Project Showcase']} />,
    <TagCard title="Project Showcase" />,
  ];
  for (const card of cards) {
    const response = new ImageResponse(card, { ...OG_SIZE, fonts });
    const png = Buffer.from(await response.arrayBuffer());
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
  }
});
