// Playwright and Chromium lookup shared by the social image renderers.
//
// Playwright is not a dependency of this repo. loadPlaywright looks for playwright-core
// in node_modules, then in $PLAYWRIGHT_CORE, then in the shared /tmp/fleet/pw install.
// chromePath uses $CHROME_PATH, then the newest Chromium in ~/.cache/ms-playwright,
// then a system Chrome.
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export function loadPlaywright(root) {
  const require = createRequire(join(root, 'package.json'));
  const candidates = ['playwright-core', 'playwright', process.env.PLAYWRIGHT_CORE, '/tmp/fleet/pw/node_modules/playwright-core'].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch {}
  }
  throw new Error('playwright-core not found; set PLAYWRIGHT_CORE to an installed copy');
}

export function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = join(homedir(), '.cache', 'ms-playwright');
  const dirs = existsSync(cache) ? readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort() : [];
  for (const d of dirs.reverse()) {
    const p = join(cache, d, 'chrome-linux', 'chrome');
    if (existsSync(p)) return p;
  }
  return ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p)); // else Playwright's own default
}
