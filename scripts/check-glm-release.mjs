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
import { namedWord } from './public-text.mjs';

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

const SPEED_KEYS = 'code, prose, reference_streams, rule, streams';
const SPEED_BAND_KEYS = 'display, hi, hi_text, lo, lo_text';
/**
 * How the reference clause compares, and so how it is worded: "strict" is every run ahead, the two median
 * rules differ only in which stream counts qualify, and "off" makes no claim at all.
 */
const SPEED_RULES = ['strict', 'median_noise', 'median', 'off'];
const keys = value => Object.keys(value).sort().join(', ');

/**
 * The hero's speed headline keeps one shape in every state: four streams, a code band, a prose band or null,
 * a comparison rule, and a list, which is empty when the rule is "off".
 */
function speedShape(speed) {
  assert.ok(speed !== null && typeof speed === 'object' && !Array.isArray(speed), 'headline.speed must be an object');
  assert.ok(SPEED_RULES.includes(speed.rule), `headline.speed.rule must be "strict", "median_noise", "median" or "off", not ${JSON.stringify(speed.rule) ?? 'missing'}`);
  assert.equal(keys(speed), SPEED_KEYS, `headline.speed must have exactly ${SPEED_KEYS}`);
  assert.equal(speed.streams, 4, 'headline.speed.streams must be 4');
  for (const name of ['code', 'prose']) {
    const cell = speed[name];
    if (name === 'prose' && cell === null) continue;
    assert.ok(cell !== null && typeof cell === 'object' && keys(cell) === SPEED_BAND_KEYS, `headline.speed.${name} must have exactly ${SPEED_BAND_KEYS}${name === 'prose' ? ', or be null' : ''}`);
  }
  assert.ok(Array.isArray(speed.reference_streams), 'headline.speed.reference_streams must be a list');
  if (speed.rule === 'off') assert.deepEqual(speed.reference_streams, [], `headline.speed.rule is "off", so headline.speed.reference_streams must be empty, not ${JSON.stringify(speed.reference_streams)}`);
}

/**
 * The committed template: the speed headline is the empty shape the fill writes into. Every figure and
 * display token is null, prose is the null band rather than null, and no reference clause is claimed.
 */
function placeholderSpeed(speed) {
  speedShape(speed);
  for (const name of ['code', 'prose']) {
    assert.ok(speed[name] !== null, `in placeholder state headline.speed.${name} must be the null band, not null`);
    for (const [key, value] of Object.entries(speed[name])) assert.equal(value, null, `in placeholder state every headline.speed value must be null, but ${name}.${key} is ${JSON.stringify(value)}`);
  }
  assert.deepEqual(speed.reference_streams, [], 'in placeholder state headline.speed.reference_streams must be empty');
}

/**
 * An approximate token for a speed band, printed in place of the band: "~" and a number within
 * [floor(lo), ceil(hi)]. The release's numbers supply it; the page never rounds a figure itself.
 */
/** Headlines use recorded ranges or medians, never approximate display tokens. */
function display(cell, where) {
  assert.equal(cell.display, null, `${where}.display must be null: the speed line prints recorded measurements`);
}

/**
 * The filled speed headline. code is the headline decode_c8 band exactly; prose is a band or null.
 * reference_streams are the stream counts, 1 to 8, at which the exact runs of the published reference
 * benchmark on this start came out ahead under rule: every run for "strict", the median for the median rules.
 */
function filledSpeed(speed, rows) {
  speedShape(speed);
  band(speed.code, 'headline.speed.code', false);
  const c4 = rows.find(row => row.id === 'decode_c4');
  for (const key of ['lo', 'hi', 'lo_text', 'hi_text']) {
    assert.equal(speed.code[key], c4[key], `headline.speed.code.${key} must equal the headline decode_c4 ${key} (${JSON.stringify(c4[key])}), not ${JSON.stringify(speed.code[key])}`);
  }
  display(speed.code, 'headline.speed.code');
  if (speed.prose !== null) {
    band(speed.prose, 'headline.speed.prose', false);
    display(speed.prose, 'headline.speed.prose');
  }
  const counts = speed.reference_streams;
  assert.ok(counts.every(count => Number.isInteger(count) && count >= 1 && count <= 8), `headline.speed.reference_streams must be whole numbers from 1 to 8, not ${JSON.stringify(counts)}`);
  assert.ok(counts.every((count, index) => index === 0 || count > counts[index - 1]), `headline.speed.reference_streams must be ascending with no repeats, not ${JSON.stringify(counts)}`);
}

/**
 * The hub card's prose figure for one stream: the release's own decode_prose_c1 band, or null when the
 * release has none. In the template it is the empty band.
 */
const HUB_PROSE_KEYS = 'hi, hi_text, lo, lo_text';
function hubProse(cell, placeholder) {
  if (!placeholder && cell === null) return;
  assert.ok(cell !== null && typeof cell === 'object' && !Array.isArray(cell) && keys(cell) === HUB_PROSE_KEYS, `headline.prose_c1 must have exactly ${HUB_PROSE_KEYS}${placeholder ? '' : ', or be null'}`);
  if (placeholder) {
    for (const [key, value] of Object.entries(cell)) assert.equal(value, null, `in placeholder state every headline.prose_c1 value must be null, but ${key} is ${JSON.stringify(value)}`);
    return;
  }
  band(cell, 'headline.prose_c1', false);
}

async function check() {
  const text = fs.readFileSync(file, 'utf8');
  const glm = JSON.parse(text);

  // A template whose speed headline is not the empty shape is refused for that too, so it never renders a claim.
  if (glm.placeholder === true) {
    try {
      placeholderSpeed(glm.headline?.speed);
      hubProse(glm.headline?.prose_c1 ?? null, true);
    } catch (error) {
      assert.fail(`placeholder is still true, and ${error.message.split('\n')[0]}`);
    }
  }
  assert.equal(glm.placeholder, false, 'placeholder is still true');
  for (const marker of ['PLACEHOLDER', 'v1.X', 'XX.X']) assert.ok(!text.includes(marker), `${marker} is still in ${file}`);
  assert.match(glm.version, /^v1\.\d+$/, 'version must look like v1.8');
  assert.match(glm.tag, /^v1\.\d+\.\d+$/, 'tag must look like v1.8.0');
  assert.ok(glm.tag.startsWith(`${glm.version}.`), 'tag and version disagree');
  // The tag installers get: the measured tag, or a later patch of the same line that only changes packaging and installation.
  assert.match(String(glm.install_tag), /^v1\.\d+\.\d+$/, 'install_tag must look like v1.8.1');
  assert.ok(glm.install_tag.startsWith(`${glm.version}.`), `install_tag ${glm.install_tag} is not on the ${glm.version} line`);
  const patch = tag => Number(tag.split('.')[2]);
  assert.ok(patch(glm.install_tag) >= patch(glm.tag), `install_tag ${glm.install_tag} is older than the measured tag ${glm.tag}`);
  if (glm.published !== null) assert.match(glm.published, /^\d{4}-\d{2}-\d{2}$/, 'published must look like 2026-09-27');
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

  // Every jspark3 link is pinned to a tag, so a later main or README never changes what the page opens.
  // What installers get is on install_tag; the numbers' files stay on the tag they were measured and frozen on.
  const links = {
    release: `${REPO}/releases/tag/${glm.install_tag}`,
    source: `${REPO}/tree/${glm.install_tag}`,
    install: `${REPO}/blob/${glm.install_tag}/docs/INSTALL.md`,
    results: `${REPO}/blob/${glm.tag}/release/results-${glm.tag}.json`,
    numbers: `${REPO}/blob/${glm.tag}/release/RELEASE-NUMBERS.md`,
  };
  // A release can publish results in its notes without separate data files.
  const separateResults = glm.links?.results !== null || glm.links?.numbers !== null;
  for (const [key, url] of Object.entries(links)) {
    if (!separateResults && (key === 'results' || key === 'numbers')) continue;
    assert.equal(glm.links?.[key], url, `links.${key} must be ${url}`);
  }

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
    assert.equal(headline.speed, null, 'headline.missing is true, so headline.speed must be null');
    assert.equal(headline.prose_c1, null, 'headline.missing is true, so headline.prose_c1 must be null');
  } else {
    assert.ok(Array.isArray(rows) && rows.length > 0, 'headline.missing is false, so headline.rows must hold the five rows');
    assert.equal(headline.serving_starts, 1, 'the headline is one serving start of the release build');
    ids(rows, 'headline');
    rows.forEach((row, index) => {
      const { label, concurrency, unit } = METRICS[index];
      assert.ok(row.label === label && row.concurrency === concurrency && row.unit === unit, `headline ${row.id}: label, concurrency and unit must be ${label}, ${concurrency}, ${unit}`);
      assert.ok(!('value' in row) && !('per_stream' in row), `headline ${row.id}: value and per_stream are the old shape; use lo and hi`);
      // An unrun decode cell requires a public reason; other releases keep the required-cell check.
      const omitted = row.omitted_reason !== undefined;
      if (omitted) {
        publicText(row.omitted_reason, `headline ${row.id} omitted_reason`);
        assert.equal(row.lo, null, `headline ${row.id}: omitted row must have null values`);
        assert.equal(row.hi, null, `headline ${row.id}: omitted row must have null values`);
        assert.ok(!('median' in row) && !('median_text' in row) && !('samples' in row), `headline ${row.id}: omitted row cannot have measurements`);
      }
      band(row, `headline ${row.id}`, row.id === 'prefill' || omitted);
      if ('samples' in row) count(row.samples, `headline ${row.id} samples`);
      if ('median' in row || 'median_text' in row) {
        assert.ok(finite(row.median) && row.lo !== null && row.median >= row.lo && row.median <= row.hi, `headline ${row.id}: median must be within its range`);
        token(row.median_text, row.median, `headline ${row.id}: median_text`);
        count(row.samples, `headline ${row.id} samples`);
      }
      assert.ok(row.v1_1 === null || finite(row.v1_1), `headline ${row.id}: v1_1 must be a number or null`);
      token(row.v1_1_text, row.v1_1, `headline ${row.id}: v1_1_text`);
      assert.ok(row.mia === null || finite(row.mia), `headline ${row.id}: mia must be a number or null`);
    });
    assert.ok(headline.speed != null, 'headline.missing is false, so headline.speed must hold the speed headline');
    filledSpeed(headline.speed, rows);
    assert.ok(headline.prose_c1 !== undefined, 'headline.prose_c1 must be a band or null');
    hubProse(headline.prose_c1, false);
    if (headline.prose_rows !== undefined || headline.structured_c8 !== undefined) {
      assert.deepEqual(headline.prose_rows?.map(row => row.concurrency), ['c1', 'c2', 'c4', 'c8'], 'prose_rows must cover c1, c2, c4, c8');
      for (const row of [...headline.prose_rows, headline.structured_c8]) {
        assert.ok(row, 'structured_c8 must be present with prose_rows');
        band(row, 'workload', false);
        count(row.samples, 'workload samples');
      }
      for (const key of ['lo', 'hi', 'lo_text', 'hi_text']) {
        assert.equal(headline.prose_rows[0][key], headline.prose_c1?.[key], `prose_c1 ${key} must match prose_rows`);
        assert.equal(headline.prose_rows[2][key], headline.speed.prose?.[key], `speed prose ${key} must match prose_rows`);
      }
    }
    if (glm.tag === 'v1.8.4') {
      assert.ok(headline.prose_rows && headline.structured_c8, 'v1.8.4 requires its workload measurements');
      for (const id of ['decode_c1', 'decode_c2', 'decode_c4', 'decode_c8']) {
        const row = rows.find(row => row.id === id);
        assert.ok(finite(row.median), `v1.8.4 ${id} requires its code median`);
        assert.equal(row.samples, headline.sweeps, `v1.8.4 ${id} repeats must match the code ladder`);
      }
      assert.equal(headline.speed.rule, 'off', 'v1.8.4 has no reference benchmark comparison');
    }
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
    // The results section links the measured tag's release notes, which carry the full results (release-copy.ts resultsNotes).
    const measuredRelease = `${REPO}/releases/tag/${glm.tag}`;
    for (const url of [links.release, links.source, glm.links.huggingface, links.install, glm.links.results, glm.links.numbers, measuredRelease].filter(Boolean)) {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      assert.equal(response.status, 200, `${url} returned ${response.status}`);
    }
  }
  return {
    ok: true,
    version: glm.version,
    tag: glm.tag,
    install_tag: glm.install_tag,
    mode_switch: glm.mode_switch,
    headline: headline.missing ? 'missing' : rows.length,
    headline_omitted: rows.filter(row => row.lo === null).map(row => row.id),
    sets: glm.sets.map(set => set.id),
    not_measured: glm.sets.flatMap(set => set.rows.filter(cell => cell.lo === null).map(cell => `${set.id}.${cell.id}`)),
    v1_1: rows.filter(row => row.v1_1 !== null).length,
    mia: rows.filter(row => row.mia !== null).length,
    speed: headline.speed && {
      prose: headline.speed.prose !== null,
      display: [headline.speed.code.display, headline.speed.prose?.display ?? null],
      rule: headline.speed.rule,
      reference_streams: headline.speed.reference_streams,
    },
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
