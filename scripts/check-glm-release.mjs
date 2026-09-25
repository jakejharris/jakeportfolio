/** Refuse to ship the GLM release page while glm-release.json still holds placeholders. */
import fs from 'node:fs';
import assert from 'node:assert/strict';

const file = 'app/(site)/jspark3/glm-release.json';
const live = process.argv.includes('--live');
const text = fs.readFileSync(file, 'utf8');
const glm = JSON.parse(text);

assert.equal(glm.placeholder, false, 'placeholder is still true');
for (const marker of ['PLACEHOLDER', 'v1.X', 'XX.X']) assert.ok(!text.includes(marker), `${marker} is still in ${file}`);
assert.match(glm.version, /^v1\.\d+$/, 'version must look like v1.8');
assert.match(glm.tag, /^v1\.\d+\.\d+$/, 'tag must look like v1.8.0');
assert.ok(glm.tag.startsWith(`${glm.version}.`), 'tag and version disagree');
assert.equal(glm.links.release, `https://github.com/jakejharris/jspark3/releases/tag/${glm.tag}`);
assert.match(glm.published, /^\d{4}-\d{2}-\d{2}$/);
assert.ok(glm.name === null || (typeof glm.name === 'string' && glm.name.length > 0));

const rows = glm.headline.rows;
assert.ok(rows.length > 0, 'no headline rows');
assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'duplicate headline row id');
for (const row of rows) {
  assert.ok(Number.isFinite(row.value), `${row.id}: value is not a number`);
  assert.ok(row.v1_1 === null || Number.isFinite(row.v1_1), `${row.id}: v1_1 must be a number or null`);
  assert.ok(row.mia === null || Number.isFinite(row.mia), `${row.id}: mia must be a number or null`);
}
// Mia's numbers appear only where we ran her benchmark exactly as she describes it.
if (rows.some(row => row.mia !== null)) {
  assert.equal(glm.mia.ran_exactly_as_published, true, 'Mia numbers need ran_exactly_as_published: true');
  assert.ok(glm.mia.benchmark && /^https:\/\//.test(glm.mia.source ?? ''), 'Mia numbers need a benchmark name and https source');
}

if (live) {
  for (const url of [glm.links.release, glm.links.source, glm.links.huggingface]) {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    assert.equal(response.status, 200, `${url} returned ${response.status}`);
  }
}
console.log(JSON.stringify({ ok: true, version: glm.version, tag: glm.tag, rows: rows.length, mia: rows.filter(row => row.mia !== null).length, live }));
