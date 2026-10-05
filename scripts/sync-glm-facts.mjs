#!/usr/bin/env node
// Copy the public facts of the current JSPARK3 GLM release into the site.
//
//   node scripts/sync-glm-facts.mjs <RELEASE-FACTS.md> [--results <results.json>] [--draft] [--out <file>]
//
// The release's facts file is the single source for every public number and sentence. This
// reads its ```json block, keeps only the public keys below, and writes
// app/(site)/jspark3/glm-facts.json with the source file's SHA-256, so the pages can be matched
// to the facts the release was approved on. It refuses local paths, IP addresses, host and
// internal names, release-candidate labels and em dashes anywhere in what it keeps. Slots the
// release has not filled yet ({{TBD...}}) are copied as they are; the pages mark them, and
// scripts/check-glm-facts.mjs refuses them for production.
//
// --results reads each set's figures from the release's results file (jspark3-release-results/1),
// where the facts leave a set's metrics to it; a figure the two files both give must match. The results
// file must have been rendered from these very facts: its source facts sha (recorded in the file as
// source_facts_sha256 or facts_sha256, else in its name, results-<version>.facts-<sha8>.json) must begin
// the facts file's SHA-256. A results file that names other facts, or none, is refused.
// --draft blanks a value that fails the public-text check to {{TBD}} instead of refusing, so a
// draft can render while the release fixes it; the production check refuses the blank like any
// other. Holds the release declares (_holds) are kept by name only. --out writes elsewhere, to
// check a facts file without changing the pages.
//
// The release's first-token pairs (metrics_template._first_token_partners) ship as first_token_partners. A results
// cell's partner sentence (its "partner") fills the pair's partner cell like a figure; a cell only the results file
// gives is kept when a pair names it; a card-only pointer ("see the note below the table") never ships.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join, resolve } from 'node:path';
import { COPY_RULES, copyRulesOf, publicIssues } from './glm-facts-hygiene.mjs';
import { CARD_POINTER, UNPUBLISHED, partnersOf, partnersWith } from './glm-partners.mjs';

const args = process.argv.slice(2);
const option = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const source = args[0];
if (!source || source.startsWith('--')) {
  console.error('usage: node scripts/sync-glm-facts.mjs <RELEASE-FACTS.md> [--results <results.json>] [--draft] [--out <file>]');
  process.exit(2);
}
const draft = args.includes('--draft');
const root = resolve(new URL('..', import.meta.url).pathname);
const out = option('--out') ? resolve(option('--out')) : join(root, 'app/(site)/jspark3/glm-facts.json');
const text = readFileSync(source, 'utf8');
const blocks = [...text.matchAll(/```json\n([\s\S]*?)\n```/g)];
if (blocks.length !== 1) throw new Error(`expected one json block in the facts file, found ${blocks.length}`);
const facts = JSON.parse(blocks[0][1]);
// The release's own copy rules check this sync, and are mirrored for the gate (scripts/glm-copy-rules.json).
const releaseRules = copyRulesOf(facts.public_copy_rules);
const copyRules = Object.keys(releaseRules).length ? releaseRules : COPY_RULES;

/**
 * The public keys. true keeps the whole value; an object keeps only its keys, each by its own rule;
 * '*' applies one rule to every key of a map. Receipts, payload digests, per-host manifests, the
 * shipped environment and anything else that names the release's own machinery stay out.
 */
const VARIANT = { label: true, description: true, framing_public: true, source: true, source_access: true, redirects_to: true, url: true, license: true, ablit_source_terms_verbatim: true, install_switch: true, download_bytes: true, other_inputs: true, conversion: true, conversion_cost_one_spark: true, user_responsibility_line: true, how: true, measured_vs_fresh_public: true, status_public: true, stranger_split_matches: true };
const PUBLIC = {
  status: true, project: true, model: true, version: true, version_label_public: true, history: true,
  tag: true, install_tag: true, results_tag: true, published: true,
  engine: { name: true, upstream: true, base_version: true, license: true, previous_engine: true, provenance_line_public: true },
  weights: { variants: { '*': VARIANT }, default_variant: true },
  draft_model: { name: true, license: true, distribution: true, commercial_alternative: true, commercial_contact: true },
  headline: { sentences: true, cites: true, rule: true },
  result_sets: { '*': { label_public: true, metrics: true } },
  metrics_template: { '*': true },
  rigmark: { publish: true, v1_8_4_block: true, 'V-D': true, 'O-D': true, 'V-N': true, comparison_public: true },
  rigmark_rows: true, metric_conditions: true, page_copy: true,
  runnability: { level_reached: true },
  compatibility: true,
  license: { components: true, line: true, commercial_path: true },
  links: true, upgrade_from_v1_8: true, credits: true, credits_site: true, site_tiles: true, site_tile_labels: true, site_tile_sets: true, site_tile_sources: true, site_tile_captions: true, site_card_footer_public: true,
  supersedes: true,
  release: { title: true }, hardware: { summary: true, link: true, network: true, disk_per_host: true },
  previous_release: true, related: true, switch: true, what_changed: true, install_claim: true,
  install_costs: true, capabilities: { image_input: true, image_input_public: true }, results_conditions_public: true, profiles: { public_line: true },
  errata: { engine_docs_public: true }, upgrade_who_should_stay: true, upgrade_thinking_public: true,
  relbench_reasoning_label_public: true, relbench_reasoning_label_short_public: true,
  rollback_commands: { existing_checkout: true, existing_checkout_where: true, fresh: true },
  measurement_conditions: true, known_issues_public: true, known_issues_scope_public: true, install_issues_scope_public: true, security_note: true, session_cache_note: true, rollback: true,
};

/** value without the release's notes to itself: keys starting with "_", at any depth. */
function unnoted(value) {
  if (Array.isArray(value)) return value.map(unnoted);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !key.startsWith('_')).map(([key, item]) => [key, unnoted(item)]));
  return value;
}

/**
 * value with only the keys rule allows. Keys starting with "_" are the release's notes to itself
 * (rules, sources, verification): they are dropped at every depth, even under a rule that keeps a
 * whole value, unless a rule names one.
 */
function pick(value, rule) {
  if (rule === true) return unnoted(value);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
  const entries = Object.entries(value).flatMap(([key, item]) => {
    const sub = rule[key] ?? (key.startsWith('_') ? undefined : rule['*']);
    return sub === undefined ? [] : [[key, pick(item, sub)]];
  });
  return Object.fromEntries(entries);
}

/**
 * A slot's note says what the release still owes. A note that names internal work (a lane, a host,
 * a test id) is dropped, leaving a bare {{TBD}}: the page needs the gap, not the note.
 */
function plainSlots(value) {
  // A sentence still to be confirmed ({{CHECK: ...}}) is unfilled until the release removes the marker.
  if (typeof value === 'string') return value.replace(/\{\{CHECK\b[^}]*\}\}/g, '{{TBD: to be confirmed}}').replace(/\{\{TBD(?::[^}]*)?\}\}/g, slot => (publicIssues(slot, '', copyRules).length ? '{{TBD}}' : slot));
  if (Array.isArray(value)) return value.map(plainSlots);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plainSlots(item)]));
  return value;
}

/** Every leaf of an object, as ["a.b", value] pairs. */
const leaves = (value, prefix = '') => (value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value).flatMap(([key, item]) => leaves(item, `${prefix}${prefix ? '.' : ''}${key}`)) : [[prefix, value]]);
/** The cells a metrics template defines, without its placeholder values: the pages need only its shape. */
const shape = value => (value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)])) : true);

const kept = pick(facts, PUBLIC);
// A measured cell may carry its figure as printed and its raw value ({display, value}); the pages print
// the figure as the release prints it, so only the display text ships.
const displayed = value => (value && typeof value === 'object' && !Array.isArray(value)
  ? (typeof value.display === 'string' ? value.display : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, displayed(item)])))
  : value);
for (const set of Object.values(kept.result_sets ?? {})) if (set && typeof set === 'object' && set.metrics) set.metrics = displayed(set.metrics);
// The template's prompt mix describes the shared prompts, not a figure each set reports. Only its
// public sentence (what the prompts are and where their texts ship) goes to the pages.
if (kept.metrics_template) {
  const mix = kept.metrics_template.prompt_mix;
  if (mix && typeof mix === 'object' && mix.public !== undefined) kept.prompt_mix_public = mix.public;
  delete kept.metrics_template.prompt_mix;
  // A cell the template fills for every set (the shipped context length) is a setting, not a measurement: keep its value.
  const settings = Object.fromEntries(leaves(kept.metrics_template).filter(([, value]) => typeof value === 'string' && /^\d[\d,]*(\.\d+)?$/.test(value)));
  if (Object.keys(settings).length) kept.template_settings = settings;
  // A template string that is neither a slot nor a figure is a label pattern ("short prompts, ..., {N} concurrent"),
  // not a cell every set reports: it stays out of the shape and is kept by name.
  for (const [key, value] of Object.entries(kept.metrics_template)) {
    if (typeof value === 'string' && !/\{\{/.test(value) && !/^\d[\d,]*(\.\d+)?$/.test(value)) {
      (kept.template_labels ??= {})[key] = value;
      delete kept.metrics_template[key];
    }
  }
  kept.metrics_template = shape(kept.metrics_template);
}
// A hold keeps figures off the pages until the release lifts it; its note is the release's own.
kept.holds = Object.keys(facts._holds ?? {});
// The figures never shown without a partner sentence: the release lists them per set in
// metrics_template._first_token_partners, which stays out like every underscore key, so the pages get the
// same pairs by figure as first_token_partners (glm-partners.mjs).
const partners = partnersOf(facts.metrics_template?._first_token_partners);
if (partners.problems.length) throw new Error(partners.problems.join('\n'));
if (Object.keys(partners.pairs).length) kept.first_token_partners = partners.pairs;
const pairs = partnersWith(partners.pairs);
/** Every cell a pair names: kept from the results file even where the facts have no cell for it. */
const paired = new Set(Object.values(pairs).flatMap(pair => [pair.partner, ...pair.keys]));

/** "a.b" keys as nested objects: {"cold_ttft_s.32k": x} becomes {cold_ttft_s: {"32k": x}}. */
function nest(flat) {
  const nested = {};
  for (const [path, value] of Object.entries(flat)) {
    const keys = path.split('.');
    keys.slice(0, -1).reduce((node, key) => (node[key] ??= {}), nested)[keys.at(-1)] = value;
  }
  return nested;
}

let results = null;
/** Results cells the facts have no cell for (a shape the two files disagree on); listed, never shown. */
const unmatched = [];
if (option('--results')) {
  const resultsText = readFileSync(option('--results'), 'utf8');
  const file = JSON.parse(resultsText);
  if (file.schema !== 'jspark3-release-results/1') throw new Error(`unknown results schema ${JSON.stringify(file.schema)}`);
  if (file.release_version !== facts.version) throw new Error(`the results file is for ${file.release_version}, the facts for ${facts.version}`);
  // The pair: text identical in public is not the same facts; only the sha the results were rendered from is.
  const factsSha = createHash('sha256').update(text).digest('hex');
  const named = basename(option('--results')).match(/\.facts-([0-9a-f]{8,64})(?=\.)/i)?.[1].toLowerCase();
  const recorded = [file.source_facts_sha256, file.facts_sha256].find(value => typeof value === 'string')?.toLowerCase();
  const refuse = message => { console.error(`REFUSED: ${message}`); process.exit(1); };
  if (recorded !== undefined && !/^[0-9a-f]{8,64}$/.test(recorded)) refuse(`the results file records its source facts as ${JSON.stringify(recorded)}, not a sha256`);
  if (recorded && named && !recorded.startsWith(named)) refuse(`the results file is named for facts ${named} but records facts ${recorded.slice(0, 12)}`);
  const from = recorded ?? named;
  if (!from) refuse(`${basename(option('--results'))} does not say which facts it was rendered from; sync a results file named results-<version>.facts-<sha8>.json`);
  if (!factsSha.startsWith(from)) refuse(`the results file was rendered from facts ${from.slice(0, 12)}, but ${basename(source)} is ${factsSha.slice(0, 12)}; sync the results file rendered from these facts`);
  results = { file: basename(option('--results')), sha256: createHash('sha256').update(resultsText).digest('hex'), status: file.status ?? null };
  kept.result_sets ??= {};
  for (const [id, set] of Object.entries(file.sets ?? {})) {
    // A figure's partner sentence rides on its cell; it fills the pair's partner cell like any figure.
    const sentences = Object.entries(set.metrics ?? {}).filter(([, cell]) => typeof cell?.partner === 'string').map(([key, cell]) => {
      if (!pairs[key]) throw new Error(`the results file gives ${id} ${key} a partner sentence, but the facts declare no first-token pair for ${key}`);
      return [pairs[key].partner, cell.partner];
    });
    const fromResults = nest(Object.fromEntries([...Object.entries(set.metrics ?? {}).map(([key, cell]) => [key, cell.display]), ...sentences]));
    const target = (kept.result_sets[id] ??= { label_public: set.label_public });
    const written = target.metrics && typeof target.metrics === 'object' ? target.metrics : null;
    if (!written) { target.metrics = fromResults; continue; }
    // The facts' cells are the shape. A cell the facts leave unfilled takes the results file's figure;
    // a cell both fill must agree, or the pages would print one figure and the evidence another.
    const given = Object.fromEntries(leaves(fromResults));
    const filled = value => typeof value === 'string' && !/\{\{(?:TBD|HOLD)\b/.test(value) && !CARD_POINTER.test(value.trim());
    const merged = Object.fromEntries(leaves(written).map(([path, value]) => {
      if (!Object.hasOwn(given, path)) return [path, value];
      if (filled(value) && filled(given[path]) && String(value) !== String(given[path])) {
        console.error(`REFUSED: ${id} ${path} is ${value} in the facts but ${given[path]} in the results file`);
        process.exit(1);
      }
      return [path, filled(value) ? value : given[path]];
    }));
    const shapeOf = new Set(leaves(written).map(([path]) => path));
    for (const path of Object.keys(given).filter(path => !shapeOf.has(path))) {
      if (paired.has(path)) merged[path] = given[path];
      else unmatched.push(`${id} ${path}`);
    }
    target.metrics = nest(merged);
  }
  // One public paragraph on how everything was measured, when the facts give no conditions of their own.
  if (file.conditions?.public) kept.metric_conditions = { all: file.conditions.public, ...(kept.metric_conditions ?? {}) };
  // Why the first-token partners read as they do (which estimator each set's sentence uses), when the results give it.
  if (file.conditions?.first_token_partner_estimators !== undefined) kept.metric_conditions = { ...(kept.metric_conditions ?? {}), first_token_partner_estimators: file.conditions.first_token_partner_estimators };
}
// A card-only pointer is wording for the cards' table; on the pages the partner sentence says it. A figure the
// release does not publish has no partner, so its partner cell (a sentence, or a hold left on it) does not ship.
for (const set of Object.values(kept.result_sets ?? {})) {
  const cells = set && typeof set === 'object' && set.metrics && typeof set.metrics === 'object' ? leaves(set.metrics) : [];
  const values = Object.fromEntries(cells);
  const orphaned = new Set(Object.entries(pairs).filter(([figure]) => typeof values[figure] === 'string' && UNPUBLISHED.test(values[figure].trim())).map(([, pair]) => pair.partner));
  const dropped = ([path, value]) => (typeof value === 'string' && CARD_POINTER.test(value.trim())) || orphaned.has(path);
  if (cells.some(dropped)) set.metrics = nest(Object.fromEntries(cells.filter(cell => !dropped(cell))));
}

/** In a draft, a value that fails the public-text check becomes {{TBD}}, and its path is listed. */
const blanked = [];
function blank(value, path = '') {
  if (typeof value === 'string') {
    if (!publicIssues(value, path, copyRules).length) return value;
    blanked.push(path);
    return '{{TBD}}';
  }
  if (Array.isArray(value)) return value.map((item, index) => blank(item, `${path}[${index}]`));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, blank(item, path ? `${path}.${key}` : key)]));
  return value;
}

const slotted = plainSlots(kept);
// A figure the results file holds ({{HOLD: id}}) adds its hold to the release's own.
const cellHolds = [...JSON.stringify(slotted).matchAll(/\{\{HOLD:\s*([\w-]+)\}\}/g)].map(match => match[1]);
slotted.holds = [...new Set([...(slotted.holds ?? []), ...cellHolds])];
const issues = publicIssues(slotted, '', copyRules);
if (issues.length && !draft) {
  for (const issue of issues) console.error(`REFUSED: ${issue}`);
  process.exit(1);
}
const facts_out = issues.length ? blank(slotted) : slotted;

const sha256 = createHash('sha256').update(text).digest('hex');
const tbd = JSON.stringify(facts_out).match(/\{\{TBD[^}]*\}\}/g) ?? [];
const record = { file: 'RELEASE-FACTS.md', sha256, status: facts.status ?? null, ...(results ? { results } : {}), ...(blanked.length ? { blanked } : {}) };
writeFileSync(out, `${JSON.stringify({ source: record, facts: facts_out }, null, 2)}\n`);
if (!option('--out') && Object.keys(releaseRules).length) writeFileSync(join(root, 'scripts/glm-copy-rules.json'), `${JSON.stringify(releaseRules, null, 2)}\n`);
console.log(JSON.stringify({ wrote: out.startsWith(root) ? out.slice(root.length + 1) : out, sha256, status: facts.status ?? null, unfilled: tbd.length, holds: facts_out.holds, blanked, results, unmatched, dropped: Object.keys(facts).filter(key => !Object.hasOwn(PUBLIC, key)) }));
