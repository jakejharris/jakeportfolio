/**
 * The current GLM release as its facts file states it. glm-facts.json is written by
 * scripts/sync-glm-facts.mjs from the release's RELEASE-FACTS.md and is never edited by hand:
 * every number and factual sentence on /jspark3/glm/ and the hub's latest card comes from it.
 *
 * A slot the release has not filled yet holds {{TBD...}}, is marked (provisional), or is missing.
 * The pages mark such a slot visibly, and scripts/check-glm-facts.mjs refuses production while any
 * remains. Nothing here invents a figure or rounds one: values print as the facts write them.
 */
import data from './glm-facts.json';
import share from './glm-share.json';

type Facts = Record<string, unknown>;
const facts = data.facts as Facts;

export const SOURCE = data.source;

/**
 * The release's share card, written by scripts/render-glm-share.mjs. It is used only while it was
 * rendered from these exact facts, so a card from an earlier sync never stands in for new numbers.
 */
export const SOCIAL_IMAGE: string | null = share.image && share.facts_sha256 === data.source.sha256 ? share.image : null;

const TBD = /\{\{TBD(?::\s*([^}]*))?\}\}/;
const TBD_ALL = /\{\{TBD(?::\s*([^}]*))?\}\}/g;
const PROVISIONAL = /\s*\(provisional\)/;

/** A value as the page prints it: its literal text, or, while pending, what the release still owes. */
export type Slot = { text: string; pending: boolean };

/** value as a slot. owed names the missing fact when the release has not described it. */
export function slot(value: unknown, owed: string): Slot {
  if (typeof value === 'number' && Number.isFinite(value)) return { text: String(value), pending: false };
  if (typeof value !== 'string' || !value.trim()) return { text: `TBD: ${owed}`, pending: true };
  if (/\{\{HOLD\b/.test(value)) return { text: 'Held', pending: true };
  const whole = value.trim().match(new RegExp(`^${TBD.source}$`));
  if (whole) return { text: `TBD: ${whole[1]?.trim() || owed}`, pending: true };
  if (TBD.test(value)) return { text: value.replace(TBD_ALL, (_, what) => `[TBD${what ? `: ${what.trim()}` : ''}]`), pending: true };
  if (PROVISIONAL.test(value)) return { text: value.replace(PROVISIONAL, ''), pending: true };
  return { text: value, pending: false };
}

/** A pending slot shown by a short stand-in rather than a description of what is owed. */
export const pendingAs = (value: Slot, text: string): Slot => (value.pending ? { text, pending: true } : value);

/** A filled literal as a number for drawing, or null. Commas are thousands separators. */
export function amount(value: unknown): number | null {
  const { text, pending } = slot(value, '');
  if (pending) return null;
  const number = Number(text.replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

/** A filled literal as the page prints it, with a thousands separator in the whole part and nothing rounded. */
export function figure(value: unknown, owed: string): Slot {
  const s = slot(value, owed);
  if (s.pending || !/^-?\d+(\.\d+)?$/.test(s.text)) return s;
  const [whole, fraction] = s.text.split('.');
  return { text: `${whole.replace(/\B(?=(\d{3})+$)/g, ',')}${fraction === undefined ? '' : `.${fraction}`}`, pending: false };
}

const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {});
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const isRecord = (value: unknown) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
/** Reads a dotted path such as "cold_ttft_s.32k". */
export const at = (root: unknown, path: string): unknown => path.split('.').reduce<unknown>((value, key) => record(value)[key], root);
/** The first letter capitalized, for a sentence-case label. */
export const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Holds the release has declared: figures it keeps off every page until it lifts them, named by id.
 * A hold the pages do not know holds every figure, so nothing slips out under a new name.
 */
export const HOLDS = list(facts.holds).filter((id): id is string => typeof id === 'string');

/** A figure the results file holds back: {{HOLD: id}}. */
const HOLD_MARK = /^\{\{HOLD(?::\s*[^}]*)?\}\}$/;
export const FINAL = facts.status === 'final' && HOLDS.length === 0 && !/\{\{HOLD\b/.test(JSON.stringify(facts)) && !TBD.test(JSON.stringify(facts)) && !PROVISIONAL.test(JSON.stringify(facts));
export const DRAFT = !FINAL;

export const VERSION = slot(facts.version, 'version');
export const TAG = slot(facts.tag, 'tag');
export const INSTALL_TAG = slot(facts.install_tag, 'install tag');
export const PUBLISHED = slot(facts.published, 'release date');

/** "Oct 2, 2026" from "2026-10-02", or null while the date is pending. */
export function releaseDate(year = true) {
  if (PUBLISHED.pending || !/^\d{4}-\d{2}-\d{2}$/.test(PUBLISHED.text)) return null;
  return new Date(`${PUBLISHED.text}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });
}

const headline = record(facts.headline);
export const HEADLINE = [slot(list(headline.sentences)[0], 'headline sentence'), slot(list(headline.sentences)[1], 'headline sub-line')] as const;
/** Where each headline figure is read from: the results file, the set and the cell. */
export const CITES = list(headline.cites).map(item => record(item)).map(item => ({
  file: slot(item.file, 'results file'),
  set: slot(item.set, 'set'),
  cell: slot(item.cell, 'cell'),
  value: slot(item.value, 'value'),
}));

/** Earlier builds of this line that were never published, as the facts word them. */
export const HISTORY = list(facts.history).map(item => record(item)).map(item => ({
  version: slot(item.version, 'version'),
  note: slot(typeof item.note === 'string' ? sentenceCase(item.note) : item.note, 'note'),
}));

/** The sentences the release writes for the pages, from its top-level copy keys (page_copy is the older home of some). */
const copy = record(facts.page_copy);
const hardware = record(facts.hardware);
const asSentence = (value: unknown) => (typeof value === 'string' ? sentenceCase(value) : value);
export const COPY = {
  engineChange: slot(facts.what_changed ?? copy.engine_change, 'what the new engine changes for users'),
  hardware: slot(asSentence(hardware.summary ?? copy.hardware), 'hardware'),
  hardwareLink: slot(hardware.link, 'how the hosts are connected'),
  network: slot(asSentence(hardware.network), 'networking requirement'),
  disk: slot(asSentence(typeof hardware.disk_per_host === 'object' && hardware.disk_per_host !== null ? undefined : hardware.disk_per_host ?? copy.disk_per_host), 'disk per host'),
  installClaim: slot(facts.install_claim ?? copy.install_claim, 'install claim'),
  upgrade: slot(copy.upgrade_from_v1_8 ?? facts.upgrade_from_v1_8, 'upgrade from v1.8'),
  rollback: slot(facts.rollback ?? copy.rollback, 'way back to v1.8.4'),
  security: slot(facts.security_note ?? copy.security_note, 'security note'),
  sessions: slot(facts.session_cache_note ?? copy.session_reuse, 'session cache'),
  license: slot(copy.license_line ?? record(facts.license).line, 'license line'),
  /** What changes about reasoning when you upgrade, beside the upgrade sentence, on every page state. */
  upgradeThinking: slot(facts.upgrade_thinking_public, 'reasoning after the upgrade'),
  /** Who should stay on v1.8.4 for now, beside the upgrade sentence. */
  whoShouldStay: facts.upgrade_who_should_stay === undefined ? null : slot(facts.upgrade_who_should_stay, 'who should stay on v1.8.4'),
};
/** The rollback commands, pinned to the v1.8.4 tag: in an existing checkout, or from a fresh clone. */
const rollback = record(facts.rollback_commands);
export const ROLLBACK_COMMANDS = [
  ...(rollback.existing_checkout === undefined ? [] : [{ key: 'existing', where: typeof rollback.existing_checkout_where === 'string' ? sentenceCase(rollback.existing_checkout_where) : 'In an existing checkout', command: slot(rollback.existing_checkout, 'rollback command') }]),
  ...(rollback.fresh === undefined ? [] : [{ key: 'fresh', where: 'From a fresh clone', command: slot(rollback.fresh, 'fresh rollback command') }]),
];
/**
 * Disk per host, when the release lists it by component. There is deliberately no total: the parts
 * are not all needed at once (the download can go after splitting), so the page never adds them up.
 */
const DISK_LABELS: Record<string, string> = {
  image: 'Container image', wheels_and_engine_build: 'Engine build', download: 'Download', thirds: 'Split parts',
  kernel_cache: 'Kernel cache', session_tier: 'Session cache', after_split: 'After splitting',
};
const diskParts = record(hardware.disk_per_host);
export const DISK_PARTS = Object.entries(diskParts).map(([key, value]) => ({ key, label: DISK_LABELS[key] ?? sentenceCase(key.replace(/_/g, ' ')), value: slot(value, (DISK_LABELS[key] ?? key).toLowerCase()) }));
/** The install switches, as the install guide spells them: one for the weights, one for the draft model. */
const switches = record(facts.switch);
export const SWITCH = {
  weights: slot(switches.weights, 'how to choose the weights at install'),
  drafter: switches.drafter === undefined ? null : slot(switches.drafter, 'how to run without the draft model'),
};

const engine = record(facts.engine);
export const ENGINE = {
  name: slot(engine.name, 'engine name'),
  upstream: slot(engine.upstream, 'engine upstream'),
  base: slot(engine.base_version, 'engine base version'),
  license: slot(engine.license, 'engine license'),
  previous: slot(engine.previous_engine, 'previous engine'),
  /**
   * Where the engine comes from, as the release says it ("a fork of TensorFold 0.3.6.2 (MIT)"). Every
   * sentence that names the engine's origin uses it, never the bare name, which would read as current
   * upstream TensorFold. provenanceStart opens a line with it.
   */
  provenance: slot(engine.provenance_line_public, 'engine provenance'),
  provenanceStart: slot(asSentence(engine.provenance_line_public), 'engine provenance'),
};

/** "owner/name" and its pinned revision, shortened to 12 characters, from "owner/name@revision". */
export function pinned(source: Slot) {
  const [repo, revision] = source.text.split('@');
  const short = revision && /^[0-9a-f]{13,}$/.test(revision) ? revision.slice(0, 12) : revision;
  return { repo: { text: repo, pending: TBD.test(repo) || repo.startsWith('TBD') }, revision: revision === undefined ? null : { text: short.includes('[TBD') ? 'TBD' : short, pending: source.pending } };
}
/** The Hugging Face page of a pinned source, built from the facts' own repository and revision. */
function huggingFace(source: Slot): Slot {
  const [repo, revision] = source.text.split('@');
  if (source.pending || !revision || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return { text: 'TBD: source link', pending: true };
  return { text: `https://huggingface.co/${repo}/tree/${revision}`, pending: false };
}

const drafter = record(facts.draft_model);
export const DRAFTER = {
  source: slot(drafter.name, 'draft model'),
  license: slot(drafter.license, 'draft model license'),
  distribution: slot(typeof drafter.distribution === 'string' ? sentenceCase(drafter.distribution) : drafter.distribution, 'how the draft model is obtained'),
  commercial: slot(drafter.commercial_alternative, 'how to run without the draft model'),
  /** What the no-draft path runs under, so "commercial use" is never claimed without its conditions. */
  commercialPath: record(facts.license).commercial_path === undefined ? null : slot(record(facts.license).commercial_path, 'commercial path and its conditions'),
  commercialContact: drafter.commercial_contact === undefined ? null : slot(drafter.commercial_contact, 'commercial contact for the draft model'),
};
export const DRAFTER_LINK = huggingFace(DRAFTER.source);

const components = record(record(facts.license).components);
const COMPONENT_LABELS: Record<string, string> = {
  recipe: 'Recipe', engine: 'Engine', base_weights: 'Base weights', ablit_weights: 'Abliterated weights',
  draft_model: 'Draft model', container_image: 'Container image', fabric_and_chat_template: 'Fabric and chat template',
};
export const LICENSES = Object.entries(components).map(([key, value]) => ({ key, label: COMPONENT_LABELS[key] ?? sentenceCase(key.replace(/_/g, ' ')), value: slot(value, `${key} license`) }));

const links = record(facts.links);
/** A link the release may not give: null when the facts have no such key, so the page leaves it out. */
const optionalLink = (key: string, owed: string) => (links[key] === undefined ? null : slot(links[key], owed));
export const LINKS = {
  release: slot(links.release, 'release notes link'),
  install: slot(links.install, 'install guide link'),
  results: slot(links.results, 'results file link'),
  source: slot(links.source, 'recipe link'),
  engine: optionalLink('engine_source', 'engine source link'),
  // The release names its Hugging Face repository hf_repo; model_card is the older key.
  card: slot(links.model_card ?? links.hf_repo, 'model card link'),
  /** The fixed prompt mix every set ran, when the release publishes it. */
  promptMix: optionalLink('prompt_mix', 'prompt mix link'),
  measurements: optionalLink('measurements', 'measurements document link'),
  limitations: optionalLink('limitations', 'known issues document link'),
  licensing: optionalLink('licensing', 'licensing document link'),
  notices: optionalLink('notices', 'third-party notices link'),
  upgrade: optionalLink('upgrade', 'upgrade and rollback link'),
};
/** The file a repository link points at ("docs/INSTALL.md" from ".../blob/v2.0.1/docs/INSTALL.md"), or fallback while it is pending. */
export function linkPath(link: Slot, fallback: string) {
  if (link.pending) return fallback;
  return link.text.match(/\/(?:blob|tree)\/[^/]+\/(.+?)\/?$/)?.[1] ?? fallback;
}

/** The runnability level reached: L3 earns "install" and "run" wording; anything less gets the guide's. */
export const RUNNABLE = record(facts.runnability).level_reached === 'L3';

/** Known issues as the release writes them for readers, API fields in backticks. */
const issues = list(facts.known_issues_public);
export const KNOWN_ISSUES = (issues.length ? issues : [undefined]).map(issue => slot(issue, 'known issues'));

/**
 * Who the release is built on, as the facts credit them: "Name (what they made)", or {name, role, url}.
 * A credit without a link is named, not linked.
 */
export type Credit = { name: Slot; role: Slot; url: Slot | null };
function credit(item: unknown): Credit {
  if (typeof item === 'string') {
    const [, name, role] = item.match(/^(.+?)\s+\((.+)\)$/) ?? [null, item, ''];
    return { name: slot(name, 'credit'), role: role ? slot(sentenceCase(role), 'credit role') : { text: '', pending: false }, url: null };
  }
  const c = record(item);
  return { name: slot(c.name, 'credit'), role: slot(asSentence(c.role), 'credit role'), url: c.url === undefined ? null : slot(c.url, 'credit link') };
}
// The site's credits ({name, role, url}) when the release gives them; otherwise the cards' strings.
const credits = list(facts.credits_site).length ? list(facts.credits_site) : list(facts.credits);
export const CREDITS: Credit[] = credits.length
  ? credits.map(credit)
  : [{ name: slot(undefined, 'credits, as the cards word them'), role: slot(undefined, 'credit roles'), url: null }];

/** The compatibility rows, in the facts' order, labelled for readers. */
const COMPAT_LABELS: Record<string, string> = {
  openai_chat_completions: 'OpenAI chat completions',
  streaming: 'Streaming',
  tool_calls: 'Tool calls',
  response_format_json_schema: 'JSON schema output (response_format)',
  // The shipped config always reasons: its lowest effort is low. The label claims no off switch.
  thinking_on_off: 'Reasoning effort',
  bind: 'Network',
};
const compatRows = Object.entries(record(facts.compatibility)).map(([key, value]) => ({
  key,
  label: COMPAT_LABELS[key] ?? sentenceCase(key.replace(/_/g, ' ')),
  value: slot(typeof value === 'string' ? sentenceCase(value) : value, (COMPAT_LABELS[key] ?? key.replace(/_/g, ' ')).toLowerCase()),
}));
// Image input is a capability the release states on its own; it sits with the request features, before the network row.
const capabilities = record(facts.capabilities);
const images = capabilities.image_input_public === undefined ? [] : [{ key: 'image_input', label: 'Images', value: slot(capabilities.image_input_public, 'image input') }];
const beforeNetwork = compatRows.findIndex(row => row.key === 'bind');
export const COMPATIBILITY = beforeNetwork < 0 ? [...compatRows, ...images] : [...compatRows.slice(0, beforeNetwork), ...images, ...compatRows.slice(beforeNetwork)];

/**
 * What each install step takes, measured on one Spark: time, disk and memory, as the facts word them.
 * A cost the facts give that no step here names is listed in INSTALL_COSTS_UNPLACED, and the
 * production check refuses it, so no measured cost is dropped without notice.
 */
const costs = record(facts.install_costs);
const COST_STEPS = [
  { label: 'Container image', time: 'image_pull_time', disk: 'image_disk' },
  { label: 'Engine build', time: 'build_time', disk: 'wheels_disk' },
  { label: 'Base weights download', time: 'download_time' },
  { label: 'Draft model download', time: 'drafter_time' },
  { label: 'Splitting into three parts', time: 'split_time', disk: 'one_third_disk', memory: 'split_ram' },
  { label: 'First start', time: 'first_start_time', disk: 'kernel_cache_disk', diskLabel: 'Kernel cache' },
  { label: 'Later starts', time: 'warm_start_time' },
] as const;
type CostPart = { label: string; value: Slot };
export const INSTALL_COSTS = COST_STEPS.map(step => {
  const part = (label: string, key: string | undefined): CostPart[] => (key && costs[key] !== undefined ? [{ label, value: slot(costs[key], label.toLowerCase()) }] : []);
  const parts = [...part('Time', step.time), ...part('diskLabel' in step ? step.diskLabel : 'Disk', 'disk' in step ? step.disk : undefined), ...part('Memory', 'memory' in step ? step.memory : undefined)];
  return { label: step.label, parts };
}).filter(step => step.parts.length);
export const INSTALL_COSTS_CONDITIONS = costs.conditions === undefined ? null : slot(costs.conditions, 'install cost conditions');
export const INSTALL_COSTS_UNPLACED = Object.keys(costs).filter(key => key !== 'conditions' && !COST_STEPS.some(step => (Object.values(step) as string[]).includes(key)));

/**
 * The weights a user chooses at install. Each variant has its own source, license and numbers.
 * The default is the facts' weights.default_variant; until it is decided, base stands in and the page says so.
 */
export type Variant = {
  id: string;
  label: Slot;
  description: Slot | null;
  source: Slot;
  url: Slot;
  license: Slot;
  /** This variant's own switch, when the release gives one; otherwise the shared SWITCH.weights applies. */
  installSwitch: Slot | null;
  download: Slot | null;
  /** What else the converted weights are built from, with revisions and licenses. */
  otherInputs: Slot | null;
  conversion: Slot | null;
  conversionCost: Slot | null;
  responsibility: Slot | null;
  framing: Slot | null;
  access: Slot | null;
  /** The source's own terms, verbatim, when the facts quote them. */
  terms: Slot | null;
  /** How the installer gets these weights onto the hosts, and who hosts them. */
  how: Slot | null;
  /** How a fresh conversion compares with the data the release measured. */
  measuredVsFresh: Slot | null;
  /** Whether this variant is ready to install in this release, as the release says it. */
  status: Slot | null;
  /** How a fresh download and split on a new machine compares with the published manifests. */
  freshSplit: Slot | null;
};
const VARIANT_NAMES: Record<string, string> = { base: 'Base weights', ablit: 'Abliterated weights' };
const weights = record(facts.weights);
const variantsRaw = record(weights.variants);
export const VARIANTS: Variant[] = (Object.keys(variantsRaw).length ? Object.keys(variantsRaw) : ['base', 'ablit']).map(id => {
  const raw = record(variantsRaw[id]);
  const source = slot(raw.source, `${id} weights source`);
  const converted = id !== 'base';
  return {
    id,
    label: pendingAs(slot(asSentence(raw.label), `${id} name`), VARIANT_NAMES[id] ?? id),
    // A description that only repeats the name adds nothing; the card shows the name once.
    description: typeof raw.description === 'string' && typeof raw.label === 'string' && raw.description.trim().toLowerCase() === raw.label.trim().toLowerCase()
      ? null
      : slot(asSentence(raw.description), `${id} description`),
    source,
    url: raw.url === undefined ? huggingFace(source) : slot(raw.url, `${id} weights link`),
    license: slot(raw.license, `${id} weights license`),
    installSwitch: raw.install_switch === undefined ? null : slot(raw.install_switch, `how to choose ${id} at install`),
    download: Object.hasOwn(raw, 'download_bytes') ? slot(raw.download_bytes, 'download size') : null,
    otherInputs: Object.hasOwn(raw, 'other_inputs') ? slot(raw.other_inputs, 'other inputs and their licenses') : null,
    conversion: converted ? slot(raw.conversion, 'conversion') : null,
    conversionCost: converted ? slot(raw.conversion_cost_one_spark, 'conversion time, disk and memory') : null,
    responsibility: converted ? slot(raw.user_responsibility_line, 'user-responsibility sentence') : null,
    framing: raw.framing_public === undefined ? null : slot(asSentence(raw.framing_public), 'framing'),
    access: raw.source_access === undefined ? null : slot(typeof raw.source_access === 'string' ? sentenceCase(raw.source_access) : raw.source_access, 'how to get the source'),
    terms: raw.ablit_source_terms_verbatim === undefined ? null : slot(raw.ablit_source_terms_verbatim, 'source terms'),
    how: raw.how === undefined ? null : slot(raw.how, `how the installer gets the ${id} weights`),
    measuredVsFresh: raw.measured_vs_fresh_public === undefined ? null : slot(raw.measured_vs_fresh_public, 'fresh conversion against the measured data'),
    status: raw.status_public === undefined ? null : slot(raw.status_public, `${id} status`),
    freshSplit: raw.stranger_split_matches === undefined ? null : slot(raw.stranger_split_matches, 'fresh download against the manifests'),
  };
});
/**
 * The default variant: weights.default_variant names it by id. A value that only starts with an id
 * ("base (provisional; ...)") is that variant, provisionally, and the page marks it so.
 */
const defaultNamed = typeof weights.default_variant === 'string' ? VARIANTS.find(item => weights.default_variant === item.id || String(weights.default_variant).startsWith(`${item.id} `)) : undefined;
export const DEFAULT_DECIDED = Boolean(defaultNamed) && weights.default_variant === defaultNamed?.id;
export const DEFAULT_PROVISIONAL = Boolean(defaultNamed) && !DEFAULT_DECIDED;
export const DEFAULT_VARIANT = defaultNamed ?? VARIANTS[0];
/** The default first, so it takes the release gold wherever variants sit side by side. */
export const VARIANTS_ORDERED = [DEFAULT_VARIANT, ...VARIANTS.filter(item => item !== DEFAULT_VARIANT)];

/**
 * A measured set: one variant, with or without the draft model. The facts name sets by weights and
 * drafter: V-D base with it, O-D abliterated with it, V-N base without it (the commercial path).
 * A set whose metrics are not written yet is pending in every cell; once they are, a cell it left
 * out reads "not measured".
 */
export type ResultSet = { id: string; label: Slot; variant: Variant; drafter: boolean; short: string; tone: 'default' | 'other' | 'plain'; written: boolean; metrics: Record<string, unknown> };
const SET_WEIGHTS: Record<string, string> = { V: 'base', O: 'ablit' };
const setsUnordered = Object.entries(record(facts.result_sets)).filter(([id]) => !id.startsWith('_')).map(([id, value]) => {
  const raw = record(value);
  const variant = VARIANTS.find(item => item.id === SET_WEIGHTS[id.charAt(0)]) ?? VARIANTS[0];
  const drafter = !id.endsWith('-N');
  return {
    id,
    label: slot(raw.label_public, `${id} label`),
    variant,
    drafter,
    short: `${variant.id === 'base' ? 'Base' : 'Abliterated'}${drafter ? '' : ', no draft'}`,
    written: isRecord(raw.metrics),
    metrics: record(raw.metrics),
  };
});
const rank = (set: (typeof setsUnordered)[number]) => (set.variant === DEFAULT_VARIANT ? 0 : 1) + (set.drafter ? 0 : 2);
export const SETS: ResultSet[] = [...setsUnordered].sort((a, b) => rank(a) - rank(b)).map(set => ({
  ...set,
  tone: !set.drafter ? 'plain' : set.variant === DEFAULT_VARIANT ? 'default' : 'other',
}));
/** The default weights with the draft model: the set the hub card and the headline figures come from. */
export const DEFAULT_SET: ResultSet | undefined = SETS[0];
/** What every set shares (build, settings, protocol), in the release's public words. */
export const SETS_CONDITIONS = slot(record(facts.metric_conditions).sets, 'what every set shares');

/** A set's cell: its literal, pending until the set's metrics are written, then "not measured" if left out. */
export type Cell = { state: 'value' | 'pending' | 'absent'; slot: Slot };
const ABSENT: Cell = { state: 'absent', slot: { text: 'Not measured', pending: false } };
const PENDING: Cell = { state: 'pending', slot: { text: 'TBD', pending: true } };
/** Which figures each known hold keeps off the pages: base_c8, every base-weights figure at 8 requests at once. */
const HOLD_RULES: Record<string, (set: ResultSet, key: string) => boolean> = {
  base_c8: (set, key) => set.variant.id === 'base' && (key === 'concurrency_aggregate_tok_s.c8' || key.startsWith('c8_')),
};
const HELD: Cell = { state: 'pending', slot: { text: 'Held', pending: true } };
/** A figure the release measured and does not publish (scripts/glm-partners.mjs UNPUBLISHED): no figure, so no unit, bar or partner, and never "not measured". */
const UNPUBLISHED = /^not published\.?$/i;
const NOT_PUBLISHED: Cell = { state: 'absent', slot: { text: 'Not published', pending: false } };
const held = (set: ResultSet, key: string) => HOLDS.some(id => (HOLD_RULES[id] ? HOLD_RULES[id](set, key) : true));
export function cell(set: ResultSet | undefined, key: string): Cell {
  if (!set || !set.written) return PENDING;
  if (held(set, key)) return HELD;
  const value = at(set.metrics, key);
  if (typeof value === 'string' && HOLD_MARK.test(value.trim())) return HELD;
  if (typeof value === 'string' && UNPUBLISHED.test(value.trim())) return NOT_PUBLISHED;
  if (value === undefined) return ABSENT;
  const shown = pendingAs(figure(value, key), 'TBD');
  return { state: shown.pending ? 'pending' : 'value', slot: shown };
}

/**
 * A figure the release never shows alone, and the sentence of the same set that always goes with it.
 * The release declares the pairs (synced as first_token_partners, scripts/glm-partners.mjs), so a new pair
 * needs no edit here. The 8-at-once first token is the first streamed token, often reasoning: its partner
 * says when visible text arrived and how many replies showed none, and it stands even where the facts list
 * no pairs (the same floor as glm-partners.mjs). check-glm-facts.mjs refuses a figure without its partner.
 */
export const PARTNER_FLOOR: Record<string, string> = { c8_ttft_p50_s: 'c8_ttft_partner_public' };
export const PARTNERS: Record<string, string> = {
  ...PARTNER_FLOOR,
  ...Object.fromEntries(Object.entries(record(facts.first_token_partners)).flatMap(([key, pair]) => {
    const sentence = record(pair).partner;
    return typeof sentence === 'string' ? [[key, sentence]] : [];
  })),
};
/** The partner sentence to print with a set's figure: null when the figure has none or the set did not measure it. */
export function partner(set: ResultSet | undefined, key: string): Slot | null {
  if (!Object.hasOwn(PARTNERS, key) || cell(set, key).state === 'absent') return null;
  return pendingAs(slot(set?.written ? at(set.metrics, PARTNERS[key]) : undefined, 'when visible text arrived'), 'TBD: when visible text arrived');
}

/** How each figure is named and read. Labels are the page's; values and conditions are the release's. */
export type MetricInfo = { label: string; short: string; unit: string; better: 'higher' | 'lower' | null };
export function metricInfo(key: string): MetricInfo {
  const cold = key.match(/^cold_ttft_s\.(\w+)$/);
  if (cold) return { label: `First token, cold ${cold[1]} prompt`, short: `Cold ${cold[1]} prompt`, unit: 's', better: 'lower' };
  const streams = key.match(/^concurrency_aggregate_tok_s\.c(\d+)$/);
  if (streams) return { label: `${streams[1]} requests at once, all streams combined`, short: `${streams[1]} at once, combined`, unit: 'tok/s', better: 'higher' };
  const named: Record<string, MetricInfo> = {
    decode_short_tok_s: { label: 'Decode, one request, short reply', short: 'Decode, short reply', unit: 'tok/s', better: 'higher' },
    'decode_short_tok_s.code': { label: 'Decode, one request, short code reply', short: 'Decode, code', unit: 'tok/s', better: 'higher' },
    'decode_short_tok_s.prose': { label: 'Decode, one request, short prose reply', short: 'Decode, prose', unit: 'tok/s', better: 'higher' },
    decode_long_tok_s: { label: 'Decode, one request, code after a 32k prompt', short: 'Decode, 32k prompt', unit: 'tok/s', better: 'higher' },
    c8_ttft_p50_s: { label: 'First token with 8 requests at once, median', short: 'First token, 8 at once', unit: 's', better: 'lower' },
    'c8_stall_s.median': { label: 'Pause in 8 running replies as a long prompt arrives', short: 'Stall, 8 at once', unit: 's', better: 'lower' },
    'c8_stall_s.max': { label: 'Longest such pause in any run', short: 'Stall, 8 at once, worst', unit: 's', better: 'lower' },
    max_context_tokens: { label: 'Longest context', short: 'Longest context', unit: 'tokens', better: null },
    'draft_acceptance.accepted_per_verify_step': { label: 'Draft tokens accepted per verify step', short: 'Accepted per step', unit: 'tokens', better: 'higher' },
    'draft_acceptance.accepted_over_proposed': { label: 'Drafted tokens accepted', short: 'Accepted of drafted', unit: '', better: 'higher' },
  };
  return named[key] ?? { label: sentenceCase(key.replace(/_/g, ' ')), short: sentenceCase(key.replace(/_/g, ' ')), unit: '', better: null };
}

/**
 * RigMark, run with the v1.8.4 protocol: one row per figure, with v1.8.4's value and each set's.
 * Until the facts list the rows, the figures RigMark's headline block reports stand in, all pending.
 * A row's note is the release's own sentence about that row, printed under its bars.
 */
export type CompareRow = { id: string; label: string; unit: string; better: 'higher' | 'lower' | null; before: Slot; values: Record<string, Cell>; note?: Slot };
const RIGMARK_FIGURES = [
  { id: 'code', label: 'Code, decode estimate', unit: 'tok/s', better: 'higher' },
  { id: 'prose', label: 'Prose, decode estimate', unit: 'tok/s', better: 'higher' },
  { id: 'structured', label: 'Structured output ceiling', unit: 'tok/s', better: 'higher' },
  { id: 'prefill_64k', label: 'Cold prefill, 64K prompt', unit: 'tok/s', better: 'higher' },
  { id: 'c4', label: 'Four at once, end to end', unit: 'tok/s', better: 'higher' },
] as const;
const rigmark = record(facts.rigmark);
/**
 * Whether RigMark is published is the release's decision (its v1.8.4 block was never published).
 * 'undecided' shows the section marked as pending in a draft; a final page shows it only on 'yes'.
 */
export const RIGMARK: 'yes' | 'no' | 'undecided' = rigmark.publish === true ? 'yes' : rigmark.publish === false ? 'no' : 'undecided';
export const RIGMARK_SHOWN = RIGMARK === 'yes' || (RIGMARK === 'undecided' && DRAFT);
/** The sets RigMark ran on, in page order. */
export const COMPARE_SETS = SETS.filter(set => Object.hasOwn(rigmark, set.id));
/** A row's v1.8.4 figure and each set's, from a facts row keyed v1_8_4 and by set id. */
const compareFigures = (row: Record<string, unknown>) => ({
  before: pendingAs(figure(row.v1_8_4, 'v1.8.4'), 'TBD'),
  values: Object.fromEntries(COMPARE_SETS.map(set => {
    if (row[set.id] === undefined) return [set.id, ABSENT];
    const shown = pendingAs(figure(row[set.id], set.id), 'TBD');
    return [set.id, { state: shown.pending ? 'pending' : 'value', slot: shown }];
  })) as Record<string, Cell>,
});

/**
 * What every view of the comparison carries when RigMark is published: the scope of the comparison,
 * two first-token rows of the release's own (C1 per stream, and prose to the first visible text),
 * each with its note, and the prose decode row's footnote, all in the release's words.
 */
const comparison = record(rigmark.comparison_public);
export const RIGMARK_SCOPE = slot(comparison.scope, 'scope of the comparison');
const UNITS: Record<string, string> = { seconds: 's', 'tok/s': 'tok/s', tokens: 'tokens' };
/** A row the release writes out: its label names its unit and direction ("..., seconds (lower is better)"), which the chart prints itself. */
function releaseRow(id: string, value: unknown, owed: string): CompareRow {
  const row = record(value);
  const label = String(row.label ?? '');
  const parts = label.match(/^(.*?),?\s*(seconds|tok\/s|tokens)?\s*\((lower|higher) is better\)\s*$/);
  return {
    id,
    label: parts?.[1] || label || owed,
    unit: parts ? UNITS[parts[2] ?? ''] ?? '' : '',
    better: parts ? (parts[3] as 'lower' | 'higher') : null,
    ...compareFigures(row),
    note: slot(row.note, `note on the ${owed} row`),
  };
}
const RELEASE_ROWS = [
  releaseRow('c1_ttft', comparison.c1_ttft_row, 'C1 per-stream time to first token'),
  releaseRow('prose_visible_ttft', comparison.prose_visible_ttft_row, 'prose time to first visible text'),
];
const PROSE_FOOTNOTE = pendingAs(slot(comparison.prose_footnote, 'prose row footnote'), 'TBD: prose row footnote, to be confirmed');
/**
 * RigMark's own prose time to first token marks the first reasoning token, not visible text: it is never
 * shown (check-glm-facts.mjs refuses such a row). Code and structured first-token rows are visible text.
 */
const reasoningTtft = (row: Record<string, unknown>) => {
  const named = `${row.id ?? ''} ${row.label ?? ''}`;
  return /prose/i.test(named) && /ttft|time to first|first[ _-]token/i.test(named) && !/visible/i.test(named);
};

const rigmarkRows = list(facts.rigmark_rows).map(item => record(item)).filter(row => !reasoningTtft(row));
const rows: CompareRow[] = rigmarkRows.length
  ? rigmarkRows.map(row => ({
    id: String(row.id ?? ''),
    label: typeof row.label === 'string' ? row.label : String(row.id ?? ''),
    unit: typeof row.unit === 'string' ? row.unit : '',
    better: row.better === 'higher' || row.better === 'lower' ? row.better : null,
    ...compareFigures(row),
  }))
  : RIGMARK_FIGURES.map(row => ({ ...row, before: PENDING.slot, values: Object.fromEntries(COMPARE_SETS.map(set => [set.id, PENDING])) }));
/** RigMark's rows, the prose decode row with its footnote, then the release's own rows. None is dropped for being slower. */
export const COMPARE: CompareRow[] = [
  ...rows.map(row => (row.id === 'prose' ? { ...row, note: PROSE_FOOTNOTE } : row)),
  ...RELEASE_ROWS.filter(extra => !rows.some(row => row.id === extra.id)),
];

/** RigMark's headline blocks, verbatim: v1.8.4's, then each set's. Shown only where RIGMARK_SHOWN. */
export const RIGMARK_BLOCKS = [
  { id: 'v1_8_4', title: { text: 'v1.8.4 on vLLM', pending: false } as Slot, text: slot(rigmark.v1_8_4_block, 'v1.8.4 block') },
  ...COMPARE_SETS.map(set => ({ id: set.id, title: set.label, text: slot(rigmark[set.id], `${set.id} block`) })),
];

const conditions = record(facts.metric_conditions);
/** Which estimator each set's first-token partner uses, when the results give it: under the partnered figures. */
export const FIRST_TOKEN_ESTIMATORS = conditions.first_token_partner_estimators === undefined ? null : slot(conditions.first_token_partner_estimators, 'how the partner sentences were measured');
export const CONDITIONS = {
  /** One paragraph on how every figure was measured, when the release writes it that way. */
  all: facts.measurement_conditions ?? conditions.all ? slot(facts.measurement_conditions ?? conditions.all, 'how the figures were measured') : null,
  cold: slot(conditions.cold_ttft, 'how cold first-token time was measured'),
  decode: slot(conditions.decode, 'how decode was measured'),
  concurrency: slot(conditions.concurrency, 'how concurrent requests were measured'),
  stall: slot(conditions.c8_stall, 'how the stall was measured'),
  acceptance: slot(conditions.draft_acceptance, 'how draft acceptance was measured'),
  /** What every set shared and what each set's receipt records, when the release says so. */
  results: facts.results_conditions_public === undefined ? null : slot(facts.results_conditions_public, 'what every set shared'),
};
/**
 * How the release's own benchmark set reasoning, when the release labels it: only once a setting that
 * turns reasoning off ships (thinking row (i)), since its requests asked for off and were measured at low.
 * Then every figure of that benchmark carries the label: the full label once beneath the figures, the
 * short one beside each figure shown on its own. RigMark's rows are not that benchmark and carry none.
 */
export const RELBENCH_LABEL = facts.relbench_reasoning_label_public === undefined ? null : {
  full: slot(facts.relbench_reasoning_label_public, 'how the benchmark set reasoning'),
  short: pendingAs(slot(facts.relbench_reasoning_label_short_public, 'reasoning setting'), 'TBD: reasoning setting'),
};
/** Settings the template gives every set (the shipped context length), by cell. */
export const TEMPLATE_SETTINGS = record(facts.template_settings);
/** What the prompt mix is and where its texts ship, as the release says it (metrics_template.prompt_mix.public). */
export const PROMPT_MIX_LINE = facts.prompt_mix_public === undefined ? null : slot(facts.prompt_mix_public, 'the prompt mix');
/** Corrections to the engine's own files, shown after the known issues and not counted among them. */
export const ERRATA = record(facts.errata).engine_docs_public === undefined ? null : slot(record(facts.errata).engine_docs_public, 'errata');
/** That each weight variant ships its own settings profile, as the release says it. */
const profiles = record(facts.profiles);
export const PROFILES_LINE = profiles.public_line === undefined ? null : slot(profiles.public_line, 'settings profiles');

/**
 * The cells a metric family has, in order: the keys of the release's metrics template, so a cell the
 * release does not measure (cold 16k, for one) never appears as a gap.
 */
const template = record(facts.metrics_template);
function cellsOf(metric: string, fallback: string[]) {
  const keys = Object.keys(record(template[metric]));
  const measured = (keys.length ? keys : fallback).map(key => [key, Number(key.replace(/\D/g, ''))] as const);
  return measured.sort((a, b) => a[1] - b[1]).map(([key]) => key);
}
export const CONTEXTS = cellsOf('cold_ttft_s', ['8k', '32k', '64k', '128k']);
/**
 * Single-request decode: the short-reply figure (one, or one per reply kind when the release splits
 * it into code and prose), then the long-prompt figure.
 */
const shortKinds = Object.keys(record(template.decode_short_tok_s));
/**
 * Draft acceptance, by the prompts it was measured on: one flat figure pair, or one pair per prompt
 * kind (the prompt mix, a single repeated prompt) when the release reports it both ways.
 */
const acceptance = record(template.draft_acceptance);
const ACCEPTANCE_NAMES: Record<string, string> = { mix: 'On the prompt mix', single_prompt: 'On a single repeated prompt' };
export const ACCEPTANCE_KINDS: Array<{ key: string; label: string | null }> = Object.keys(acceptance).length && Object.values(acceptance).every(isRecord)
  ? Object.keys(acceptance).map(kind => ({ key: `draft_acceptance.${kind}`, label: ACCEPTANCE_NAMES[kind] ?? sentenceCase(kind.replace(/_/g, ' ')) }))
  : [{ key: 'draft_acceptance', label: null }];
export const DECODE_CELLS = [
  ...(shortKinds.length ? shortKinds.map(kind => `decode_short_tok_s.${kind}`) : ['decode_short_tok_s']),
  'decode_long_tok_s',
];
export const STREAMS = cellsOf('concurrency_aggregate_tok_s', ['c1', 'c2', 'c4', 'c8', 'c16']);


/**
 * The condition a concurrency figure never shows without, from the release's own templates: an N-at-once
 * figure (cN_*, or a c-ladder point) names its short prompts and N from its key (concurrency_label_template),
 * a pause also names the long prompt that joins (stall_condition_template). Null for a figure that needs none.
 * A hub tile, the share card and every glm page figure carry it; while the release has no template for it,
 * the caption is a visible TBD.
 */
const templateLabels = record(facts.template_labels);
export function captionTemplate(key: string): { template: string; n: string } | null {
  const n = key.match(/^c(\d+)_/)?.[1] ?? key.match(/^concurrency_[a-z_]+\.c(\d+)$/)?.[1];
  if (!n) return null;
  return { template: /^c\d+_stall_s(\.|$)/.test(key) ? 'stall_condition_template' : 'concurrency_label_template', n };
}
export function tileCaption(key: string): Slot | null {
  const needs = captionTemplate(key);
  if (!needs) return null;
  const template = templateLabels[needs.template];
  return slot(typeof template === 'string' && template.includes('{N}') ? template.replace(/\{N\}/g, needs.n) : undefined, 'the prompts this figure was measured on');
}

/**
 * The hub card's figures (and the share card's): the release's choice, else four headline figures of the
 * default set. A tile has no room for a partner sentence, so a figure that needs one is never a tile.
 * A tile reads the default set unless the release gives it another set that measured it (site_tile_sets,
 * named under the figure by its weights, since the line over the tiles names the default's) or a RigMark
 * row (site_tile_sources). A RigMark tile reads the default set's column only, never another set's or
 * v1.8.4's, and shows only while RigMark is published. site_tile_labels gives a tile its own short label.
 * A RigMark tile's condition is the release's own (site_tile_captions), never a prompt-mix caption: RigMark
 * ran its own requests. Its N-at-once rows (cN) never show without one; until the facts give it, it is TBD.
 */
const tileLabels = record(facts.site_tile_labels);
const tileSets = record(facts.site_tile_sets);
const tileSources = record(facts.site_tile_sources);
const tileCaptions = record(facts.site_tile_captions);
const named = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
export type TileFigure = { key: string; label: string; unit: string; set: ResultSet | undefined; value: Cell; weights: Slot | null; caption: Slot | null };
function tileFigure(key: string): TileFigure | null {
  if (Object.hasOwn(tileSources, key)) {
    const source = record(tileSources[key]);
    const row = rigmarkRows.find(item => item.id === source.rigmark_row);
    if (RIGMARK !== 'yes' || !row || !DEFAULT_SET || source.set !== DEFAULT_SET.id) return null;
    const shown = pendingAs(figure(row[DEFAULT_SET.id], DEFAULT_SET.id), 'TBD');
    const caption = Object.hasOwn(tileCaptions, key) || /^c\d+$/.test(String(row.id)) ? slot(named(tileCaptions[key]) ?? undefined, 'what RigMark ran for this figure') : null;
    return { key, label: named(tileLabels[key]) ?? String(row.label ?? key), unit: typeof row.unit === 'string' ? row.unit : '', set: DEFAULT_SET, value: { state: shown.pending ? 'pending' : 'value', slot: shown }, weights: null, caption };
  }
  const choice = record(tileSets[key]);
  // A set the facts do not have reads as pending, never as the default set's figure.
  const set = choice.set === undefined ? DEFAULT_SET : SETS.find(item => item.id === choice.set);
  const info = metricInfo(key);
  const weights = set && set !== DEFAULT_SET ? (named(choice.label) ? slot(choice.label, 'the weights') : set.label) : null;
  return { key, label: named(tileLabels[key]) ?? info.short, unit: info.unit, set, value: cell(set, key), weights, caption: tileCaption(key) };
}
const tiles = list(facts.site_tiles).filter((key): key is string => typeof key === 'string' && !TBD.test(key));
export const TILE_FIGURES: TileFigure[] = (tiles.length ? tiles : ['cold_ttft_s.32k', DECODE_CELLS[0], 'concurrency_aggregate_tok_s.c8', 'c8_stall_s.median'])
  .filter(key => !Object.hasOwn(PARTNERS, key))
  .flatMap(key => tileFigure(key) ?? []);
export const TILES: string[] = TILE_FIGURES.map(tile => tile.key);
/**
 * What the tiles were measured with, for the line over them: the release's own line when it gives one,
 * else the default set's label. Tiles from other weights need the release's line ("... unless marked").
 */
export const TILES_LINE: Slot | null = facts.site_card_footer_public !== undefined ? slot(facts.site_card_footer_public, 'what the tiles were measured with')
  : TILE_FIGURES.some(tile => tile.weights) ? slot(undefined, 'what the tiles were measured with') : DEFAULT_SET?.label ?? null;
