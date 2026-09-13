/** Commit local, byte-identical snapshots of the recipe-owned release contract. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
const check = args.includes('--check');
const source = args.find(arg => !arg.startsWith('--'));
if (!source) throw new Error('Usage: node scripts/sync-tempo-release.mjs /path/to/recipe/release [--check]');
const summaryBytes = fs.readFileSync(path.join(source, 'summary.json'));
const benchmarkBytes = fs.readFileSync(path.join(source, 'benchmarks.json'));
const summary = JSON.parse(summaryBytes);
const benchmarks = JSON.parse(benchmarkBytes);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(summary.schema_version, 1);
assert.equal(benchmarks.schema_version, 1);
assert.equal(summary.identity.project, 'JSPARK3');
assert.equal(summary.identity.name, 'Tempo');
assert.equal(summary.identity.model, 'DeepSeek-V4.1 Flash');
assert.equal(summary.benchmarks_sha256, sha256(benchmarkBytes), 'Benchmark source hash drift');
assert.equal(summary.identity.candidate, benchmarks.version, 'Candidate identity drift');
assert.ok(['pending', 'published'].includes(summary.publication_status));
const required = ['ttft_cold_64k', 'ttft_repeat_64k', 'ttft_cold_76k', 'ttft_repeat_76k', 'work_c3_repeat', 'work_c6_repeat', 'short_c6', 'generation_prose', 'generation_code'];
assert.equal(new Set(benchmarks.metrics.map(m => m.id)).size, benchmarks.metrics.length, 'Duplicate benchmark ID');
for (const id of required) {
  const selected = summary.selected_metrics.find(m => m.id === id);
  const evidence = benchmarks.metrics.find(m => m.id === id);
  assert.ok(selected && evidence, `Missing required metric ${id}`);
  const values = Array.isArray(selected.value) ? selected.value : [selected.value];
  assert.ok(values.length > 0 && values.every(value => typeof value === 'number' && Number.isFinite(value)));
  for (const [key, value] of Object.entries(selected)) assert.deepEqual(value, evidence[key], `${id}.${key} drift`);
  assert.match(evidence.source_sha256, /^[a-f0-9]{64}$/);
  assert.ok(evidence.source_pointer && evidence.caveats && evidence.samples > 0);
}
for (const key of ['install', 'source', 'release', 'evidence', 'huggingface', 'website']) {
  assert.equal(new URL(summary.links[key]).protocol, 'https:');
}
assert.equal(summary.links.install, `https://github.com/jakejharris/jspark3-deepseek/blob/${summary.identity.candidate}/docs/INSTALL.md`);
assert.equal(summary.links.website, 'https://jakejh.com/jspark3/deepseek/');
const outputs = new Map([
  ['app/(site)/jspark3/v2/release.generated.json', summaryBytes],
  ['public/jspark3/tempo-summary.json', summaryBytes],
  ['public/jspark3/tempo-benchmarks.json', benchmarkBytes],
]);
for (const [file, bytes] of outputs) {
  if (check) assert.ok(fs.existsSync(file) && fs.readFileSync(file).equals(bytes), `Generated release drift: ${file}`);
  else fs.writeFileSync(file, bytes);
}
console.log(JSON.stringify({mode: check ? 'checked' : 'exported', candidate: summary.identity.candidate, publication: summary.publication_status, summary_sha256: sha256(summaryBytes), benchmarks_sha256: sha256(benchmarkBytes), metrics: required, files: [...outputs.keys()]}, null, 2));
