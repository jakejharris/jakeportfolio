import assert from 'node:assert/strict';
import test from 'node:test';
import { ScrollMemory, scrollKey } from './scroll-memory';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

test('a page is keyed by path and query, not by trailing slash or hash', () => {
  assert.equal(scrollKey({ pathname: '/posts/a/', search: '' }), '/posts/a');
  assert.equal(scrollKey({ pathname: '/posts/a', search: '' }), '/posts/a');
  assert.equal(scrollKey({ pathname: '/', search: '' }), '/');
  assert.equal(scrollKey({ pathname: '/tags/x/', search: '?page=2' }), '/tags/x?page=2');
});

test('positions survive a reload of the session', () => {
  const storage = memoryStorage();
  const first = new ScrollMemory(storage);
  first.save('/', 812.4);
  first.save('/posts/a', 2400);
  first.persist();
  const second = new ScrollMemory(storage);
  assert.equal(second.get('/'), 812);
  assert.equal(second.get('/posts/a'), 2400);
  assert.equal(second.get('/about'), undefined);
});

test('the oldest pages are forgotten first', () => {
  const memory = new ScrollMemory(null);
  for (let i = 0; i < 60; i++) memory.save(`/p/${i}`, i);
  assert.equal(memory.get('/p/0'), undefined);
  assert.equal(memory.get('/p/59'), 59);
  // Visiting an old page again makes it recent.
  memory.save('/p/20', 5);
  for (let i = 60; i < 89; i++) memory.save(`/p/${i}`, i);
  assert.equal(memory.get('/p/20'), 5);
});

test('broken storage is ignored', () => {
  const memory = new ScrollMemory({
    getItem: () => '{not json',
    setItem: () => {
      throw new Error('quota');
    },
  });
  memory.save('/', 10);
  memory.persist();
  assert.equal(memory.get('/'), 10);
});
