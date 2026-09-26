/**
 * Release copy for the JSPARK3 hub and the GLM release page (/jspark3/glm/).
 * It holds no layout, so a redesign can import these strings as they are.
 *
 * GLM release facts live in glm-release.json. Fill them in when the release is
 * published, then run `node scripts/check-glm-release.mjs`. It fails while any
 * placeholder remains. Until then, placeholders render visibly as "v1.X" and "XX.X".
 */
import glm from './glm-release.json';

/**
 * One headline measurement: the within-start band across the sweeps, with lo equal to hi for a single measurement.
 * The numbers size the bars; the *_text fields are the numbers as the release files write them, and the page prints those.
 */
export interface HeadlineRow {
  id: string;
  label: string;
  concurrency: string;
  unit: string;
  lo: number | null;
  hi: number | null;
  lo_text: string | null;
  hi_text: string | null;
  v1_1: number | null;
  v1_1_text: string | null;
  mia: number | null;
}

/** One cell of a serving start. lo and hi (and their texts) are all null when the start did not measure it. */
export interface SetRow {
  id: string;
  lo: number | null;
  hi: number | null;
  lo_text: string | null;
  hi_text: string | null;
}

/** One measured start of the server, labelled by the build it ran. Mode 0 is stock weights, mode 1 edited weights. */
export interface ServingSet {
  id: string;
  group: string;
  label: string;
  build: string;
  mode: number;
  serving_starts: number;
  sweeps: number;
  rows: SetRow[];
}

export interface GlmRelease {
  placeholder: boolean;
  version: string;
  tag: string;
  name: string | null;
  published: string;
  social_image: string | null;
  mode_switch: string;
  links: { release: string; source: string; huggingface: string; results: string; numbers: string };
  headline: { baseline: string; conditions: string; build: string; missing: boolean; serving_starts: number; sweeps: number; rows: HeadlineRow[] };
  sets: ServingSet[];
  mia: { benchmark: string | null; source: string | null; ran_exactly_as_published: boolean };
}

export const GLM_RELEASE: GlmRelease = glm;

/** True until the release facts are filled in. Pages mark every unfilled value while it holds. */
export const IS_PLACEHOLDER = GLM_RELEASE.placeholder;

/** The release's own stock-weight rows, or none when its final start is not in the numbers. */
export const HEADLINE_ROWS = GLM_RELEASE.headline.missing ? [] : GLM_RELEASE.headline.rows;

/** "Sep 26, 2026" from "2026-09-26". */
export function releaseDate(iso: string, year = true) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });
}

/** A build as the page shows it: the tag without a zero patch, so v1.8.0 is "v1.8" and v1.7.5 stays "v1.7.5". */
export function displayBuild(build: string) {
  return build.replace(/^(v\d+\.[\dX]+)\.0$/, '$1');
}

/** This release as the page names it, from its tag. */
export const RELEASE = displayBuild(glm.tag);

/**
 * The internal builds between v1.1 and this release: v1.2 through v1.7 for v1.8.0,
 * v1.2 through v1.7.4 for v1.7.5, only v1.2 for v1.3.0, and none for v1.2.0.
 */
function internalBuilds(tag: string) {
  const match = /^v1\.(\d+)\.(\d+)$/.exec(tag);
  if (!match) return { first: 'v1.2', last: 'v1.X' };
  const [minor, patch] = [Number(match[1]), Number(match[2])];
  const last = patch > 0 ? displayBuild(`v1.${minor}.${patch - 1}`) : `v1.${minor - 1}`;
  if (minor < 2 || (minor === 2 && patch === 0)) return null;
  return { first: 'v1.2', last: last === 'v1.2' ? null : last };
}

export const INTERNAL_BUILDS = internalBuilds(glm.tag);

/**
 * A measured value exactly as the release files write it, so 108.0 stays 108.0. The only change is a
 * thousands separator in the whole part. null is a visible placeholder before the fill and "n/a" after it.
 */
export function valueText(text: string | null) {
  if (text === null) return IS_PLACEHOLDER ? 'XX.X' : 'n/a';
  const [whole, fraction] = text.split('.');
  return `${whole.replace(/\B(?=(\d{3})+$)/g, ',')}${fraction === undefined ? '' : `.${fraction}`}`;
}

/** The five cells every serving start reports, in page order. glm-release.json uses the same ids. */
export const METRICS = [
  { id: 'prefill', label: 'Prefill', concurrency: 'c1' },
  { id: 'decode_c1', label: 'Decode', concurrency: 'c1' },
  { id: 'decode_c2', label: 'Decode', concurrency: 'c2' },
  { id: 'decode_c4', label: 'Decode', concurrency: 'c4' },
  { id: 'decode_c8', label: 'Decode', concurrency: 'c8' },
] as const;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const counted = (count: number, noun: string) => `${WORDS[count] ?? count} ${noun}${count === 1 ? '' : 's'}`;

/** "one serving start, two sweeps". */
export function startsAndSweeps({ serving_starts, sweeps }: { serving_starts: number; sweeps: number }) {
  return `${counted(serving_starts, 'serving start')}, ${counted(sweeps, 'sweep')}`;
}

/** "v1.7.4 · stock weights · one serving start, two sweeps". */
export function setCaption(set: { build: string; mode: number; serving_starts: number; sweeps: number }) {
  return `${displayBuild(set.build)} · ${set.mode === 0 ? 'stock weights' : 'edited weights, opt-in'} · ${startsAndSweeps(set)}`;
}

/** Mia's series appears only where we ran her benchmark exactly as she describes it. */
export const SHOW_MIA = glm.mia.ran_exactly_as_published && HEADLINE_ROWS.some(row => row.mia !== null);

/** The v1.1 comparison shows while it is a placeholder, and after the fill only if a row carries a v1.1 figure. */
export const SHOW_V1_1 = IS_PLACEHOLDER || HEADLINE_ROWS.some(row => row.v1_1 !== null);

/** "one stream" for c1, "4 streams" for c4. */
export function streams(concurrency: string) {
  const count = Number(concurrency.replace(/^c/, ''));
  return count === 1 ? 'one stream' : `${count} streams`;
}

export const LABELS = {
  latest: 'Latest release',
  named: 'Named release',
  experimental: 'Experimental',
} as const;

export const HUB_COPY = {
  metaDescription: 'Release history, serving recipes, and measured results for three NVIDIA DGX Sparks.',
  standfirst: 'The releases, recipes, and measured results.',
  note: 'Numbered JSPARK3 releases are the main line, and it runs GLM-5.3 Flash. Tempo is a named release: a DeepSeek experiment with its own recipe versions. Earlier GLM links still lead to the GLM page.',
  glmCard: {
    meta: LABELS.latest,
    version: RELEASE,
    title: glm.name ?? 'GLM-5.3 Flash',
    model: glm.name ? 'GLM-5.3 Flash' : 'Stock weights by default',
    detail: 'vLLM · Three DGX Sparks · One OpenAI-compatible endpoint',
    action: 'Recipe, results, and release notes',
  },
  tempoCard: {
    meta: LABELS.named,
    version: LABELS.experimental,
    title: 'Tempo',
    detail: 'Our DeepSeek experiment.',
    action: 'Recipe, results, and limitations',
  },
  releasesTitle: 'Releases',
  historyTitle: 'Release history',
  internalRow: 'Internal builds, not published',
} as const;

/** Published releases before the latest one, newest first. The latest GLM release and the internal builds come from glm-release.json. */
export const RELEASE_HISTORY = [
  { version: 'Tempo', what: 'DeepSeek-V4.1 Flash', recipes: true, when: 'Sep 13', href: '/jspark3/deepseek/' },
  { version: 'v1.1 Cadence', what: 'GLM-5.3 Flash', when: 'Sep 7', href: '/jspark3/glm/#releases' },
  { version: 'v1.0', what: 'GLM-5.3 Flash', when: 'Sep 2', href: 'https://github.com/jakejharris/jspark3/releases/tag/v1.0.0' },
] as const;

const MODE_SWITCH = {
  A: 'Experimental runtime switch. It needs the service started in edited mode. The whole service then switches between stock and edited weights after admission closes and requests drain, with a receipt for every switch. It is global and serialized, not per request, and this release makes no latency or capacity claim for it.',
  B: 'Choose stock or edited behavior before launch. Changing modes currently requires a service restart and recomputes conversation prefixes.',
} as const;

/** The groups of the serving-start table, in order. A set's group always matches its mode. */
export const SET_GROUPS = [
  { group: 'base_m0', title: 'Stock weights (default)' },
  { group: 'opt_in_m1', title: 'Edited weights (opt-in)' },
] as const;

export const GLM_COPY = {
  title: `JSPARK3 ${RELEASE}`,
  metaDescription: `JSPARK3 ${RELEASE}: GLM-5.3 Flash across three NVIDIA DGX Sparks, with stock weights by default, a pinned recipe, and measured results.`,
  label: LABELS.latest,
  lede: 'GLM-5.3 Flash across three DGX Sparks as one OpenAI-compatible endpoint. The recipe is pinned so you can rebuild it, with public benchmarks and the misses left in.',
  intro: 'One OpenAI-compatible endpoint across all three. The recipe is pinned so you can rebuild it, with public benchmarks and the misses left in.',
  internalBuilds: INTERNAL_BUILDS
    ? `${INTERNAL_BUILDS.last ? `${INTERNAL_BUILDS.first} through ${INTERNAL_BUILDS.last} were internal builds` : `${INTERNAL_BUILDS.first} was an internal build`}, so the public numbers go from v1.1 to ${RELEASE}.`
    : null,
  weights: 'The default install uses the stock GLM-5.3 Flash weights. Abliteration is an explicit opt-in.',
  /** How modes change in this release, chosen by mode_switch. Neither story makes a speed claim. */
  modeSwitch: glm.mode_switch === 'A' || glm.mode_switch === 'B' ? MODE_SWITCH[glm.mode_switch] : null,
  whyGlmTitle: 'We tried DeepSeek, measured it, and came back.',
  whyGlm:
    'Tempo was my DeepSeek experiment, and I measured it seriously. Its tok/s held up, but it overthinks, and time to finish a task is what I actually feel. GLM-5.3 Flash is better at agent and coding work, and better in almost every other way I use it, so the numbered line runs GLM again.',
  whyGlmLink: 'Tempo, the DeepSeek experiment',
  numbersNote: 'Compared with our own v1.1.',
  resultsTitle: 'Measured on our three Sparks.',
  /** Under the results heading: what one headline figure is. */
  bandLine: `${RELEASE} with stock weights: ${startsAndSweeps(glm.headline)}. Each figure is the range across those sweeps.`,
  /** In place of the band line when the release's own start is not in the numbers. No base start is promoted. */
  headlineMissing: `No measured stock-weight start of ${RELEASE} is in this release’s numbers. The stock-weight figures below come from the base recipe, labelled by build.`,
  /** Under a headline figure the release's numbers leave out, such as a prefill with no clean measurement. */
  figureOmitted: 'Not in this release’s numbers.',
  /** The chart key for the lighter part of a bar. */
  bandKey: 'Range across sweeps',
  sets: {
    title: 'Every serving start we measured',
    intro: 'Each row is one start of the server, labelled by build, with the range across its sweeps. Every start we measured is listed.',
    column: 'Serving start',
    caption: 'All figures in tok/s. Decode above one stream is the aggregate across all streams.',
    thisRelease: `${RELEASE}, this release`,
    earlier: 'Earlier release',
    unscaled: 'Edited-weight rows are measured as they are and never scaled to stand in for stock weights.',
  },
  mia: { series: 'Mia, published' },
  notesLink: { title: 'Release notes and known issues', detail: 'release notes on GitHub' },
  resultsLinks: [
    { label: 'Results file ↗', href: glm.links.results },
    { label: 'Every number, with how it was measured ↗', href: glm.links.numbers },
  ],
  credit: {
    text: 'Thanks to @unsaltedbutter-ai for the first community run of JSPARK3 on their own three GB10 machines, shared in PR #9.',
    handle: '@unsaltedbutter-ai',
    profile: 'https://github.com/unsaltedbutter-ai',
    pr: 'https://github.com/jakejharris/jspark3/pull/9',
  },
  proof: {
    title: 'Run on someone else’s hardware.',
    scope: `Their run used JSPARK3 v1.1 with one added patch. It was not a run of ${RELEASE}.`,
  },
  install: {
    title: `Run ${RELEASE}`,
    body: 'You need three DGX Sparks, fast direct connections between them (RoCE), and enough disk space. The install guide checks your machines before anything starts.',
    guide: `https://github.com/jakejharris/jspark3/blob/${glm.tag}/docs/INSTALL.md`,
  },
  links: [
    { label: 'GitHub repository', href: glm.links.source, primary: true },
    { label: `Release ${glm.tag}`, href: glm.links.release },
    { label: 'Hugging Face: model card and provenance', href: glm.links.huggingface },
  ],
  /** The published v1.1 page, for history links. */
  previous: { label: 'JSPARK3 v1.1 (Cadence)', href: 'https://github.com/jakejharris/jspark3/releases/tag/v1.1.0' },
} as const;

export const TEMPO_COPY = {
  summary: 'A named JSPARK3 release: our DeepSeek experiment.',
  mainLineLink: 'Main line: latest JSPARK3 release (GLM-5.3 Flash)',
} as const;
