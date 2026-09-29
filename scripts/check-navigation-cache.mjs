// Integration test with a synthetic CMS, isolated copy of the production build,
// and ephemeral local credentials. Never sends a mutation to a real CMS.
// node scripts/check-navigation-cache.mjs /tmp/navigation-cache-check [3873]
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { cp, mkdir, readFile, writeFile, symlink, open } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [output, port = '3873'] = process.argv.slice(2);
assert(output && path.isAbsolute(output), 'Supply an absolute output directory outside the repository');
const root = process.cwd();
assert(!path.resolve(output).startsWith(root + path.sep), 'Keep test artifacts outside the repository');
const base = `http://127.0.0.1:${port}`;
await mkdir(output, { recursive: true });
const build = path.join(output, 'site');
await mkdir(build); // A new directory per run preserves previous evidence.
await cp('.next', path.join(build, '.next'), { recursive: true,
  filter: (source) => path.resolve(source) !== path.resolve('.next/cache'),
});
for (const file of ['next.config.js', 'package.json']) await cp(file, path.join(build, file));
for (const folder of ['node_modules', 'public']) await symlink(path.join(root, folder), path.join(build, folder));
const statePath = path.join(output, 'cms-state.json');
const readsPath = path.join(output, 'cms-reads.jsonl');
const state = (version, count) => writeFile(statePath, JSON.stringify({ version, count }));
await state('one', 41);
await writeFile(readsPath, '');
const secret = 'ab'.repeat(32);
const log = await open(path.join(output, 'server.log'), 'w');
const server = spawn(process.execPath, [
  '--require', fileURLToPath(new URL('./fixtures/navigation-cms.cjs', import.meta.url)),
  path.join(root, 'node_modules/next/dist/bin/next'), 'start', build, '-p', port,
], {
  env: { ...process.env, NEXT_PUBLIC_SANITY_PROJECT_ID: 'q1u033fj', NEXT_TELEMETRY_DISABLED: '1',
    NAV_CMS_STATE: statePath, NAV_CMS_READS: readsPath,
    SANITY_API_READ_TOKEN: 'local-fixture-only', SANITY_WEBHOOK_SECRET: 'local-fixture-webhook',
    DRAFTS_PASSCODE: 'local-fixture-passcode', DRAFTS_COOKIE_SECRET: secret,
    VIEWADMIN_TOKEN: 'local-fixture-admin', VIEW_WRITES_ENABLED: '0',
  }, stdio: ['ignore', log.fd, log.fd],
});
const get = async (route, headers) => {
  const response = await fetch(base + route, { headers });
  return { status: response.status, cache: response.headers.get('x-nextjs-cache'),
    policy: response.headers.get('cache-control'), body: await response.text() };
};
const invalidate = async () => {
  const response = await fetch(base + '/api/revalidate/', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'local-fixture-webhook' }, body: '{"_type":"post"}',
  });
  assert.equal(response.status, 200);
};
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('Test server exited; inspect server.log');
    try { ready = (await fetch(base + '/robots.txt')).ok; } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, 'Test server did not start');
  // Exercise new slugs absent from generateStaticParams as well as the home page.
  const post = '/posts/navigation-cache-fixture/';
  const routes = ['/', post, '/tags/navigation-cache-fixture/'];
  await invalidate();
  for (const route of routes) {
    assert.equal((await get(route)).status, 200);
    const cached = await get(route);
    assert.equal(cached.cache, 'HIT', route);
    assert.match(cached.body, /Published one/, route);
    assert.match(cached.policy, /s-maxage=60/, route);
  }
  assert.match((await get(post)).body, /41<!-- --> views/);
  await state('two', 99);
  assert.match((await get(post)).body, /Published body one/, 'Content changed without cache invalidation');
  // Admin must bypass the public view-count snapshot even while the page is cached.
  const admin = await get('/api/viewadmin/', { authorization: 'Bearer local-fixture-admin' });
  assert.equal(admin.status, 200);
  assert.equal(JSON.parse(admin.body)[0].liveViewCount, 99);
  await invalidate();
  for (const route of routes) {
    const fresh = await get(route);
    assert.match(fresh.body, /Published two/, `Webhook left stale content at ${route}`);
  }
  assert.match((await get(post)).body, /Published body two/, 'Post body survived global content invalidation');
  // Sign only the local fixture's auth cookie and use its build preview cookie.
  const manifest = JSON.parse(await readFile(path.join(build, '.next/prerender-manifest.json'), 'utf8'));
  const expiry = Math.floor(Date.now() / 1000) + 600;
  const signature = createHmac('sha256', Buffer.from(secret, 'hex')).update(`cookie:${expiry}`).digest('hex');
  const bypass = `__prerender_bypass=${manifest.preview.previewModeId}`;
  const headers = { cookie: `${bypass}; __Host-drafts_auth=v1.${expiry}.${signature}` };
  const preview = await get(post, headers);
  assert.match(preview.body, /Secret draft body two/);
  assert.match(preview.policy, /private.*no-store/);
  await state('three', 101);
  assert.match((await get(post, headers)).body, /Secret draft body three/, 'Draft fetch was cached');
  for (const cookie of ['', bypass, `${bypass}; __Host-drafts_auth=invalid`]) {
    const published = await get(post, { cookie });
    assert.doesNotMatch(published.body, /Secret draft body|Private draft/, 'Draft leaked into published response');
  }
  const readLog = await readFile(readsPath, 'utf8');
  assert.match(readLog, /"draft":true/, 'Fixture never exercised the draft perspective');
  console.log('Published ISR, new slugs, post-body webhook refresh, live admin counts and authenticated draft isolation passed.');
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
  await log.close();
}
