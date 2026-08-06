import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Module = require('node:module');
const ts = require('typescript');

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'Node',
});
require('ts-node/register/transpile-only');

const {
  mintViewToken,
  verifyViewToken,
} = require('../app/lib/view-token.ts');

function loadRouteInternals(relativePath, names) {
  const filename = fileURLToPath(new URL(relativePath, import.meta.url));
  const source = `${readFileSync(filename, 'utf8')}\nexport const __verification = { ${names.join(', ')} };`;
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  const loadedModule = new Module(filename);
  const requireFromRoute = createRequire(filename);
  loadedModule.filename = filename;
  loadedModule.paths = Module._nodeModulePaths(dirname(filename));
  loadedModule.require = (id) => {
    if (id.endsWith('/sanity.client')) return { client: {}, writeClient: {} };
    if (id.endsWith('/view-token')) return { verifyViewToken: () => false };
    return requireFromRoute(id);
  };
  loadedModule._compile(compiled, filename);
  return loadedModule.exports.__verification;
}

const views = loadRouteInternals('../app/api/views/route.ts', [
  'DEDUP_MAX_ENTRIES',
  'DEDUP_TTL_MS',
  'getIpHash',
  'isAllowedSource',
  'isDuplicate',
  'recentViews',
]);
const { getAuthFailure } = loadRouteInternals(
  '../app/api/viewadmin/route.ts',
  ['getAuthFailure']
);

let passed = 0;

function check(name, condition) {
  if (!condition) {
    throw new Error(`FAIL ${name}`);
  }

  passed += 1;
  console.log(`PASS ${name}`);
}

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

const originalEnv = Object.fromEntries(
  ['NODE_ENV', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VIEWS_TOKEN_SECRET', 'VIEWADMIN_TOKEN']
    .map((name) => [name, process.env[name]])
);
const realDateNow = Date.now;

try {
  process.env.VIEWS_TOKEN_SECRET = 'local-verification-secret-not-used-by-the-app';
  const slug = 'verify-view-token';
  const token = mintViewToken(slug);

  check('minted token verifies', verifyViewToken(token, slug));
  check('wrong slug fails', !verifyViewToken(token, 'wrong-slug'));

  Date.now = () => realDateNow() - (2 * 60 * 60 * 1000) - 1;
  const expiredToken = mintViewToken(slug);
  Date.now = realDateNow;
  check('expired token fails', !verifyViewToken(expiredToken, slug));

  const replacement = token.endsWith('0') ? '1' : '0';
  check('tampered signature fails', !verifyViewToken(token.slice(0, -1) + replacement, slug));
  check('leading-zero timestamp fails', !verifyViewToken(`0${token}`, slug));

  process.env.NODE_ENV = 'production';
  delete process.env.VERCEL_BRANCH_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  check('production origin allowed', views.isAllowedSource('https://www.jakejh.com/posts/a'));
  check('project preview fallback allowed', views.isAllowedSource('https://jakeportfolio-fix-123.vercel.app'));
  check('unrelated Vercel host rejected', !views.isAllowedSource('https://unrelated.vercel.app'));
  check('Vercel suffix spoof rejected', !views.isAllowedSource('https://evil.vercel.app.attacker.com'));

  process.env.VERCEL_BRANCH_URL = 'jakeportfolio-feature-jakejharris.vercel.app';
  process.env.VERCEL_PROJECT_PRODUCTION_URL = 'jakeportfolio.vercel.app';
  check('configured branch preview allowed', views.isAllowedSource('https://jakeportfolio-feature-jakejharris.vercel.app'));
  check('configured project URL allowed', views.isAllowedSource('https://jakeportfolio.vercel.app'));
  check('other project-shaped preview rejected when configured', !views.isAllowedSource('https://jakeportfolio-other.vercel.app'));

  process.env.NODE_ENV = 'development';
  check('portless localhost allowed in development', views.isAllowedSource('http://localhost'));
  check('localhost port allowed in development', views.isAllowedSource('http://localhost:3000'));
  check('portless loopback allowed in development', views.isAllowedSource('http://127.0.0.1'));
  check('loopback port allowed in development', views.isAllowedSource('http://127.0.0.1:3000'));

  const hash = (ip) => createHash('sha256')
    .update(ip + process.env.VIEWS_TOKEN_SECRET)
    .digest('hex')
    .slice(0, 16);
  const requestWithHeaders = (headers = {}) => ({ headers: new Headers(headers) });
  check('Vercel IP header wins', views.getIpHash(requestWithHeaders({
    'x-vercel-forwarded-for': '203.0.113.8',
    'x-real-ip': '203.0.113.9',
    'x-forwarded-for': '198.51.100.1, 203.0.113.10',
  })) === hash('203.0.113.8'));
  check('real IP header wins over XFF', views.getIpHash(requestWithHeaders({
    'x-real-ip': '203.0.113.9',
    'x-forwarded-for': '198.51.100.1, 203.0.113.10',
  })) === hash('203.0.113.9'));
  check('last XFF hop is fallback', views.getIpHash(requestWithHeaders({
    'x-forwarded-for': '198.51.100.1, 203.0.113.10',
  })) === hash('203.0.113.10'));
  delete process.env.VIEWS_TOKEN_SECRET;
  check('missing hash secret returns null', views.getIpHash(requestWithHeaders()) === null);
  process.env.VIEWS_TOKEN_SECRET = 'local-verification-secret-not-used-by-the-app';

  views.recentViews.clear();
  let now = 1_000;
  Date.now = () => now;
  check('first dedup key accepted', !views.isDuplicate('ttl'));
  now += views.DEDUP_TTL_MS - 1;
  check('duplicate inside TTL rejected', views.isDuplicate('ttl'));
  now = 1_000 + views.DEDUP_TTL_MS;
  check('duplicate does not move TTL anchor', !views.isDuplicate('ttl'));

  views.recentViews.clear();
  for (let index = 0; index < views.DEDUP_MAX_ENTRIES; index += 1) {
    views.isDuplicate(`lru-${index}`);
  }
  views.isDuplicate('lru-0');
  views.isDuplicate('lru-overflow');
  check('LRU cap evicts least-recent key',
    views.recentViews.size === views.DEDUP_MAX_ENTRIES &&
    views.recentViews.has('lru-0') &&
    !views.recentViews.has('lru-1'));
  Date.now = realDateNow;

  delete process.env.VIEWADMIN_TOKEN;
  check('absent admin token fails closed', getAuthFailure(requestWithHeaders())?.status === 503);
  process.env.VIEWADMIN_TOKEN = 'verification-admin-token';
  check('absent authorization rejected', getAuthFailure(requestWithHeaders())?.status === 401);
  check('empty authorization rejected', getAuthFailure(requestWithHeaders({ authorization: '' }))?.status === 401);
  check('wrong-length authorization rejected', getAuthFailure(requestWithHeaders({ authorization: 'Bearer short' }))?.status === 401);
  check('same-length wrong authorization rejected', getAuthFailure(requestWithHeaders({
    authorization: `Bearer ${'x'.repeat(process.env.VIEWADMIN_TOKEN.length)}`,
  }))?.status === 401);
  check('correct authorization accepted', getAuthFailure(requestWithHeaders({
    authorization: `Bearer ${process.env.VIEWADMIN_TOKEN}`,
  })) === null);
} finally {
  Date.now = realDateNow;
  for (const [name, value] of Object.entries(originalEnv)) restoreEnv(name, value);
}

console.log(`${passed} views-hardening checks passed`);
