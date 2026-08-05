import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'Node',
});
require('ts-node/register/transpile-only');

const {
  mintViewToken,
  verifyViewToken,
} = require('../app/lib/view-token.ts');

process.env.VIEWS_TOKEN_SECRET = 'local-verification-secret-not-used-by-the-app';

let passed = 0;

function check(name, condition) {
  if (!condition) {
    throw new Error(`FAIL ${name}`);
  }

  passed += 1;
  console.log(`PASS ${name}`);
}

const slug = 'verify-view-token';
const token = mintViewToken(slug);

check('minted token verifies', verifyViewToken(token, slug));
check('wrong slug fails', !verifyViewToken(token, 'wrong-slug'));

const realDateNow = Date.now;
let expiredToken;
try {
  Date.now = () => realDateNow() - (2 * 60 * 60 * 1000) - 1;
  expiredToken = mintViewToken(slug);
} finally {
  Date.now = realDateNow;
}
check('expired token fails', !verifyViewToken(expiredToken, slug));

const replacement = token.endsWith('0') ? '1' : '0';
const tamperedToken = token.slice(0, -1) + replacement;
check('tampered signature fails', !verifyViewToken(tamperedToken, slug));

console.log(`${passed}/4 view-token checks passed`);
