import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import committed from '../glm-release.json';
import type { GlmRelease } from '../release-copy';
import { setCaption } from '../release-copy';
import { axisEnd, bandText, buildRaceStarts, raceCaption, weightsText, type RaceData, type RaceStart } from './decode-race-data';

const synthetic: GlmRelease = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'scripts/fixtures/glm-release.synthetic.json'), 'utf8'),
);

/** Every number and number text anywhere in a release file. */
function valuesIn(release: GlmRelease) {
  const numbers = new Set<number>();
  const texts = new Set<string>();
  const walk = (value: unknown) => {
    if (typeof value === 'number') numbers.add(value);
    else if (typeof value === 'string') texts.add(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(release);
  return { numbers, texts };
}

/** Every number the race draws or prints comes from the release file itself. */
function assertFromData(race: RaceData, release: GlmRelease) {
  const { numbers, texts } = valuesIn(release);
  const concurrencies = new Set(
    [...release.headline.rows.map(row => row.concurrency), 'c1', 'c2', 'c4', 'c8'].map(at => Number(at.replace(/^c/, ''))),
  );
  for (const start of race.starts) {
    for (const lane of start.lanes) {
      for (const value of [lane.lo, lane.hi]) if (value !== null) assert.ok(numbers.has(value), `${start.key} ${lane.id}: ${value} is not in the data`);
      assert.ok(concurrencies.has(lane.streams), `${start.key} ${lane.id}: ${lane.streams} streams is not a concurrency in the data`);
      for (const part of lane.band.split('–')) {
        if (part === 'XX.X' || part === 'n/a') continue;
        assert.ok(texts.has(part.replace(/,/g, '')), `${start.key} ${lane.id}: "${part}" is not a text in the data`);
      }
    }
  }
}

/**
 * The committed file in its placeholder state: a deep copy with every measured value set back to null.
 * Built from the file itself, so it keeps the current schema whether or not the release has been filled.
 */
function placeholderOf(release: GlmRelease): GlmRelease {
  const MEASURED = new Set(['lo', 'hi', 'lo_text', 'hi_text', 'v1_1', 'v1_1_text', 'mia']);
  const blank = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(blank);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, MEASURED.has(key) ? null : blank(entry)]));
  };
  return { ...(blank(structuredClone(release)) as GlmRelease), placeholder: true, mia: release.mia };
}

test('the placeholder state yields no measured start and no scale', () => {
  const release = placeholderOf(committed as GlmRelease);
  const race = buildRaceStarts(release);
  const own = release.headline.missing ? [] : ['current'];
  assert.equal(race.measured.length, 0);
  assert.equal(race.scaleEnd, null);
  assert.deepEqual(race.starts.map(start => start.key), [...own, ...release.sets.map(set => set.id)]);
  assert.equal(race.initial?.key, race.starts[0]?.key);
  for (const start of race.starts) {
    assert.deepEqual(start.lanes.map(lane => lane.id), ['decode_c1', 'decode_c2', 'decode_c4', 'decode_c8']);
    for (const lane of start.lanes) assert.equal(lane.band, bandText(null, null));
  }
  assertFromData(race, release);
});

test('every number the race uses is in the committed file, filled or not', () => {
  const release = committed as GlmRelease;
  const race = buildRaceStarts(release);
  assert.ok(race.starts.length > 0);
  assertFromData(race, release);
  if (race.scaleEnd !== null) {
    const all = race.measured.flatMap(start => start.lanes.flatMap(lane => [lane.lo, lane.hi])).filter((value): value is number => value !== null);
    assert.equal(race.scaleEnd, axisEnd(all));
  }
});

test('a filled file yields every start in table order, with its own decode rows', () => {
  const race = buildRaceStarts(synthetic);
  assert.deepEqual(race.starts.map(start => start.key), ['current', ...synthetic.sets.map(set => set.id)]);
  assert.deepEqual(race.measured.map(start => start.key), race.starts.map(start => start.key));
  assert.equal(race.initial?.key, 'current');
  const own = race.starts[0];
  assert.equal(own.label, `${synthetic.headline.build}, measured build`);
  const decode = synthetic.headline.rows.filter(row => row.label === 'Decode');
  assert.deepEqual(own.lanes.map(lane => [lane.id, lane.streams, lane.lo, lane.hi]), decode.map(row => [row.id, Number(row.concurrency.slice(1)), row.lo, row.hi]));
  assert.deepEqual(own.lanes.map(lane => lane.label), ['one stream', '2 streams', '4 streams', '8 streams']);
  for (const [index, set] of synthetic.sets.entries()) {
    const lanes = race.starts[index + 1].lanes;
    const rows = set.rows.filter(row => row.id.startsWith('decode_'));
    assert.deepEqual(lanes.map(lane => [lane.id, lane.lo, lane.hi]), rows.map(row => [row.id, row.lo, row.hi]));
  }
  assertFromData(race, synthetic);
});

test('a lane prints its band as the page does, and nothing for a row that was not measured', () => {
  const race = buildRaceStarts(synthetic);
  const lanes = Object.fromEntries(race.starts.flatMap(start => start.lanes.map(lane => [`${start.key}/${lane.id}`, lane])));
  assert.equal(lanes['current/decode_c1'].band, bandText('11.1', '22.2'));
  assert.equal(bandText('11.1', '22.2'), '11.1–22.2');
  assert.equal(bandText('22.2', '22.2'), '22.2');
  assert.equal(bandText('1234.5', '1234.5'), '1,234.5');
  const missing = lanes['base_m0_b/decode_c4'];
  assert.equal(missing.lo, null);
  assert.equal(missing.band, bandText(null, null));
});

test('a start with no measured decode row is not offered, and the release missing leaves only the sets', () => {
  const partial: GlmRelease = structuredClone(synthetic);
  partial.headline.missing = true;
  partial.sets[1].rows = partial.sets[1].rows.map(row => ({ ...row, lo: null, hi: null, lo_text: null, hi_text: null }));
  const race = buildRaceStarts(partial);
  assert.deepEqual(race.starts.map(start => start.key), synthetic.sets.map(set => set.id));
  assert.deepEqual(race.measured.map(start => start.key), [synthetic.sets[0].id, synthetic.sets[2].id]);
  assert.equal(race.initial?.key, synthetic.sets[0].id);
});

test('one lane width covers every lo and hi of every measured start, by the chart rule', () => {
  const race = buildRaceStarts(synthetic);
  const all = race.measured.flatMap(start => start.lanes.flatMap(lane => [lane.lo, lane.hi])).filter((value): value is number => value !== null);
  assert.equal(race.scaleEnd, axisEnd(all));
  assert.ok(all.every(value => value <= (race.scaleEnd ?? 0)));
  // The rule of HeadlineResults.tsx: a round step at or just above the largest value.
  assert.equal(axisEnd([88.8]), 100);
  assert.equal(axisEnd([101]), 150);
  assert.equal(axisEnd([12, 180]), 200);
  assert.equal(axisEnd([251]), 300);
  assert.equal(axisEnd([0.4]), 1);
  assert.equal(axisEnd([]), 1);
});

/** How often `part` appears in `text`. */
const count = (text: string, part: string) => text.split(part).length - 1;

test('a caption says the label as written, then the build and the weights once each, then starts and sweeps', () => {
  const run = { serving_starts: 1, sweeps: 2 };
  const caption = (label: string, build: string, mode: number) => raceCaption({ label, run: { build, mode, ...run } });
  assert.equal(caption('v1.7.4 base recipe, stock weights, QA profile', 'v1.7.4', 0), 'v1.7.4 base recipe, stock weights, QA profile · one serving start, two sweeps');
  assert.equal(caption('v1.7.4 base recipe, no decode levers', 'v1.7.4', 1), 'v1.7.4 base recipe, no decode levers · edited weights, opt-in · one serving start, two sweeps');
  assert.equal(caption('v1.99.0, measured build', 'v1.99.0', 0), 'v1.99.0, measured build · stock weights · one serving start, two sweeps');
  assert.equal(caption('v1.99, this release', 'v1.99.0', 0), 'v1.99.0 · v1.99, this release · stock weights · one serving start, two sweeps');
  // A build the label lacks leads, and a longer version in the label does not count as it.
  assert.equal(caption('Base recipe, levers off', 'v1.98.4', 0), 'v1.98.4 · Base recipe, levers off · stock weights · one serving start, two sweeps');
  assert.equal(caption('v1.7.4 base recipe', 'v1.7.0', 0), 'v1.7.0 · v1.7.4 base recipe · stock weights · one serving start, two sweeps');
});

test('every start of a file gets its label verbatim, its build and its weights exactly once', () => {
  for (const release of [synthetic, committed as GlmRelease, placeholderOf(committed as GlmRelease)]) {
    for (const start of buildRaceStarts(release).starts as RaceStart[]) {
      const caption = raceCaption(start);
      assert.ok(caption.includes(start.label), `${start.key}: "${caption}" lacks its label`);
      assert.equal(count(caption, start.run.build), Math.max(1, count(start.label, start.run.build)), `${start.key}: "${caption}"`);
      const weights = start.run.mode === 0 ? 'stock weights' : 'edited weights';
      assert.equal(count(caption.toLowerCase(), weights), 1, `${start.key}: "${caption}" has its weights other than once`);
    }
  }
  // The release's own start is labelled from the page's own file, which names its build, so the label leads.
  const own = buildRaceStarts(committed as GlmRelease).starts.find(start => start.key === 'current');
  if (own) assert.equal(raceCaption(own), [own.label, 'stock weights', raceCaption(own).split(' · ').at(-1)].join(' · '));
});

test('the measured build stays independent of a later install patch', () => {
  for (const installTag of [synthetic.tag, 'v1.99.2']) {
    const release = { ...synthetic, install_tag: installTag };
    const own = buildRaceStarts(release).starts.find(start => start.key === 'current')!;
    assert.equal(own.run.build, release.headline.build);
    assert.equal(own.label, `${release.headline.build}, measured build`);
    assert.equal(raceCaption(own), `${release.headline.build}, measured build · stock weights · one serving start, two sweeps`);
  }
});

test('the weights words match the ones setCaption writes', () => {
  for (const mode of [0, 1]) {
    const caption = setCaption({ build: 'v1.2.3', mode, serving_starts: 1, sweeps: 1 });
    assert.ok(caption.includes(` · ${weightsText(mode)} · `), `setCaption writes "${caption}", without "${weightsText(mode)}"`);
  }
});
