import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { rememberViewCount, VIEW_TTL_MS } from './remembered-view-count';

const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
};
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
after(() => {
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

test('returning readers retain the highest API or server count without renewing its expiry', () => {
  const end = 1000 + VIEW_TTL_MS;
  assert.equal(rememberViewCount('returning', 500, end, 1000), 500);
  assert.equal(rememberViewCount('returning', 601, end, 1100), 601);
  assert.equal(rememberViewCount('returning', 500, end + 1000, 2000), 601);
  assert.equal(rememberViewCount('returning', 650, end, 2100), 650);
  assert.equal(rememberViewCount('returning', 610, end, 2200), 650);
  assert.equal(JSON.parse(values.get('view-count:returning')!).expiresAt, end);
  assert.equal(rememberViewCount('another-post', 20, end, 2200), 20);
});

test('a persisted maximum survives a cold client and expires for admin corrections', () => {
  const end = 1000 + VIEW_TTL_MS;
  values.set('view-count:cold', JSON.stringify({ count: 601, expiresAt: end }));
  assert.equal(rememberViewCount('cold', 500, end, 2000), 601);
  assert.equal(rememberViewCount('cold', 40, end + VIEW_TTL_MS, end), 40);
});

test('unknown counts stay unknown until a real snapshot is available', () => {
  const end = 1000 + VIEW_TTL_MS;
  assert.equal(rememberViewCount('unknown', null, end, 1000), null);
  assert.equal(values.has('view-count:unknown'), false, 'Unknown must not persist as zero');
  assert.equal(rememberViewCount('unknown', 601, end, 1100), 601);
  assert.equal(rememberViewCount('unknown', null, end + 1000, 2000), 601);
  assert.equal(JSON.parse(values.get('view-count:unknown')!).expiresAt, end);
  assert.equal(rememberViewCount('unknown', null, end + VIEW_TTL_MS, end), null);
  assert.equal(rememberViewCount('unknown', 0, end + VIEW_TTL_MS, end), 0);
});

test('unknown server counts can recover a valid maximum from storage', () => {
  const end = 1000 + VIEW_TTL_MS;
  values.set('view-count:unknown-cold', JSON.stringify({ count: 601, expiresAt: end }));
  assert.equal(rememberViewCount('unknown-cold', null, end, 2000), 601);
});

test('invalid stored counts and impossible future expiries cannot poison the display', () => {
  for (const [i, record] of ['bad json', null, { count: -2, expiresAt: 2000 },
    { count: '9000', expiresAt: 2000 }, { count: 9000, expiresAt: 1001 + VIEW_TTL_MS }].entries()) {
    values.set(`view-count:invalid-${i}`, typeof record === 'string' ? record : JSON.stringify(record));
    assert.equal(rememberViewCount(`invalid-${i}`, 5, 1000 + VIEW_TTL_MS, 1000), 5);
  }
});

test('same-tab navigation retains its maximum when storage is blocked', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, get() { throw new Error('Storage blocked'); },
  });
  try {
    assert.equal(rememberViewCount('blocked', 601, 1000 + VIEW_TTL_MS, 1000), 601);
    assert.equal(rememberViewCount('blocked', 500, 1000 + VIEW_TTL_MS, 2000), 601);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  }
});
