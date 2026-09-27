/**
 * Negative controls for the GLM release ship gate.
 *
 *   node --test scripts/check-glm-release.test.mjs
 *
 * Each control breaks one rule in a copy of the synthetic fixture and runs the real
 * checker on it. The suite fails if the checker accepts any broken copy, or refuses
 * it for a reason other than the rule under test. The fixture's numbers are made up.
 *
 * The checker refuses agent and model names without naming them, and so does this file.
 * To run those controls too, pass the names:
 *
 *   GLM_CHECK_NAMES='name one,name two' node --test scripts/check-glm-release.test.mjs
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const checker = path.join(root, 'scripts/check-glm-release.mjs');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'scripts/fixtures/glm-release.synthetic.json'), 'utf8'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-release-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

let runs = 0;
function check(glm) {
  const file = path.join(dir, `case-${++runs}.json`);
  fs.writeFileSync(file, JSON.stringify(glm, null, 2));
  return spawnSync(process.execPath, [checker, file], { cwd: root, encoding: 'utf8' });
}

const edited = edit => {
  const glm = structuredClone(fixture);
  edit(glm);
  return glm;
};
const set = (glm, id) => glm.sets.find(item => item.id === id);
const row = (rows, id) => rows.find(item => item.id === id);
/** The headline's final start missed the freeze: no headline rows, no speed headline, Story A. */
const missing = glm => {
  glm.headline.missing = true;
  glm.headline.speed = null;
  glm.headline.rows = [];
  glm.mode_switch = 'A';
};
/** The release's numbers leave out its prefill: the row stays, with its band and texts null. */
const prefillOmitted = glm => {
  Object.assign(row(glm.headline.rows, 'prefill'), { lo: null, hi: null, lo_text: null, hi_text: null });
};
const NULL_BAND = { lo: null, hi: null, lo_text: null, hi_text: null, display: null };
/** The committed template's state: placeholder true and the speed headline the empty shape. */
const template = glm => {
  glm.placeholder = true;
  glm.headline.speed = { streams: 8, code: { ...NULL_BAND }, prose: { ...NULL_BAND }, reference_streams: [] };
};
const speed = glm => glm.headline.speed;

test('accepts the synthetic fixture', () => {
  const result = check(fixture);
  assert.equal(result.status, 0, result.stderr);
});

test('accepts the fixture with the headline missing', () => {
  const result = check(edited(missing));
  assert.equal(result.status, 0, result.stderr);
});

test('accepts the fixture with the headline prefill left out', () => {
  const result = check(edited(prefillOmitted));
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).headline_omitted, ['prefill']);
});

test('refuses the template state only because it is a placeholder', () => {
  const result = check(edited(template));
  assert.notEqual(result.status, 0, result.stdout);
  assert.equal(result.stderr.trim(), 'REFUSED: placeholder is still true');
});

/** [what varies, the edit] for speed headlines the checker must accept. The fixture's decode_c8 band is 77.7 to 88.8. */
const SPEED_ACCEPTED = [
  ['no prose run', glm => { speed(glm).prose = null; }],
  ['no reference clause', glm => { speed(glm).reference_streams = []; }],
  ['one reference stream count', glm => { speed(glm).reference_streams = [1]; }],
  ['every reference stream count', glm => { speed(glm).reference_streams = [1, 2, 3, 4, 5, 6, 7, 8]; }],
  ['non-contiguous reference stream counts', glm => { speed(glm).reference_streams = [1, 2, 4]; }],
  ['display tokens', glm => { speed(glm).code.display = '~80'; speed(glm).prose.display = '~40'; }],
  ['a display token with a decimal part', glm => { speed(glm).code.display = '~80.5'; }],
  ['a display token at the floor of lo', glm => { speed(glm).code.display = '~77'; }],
  ['a display token at the ceiling of hi', glm => { speed(glm).code.display = '~89'; }],
  ['a single-value prose band', glm => { Object.assign(speed(glm).prose, { lo: 33.3, hi: 33.3, lo_text: '33.3', hi_text: '33.3' }); }],
];
for (const [what, edit] of SPEED_ACCEPTED) {
  test(`accepts a speed headline with ${what}`, () => {
    const result = check(edited(edit));
    assert.equal(result.status, 0, result.stderr);
  });
}

test('accepts a v1.x.5 tag, whose version drops the patch', () => {
  const result = check(edited(glm => {
    const tag = 'v1.99.5';
    glm.tag = tag;
    glm.headline.build = tag;
    for (const key of Object.keys(glm.links)) glm.links[key] = glm.links[key].replaceAll('v1.99.0', tag);
  }));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).version, 'v1.99');
});

/** [what breaks, the edit, the refusal it must produce] */
const CONTROLS = [
  ['placeholder is true', glm => { glm.placeholder = true; }, /placeholder is still true/],
  ['a PLACEHOLDER marker', glm => { glm.headline.conditions = 'PLACEHOLDER: conditions'; }, /PLACEHOLDER is still in/],
  ['a placeholder version', glm => { glm.version = 'v1.X'; }, /v1\.X is still in/],
  ['a placeholder number marker', glm => { glm.headline.conditions += ' XX.X'; }, /XX\.X is still in/],
  ['tag and version disagree', glm => { glm.tag = 'v1.98.0'; }, /tag and version disagree/],
  ['a malformed release date', glm => { glm.published = '27 Sep'; }, /published must look like/],
  ['a share card that does not exist', glm => { glm.social_image = '/og/jspark3-glm-none.png'; }, /does not exist/],
  ['a share card for another release', glm => { glm.social_image = '/og/jspark3-hub-v1.png'; }, /social_image must be \/og\/jspark3-glm-v1\.99\.png/],
  ['a release name with a lane id', glm => { glm.name = 'Q9'; }, /name has a boot or lane id: "Q9"/],
  ['an empty release name', glm => { glm.name = ''; }, /name must be non-empty text/],
  ['headline build missing', glm => { delete glm.headline.build; }, /headline\.build must be the tag v1\.99\.0/],
  ['headline build is the version', glm => { glm.headline.build = 'v1.99'; }, /headline\.build must be the tag/],
  ['headline build is another patch', glm => { glm.headline.build = 'v1.99.4'; }, /headline\.build must be the tag/],
  ['release link for another tag', glm => { glm.links.release = 'https://github.com/jakejharris/jspark3/releases/tag/v1.98.0'; }, /links\.release must be/],
  ['no results link', glm => { delete glm.links.results; }, /links\.results must be/],
  ['results link on main, not the tag', glm => { glm.links.results = 'https://github.com/jakejharris/jspark3/blob/main/release/results-v1.99.0.json'; }, /links\.results must be/],
  ['results link named by version, not tag', glm => { glm.links.results = 'https://github.com/jakejharris/jspark3/blob/v1.99.0/release/results-v1.99.json'; }, /links\.results must be/],
  ['relative numbers link', glm => { glm.links.numbers = 'release/RELEASE-NUMBERS.md'; }, /links\.numbers must be/],
  ['mode_switch C', glm => { glm.mode_switch = 'C'; }, /mode_switch must be "A" or "B"/],
  ['mode_switch null', glm => { glm.mode_switch = null; }, /mode_switch must be "A" or "B"/],
  ['mode_switch lower case', glm => { glm.mode_switch = 'b'; }, /mode_switch must be "A" or "B"/],
  ['headline.missing as text', glm => { glm.headline.missing = 'no'; }, /headline\.missing must be true or false/],
  ['headline missing but rows kept', glm => { glm.headline.missing = true; }, /headline\.rows must be empty/],
  ['headline present with no rows', glm => { glm.headline.rows = []; }, /must hold the five rows/],
  ['headline from two serving starts', glm => { glm.headline.serving_starts = 2; }, /one serving start/],
  ['headline with zero sweeps', glm => { glm.headline.sweeps = 0; }, /headline\.sweeps must be a whole number/],
  ['headline row dropped', glm => { glm.headline.rows.pop(); }, /headline rows must be prefill/],
  ['headline rows reordered', glm => { glm.headline.rows.reverse(); }, /in that order/],
  ['headline unit changed', glm => { glm.headline.rows[0].unit = 'ms'; }, /label, concurrency and unit/],
  ['headline lo null', glm => { row(glm.headline.rows, 'decode_c1').lo = null; }, /lo and hi must both be numbers$/],
  ['headline decode left out like a prefill', glm => { Object.assign(row(glm.headline.rows, 'decode_c1'), { lo: null, hi: null, lo_text: null, hi_text: null }); }, /headline decode_c1: lo and hi must both be numbers$/],
  ['headline prefill half left out', glm => { prefillOmitted(glm); row(glm.headline.rows, 'prefill').hi = 2222.2; }, /headline prefill: lo and hi must both be numbers, or both null/],
  ['headline prefill left out but its text kept', glm => { prefillOmitted(glm); row(glm.headline.rows, 'prefill').lo_text = '1111.1'; }, /headline prefill: lo_text must be null, since its number is/],
  ['headline lo_text missing', glm => { delete row(glm.headline.rows, 'decode_c1').lo_text; }, /headline decode_c1: lo_text must be the figure as written/],
  ['headline hi_text as a number', glm => { row(glm.headline.rows, 'decode_c2').hi_text = 44.4; }, /headline decode_c2: hi_text must be the figure as written/],
  ['headline text with a separator', glm => { row(glm.headline.rows, 'prefill').lo_text = '1,111.1'; }, /headline prefill: lo_text must be the figure as written/],
  ['headline text with an exponent', glm => { row(glm.headline.rows, 'decode_c4').lo_text = '5.55e1'; }, /headline decode_c4: lo_text must be the figure as written/],
  ['headline text with a sign', glm => { row(glm.headline.rows, 'decode_c4').hi_text = '+66.6'; }, /headline decode_c4: hi_text must be the figure as written/],
  ['headline text with a trailing point', glm => { row(glm.headline.rows, 'decode_c8').hi_text = '88.'; }, /headline decode_c8: hi_text must be the figure as written/],
  ['headline text that disagrees with its number', glm => { row(glm.headline.rows, 'decode_c8').lo_text = '77.8'; }, /headline decode_c8: lo_text "77\.8" does not equal 77\.7/],
  ['headline text rounded', glm => { row(glm.headline.rows, 'prefill').hi_text = '2222'; }, /headline prefill: hi_text "2222" does not equal 2222\.2/],
  ['v1_1_text missing', glm => { delete row(glm.headline.rows, 'decode_c1').v1_1_text; }, /headline decode_c1: v1_1_text must be the figure as written/],
  ['v1_1_text without a v1_1 figure', glm => { row(glm.headline.rows, 'decode_c4').v1_1_text = '55.5'; }, /headline decode_c4: v1_1_text must be null, since its number is/],
  ['v1_1_text that disagrees', glm => { row(glm.headline.rows, 'decode_c2').v1_1_text = '22.3'; }, /headline decode_c2: v1_1_text "22\.3" does not equal 22\.2/],
  ['headline hi as text', glm => { row(glm.headline.rows, 'decode_c4').hi = '66.6'; }, /lo and hi must both be numbers$/],
  ['headline band inverted', glm => { Object.assign(row(glm.headline.rows, 'decode_c2'), { lo: 44.4, hi: 33.3 }); }, /lo 44\.4 is above hi 33\.3/],
  ['headline lo negative', glm => { row(glm.headline.rows, 'decode_c8').lo = -11.1; }, /is negative/],
  ['old single value kept', glm => { glm.headline.rows[0].value = 11.1; }, /old shape/],
  ['old per-stream value kept', glm => { glm.headline.rows[2].per_stream = 11.1; }, /old shape/],
  ['v1_1 as text', glm => { row(glm.headline.rows, 'decode_c1').v1_1 = '11.1'; }, /v1_1 must be a number or null/],
  ['a Mia figure without an exact run', glm => { row(glm.headline.rows, 'decode_c1').mia = 11.1; }, /ran_exactly_as_published/],
  ['sets not a list', glm => { glm.sets = null; }, /sets must be a list/],
  ['duplicate set id', glm => { glm.sets[1].id = glm.sets[0].id; }, /duplicate set id/],
  ['set id missing', glm => { delete glm.sets[0].id; }, /id must be lower-case/],
  ['unknown set group', glm => { set(glm, 'base_m0_a').group = 'base_m2'; }, /group must be base_m0 or opt_in_m1/],
  ['stock group at mode 1', glm => { set(glm, 'base_m0_a').mode = 1; }, /group base_m0 needs mode 0/],
  ['opt-in group at mode 0', glm => { set(glm, 'opt_in_m1').mode = 0; }, /group opt_in_m1 needs mode 1/],
  ['mode as text', glm => { set(glm, 'base_m0_b').mode = '0'; }, /group base_m0 needs mode 0/],
  ['build not a version', glm => { set(glm, 'base_m0_a').build = 'latest'; }, /build must look like/],
  ['set cell half measured', glm => { row(set(glm, 'base_m0_b').rows, 'decode_c4').lo = 11.1; }, /or both null \(not measured\)/],
  ['set cell text without a number', glm => { row(set(glm, 'base_m0_b').rows, 'decode_c4').hi_text = '11.1'; }, /set base_m0_b decode_c4: hi_text must be null, since its number is/],
  ['set cell text missing', glm => { delete row(set(glm, 'opt_in_m1').rows, 'decode_c2').lo_text; }, /set opt_in_m1 decode_c2: lo_text must be the figure as written/],
  ['set cell text that disagrees', glm => { row(set(glm, 'base_m0_a').rows, 'prefill').hi_text = '1111.01'; }, /set base_m0_a prefill: hi_text "1111\.01" does not equal 1111/],
  ['set band inverted', glm => { Object.assign(row(set(glm, 'opt_in_m1').rows, 'decode_c2'), { lo: 44.4, hi: 33.3 }); }, /is above hi/],
  ['set cell dropped', glm => { set(glm, 'opt_in_m1').rows.pop(); }, /set opt_in_m1 rows must be/],
  ['set measured nothing', glm => { for (const cell of set(glm, 'base_m0_a').rows) Object.assign(cell, { lo: null, hi: null, lo_text: null, hi_text: null }); }, /measured none of the five cells/],
  ['set with zero serving starts', glm => { set(glm, 'base_m0_a').serving_starts = 0; }, /serving_starts must be a whole number/],
  ['set with fractional sweeps', glm => { set(glm, 'base_m0_a').sweeps = 1.5; }, /sweeps must be a whole number/],
  ['set label over 60 characters', glm => { set(glm, 'base_m0_a').label = 'Synthetic base start with a label that runs well past the limit'; }, /the limit is 60/],
  ['empty set label', glm => { set(glm, 'base_m0_a').label = ' '; }, /label must be non-empty text/],
  ['headline missing and no base set', glm => { missing(glm); glm.sets = glm.sets.filter(item => item.group !== 'base_m0'); }, /no base_m0 set/],
  ['a speed headline when the headline is missing', glm => { const kept = speed(glm); missing(glm); glm.headline.speed = kept; }, /headline\.missing is true, so headline\.speed must be null/],
  ['a null speed headline when the headline is present', glm => { glm.headline.speed = null; }, /headline\.missing is false, so headline\.speed must hold the speed headline/],
  ['no speed headline when the headline is present', glm => { delete glm.headline.speed; }, /headline\.missing is false, so headline\.speed must hold the speed headline/],
  ['a speed headline that is a list', glm => { glm.headline.speed = []; }, /headline\.speed must be an object/],
  ['a speed headline with an extra field', glm => { speed(glm).scaled_from = 'base_m0_a'; }, /headline\.speed must have exactly code, prose, reference_streams, streams/],
  ['a speed headline at 4 streams', glm => { speed(glm).streams = 4; }, /headline\.speed\.streams must be 8/],
  ['a speed headline streams as text', glm => { speed(glm).streams = '8'; }, /headline\.speed\.streams must be 8/],
  ['a speed band with an extra field', glm => { speed(glm).code.per_stream = 11.1; }, /headline\.speed\.code must have exactly display, hi, hi_text, lo, lo_text$/],
  ['a speed band without display', glm => { delete speed(glm).prose.display; }, /headline\.speed\.prose must have exactly display, hi, hi_text, lo, lo_text, or be null/],
  ['reference_streams not a list', glm => { speed(glm).reference_streams = 1; }, /headline\.speed\.reference_streams must be a list/],
  ['code lo that is not the decode_c8 lo', glm => { Object.assign(speed(glm).code, { lo: 77.8, lo_text: '77.8' }); }, /headline\.speed\.code\.lo must equal the headline decode_c8 lo \(77\.7\), not 77\.8/],
  ['code hi that is not the decode_c8 hi', glm => { Object.assign(speed(glm).code, { hi: 99.9, hi_text: '99.9' }); }, /headline\.speed\.code\.hi must equal the headline decode_c8 hi \(88\.8\), not 99\.9/],
  ['code taken from the decode_c4 row', glm => { Object.assign(speed(glm).code, { lo: 55.5, hi: 66.6, lo_text: '55.5', hi_text: '66.6' }); }, /headline\.speed\.code\.lo must equal the headline decode_c8 lo \(77\.7\), not 55\.5/],
  ['code hi_text written differently from the decode_c8 row', glm => { speed(glm).code.hi_text = '88.80'; }, /headline\.speed\.code\.hi_text must equal the headline decode_c8 hi_text \("88\.8"\), not "88\.80"/],
  ['code null', glm => { speed(glm).code = null; }, /headline\.speed\.code must have exactly display, hi, hi_text, lo, lo_text$/],
  ['code band null', glm => { Object.assign(speed(glm).code, { lo: null, hi: null, lo_text: null, hi_text: null }); }, /headline\.speed\.code: lo and hi must both be numbers$/],
  ['code band inverted', glm => { Object.assign(speed(glm).code, { lo: 88.8, hi: 77.7, lo_text: '88.8', hi_text: '77.7' }); }, /headline\.speed\.code: lo 88\.8 is above hi 77\.7/],
  ['code text that is not its number', glm => { speed(glm).code.lo_text = '77.6'; }, /headline\.speed\.code: lo_text "77\.6" does not equal 77\.7/],
  ['a display token without "~"', glm => { speed(glm).code.display = '80'; }, /headline\.speed\.code\.display must be null or look like "~180"/],
  ['a display token in words', glm => { speed(glm).code.display = 'about 80'; }, /headline\.speed\.code\.display must be null or look like "~180"/],
  ['a display token as a number', glm => { speed(glm).code.display = 80; }, /headline\.speed\.code\.display must be null or look like "~180"/],
  ['a display token with a separator', glm => { speed(glm).code.display = '~1,080'; }, /headline\.speed\.code\.display must be null or look like "~180"/],
  ['a display token with a unit', glm => { speed(glm).code.display = '~80 tok/s'; }, /headline\.speed\.code\.display must be null or look like "~180"/],
  ['a display token far above the band', glm => { speed(glm).code.display = '~200'; }, /headline\.speed\.code\.display "~200" is outside 77 to 89, the band it stands for/],
  ['a display token just above the band', glm => { speed(glm).code.display = '~89.1'; }, /headline\.speed\.code\.display "~89\.1" is outside 77 to 89/],
  ['a display token just below the band', glm => { speed(glm).code.display = '~76.9'; }, /headline\.speed\.code\.display "~76\.9" is outside 77 to 89/],
  ['a prose display token out of its band', glm => { speed(glm).prose.display = '~80'; }, /headline\.speed\.prose\.display "~80" is outside 33 to 45/],
  ['a prose band inverted', glm => { Object.assign(speed(glm).prose, { lo: 44.4, hi: 33.3, lo_text: '44.4', hi_text: '33.3' }); }, /headline\.speed\.prose: lo 44\.4 is above hi 33\.3/],
  ['a prose text that is not its number', glm => { speed(glm).prose.hi_text = '44.5'; }, /headline\.speed\.prose: hi_text "44\.5" does not equal 44\.4/],
  ['a prose text with a sign', glm => { speed(glm).prose.lo_text = '+33.3'; }, /headline\.speed\.prose: lo_text must be the figure as written/],
  ['a prose band half null', glm => { speed(glm).prose.hi = null; }, /headline\.speed\.prose: lo and hi must both be numbers$/],
  ['a prose band all null after the fill', glm => { speed(glm).prose = { ...NULL_BAND }; }, /headline\.speed\.prose: lo and hi must both be numbers$/],
  ['reference stream count 0', glm => { speed(glm).reference_streams = [0]; }, /headline\.speed\.reference_streams must be whole numbers from 1 to 8, not \[0\]/],
  ['reference stream count 9', glm => { speed(glm).reference_streams = [9]; }, /headline\.speed\.reference_streams must be whole numbers from 1 to 8, not \[9\]/],
  ['a fractional reference stream count', glm => { speed(glm).reference_streams = [1.5]; }, /headline\.speed\.reference_streams must be whole numbers from 1 to 8/],
  ['a reference stream count as text', glm => { speed(glm).reference_streams = ['1']; }, /headline\.speed\.reference_streams must be whole numbers from 1 to 8, not \["1"\]/],
  ['a reference stream count as a concurrency', glm => { speed(glm).reference_streams = ['c1']; }, /headline\.speed\.reference_streams must be whole numbers from 1 to 8/],
  ['reference stream counts descending', glm => { speed(glm).reference_streams = [2, 1]; }, /headline\.speed\.reference_streams must be ascending with no repeats, not \[2,1\]/],
  ['a repeated reference stream count', glm => { speed(glm).reference_streams = [1, 1]; }, /headline\.speed\.reference_streams must be ascending with no repeats, not \[1,1\]/],
  ['a reference clause in the template', glm => { template(glm); speed(glm).reference_streams = [1]; }, /^REFUSED: placeholder is still true, and in placeholder state headline\.speed\.reference_streams must be empty/],
  ['a figure in the template', glm => { template(glm); speed(glm).code.lo = 77.7; }, /^REFUSED: placeholder is still true, and in placeholder state every headline\.speed value must be null, but code\.lo is 77\.7/],
  ['a display token in the template', glm => { template(glm); speed(glm).prose.display = '~40'; }, /^REFUSED: placeholder is still true, and in placeholder state every headline\.speed value must be null, but prose\.display is "~40"/],
  ['a null prose in the template', glm => { template(glm); speed(glm).prose = null; }, /^REFUSED: placeholder is still true, and in placeholder state headline\.speed\.prose must be the null band, not null/],
  ['no speed headline in the template', glm => { template(glm); delete glm.headline.speed; }, /^REFUSED: placeholder is still true, and headline\.speed must be an object/],
  ['a template speed headline at 4 streams', glm => { template(glm); speed(glm).streams = 4; }, /^REFUSED: placeholder is still true, and headline\.speed\.streams must be 8/],
];

/**
 * Text the page prints as written. Each value must be refused in a set label and in the conditions sentence.
 * The ids are made-up stand-ins with the shapes the checker refuses.
 */
const CLAIM = 'a claim about mode switching, speed, equivalence or scaling';
const HYGIENE = [
  ['Base recipe \u2014 levers off', /an em dash/],
  ['boot7 base recipe', /a boot or lane id: "boot7"/],
  ['Boot 7 base recipe', /a boot or lane id: "Boot 7"/],
  ['boot-7 base recipe', /a boot or lane id: "boot-7"/],
  ['boot_7 base recipe', /a boot or lane id: "boot_7"/],
  ['A0-X base recipe', /a boot or lane id: "A0-X"/],
  ['A0 X base recipe', /a boot or lane id: "A0 X"/],
  ['a0-x base recipe', /a boot or lane id: "a0-x"/],
  ['a0_x base recipe', /a boot or lane id: "a0_x"/],
  ['A0-X9 base recipe', /a boot or lane id: "A0-X9"/],
  ['Q9 matrix at ship config', /a boot or lane id: "Q9"/],
  ['Z3 matrix at ship config', /a boot or lane id: "Z3"/],
  ["Q9' matrix at ship config", /a boot or lane id: "Q9"/],
  ['Base matrix Z12', /a boot or lane id: "Z12"/],
  ['FINAL-X start', /a boot or lane id: "FINAL-"/],
  ['KGATE-X start', /a boot or lane id: "KGATE"/],
  ['Base start on fa9', /a boot or lane id: "fa9"/],
  ['Base start from lane 42', /a boot or lane id: "lane 42"/],
  ['Base start from %42', /a boot or lane id: "%42"/],
  ['Base start from /home/run/numbers', /a local path/],
  ['Base start from ~/run/numbers', /a local path/],
  ['Base start from /tmp/run/numbers', /a local path: "\/tmp\/"/],
  ['Base start from /mnt/run/numbers', /a local path: "\/mnt\/"/],
  ['Base start at 10.0.0.9', /an IP address: "10\.0\.0\.9"/],
  ['Base start on node-z.local', /a local host name: "node-z\.local"/],
  ['Base start on NODE-Z.LOCAL', /a local host name: "NODE-Z\.LOCAL"/],
  ["Mia's benchmark settings", /the Mia name: "Mia"/],
  ['MIA settings', /the Mia name: "MIA"/],
  ['as mia runs it', /the Mia name: "mia"/],
  ['Mode switching is instant and costs no throughput.', new RegExp(`${CLAIM}: "switch"`)],
  ['switches modes in 2 s', new RegExp(`${CLAIM}: "switch"`)],
  ['same quality as edited', new RegExp(`${CLAIM}: "same quality"`)],
  ['x1.13 scaled', new RegExp(`${CLAIM}: "x1"`)],
  ['Base start, 1.13x of stock', new RegExp(`${CLAIM}: "3x"`)],
  ['Base start, 1.13 X stock', new RegExp(`${CLAIM}: "3 X"`)],
  ['Base start, \u00d71.13', new RegExp(`${CLAIM}: "\u00d7"`)],
  ['Edited start after a restart', new RegExp(`${CLAIM}: "restart"`)],
  ['Edited start by hot swap', new RegExp(`${CLAIM}: "hot swap"`)],
  ['Edited start, Hot-Swapped', new RegExp(`${CLAIM}: "Hot-Swap"`)],
  ['Instantly ready edited start', new RegExp(`${CLAIM}: "Instant"`)],
  ['Seamless edited start', new RegExp(`${CLAIM}: "Seamless"`)],
  ['Edited start, no downtime', new RegExp(`${CLAIM}: "downtime"`)],
  ['Edited start, low latency', new RegExp(`${CLAIM}: "latency"`)],
  ['Edited start, equivalent output', new RegExp(`${CLAIM}: "equivalen"`)],
  ['Identical edited start', new RegExp(`${CLAIM}: "Identical"`)],
  ['Edited start at parity', new RegExp(`${CLAIM}: "parity"`)],
  ['Edited start, scaled to stock', new RegExp(`${CLAIM}: "scaled"`)],
  ['Edited start, Scaling applied', new RegExp(`${CLAIM}: "Scaling"`)],
  ['Edited start, correction factor', new RegExp(`${CLAIM}: "factor"`)],
  ['Edited start, abliteration tax', new RegExp(`${CLAIM}: "tax"`)],
];
const NAMES = (process.env.GLM_CHECK_NAMES ?? '').split(',').map(name => name.trim()).filter(Boolean);
for (const name of NAMES) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  HYGIENE.push([`Base start measured by ${name}`, new RegExp(`an agent or model name: "${escaped}"`)]);
  HYGIENE.push([`Base start, ${name.toLowerCase()}-6 run`, new RegExp(`an agent or model name: "${escaped.toLowerCase()}"`)]);
}
if (!NAMES.length) test('refuses agent and model names', { skip: 'set GLM_CHECK_NAMES to run these controls' }, () => {});
for (const [text, refusal] of HYGIENE) {
  CONTROLS.push([`set label "${text}"`, glm => { set(glm, 'base_m0_b').label = text; }, refusal]);
  CONTROLS.push([`conditions "${text}"`, glm => { glm.headline.conditions = `${text}.`; }, refusal]);
}

for (const [what, edit, refusal] of CONTROLS) {
  test(`refuses ${what}`, t => {
    const result = check(edited(edit));
    assert.notEqual(result.status, 0, `accepted: ${result.stdout.trim()}`);
    const reason = result.stderr.trim();
    t.diagnostic(reason);
    assert.match(reason, /^REFUSED: /);
    assert.match(reason, refusal);
  });
}
