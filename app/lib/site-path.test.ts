import assert from 'node:assert/strict';
import test from 'node:test';
import { sitePath } from './site-path';

test('a link to the site becomes its path; a link elsewhere stays external', () => {
  assert.equal(sitePath('https://jakejh.com/jspark3/'), '/jspark3/');
  assert.equal(sitePath('https://www.jakejh.com/jspark3/glm/#known-issue-17'), '/jspark3/glm/#known-issue-17');
  assert.equal(sitePath('http://jakejh.com/about/?tab=1'), '/about/?tab=1');
  assert.equal(sitePath('/contact/'), '/contact/');
  assert.equal(sitePath('https://github.com/jakejharris/jspark3'), null);
  assert.equal(sitePath('https://jakejh.com.example.org/'), null);
  assert.equal(sitePath('//jakejh.com/jspark3/'), null);
  assert.equal(sitePath('mailto:jake@jakejh.com'), null);
  assert.equal(sitePath('not a url'), null);
});
