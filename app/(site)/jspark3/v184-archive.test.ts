import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';

// /jspark3/glm/v1.8.4 keeps v1.8.4 as it was published. The newer release's figures live in its facts
// (glm-facts.ts, glm-facts.json, glm-share.json); the archive may name that release only in its
// "Newer release" link, so nothing else on the route may load them.
const root = resolve(__dirname, '../../..');
const route = 'app/(site)/jspark3/glm/v1.8.4/page.tsx';
const NEWER_FACTS = /\/jspark3\/glm-(?:facts\.(?:ts|json)|share\.json)$/;

/** The local modules a file loads at run time: type-only imports are erased and load nothing. */
function imports(file: string) {
  const text = readFileSync(file, 'utf8');
  const specs = [...text.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/gm)].map(match => match[1]);
  return specs.flatMap(spec => {
    const base = spec.startsWith('.') ? resolve(dirname(file), spec) : spec.startsWith('@/') ? join(root, spec.slice(2)) : null;
    if (!base || /\.css$/.test(base)) return [];
    const found = ['', '.ts', '.tsx', '.mjs', '.js', '.json', '/index.ts', '/index.tsx'].map(ext => base + ext).find(path => /\.\w+$/.test(path) && existsSync(path));
    assert.ok(found, `${relative(root, file)} imports ${spec}, which does not resolve`);
    return [found];
  });
}

/** Every module reachable from start, with the chain that reaches it. */
function reach(start: string, skip: (from: string, to: string) => boolean = () => false) {
  const chains = new Map<string, string[]>([[start, [start]]]);
  const queue = [start];
  while (queue.length) {
    const file = queue.shift()!;
    for (const next of imports(file)) {
      if (chains.has(next) || skip(file, next)) continue;
      chains.set(next, [...chains.get(file)!, next]);
      if (!/\.json$/.test(next)) queue.push(next);
    }
  }
  return chains;
}

test('the v1.8.4 archive loads none of the newer release facts, apart from its link', () => {
  const page = join(root, route);
  // The route file itself takes the newer version and engine for its one link, and nothing else.
  const source = readFileSync(page, 'utf8');
  const named = [...source.matchAll(/^import\s+\{([^}]*)\}\s+from\s+'\.\.\/\.\.\/glm-facts';/gm)].map(match => match[1].split(',').map(name => name.trim()).filter(Boolean));
  assert.deepEqual(named, [['ENGINE', 'VERSION']], 'v1.8.4/page.tsx may import only ENGINE and VERSION from glm-facts');
  const link = source.match(/newer=\{(<a href="\/jspark3\/glm\/">Newer release: [^\n]*?<\/a>)\}/)?.[1];
  assert.ok(link, 'the Newer release link is missing');
  const outside = source.replace(link, '');
  assert.equal(outside.match(/\b(?:ENGINE|VERSION)\b/g)?.length, 2, 'ENGINE and VERSION are used outside the Newer release link');
  assert.deepEqual(link.match(/\b(?:ENGINE|VERSION)\.\w+|<Fact slot=\{VERSION\} \/>/g), ['<Fact slot={VERSION} />', 'ENGINE.provenance']);

  // Everything else the route renders, and the layouts around it, reach no newer facts at all.
  const roots = [page, join(root, 'app/(site)/layout.tsx'), join(root, 'app/layout.tsx')];
  for (const start of roots) {
    const chains = reach(start, (from, to) => from === page && NEWER_FACTS.test(to));
    for (const [file, chain] of chains) {
      assert.ok(!NEWER_FACTS.test(file), `${chain.map(path => relative(root, path)).join(' -> ')} loads the newer release facts`);
    }
  }
});
