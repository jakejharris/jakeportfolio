/**
 * Refuse to ship the GLM release page while glm-release.json still holds placeholders
 * or breaks a publication rule.
 *
 *   node scripts/check-glm-release.mjs [--live] [path]
 *
 * The path defaults to the page's own file. --live also checks that every linked
 * release file answers 200. A refusal prints "REFUSED: <reason>" and exits 1.
 * scripts/check-glm-release.test.mjs holds the negative controls.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const REPO = 'https://github.com/jakejharris/jspark3';
/** The five cells the page shows, in page order. Every set uses the same ids. */
const METRICS = [
  { id: 'prefill', label: 'Prefill', concurrency: 'c1', unit: 'tok/s' },
  { id: 'decode_c1', label: 'Decode', concurrency: 'c1', unit: 'tok/s' },
  { id: 'decode_c2', label: 'Decode', concurrency: 'c2', unit: 'tok/s' },
  { id: 'decode_c4', label: 'Decode', concurrency: 'c4', unit: 'tok/s' },
  { id: 'decode_c8', label: 'Decode', concurrency: 'c8', unit: 'tok/s' },
];
const IDS = METRICS.map(metric => metric.id).join(', ');
/** A set's group always matches its weights mode: 0 is stock, 1 is edited (opt-in). */
const GROUP_MODE = { base_m0: 0, opt_in_m1: 1 };
/**
 * Text the page prints as written: the conditions sentence, every set label, and a release name if one is set.
 * Boot and lane ids are matched by shape, so this public file spells none of them.
 */
const HYGIENE = [
  [/\u2014/, 'an em dash'],
  [/boot[\s_-]*\d+|\bA\d+[\s_-]*[A-Z]\d*\b|FINAL-|KGATE|\bfa\d+\b|\blane[\s_-]*\d+|%\d+/i, 'a boot or lane id'],
  // An upper-case letter and digits as a word. Case matters here: the conditions say "c1 to c8".
  [/\b[A-Z]\d+\b/, 'a boot or lane id'],
  [/\/home\/|~\/|\/tmp\/|\/mnt\//, 'a local path'],
  [/\b\d{1,3}(?:\.\d{1,3}){3}\b/, 'an IP address'],
  [/\b[\w-]+\.local\b/i, 'a local host name'],
  [/\bmia\b/i, 'the Mia name'],
  // The page claims nothing about how modes switch, how fast anything is, equivalence, or scaling.
  [/switch|restart|hot[\s_-]*swap|\binstant|seamless|downtime|latency|equivalen|\bidentical|same quality|\bparity|scal(?:ed|ing)|\bfactor|\btax|\d\s*x\b|\bx\s*\d|\u00d7/i, 'a claim about mode switching, speed, equivalence or scaling'],
];
/**
 * Agent and model names, refused as whole words in any case. They are kept as SHA-256
 * digests of the lower-case word, so this public file does not name them itself.
 */
const NAME_DIGESTS = new Set([
  '71b41d6dd48dc58eba8f5cf9edf30fef6597fdf285a521bb8fcbad4b3d50887d',
  '27037fccea3062ee8ebaea07a9e2bf8dcb6511fd860ae993442aee0c512b8bbf',
  '693b286515bd1dd00865e7b60e4e53556537bbe4b1cc90ab608d94eb7c56fdc6',
  '57de4cf40144bdf7d00010f2f5557a7d642c2b9705309bfade167dd313e2ca93',
  'c857d09db23e6822e3600bc06ad8d58f92ed62bc8efd81c753f77048662cb97d',
  'e12ce8285efc67c6d93d3a122e2589ed95089bcbb775ba5634d94e2b8385db07',
  '09cf980b5ff304ac11b7f6d2c5c263da2a867425798ef5cc5d2ebcf55c4fcd23',
  '8db59feb4d217f26c79d6e76eea6ff80398e8b823e376bb783be870a96cab9e7',
  '970ec274ca867815174ebe4eff19282000f9495a6c7254e94991d1fb4dc3df30',
  '053ea4804ef1bb33d4a3d6fb024a614b6d257cebc2bc7cd915da9c9522f37ffc',
  '444b759c5264422ea582403ae2083d2447fd226a2e40795968dd740e9202cb97',
  'e4f9c522e1c89280e9561b825f4f24fe32b51ff82d61e5c2b1dfd0321c35a90b',
  'add92b9cde2bdbf3daaf65a0db79e9b1a7fa428b71b4d6ce38c742eb6dca0c1c',
  'c9ad8f2cc1294afa0ef22fc2c019ff7243cdd272b2147ddca3f34c5036b05768',
]);
const namedWord = text => text.split(/[^A-Za-z0-9]+/).find(word => word && NAME_DIGESTS.has(createHash('sha256').update(word.toLowerCase()).digest('hex')));

const live = process.argv.includes('--live');
const file = process.argv.slice(2).find(arg => !arg.startsWith('--')) ?? 'app/(site)/jspark3/glm-release.json';
const finite = value => typeof value === 'number' && Number.isFinite(value);

function publicText(text, where) {
  assert.ok(typeof text === 'string' && text.trim(), `${where} must be non-empty text`);
  for (const [pattern, what] of HYGIENE) {
    const hit = pattern.exec(text);
    assert.ok(!hit, `${where} has ${what}: "${hit?.[0]}"`);
  }
  const name = namedWord(text);
  assert.ok(!name, `${where} has an agent or model name: "${name}"`);
}

function count(value, where) {
  assert.ok(Number.isInteger(value) && value > 0, `${where} must be a whole number above zero`);
}

/**
 * A figure as the release files write it, which the page prints: digits with an optional decimal part.
 * It is null exactly when its number is, and otherwise equals it, so "108.0" goes with 108.
 */
function token(text, value, where) {
  if (value === null) return assert.equal(text, null, `${where} must be null, since its number is`);
  assert.ok(typeof text === 'string' && /^\d+(\.\d+)?$/.test(text), `${where} must be the figure as written, like "108.0"`);
  assert.equal(Number(text), value, `${where} "${text}" does not equal ${value}`);
}

/** A within-start band: two numbers with lo <= hi, and their texts. A nullable cell may instead be null and null, meaning not measured. */
function band(cell, where, nullable) {
  if (!(nullable && cell.lo === null && cell.hi === null)) {
    assert.ok(finite(cell.lo) && finite(cell.hi), `${where}: lo and hi must both be numbers${nullable ? ', or both null (not measured)' : ''}`);
    assert.ok(cell.lo >= 0, `${where}: lo ${cell.lo} is negative`);
    assert.ok(cell.lo <= cell.hi, `${where}: lo ${cell.lo} is above hi ${cell.hi}`);
  }
  token(cell.lo_text, cell.lo, `${where}: lo_text`);
  token(cell.hi_text, cell.hi, `${where}: hi_text`);
}

function ids(rows, where) {
  assert.ok(Array.isArray(rows), `${where} rows must be a list`);
  assert.equal(rows.map(row => row?.id).join(', '), IDS, `${where} rows must be ${IDS}, in that order`);
}

async function check() {
  const text = fs.readFileSync(file, 'utf8');
  const glm = JSON.parse(text);

  assert.equal(glm.placeholder, false, 'placeholder is still true');
  for (const marker of ['PLACEHOLDER', 'v1.X', 'XX.X']) assert.ok(!text.includes(marker), `${marker} is still in ${file}`);
  assert.match(glm.version, /^v1\.\d+$/, 'version must look like v1.8');
  assert.match(glm.tag, /^v1\.\d+\.\d+$/, 'tag must look like v1.8.0');
  assert.ok(glm.tag.startsWith(`${glm.version}.`), 'tag and version disagree');
  assert.match(glm.published, /^\d{4}-\d{2}-\d{2}$/, 'published must look like 2026-09-27');
  // The release has no name; the page shows its build. A name set anyway is printed, so it is screened like the labels.
  if (glm.name !== null) publicText(glm.name, 'name');
  // The page names the release by its tag without a zero patch: v1.8.0 is v1.8, v1.7.5 stays v1.7.5.
  const shown = glm.tag.replace(/\.0$/, '');
  // The /jspark3/glm/ share card. null keeps the neutral hub card.
  if (glm.social_image !== null) {
    assert.match(glm.social_image, /^\/og\/[\w.-]+\.png$/, 'social_image must look like /og/<file>.png');
    assert.ok(fs.existsSync(`public${glm.social_image}`), `public${glm.social_image} does not exist`);
    assert.equal(glm.social_image, `/og/jspark3-glm-${shown}.png`, `social_image must be /og/jspark3-glm-${shown}.png, this release's card`);
  }
  // mode_switch only chooses between the two sentences already on the page.
  assert.ok(glm.mode_switch === 'A' || glm.mode_switch === 'B', `mode_switch must be "A" or "B", not ${JSON.stringify(glm.mode_switch)}`);

  const links = {
    release: `${REPO}/releases/tag/${glm.tag}`,
    results: `${REPO}/blob/${glm.tag}/release/results-${glm.tag}.json`,
    numbers: `${REPO}/blob/${glm.tag}/release/RELEASE-NUMBERS.md`,
  };
  for (const [key, url] of Object.entries(links)) assert.equal(glm.links?.[key], url, `links.${key} must be ${url}`);

  // The headline is the release's own stock-weight start. When it missed the freeze, it has no rows at all.
  const { headline } = glm;
  assert.equal(typeof headline.missing, 'boolean', 'headline.missing must be true or false');
  assert.equal(headline.build, glm.tag, `headline.build must be the tag ${glm.tag}`);
  assert.match(headline.baseline, /^v\d+\.\d+$/, 'headline.baseline must look like v1.1');
  publicText(headline.conditions, 'headline.conditions');
  count(headline.serving_starts, 'headline.serving_starts');
  count(headline.sweeps, 'headline.sweeps');
  const rows = headline.rows;
  if (headline.missing) {
    assert.deepEqual(rows, [], 'headline.missing is true, so headline.rows must be empty');
  } else {
    assert.ok(Array.isArray(rows) && rows.length > 0, 'headline.missing is false, so headline.rows must hold the five rows');
    assert.equal(headline.serving_starts, 1, 'the headline is one serving start of the release build');
    ids(rows, 'headline');
    rows.forEach((row, index) => {
      const { label, concurrency, unit } = METRICS[index];
      assert.ok(row.label === label && row.concurrency === concurrency && row.unit === unit, `headline ${row.id}: label, concurrency and unit must be ${label}, ${concurrency}, ${unit}`);
      assert.ok(!('value' in row) && !('per_stream' in row), `headline ${row.id}: value and per_stream are the old shape; use lo and hi`);
      // Only the prefill may be left out of the numbers, and the page then shows n/a for it. Decode is required.
      band(row, `headline ${row.id}`, row.id === 'prefill');
      assert.ok(row.v1_1 === null || finite(row.v1_1), `headline ${row.id}: v1_1 must be a number or null`);
      token(row.v1_1_text, row.v1_1, `headline ${row.id}: v1_1_text`);
      assert.ok(row.mia === null || finite(row.mia), `headline ${row.id}: mia must be a number or null`);
    });
  }
  // Mia's numbers appear only where we ran her benchmark exactly as she describes it.
  if (rows.some(row => row.mia !== null)) {
    assert.equal(glm.mia.ran_exactly_as_published, true, 'Mia numbers need ran_exactly_as_published: true');
    assert.ok(glm.mia.benchmark && /^https:\/\//.test(glm.mia.source ?? ''), 'Mia numbers need a benchmark name and https source');
  }

  // Every other measured start, labelled by build and grouped by weights mode.
  assert.ok(Array.isArray(glm.sets), 'sets must be a list');
  assert.equal(new Set(glm.sets.map(set => set.id)).size, glm.sets.length, 'duplicate set id');
  for (const set of glm.sets) {
    const where = `set ${set.id}`;
    assert.ok(typeof set.id === 'string' && /^[a-z0-9_]+$/.test(set.id), `${where}: id must be lower-case letters, digits and underscores`);
    assert.ok(Object.hasOwn(GROUP_MODE, set.group), `${where}: group must be base_m0 or opt_in_m1, not ${JSON.stringify(set.group)}`);
    assert.equal(set.mode, GROUP_MODE[set.group], `${where}: group ${set.group} needs mode ${GROUP_MODE[set.group]}, not ${JSON.stringify(set.mode)}`);
    assert.match(String(set.build), /^v\d+\.\d+(?:\.\d+)?$/, `${where}: build must look like v1.7.4`);
    publicText(set.label, `${where} label`);
    assert.ok(set.label.length <= 60, `${where} label is ${set.label.length} characters; the limit is 60`);
    count(set.serving_starts, `${where} serving_starts`);
    count(set.sweeps, `${where} sweeps`);
    ids(set.rows, where);
    for (const cell of set.rows) band(cell, `${where} ${cell.id}`, true);
    assert.ok(set.rows.some(cell => cell.lo !== null), `${where} measured none of the five cells`);
  }
  if (headline.missing) assert.ok(glm.sets.some(set => set.group === 'base_m0'), 'headline.missing is true, but no base_m0 set is there to show the stock-weight figures');

  if (live) {
    for (const url of [links.release, glm.links.source, glm.links.huggingface, `${REPO}/blob/${glm.tag}/docs/INSTALL.md`, links.results, links.numbers]) {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      assert.equal(response.status, 200, `${url} returned ${response.status}`);
    }
  }
  return {
    ok: true,
    version: glm.version,
    tag: glm.tag,
    mode_switch: glm.mode_switch,
    headline: headline.missing ? 'missing' : rows.length,
    headline_omitted: rows.filter(row => row.lo === null).map(row => row.id),
    sets: glm.sets.map(set => set.id),
    not_measured: glm.sets.flatMap(set => set.rows.filter(cell => cell.lo === null).map(cell => `${set.id}.${cell.id}`)),
    v1_1: rows.filter(row => row.v1_1 !== null).length,
    mia: rows.filter(row => row.mia !== null).length,
    social_image: glm.social_image,
    live,
  };
}

try {
  console.log(JSON.stringify(await check()));
} catch (error) {
  // Newer Node versions append the compared values to an assertion's message; the first line is the reason.
  console.error(`REFUSED: ${error.message.split('\n')[0]}`);
  process.exit(1);
}
