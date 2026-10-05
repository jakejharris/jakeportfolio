#!/usr/bin/env node
/**
 * Refuse to ship /jspark3/glm/ and the hub's latest card unless the synced release facts are final,
 * public and complete.
 *
 *   node scripts/check-glm-facts.mjs [--facts RELEASE-FACTS.md] [--results results.json] [--live] [--before-numbers]
 *
 * --facts and --results also check that app/(site)/jspark3/glm-facts.json was synced from exactly
 * those files.
 * --live checks that every linked page answers 200.
 * --before-numbers checks everything except the number slots (every result figure, the headline and
 * what_changed written from them, the RigMark blocks and rows and the release's comparison rows, the
 * warm start time), the RigMark decision and status "final", so the rest can be cleared before the last
 * figures arrive; it lists what it skipped. Only the full check clears a release to ship.
 * A refusal prints one "REFUSED: <reason>" line per problem and exits 1.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { COPY_RULES, copyRulesOf, publicIssues } from './glm-facts-hygiene.mjs';
import { UNPUBLISHED, partnersOf, partnersWith } from './glm-partners.mjs';
import { factsOf, reasoningOffRow, rowSentence } from './glm-thinking-row.mjs';

const args = process.argv.slice(2);
const factsPath = args.includes('--facts') ? args[args.indexOf('--facts') + 1] : null;
/** The release facts as written, underscore keys and all; read only with --facts. */
const releaseFacts = factsPath ? factsOf(readFileSync(factsPath, 'utf8')) : {};
const resultsPath = args.includes('--results') ? args[args.indexOf('--results') + 1] : null;
const live = args.includes('--live');
const beforeNumbers = args.includes('--before-numbers');
const synced = JSON.parse(readFileSync(new URL('../app/(site)/jspark3/glm-facts.json', import.meta.url), 'utf8'));
const share = JSON.parse(readFileSync(new URL('../app/(site)/jspark3/glm-share.json', import.meta.url), 'utf8'));
const { facts, source } = synced;
/**
 * Whether thinking row (i) is applied (never without --facts): the row from the release facts
 * (_freeze_variants before the freeze, _thinking_row_applied after it), its strings in the synced facts.
 */
const offRow = reasoningOffRow(releaseFacts, facts);

/** Number slots: filled from the last measurements, and re-checked by the full check once they are. */
const NUMBER_SLOTS = [/^result_sets\.[^.]+\.metrics\b/, /^headline\b/, /^what_changed$/, /^rigmark\.[A-Z]-[A-Z]$/, /^rigmark\.comparison_public\.(?:c1_ttft|prose_visible_ttft)_row\.(?:v1_8_4|[A-Z]-[A-Z])$/, /^rigmark_rows\b/, /^site_tile_captions\b/, /^install_costs\.warm_start_time$/];
/** Decisions Jake makes before the release ships. */
const DECISIONS = [/^rigmark\.publish$/];
const skippable = path => beforeNumbers && [...NUMBER_SLOTS, ...DECISIONS].some(pattern => pattern.test(path));
/** On a no, nothing RigMark measured is shown, so what it still owes cannot reach a page. */
const unshown = path => facts.rigmark?.publish === false && /^rigmark(?:\.(?!publish$)|_rows\b)/.test(path);

const failures = [];
const skipped = new Set();
const failedPaths = new Set();
/** Records a failure at path, once per path, unless path is a slot this run skips. */
const need = (ok, message, path = '') => {
  if (ok) return true;
  if (path && skippable(path)) skipped.add(path);
  else if (!path || !failedPaths.has(path)) failures.push(message);
  if (path) failedPaths.add(path);
  return false;
};

const text = value => typeof value === 'string' && value.trim().length > 0;
const record = value => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const at = (root, path) => path.split('.').reduce((value, key) => record(value)[key], root);
const https = (value, where, path) => need(text(value) && /^https:\/\/\S+$/.test(value), `${where} must be an https link, not ${JSON.stringify(value)}`, path);
const literal = (value, where, path) => need(text(value) && /^\d[\d,]*(\.\d+)?$/.test(value), `${where} must be a number written as text, not ${JSON.stringify(value)}`, path);
const filled = (value, where, path) => need(text(value), `${where} is missing`, path);
/**
 * Figures never shown alone (glm-partners.mjs): { [figure]: { partner, keys } }, the partner sentence of the
 * same set and the set's figures it must give. They come from the release facts at check time
 * (metrics_template._first_token_partners; the synced first_token_partners without --facts), over the c8 floor,
 * so a pair the release declares needs no edit here.
 */
const declared = factsPath ? partnersOf(releaseFacts.metrics_template?._first_token_partners) : { pairs: record(facts.first_token_partners), problems: [] };
const PARTNERS = partnersWith(declared.pairs);
/** The credits the pages show: the site's {name, role, url} list when the release gives one, else the cards' strings. */
const credits = Array.isArray(facts.credits_site) && facts.credits_site.length ? facts.credits_site : facts.credits;
/** Every leaf of a metrics object, as dotted paths. */
const leaves = (value, prefix = '') => Object.entries(record(value)).flatMap(([key, item]) => (record(item) === item ? leaves(item, `${prefix}${key}.`) : [`${prefix}${key}`]));
/** Every string in the facts with its path ("weights.variants.base.how", "known_issues_public[4]"). */
function strings(value, path = '') {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, index) => strings(item, `${path}[${index}]`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key));
  return [];
}

/** The pages read a set's weights from its first letter and its draft model from its suffix. */
const SET_WEIGHTS = { V: 'base', O: 'ablit' };
/** The install costs the install section places, by key (app/(site)/jspark3/glm-facts.ts COST_STEPS). */
const PLACED_COSTS = ['conditions', 'image_pull_time', 'image_disk', 'build_time', 'wheels_disk', 'download_time', 'drafter_time', 'split_time', 'one_third_disk', 'split_ram', 'first_start_time', 'kernel_cache_disk', 'warm_start_time'];

function check() {
  for (const issue of publicIssues(facts)) need(false, issue);
  if (factsPath) need(createHash('sha256').update(readFileSync(factsPath)).digest('hex') === source.sha256, 'glm-facts.json was not synced from that facts file; run scripts/sync-glm-facts.mjs');
  if (resultsPath) need(createHash('sha256').update(readFileSync(resultsPath)).digest('hex') === source.results?.sha256, 'glm-facts.json was not synced from that results file; run scripts/sync-glm-facts.mjs --results');
  need(source.blanked === undefined, `the draft sync blanked ${source.blanked?.join(', ')}; sync without --draft`);
  if (beforeNumbers) skipped.add(`status (${JSON.stringify(facts.status)})`);
  else need(facts.status === 'final', `the release facts are ${JSON.stringify(facts.status)}, not final`);
  need((facts.holds ?? []).length === 0, `the release still holds figures: ${(facts.holds ?? []).join(', ')}`);
  // The shipped config always reasons; its lowest effort is low. No page may offer to turn thinking off.
  // A sentence may say an earlier release ran with reasoning off ("v1.8.4 ran with reasoning off, its
  // default"): the words describe the release the sentence names last before them, if it is not this one.
  // If the release applies thinking row (i) at the freeze (a setting that turns reasoning off ships), that
  // row's own sentences may say so, each in its own field (glm-thinking-row.mjs; needs --facts).
  const OFF_SWITCH = /(?:turn|switch|toggle)s?\w*\s+(?:thinking|reasoning)\s+off|(?:thinking|reasoning)\s+(?:can be |is )?(?:turned |switched )?off|disable\w*\s+(?:thinking|reasoning)|(?:thinking|reasoning)\s+on\s*(?:and|or|\/)\s*off|no[- ]thinking mode/gi;
  const earlier = name => !!name && !String(facts.version ?? '').startsWith(name) && !name.startsWith(String(facts.version ?? '-'));
  // After the freeze _thinking_row_applied records the row applied; if that is row (i), every one of its strings must be live.
  need(offRow.applied || (!offRow.fields.length && !(offRow.row && offRow.from === '_thinking_row_applied')), `thinking row (i) is only partly applied: ${offRow.missing.join(', ')} not in the live facts`);
  // metric_conditions.all is the results file's conditions.public, which the cards render from the facts'
  // measurement_conditions: the two must be the same text. Under row (i) the cards render
  // again with the relabel, so the check follows it; the reason given names row (i)'s sentence when that is the drift.
  const conditionsAll = facts.metric_conditions?.all;
  if (typeof conditionsAll === 'string' && conditionsAll !== facts.measurement_conditions) {
    const split = value => String(value ?? '').split(/(?<=[.!?])\s+/);
    const live = split(facts.measurement_conditions), rendered = split(conditionsAll);
    const relabel = offRow.relabel && ['replace', 'with'].find(side => conditionsAll.includes(offRow.relabel[side]) !== String(facts.measurement_conditions ?? '').includes(offRow.relabel[side]));
    const first = live.find(sentence => !rendered.includes(sentence)) ?? rendered.find(sentence => !live.includes(sentence));
    need(false, relabel
      ? `metric_conditions.all and measurement_conditions disagree on the reasoning sentence: row (i)'s ${relabel === 'with' ? 'relabel' : 'replaced sentence'} is only in ${conditionsAll.includes(offRow.relabel[relabel]) ? 'metric_conditions.all' : 'measurement_conditions'}`
      : `metric_conditions.all is not measurement_conditions; the cards render it from the facts, so sync a matching pair (first difference: "${String(first).slice(0, 120)}")`);
  }
  // Under row (i) every figure of the release's own benchmark is labelled; under any other row nothing is.
  if (offRow.applied) for (const key of ['relbench_reasoning_label_public', 'relbench_reasoning_label_short_public']) filled(facts[key], `${key} (thinking row (i) is applied)`, key);
  else need(facts.relbench_reasoning_label_public === undefined && facts.relbench_reasoning_label_short_public === undefined, 'the reasoning labels are live but thinking row (i) is not applied');
  for (const [path, value] of strings(facts)) for (const sentence of value.split(/(?<=[.!?])\s+/)) for (const match of sentence.matchAll(OFF_SWITCH)) {
    const named = [...sentence.slice(0, match.index).matchAll(/\bv\d+(?:\.\d+){1,2}\b/g)].at(-1)?.[0];
    need(earlier(named) || rowSentence(offRow, path, sentence), `${path}: the facts say thinking can be turned off ("${match[0]}"); the shipped config has no thinking-off mode`);
  }
  for (const [path, value] of strings(facts)) {
    const pending = value.match(/\{\{(?:TBD|HOLD)\b[^}]*\}\}|\(provisional\)/);
    if (pending && !unshown(path)) need(false, `${path} is still pending (${pending[0]})`, path);
  }
  // Digests are shown only as pure hex; anything else in a sha256 slot is a note, not a digest.
  for (const [path, value] of strings(facts)) if (/sha256/i.test(path.split('.').at(-1) ?? '')) need(/^[0-9a-f]{64}$/.test(value), `${path} is not a SHA-256 digest`, path);

  for (const key of ['version', 'tag', 'install_tag', 'results_tag']) filled(facts[key], key, key);
  need(/^\d{4}-\d{2}-\d{2}$/.test(facts.published ?? ''), 'published must be a date like 2026-10-02', 'published');
  need(facts.headline?.sentences?.length === 2, 'headline needs its sentence and sub-line', 'headline.sentences');
  (facts.headline?.sentences ?? []).forEach((sentence, index) => filled(sentence, `headline sentence ${index}`, `headline.sentences[${index}]`));

  // Links point at their governing tag: install at install_tag, results at results_tag. Every link the facts give is https.
  const links = record(facts.links);
  for (const key of ['release', 'install', 'results', 'source']) https(links[key], `links.${key}`, `links.${key}`);
  https(links.model_card ?? links.hf_repo, 'links.hf_repo (the model card)', 'links.hf_repo');
  for (const [key, value] of Object.entries(links)) if (!['release', 'install', 'results', 'source'].includes(key)) https(value, `links.${key}`, `links.${key}`);
  if (text(links.install) && !/\{\{/.test(links.install)) need(links.install.includes(facts.install_tag), 'links.install must be pinned to install_tag');
  if (text(links.results) && !/\{\{/.test(links.results)) need(links.results.includes(facts.results_tag), 'links.results must be pinned to results_tag');

  // The release's sentences: top-level keys, or their older homes in page_copy.
  const copy = record(facts.page_copy);
  const hardware = record(facts.hardware);
  const sentences = {
    what_changed: facts.what_changed ?? copy.engine_change, install_claim: facts.install_claim ?? copy.install_claim,
    'hardware.summary': hardware.summary ?? copy.hardware, 'hardware.link': hardware.link, 'hardware.network': hardware.network,
    'hardware.disk_per_host': hardware.disk_per_host ?? copy.disk_per_host, rollback: facts.rollback ?? copy.rollback,
    security_note: facts.security_note ?? copy.security_note, session_cache_note: facts.session_cache_note ?? copy.session_reuse,
    upgrade_from_v1_8: facts.upgrade_from_v1_8 ?? copy.upgrade_from_v1_8, upgrade_thinking_public: facts.upgrade_thinking_public,
    'license.line': copy.license_line ?? facts.license?.line,
  };
  for (const [key, value] of Object.entries(sentences)) {
    // Disk per host may come by component; then every component is filled (and the page never sums them).
    if (key === 'hardware.disk_per_host' && record(value) === value) for (const [part, item] of Object.entries(value)) filled(item, `hardware.disk_per_host.${part}`, `hardware.disk_per_host.${part}`);
    else filled(value, key, key);
  }
  for (const key of ['name', 'previous_engine', 'license', 'provenance_line_public']) filled(facts.engine?.[key], `engine.${key}`, `engine.${key}`);
  // The copy rules are the release's: the mirror holds the same patterns and allowances as its public_copy_rules.
  const rules = factsPath ? copyRulesOf(releaseFacts.public_copy_rules) : {};
  if (Object.keys(rules).length) need(JSON.stringify(rules) === JSON.stringify(COPY_RULES), "scripts/glm-copy-rules.json is not the facts' public_copy_rules; run scripts/sync-glm-facts.mjs", 'public_copy_rules');
  for (const key of ['name', 'license', 'distribution', 'commercial_alternative', 'commercial_contact']) filled(facts.draft_model?.[key], `draft_model.${key}`, `draft_model.${key}`);
  // "Commercial use" is never shown without the conditions the no-draft path runs under.
  filled(facts.license?.commercial_path, 'license.commercial_path', 'license.commercial_path');
  if (facts.upgrade_who_should_stay !== undefined) filled(facts.upgrade_who_should_stay, 'upgrade_who_should_stay', 'upgrade_who_should_stay');
  for (const key of ['existing_checkout', 'fresh']) if (facts.rollback_commands !== undefined) filled(facts.rollback_commands?.[key], `rollback_commands.${key}`, `rollback_commands.${key}`);
  if (facts.rollback_commands !== undefined) for (const key of ['existing_checkout', 'fresh']) need(String(facts.rollback_commands?.[key] ?? '').includes('v1.8.4'), `rollback_commands.${key} must be pinned to the v1.8.4 tag`);

  // The weights a user chooses at install: one named default, each with its own source, license, switch and way in.
  const variants = record(facts.weights?.variants);
  need(Object.keys(variants).length >= 1, 'weights.variants must list the weights a user can choose');
  need(Object.hasOwn(variants, facts.weights?.default_variant), `weights.default_variant must name one variant exactly, not ${JSON.stringify(facts.weights?.default_variant)}`);
  for (const [id, item] of Object.entries(variants)) {
    const where = `variant ${id}`;
    for (const key of ['label', 'description', 'license', 'how']) filled(item[key], `${where}: ${key}`, `weights.variants.${id}.${key}`);
    filled(item.install_switch ?? facts.switch?.weights, `${where}: install_switch (or switch.weights)`);
    need(/^[\w.-]+\/[\w.-]+@[0-9a-f]{7,}$/.test(item.source ?? ''), `${where}: source must be owner/name@revision`);
    if (item.url !== undefined) https(item.url, `${where} url`);
    if (id !== 'base') for (const key of ['framing_public', 'user_responsibility_line', 'conversion', 'conversion_cost_one_spark']) filled(item[key], `${where}: ${key}`, `weights.variants.${id}.${key}`);
  }

  // Every set names its weights and carries its own figures as literals; a set with the draft model has every cell.
  const sets = Object.entries(record(facts.result_sets));
  const template = leaves(facts.metrics_template);
  need(sets.length >= 1, 'result_sets is empty');
  for (const [id, set] of sets) {
    const variant = SET_WEIGHTS[id.charAt(0)];
    need(variant && Object.hasOwn(variants, variant), `result set ${id} does not name weights the release offers`);
    filled(set.label_public, `result set ${id}: label_public`);
    if (!need(record(set.metrics) === set.metrics, `result set ${id}: metrics must be written out, not ${JSON.stringify(set.metrics)}`)) continue;
    const cells = leaves(set.metrics);
    /** A figure the release measured and does not publish: printed as "Not published", with no unit and no partner. */
    const unpublished = value => typeof value === 'string' && UNPUBLISHED.test(value.trim());
    for (const path of cells) {
      const value = at(set.metrics, path), where = `result_sets.${id}.metrics.${path}`;
      // A partner sentence is copy and a reply count reads "3 of 24"; every other cell is a figure.
      if (unpublished(value)) continue;
      if (path.endsWith('_public')) filled(value, `${id} metrics.${path}`, where);
      else if (path.endsWith('_replies')) need(text(value) && /^\d[\d,]* of \d[\d,]*$/.test(value), `${id} metrics.${path} must read like "3 of 24", not ${JSON.stringify(value)}`, where);
      else literal(value, `${id} metrics.${path}`, where);
    }
    // Where a set gives a partnered figure it gives the partner, and a figure the page shows has its sentence written.
    for (const [key, { partner: sentence, keys: names }] of Object.entries(PARTNERS)) {
      const figure = at(set.metrics, key);
      if (figure === undefined || unpublished(figure)) continue;
      const mate = at(set.metrics, sentence);
      const written = value => text(value) && !/\{\{(?:TBD|HOLD)\b|\(provisional\)/.test(value);
      need(mate !== undefined, `${id} metrics.${key} has no partner: ${sentence} goes wherever the figure does`);
      if (written(figure) && mate !== undefined) need(written(mate), `${id} metrics.${key} (${figure}) would show without its partner: ${sentence} is ${JSON.stringify(mate)}`);
      if (written(figure) && written(mate)) for (const name of names) {
        const value = at(set.metrics, name);
        if (written(value)) need(mate.includes(value), `${id} metrics.${sentence} does not give ${name} (${value})`);
      }
    }
    if (!id.endsWith('-N')) for (const path of template) need(cells.includes(path), `${id} metrics.${path} is missing`, `result_sets.${id}.metrics.${path}`);
  }
  const letter = Object.entries(SET_WEIGHTS).find(([, weights]) => weights === facts.weights?.default_variant)?.[0];
  const defaultSet = record(facts.result_sets)[`${letter}-D`];
  need(defaultSet, 'the default weights need a set with the draft model');

  // The note under the partnered figures, on which estimator each set's partner uses, when the results give one.
  if (record(facts.metric_conditions).first_token_partner_estimators !== undefined) filled(facts.metric_conditions.first_token_partner_estimators, 'metric_conditions.first_token_partner_estimators');
  // The pairs as the release declares them, and as the pages read them.
  for (const problem of declared.problems) need(false, problem);
  if (factsPath) need(JSON.stringify(record(facts.first_token_partners)) === JSON.stringify(declared.pairs), 'glm-facts.json first_token_partners is not the facts\' metrics_template._first_token_partners; run scripts/sync-glm-facts.mjs');
  // A hub tile, the share card and the headline have no room for a partner sentence.
  for (const key of Array.isArray(facts.site_tiles) ? facts.site_tiles : []) need(!Object.hasOwn(PARTNERS, key), `site_tiles: ${key} is never shown without ${PARTNERS[key]?.partner}, and a tile has no room for it`);
  // A concurrency figure carries its condition, from the release's template (glm-facts.ts captionTemplate keeps the
  // same rule): an N-at-once figure its concurrency label with N from its key, a pause its stall condition.
  const captionOf = key => (/^c\d+_stall_s(\.|$)/.test(key) ? 'stall_condition_template' : /^c\d+_|^concurrency_[a-z_]+\.c\d+$/.test(key) ? 'concurrency_label_template' : null);
  const conditioned = template => text(record(facts.template_labels)[template]) && record(facts.template_labels)[template].includes('{N}');
  for (const key of Array.isArray(facts.site_tiles) ? facts.site_tiles : []) {
    const template = captionOf(key);
    if (template) need(conditioned(template), `site_tiles: ${key} is never shown without its condition, and the facts give no ${template} with {N}`, `template_labels.${template}`);
  }
  // The same on /jspark3/glm/: every c8 or c-ladder figure and every stall figure any set measured, each with its N.
  // (One refusal per template: when a tile already refused for it, that refusal stands for these too.)
  const figures = {};
  for (const key of new Set(sets.flatMap(([, set]) => leaves(set.metrics)))) if (captionOf(key)) (figures[captionOf(key)] ??= []).push(key);
  for (const [template, keys] of Object.entries(figures)) need(conditioned(template), `/jspark3/glm/ never shows ${keys.join(', ')} without its condition, and the facts give no ${template} with {N}`, `template_labels.${template}`);
  for (const cite of facts.headline?.cites ?? []) need(!Object.hasOwn(PARTNERS, cite.cell), `the headline cites ${cite.cell}, which is never shown without ${PARTNERS[cite.cell]?.partner}`);

  // The headline's figures must be the figures of the cells they cite.
  for (const [index, cite] of (facts.headline?.cites ?? []).entries()) {
    const set = record(facts.result_sets)[cite.set];
    if (!need(set, `headline cites set ${JSON.stringify(cite.set)}, which the facts do not have`, `headline.cites[${index}].set`)) continue;
    const value = at(set.metrics, cite.cell);
    if (value !== undefined) need(String(value) === String(cite.value), `headline cites ${cite.set} ${cite.cell} as ${cite.value}, but the set has ${value}`, `headline.cites[${index}].value`);
  }

  // RigMark is published only on an explicit decision; when it is, every row and block is there.
  need(typeof facts.rigmark?.publish === 'boolean', 'rigmark.publish must be decided: true or false', 'rigmark.publish');
  if (facts.rigmark?.publish === true) {
    filled(facts.rigmark.v1_8_4_block, 'rigmark.v1_8_4_block');
    const ran = sets.map(([id]) => id).filter(id => Object.hasOwn(facts.rigmark, id));
    for (const id of ran) filled(facts.rigmark[id], `rigmark.${id}`, `rigmark.${id}`);
    need(Array.isArray(facts.rigmark_rows) && facts.rigmark_rows.length, 'rigmark_rows are missing', 'rigmark_rows');
    for (const row of facts.rigmark_rows ?? []) {
      for (const key of ['id', 'label', 'unit']) filled(row[key], `rigmark row ${row.id}: ${key}`, 'rigmark_rows');
      need(row.better === 'higher' || row.better === 'lower', `rigmark row ${row.id}: better must be higher or lower`, 'rigmark_rows');
      literal(row.v1_8_4, `rigmark row ${row.id} v1_8_4`, 'rigmark_rows');
      for (const id of ran) literal(row[id], `rigmark row ${row.id} ${id}`, 'rigmark_rows');
    }
    // Every view of the comparison carries its scope, the release's two first-token rows (C1 per stream, and
    // prose to the first visible text), each with its note and figures, and the prose row's footnote.
    const comparison = record(facts.rigmark.comparison_public);
    const where = key => `rigmark.comparison_public.${key}`;
    filled(comparison.scope, where('scope'), where('scope'));
    for (const name of ['c1_ttft_row', 'prose_visible_ttft_row']) {
      const row = record(comparison[name]);
      for (const key of ['label', 'note']) filled(row[key], where(`${name}.${key}`), where(`${name}.${key}`));
      for (const id of ['v1_8_4', ...ran]) literal(row[id], where(`${name}.${id}`), where(`${name}.${id}`));
    }
    filled(comparison.prose_footnote, where('prose_footnote'), where('prose_footnote'));
  }
  // RigMark's own prose time to first token marks the first reasoning token, not visible text: no row may
  // carry it, published or not (glm-facts.ts drops one too). Code and structured first-token rows are visible text.
  for (const row of Array.isArray(facts.rigmark_rows) ? facts.rigmark_rows : []) {
    const named = `${row?.id ?? ''} ${row?.label ?? ''}`;
    need(!(/prose/i.test(named) && /ttft|time to first|first[ _-]token/i.test(named) && !/visible/i.test(named)), `rigmark row ${row?.id}: RigMark's prose time to first token marks the first reasoning token, not visible text, and is never published; use rigmark.comparison_public.prose_visible_ttft_row`);
  }
  // The only comparison of this release with v1.8.4 is RigMark's "Against v1.8.4", shown on a yes. The sync
  // no longer ships a v1.8.4 baseline and no chart, tile or share card draws one.
  need(facts.baseline_v1_8_4 == null || Object.keys(record(facts.baseline_v1_8_4)).length === 0, 'baseline_v1_8_4 must be empty: v1.8.4 figures stand beside this release only in RigMark\'s "Against v1.8.4"');

  const conditions = record(facts.metric_conditions);
  if (!text(facts.measurement_conditions ?? conditions.all)) for (const key of ['sets', 'cold_ttft', 'decode', 'concurrency', 'c8_stall', 'draft_acceptance']) filled(conditions[key], `metric_conditions.${key}`);
  // A tile shows a figure of the default set, of another set that measured it (site_tile_sets, named under the
  // figure by its weights), or of a RigMark row (site_tile_sources). A RigMark tile reads the default set's column
  // only, never another set's or v1.8.4's, shows only while RigMark is published, and its label says it is RigMark's.
  const siteTiles = Array.isArray(facts.site_tiles) ? facts.site_tiles : [];
  const tileSets = record(facts.site_tile_sets), tileSources = record(facts.site_tile_sources), tileLabels = record(facts.site_tile_labels), tileCaptions = record(facts.site_tile_captions);
  for (const field of ['site_tile_labels', 'site_tile_sets', 'site_tile_sources', 'site_tile_captions']) for (const key of Object.keys(record(facts[field]))) need(siteTiles.includes(key), `${field}: ${key} is not one of site_tiles`, `${field}.${key}`);
  for (const [key, label] of Object.entries(tileLabels)) filled(label, `site_tile_labels.${key}`, `site_tile_labels.${key}`);
  // A RigMark tile's condition is the release's own, word for word as the facts give it, and never the prompt mix's:
  // RigMark ran its own requests. A metrics tile's condition comes from the release's template instead.
  if (factsPath) need(JSON.stringify(tileCaptions) === JSON.stringify(record(releaseFacts.site_tile_captions)), "glm-facts.json site_tile_captions is not the facts' site_tile_captions; run scripts/sync-glm-facts.mjs", 'site_tile_captions');
  const mixTemplate = record(facts.template_labels).concurrency_label_template;
  const mix = text(mixTemplate) ? new RegExp(`^${mixTemplate.split('{N}').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\d+')}$`) : null;
  for (const [key, caption] of Object.entries(tileCaptions)) {
    filled(caption, `site_tile_captions.${key}`, `site_tile_captions.${key}`);
    need(Object.hasOwn(tileSources, key), `site_tile_captions.${key} captions a metrics tile, whose condition comes from the release's template`, `site_tile_captions.${key}`);
    need(!mix?.test(String(caption)), `site_tile_captions.${key} is the prompt mix's caption; a RigMark tile names what RigMark ran`, `site_tile_captions.${key}`);
    need(!/\d(?:\.\d+)?\s*[x\u00d7](?![\w/-])/.test(String(caption)), `site_tile_captions.${key} gives a ratio; a tile shows its own figure only`, `site_tile_captions.${key}`);
  }
  for (const key of siteTiles) {
    if (Object.hasOwn(tileSources, key)) {
      const source = record(tileSources[key]), where = `site_tile_sources.${key}`;
      need(!Object.hasOwn(tileSets, key), `site tile ${key} names both a source and a set`, where);
      need(facts.rigmark?.publish === true, `site tile ${key} is a RigMark figure, and RigMark is not published`, where);
      need(source.set === `${letter}-D`, `site tile ${key} reads RigMark's ${JSON.stringify(source.set)} column; a tile shows only the default set's (${letter}-D), never another set's or v1.8.4's`, where);
      const row = (Array.isArray(facts.rigmark_rows) ? facts.rigmark_rows : []).find(item => item?.id === source.rigmark_row);
      if (need(row, `site tile ${key} reads rigmark row ${JSON.stringify(source.rigmark_row)}, which the facts do not have`, where)) literal(row[source.set], `site tile ${key} (rigmark row ${row.id} ${source.set})`, where);
      need(/\bRigMark\b/.test(tileLabels[key] ?? ''), `site tile ${key} is RigMark's figure, and site_tile_labels.${key} does not say so`, `site_tile_labels.${key}`);
      if (/^c\d+$/.test(String(source.rigmark_row))) need(text(tileCaptions[key]), `site tile ${key} is RigMark's ${String(source.rigmark_row).slice(1)}-at-once figure, and site_tile_captions.${key} does not give its condition`, `site_tile_captions.${key}`);
      continue;
    }
    need(template.includes(key), `site tile ${key} is not a metrics cell`);
    const id = Object.hasOwn(tileSets, key) ? record(tileSets[key]).set : `${letter}-D`;
    const set = record(facts.result_sets)[id];
    if (!need(set, `site tile ${key} reads set ${JSON.stringify(id)}, which the facts do not have`, `site_tile_sets.${key}`)) continue;
    literal(at(set.metrics, key), `site tile ${key}`, `result_sets.${id}.metrics.${key}`);
    const label = record(tileSets[key]).label;
    if (label !== undefined) filled(label, `site_tile_sets.${key}.label`, `site_tile_sets.${key}`);
  }
  // The line over the tiles names the default set's weights; when a tile is from other weights, it says so.
  const mixed = siteTiles.some(key => Object.hasOwn(tileSets, key) && record(tileSets[key]).set !== `${letter}-D`);
  const footer = facts.site_card_footer_public;
  if (mixed) need(text(footer), 'site tiles come from more than one set of weights, and site_card_footer_public does not say what they were measured with', 'site_card_footer_public');
  if (footer !== undefined && filled(footer, 'site_card_footer_public', 'site_card_footer_public')) {
    if (defaultSet) need(footer.startsWith(defaultSet.label_public ?? ''), `site_card_footer_public must name the default set's weights (${JSON.stringify(defaultSet.label_public)}) first`, 'site_card_footer_public');
    need(mixed || !/unless marked/i.test(footer), 'site_card_footer_public says "unless marked", and no tile is marked', 'site_card_footer_public');
  }

  // What the install takes: every cost the facts give has a place on the page.
  const costs = record(facts.install_costs);
  for (const key of Object.keys(costs)) need(PLACED_COSTS.includes(key), `install_costs.${key} has no place on the page; add it to COST_STEPS in glm-facts.ts`);
  if (facts.capabilities?.image_input === true) filled(facts.capabilities.image_input_public, 'capabilities.image_input_public', 'capabilities.image_input_public');
  if (facts.errata !== undefined) filled(facts.errata.engine_docs_public, 'errata.engine_docs_public', 'errata.engine_docs_public');

  need(Array.isArray(credits) && credits.length, 'credits are missing');
  // A credit is "Name (what they made)", or {name, role, url} with an https link.
  for (const credit of credits ?? []) {
    if (typeof credit === 'string') { need(/^.+?\s+\(.+\)$/.test(credit), `credit ${JSON.stringify(credit)} must read "Name (what they made)"`); continue; }
    need(text(credit.name) && text(credit.role), 'every credit needs a name and a role');
    if (credit.url !== undefined) https(credit.url, `credit ${credit.name}`);
  }
  need(Array.isArray(facts.known_issues_public), 'known_issues_public must be a list');
  for (const [index, issue] of (facts.known_issues_public ?? []).entries()) filled(issue, `known issue ${index}`, `known_issues_public[${index}]`);
  for (const [key, value] of Object.entries(record(facts.compatibility))) filled(value, `compatibility.${key}`, `compatibility.${key}`);
  for (const [key, value] of Object.entries(record(facts.license?.components))) filled(value, `license.components.${key}`, `license.components.${key}`);
  const acceptedPatch = facts.runnability?.level_reached === 'live-acceptance' &&
    facts.results_tag !== facts.version && /clean installation.*has not been demonstrated/i.test(facts.install_claim ?? '') &&
    /^https:\/\//.test(facts.links?.evidence ?? '');
  need(['L2', 'L3'].includes(facts.runnability?.level_reached) || acceptedPatch,
    'the pages need L2/L3 or live acceptance with an explicit clean-install limitation, historical results and evidence link', 'runnability.level_reached');
  // The release's numbers card, when it is shown, must come from these exact facts.
  if (share.image) need(share.facts_sha256 === source.sha256, 'the share card was rendered from other facts; rerun scripts/render-glm-share.mjs');
  return { version: facts.version, sha256: source.sha256, default: facts.weights?.default_variant, sets: sets.map(([id]) => id), rigmark: facts.rigmark?.publish, reasoning_off_row: offRow.applied, share: share.image };
}

/** Every outside page the release pages link to. */
function urls() {
  const variants = Object.values(record(facts.weights?.variants)).map(item => item.url ?? `https://huggingface.co/${item.source.split('@')[0]}/tree/${item.source.split('@')[1]}`);
  const [drafter, revision] = String(facts.draft_model.name).split('@');
  return [...Object.values(record(facts.links)).filter(value => /^https:/.test(value)), ...variants, `https://huggingface.co/${drafter}/tree/${revision}`, ...credits.flatMap(credit => (credit?.url ? [credit.url] : []))];
}

const result = check();
if (live && !failures.length) {
  for (const url of new Set(urls())) {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    need(response.status === 200, `${url} returned ${response.status}`);
  }
}
const skips = beforeNumbers ? { skipped: [...skipped].sort() } : {};
if (failures.length) {
  for (const failure of failures) console.error(`REFUSED: ${failure.split('\n')[0]}`);
  if (beforeNumbers) console.error(`(skipped before the numbers: ${skips.skipped.length})`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, mode: beforeNumbers ? 'before-numbers' : 'full', ...result, live, ...skips }));
