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
// The /jspark3/glm/ share card. null keeps the neutral hub card.
if (glm.social_image !== null) {
  assert.match(glm.social_image, /^\/og\/[\w.-]+\.png$/, 'social_image must look like /og/<file>.png');
  assert.ok(fs.existsSync(`public${glm.social_image}`), `public${glm.social_image} does not exist`);
}

const rows = glm.headline.rows;
assert.ok(rows.length > 0, 'no headline rows');
assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'duplicate headline row id');
for (const row of rows) {
  assert.ok(row.label && row.unit, `${row.id}: label and unit are required`);
  assert.match(row.concurrency, /^c\d+$/, `${row.id}: concurrency must look like c4`);
  assert.ok(Number.isFinite(row.value), `${row.id}: value is not a number`);
  assert.ok(row.v1_1 === null || Number.isFinite(row.v1_1), `${row.id}: v1_1 must be a number or null`);
  assert.ok(row.mia === null || Number.isFinite(row.mia), `${row.id}: mia must be a number or null`);
  // value is the aggregate across all streams; per_stream is the optional mean per stream.
  assert.ok(row.per_stream === null || Number.isFinite(row.per_stream), `${row.id}: per_stream must be a number or null`);
  if (row.concurrency === 'c1') assert.equal(row.per_stream, null, `${row.id}: one stream has no separate per-stream value`);
  else if (row.per_stream !== null) assert.ok(row.per_stream < row.value, `${row.id}: per_stream must be below the aggregate value`);
}
// Mia's numbers appear only where we ran her benchmark exactly as she describes it.
if (rows.some(row => row.mia !== null)) {
  assert.equal(glm.mia.ran_exactly_as_published, true, 'Mia numbers need ran_exactly_as_published: true');
  assert.ok(glm.mia.benchmark && /^https:\/\//.test(glm.mia.source ?? ''), 'Mia numbers need a benchmark name and https source');
}

if (live) {
  for (const url of [glm.links.release, glm.links.source, glm.links.huggingface, `https://github.com/jakejharris/jspark3/blob/${glm.tag}/docs/INSTALL.md`]) {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    assert.equal(response.status, 200, `${url} returned ${response.status}`);
  }
}
console.log(JSON.stringify({ ok: true, version: glm.version, tag: glm.tag, rows: rows.length, per_stream: rows.filter(row => row.per_stream !== null).length, mia: rows.filter(row => row.mia !== null).length, social_image: glm.social_image, live }));
