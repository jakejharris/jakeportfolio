/**
 * Thinking row (i): recognised only when every one of its strings is live, each in its own field.
 *
 *   node --test scripts/glm-thinking-row.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { reasoningOffRow, rowSentence } from './glm-thinking-row.mjs';

const ROW = {
  id: '(i)',
  known_issue_9_public: 'Reasoning is on by default. To turn reasoning off, send `enable_thinking: false`.',
  compatibility_thinking_on_off: 'On by default. Turn it off per request.',
  upgrade_thinking_public: 'Reasoning is now on by default.',
  relbench_reasoning_label_public: 'Measured at reasoning effort low; on v2.0.1, `enable_thinking: false` turns reasoning off.',
  measurement_conditions_reasoning_sentence: { replace: 'Figures are at low effort.', with: 'Figures are at low effort; `enable_thinking: false` now turns reasoning off.' },
  who_should_stay_prose_sentence: 'v2.0.1 with reasoning turned off was not measured.',
};
const LIVE_III = {
  known_issues_public: ['One.', 'Reasoning is always on, and no setting turns it fully off.'],
  compatibility: { thinking_on_off: 'Always on.' },
  upgrade_thinking_public: 'Reasoning is now always on.',
  measurement_conditions: 'Every set ran the same build. Figures are at low effort.',
  upgrade_who_should_stay: 'v1.8.4 stays available. On prose replies it is sooner.',
};
const applied = live => ({ ...live, _freeze_variants: { _thinking: { x2e_default_high: ROW, no_fix: { id: '(iii)' } } } });
const rowI = {
  known_issues_public: ['One.', ROW.known_issue_9_public],
  compatibility: { thinking_on_off: ROW.compatibility_thinking_on_off },
  upgrade_thinking_public: ROW.upgrade_thinking_public,
  relbench_reasoning_label_public: ROW.relbench_reasoning_label_public,
  measurement_conditions: `Every set ran the same build. ${ROW.measurement_conditions_reasoning_sentence.with}`,
  upgrade_who_should_stay: `v1.8.4 stays available. ${ROW.who_should_stay_prose_sentence}`,
};

test('row (iii) live: row (i) is not applied and none of its sentences is allowed', () => {
  const state = reasoningOffRow(applied(LIVE_III));
  assert.equal(state.applied, false);
  assert.deepEqual(state.fields, []);
  assert.equal(rowSentence(state, 'known_issues_public[1]', 'To turn reasoning off, send `enable_thinking: false`.'), false);
});

test('row (i) live: each of its sentences is allowed in its own field, and nowhere else', () => {
  const state = reasoningOffRow(applied(rowI));
  assert.equal(state.applied, true, `missing: ${state.missing}`);
  assert.deepEqual(state.fields.map(field => field.path), ['known_issues_public[1]', 'compatibility.thinking_on_off', 'upgrade_thinking_public', 'relbench_reasoning_label_public', 'measurement_conditions', 'upgrade_who_should_stay']);
  assert.equal(rowSentence(state, 'known_issues_public[1]', 'To turn reasoning off, send `enable_thinking: false`.'), true);
  assert.equal(rowSentence(state, 'security_note', 'To turn reasoning off, send `enable_thinking: false`.'), false);
  assert.equal(rowSentence(state, 'known_issues_public[1]', 'You can turn reasoning off.'), false);
});

test('row (i) partly live is not applied, so its sentences stay refused', () => {
  const state = reasoningOffRow(applied({ ...LIVE_III, known_issues_public: rowI.known_issues_public }));
  assert.equal(state.applied, false);
  assert.ok(state.missing.includes('upgrade_thinking_public'));
  assert.equal(rowSentence(state, 'known_issues_public[1]', 'To turn reasoning off, send `enable_thinking: false`.'), false);
});

test('a new spelling in the row and the live fields is picked up as is', () => {
  const spelled = { ...ROW, known_issue_9_public: 'Reasoning is on by default. To turn reasoning off, send `thinking: "off"`.' };
  const facts = { ...rowI, known_issues_public: ['One.', spelled.known_issue_9_public], _freeze_variants: { _thinking: { x2e_default_high: spelled } } };
  const state = reasoningOffRow(facts);
  assert.equal(state.applied, true);
  assert.equal(rowSentence(state, 'known_issues_public[1]', 'To turn reasoning off, send `thinking: "off"`.'), true);
});

test('facts without the variants (no --facts) never apply row (i)', () => {
  assert.equal(reasoningOffRow({}).applied, false);
  assert.equal(reasoningOffRow(rowI).applied, false);
});

// After the freeze the release deletes _freeze_variants and keeps the row it applied as _thinking_row_applied.
const frozen = (live, row) => ({ ...live, ...(row === undefined ? {} : { _thinking_row_applied: row }) });

test('frozen row (i): read from _thinking_row_applied once the variants are gone', () => {
  const state = reasoningOffRow(frozen(rowI, ROW));
  assert.equal(state.from, '_thinking_row_applied');
  assert.equal(state.applied, true, `missing: ${state.missing}`);
  assert.equal(rowSentence(state, 'known_issues_public[1]', 'To turn reasoning off, send `enable_thinking: false`.'), true);
  assert.deepEqual(state.relabel, ROW.measurement_conditions_reasoning_sentence);
});

test('frozen row (i) with the key missing fails closed', () => {
  const state = reasoningOffRow(frozen(rowI));
  assert.equal(state.applied, false);
  assert.equal(state.row, null);
  assert.equal(rowSentence(state, 'known_issues_public[1]', 'To turn reasoning off, send `enable_thinking: false`.'), false);
});

test('frozen row (iii): no row (i), whatever the live text says', () => {
  for (const live of [LIVE_III, rowI]) {
    const state = reasoningOffRow(frozen(live, { id: '(iii)', known_issue_9_public: LIVE_III.known_issues_public[1] }));
    assert.deepEqual([state.row, state.from, state.applied, state.fields], [null, '_thinking_row_applied', false, []]);
  }
});

test('frozen row (i) whose strings are not live is recorded as applied but is not', () => {
  const state = reasoningOffRow(frozen(LIVE_III, ROW));
  assert.deepEqual([state.row, state.from, state.applied], ['(i)', '_thinking_row_applied', false]);
  assert.ok(state.missing.includes('known_issue_9_public'));
});

test('_thinking_row_applied wins over leftover variants', () => {
  const state = reasoningOffRow({ ...applied(rowI), _thinking_row_applied: { id: '(iii)' } });
  assert.equal(state.applied, false);
});

test('the row comes from the release facts, the live strings from the synced facts', () => {
  const release = { ...LIVE_III, _thinking_row_applied: ROW };
  assert.equal(reasoningOffRow(release).applied, false);
  assert.equal(reasoningOffRow(release, rowI).applied, true);
});
