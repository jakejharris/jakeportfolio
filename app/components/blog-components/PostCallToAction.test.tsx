import assert from 'node:assert/strict';
import test from 'node:test';

// The component renders server-side; its stylesheet means nothing here.
require.extensions['.css'] = (module: NodeModule) => { module.exports = {}; };

async function render(props: { text: string; url: string; style?: string }) {
  const React = await import('react');
  // The site's components use the classic JSX runtime, as in Next.
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: PostCallToAction } = await import('./PostCallToAction');
  return renderToStaticMarkup(React.createElement(PostCallToAction, props));
}

test('a call to action into the site opens in place, at its path, with an arrow that stays', async () => {
  const html = await render({ text: 'Open the write-up', url: 'https://jakejh.com/jspark3/', style: 'primary' });
  // Next adds the trailing slash in a build (trailingSlash: true); a bare render leaves it off.
  assert.match(html, /<a class="post-cta post-cta-primary" href="\/jspark3\/?">/);
  assert.ok(!html.includes('target='), 'a page on the site opens a new tab');
  assert.ok(html.includes('<span class="post-cta-text">Open the write-up</span>'));
  assert.ok(html.includes('<span class="post-cta-arrow" aria-hidden="true">→</span>'));
  assert.ok(!html.includes('opens in a new tab'));
});

test('a call to action elsewhere opens a new tab and says so; an unknown style falls back to primary', async () => {
  const html = await render({ text: 'Code on GitHub', url: 'https://github.com/jakejharris/jspark3', style: 'loud' });
  assert.match(html, /<a class="post-cta post-cta-primary post-cta-external" href="https:\/\/github\.com\/jakejharris\/jspark3" target="_blank" rel="noopener noreferrer">/);
  assert.ok(html.includes('<span class="post-cta-arrow" aria-hidden="true">↗</span>'));
  assert.ok(html.includes('<span class="sr-only">(opens in a new tab)</span>'));
});

test('the call to action draws no shadow', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const css = readFileSync(join(__dirname, '../../css/post-cta.css'), 'utf8');
  assert.ok(!/shadow/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'post-cta.css draws a shadow');
});
