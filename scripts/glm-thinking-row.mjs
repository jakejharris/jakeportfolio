// Thinking row (i) of the release facts: a v2.0.1 setting that turns reasoning off ships.
//
// The release keeps its candidate texts in _freeze_variants._thinking (never synced) and applies
// one at the freeze by writing its strings into the live fields. At the freeze it deletes the
// variants and keeps the row it applied, verbatim with its id, as _thinking_row_applied. Under
// row (i) those strings say reasoning can be turned off, which check-glm-facts.mjs otherwise
// refuses. This reads row (i)'s strings by name from the release facts, word for word as they
// stand, and finds each in its live home: row (i) counts as applied only when every one of them is
// there. A new spelling in the row and the live fields is picked up by the next sync and check; no
// name or text is written here.

/** Row (i)'s strings by name, and the live fields each may sit in once applied. */
const HOMES = {
  known_issue_9_public: facts => (Array.isArray(facts.known_issues_public) ? facts.known_issues_public : []).map((text, index) => [`known_issues_public[${index}]`, text]),
  compatibility_thinking_on_off: facts => [['compatibility.thinking_on_off', facts.compatibility?.thinking_on_off]],
  upgrade_thinking_public: facts => [['upgrade_thinking_public', facts.upgrade_thinking_public]],
  relbench_reasoning_label_public: facts => [['relbench_reasoning_label_public', facts.relbench_reasoning_label_public]],
  'measurement_conditions_reasoning_sentence.with': facts => [['measurement_conditions', facts.measurement_conditions], ['metric_conditions.all', facts.metric_conditions?.all]],
  // Beyond the strings the row names: row (i) rewrites who-stays' prose sentence ("v2.0.1 with reasoning turned off
  // was not measured"), and without it row (i) could not pass the check.
  who_should_stay_prose_sentence: facts => [['upgrade_who_should_stay', facts.upgrade_who_should_stay]],
};

const at = (root, path) => path.split('.').reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), root);

/** The release facts' JSON block, parsed. */
export const factsOf = text => JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)?.[1] ?? '{}');

/**
 * Row (i) as the release facts hold it, and where from: after the freeze _thinking_row_applied (the
 * applied row; under (iii) it is the (iii) row, so no row (i)), before it _freeze_variants._thinking.
 */
function rowOf(facts) {
  if (facts?._thinking_row_applied !== undefined) return { from: '_thinking_row_applied', row: facts._thinking_row_applied?.id === '(i)' ? facts._thinking_row_applied : null };
  const [, row] = Object.entries(facts?._freeze_variants?._thinking ?? {}).find(([, item]) => item?.id === '(i)') ?? [];
  return { from: row ? '_freeze_variants' : null, row: row ?? null };
}

/**
 * Whether row (i) is applied, and where its strings sit:
 * { row: the row's id, from: the key it was read from, applied, fields: [{ name, path, text }],
 *   missing: [names not found live], relabel: its measurement_conditions sentence ({ replace, with }) }.
 * The row comes from the release facts; the live fields from live (the synced facts the pages read),
 * or from the release facts themselves. Without a row (i) in the facts nothing is applied.
 */
export function reasoningOffRow(facts, live = facts) {
  const { from, row } = rowOf(facts);
  if (!row) return { row: null, from, applied: false, fields: [], missing: [], relabel: null };
  const fields = [];
  const missing = [];
  for (const [name, homes] of Object.entries(HOMES)) {
    const text = at(row, name);
    if (typeof text !== 'string' || !text.trim()) continue;
    const found = homes(live).filter(([, value]) => typeof value === 'string' && value.includes(text));
    if (found.length) for (const [path] of found) fields.push({ name, path, text });
    else missing.push(name);
  }
  const relabel = typeof row.measurement_conditions_reasoning_sentence?.with === 'string' ? row.measurement_conditions_reasoning_sentence : null;
  return { row: row.id, from, applied: fields.length > 0 && missing.length === 0, fields, missing, relabel };
}

/** Whether a sentence at path is one of row (i)'s own sentences, in that string's home. */
export const rowSentence = (state, path, sentence) => state.applied && state.fields.some(field => field.path === path && field.text.includes(sentence));
