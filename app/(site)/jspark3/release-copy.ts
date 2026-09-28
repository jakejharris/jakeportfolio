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

/**
 * One figure of the speed headline: a within-start band as written, like a headline row. The line prints
 * its hi as "up to"; display is always null (no approximate token stands in for a figure).
 */
export interface SpeedBand {
  lo: number | null;
  hi: number | null;
  lo_text: string | null;
  hi_text: string | null;
  display: string | null;
}

/**
 * The hero's speed headline, from the release's own stock-weight start. code is its decode_c4 row;
 * prose is null when the start has no prose run. reference_streams lists the stream counts at which
 * its exact runs of the published reference benchmark came out ahead under rule, and is empty for no claim.
 * rule is "strict" (every run ahead), "median_noise" or "median" (the median ahead; the two differ only in
 * which counts qualify), or "off", which makes no claim.
 */
export interface HeadlineSpeed {
  streams: number;
  code: SpeedBand;
  prose: SpeedBand | null;
  rule: string;
  reference_streams: number[];
}

export interface GlmRelease {
  placeholder: boolean;
  version: string;
  /** The tag the numbers were measured on. */
  tag: string;
  /** The tag installers get: tag itself, or a later patch that only changes packaging and installation. */
  install_tag: string;
  name: string | null;
  published: string;
  social_image: string | null;
  mode_switch: string;
  links: { release: string; source: string; install: string; huggingface: string; results: string; numbers: string };
  headline: {
    baseline: string;
    conditions: string;
    build: string;
    missing: boolean;
    serving_starts: number;
    sweeps: number;
    /** null exactly when missing is true. */
    speed: HeadlineSpeed | null;
    /** The hub card's prose figure for one stream: the release's own decode_prose_c1, or null when it has none. */
    prose_c1: { lo: number | null; hi: number | null; lo_text: string | null; hi_text: string | null } | null;
    rows: HeadlineRow[];
  };
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

/** The tag installers get, as the page names it: v1.8.1 while the numbers stay those of v1.8.0. */
export const INSTALL_RELEASE = displayBuild(glm.install_tag);

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

/**
 * Ascending stream counts in words: "one stream", "one and two streams", "one to four streams"
 * for a run of three or more, and "one, two and four streams" otherwise.
 */
export function streamCounts(counts: readonly number[]) {
  const words = counts.map(count => WORDS[count]);
  const last = words[words.length - 1];
  const run = counts.length >= 3 && counts.every((count, index) => index === 0 || count === counts[index - 1] + 1);
  const list = words.length === 1 ? last : run ? `${words[0]} to ${last}` : `${words.slice(0, -1).join(', ')} and ${last}`;
  return `${list} ${counts.length === 1 && counts[0] === 1 ? 'stream' : 'streams'}`;
}

/** The speed headline, or null when the release's own start is not in the numbers. Nothing stands in for it. */
export const SPEED = GLM_RELEASE.headline.missing ? null : GLM_RELEASE.headline.speed;

/**
 * The reference clause, worded by the speed headline's rule. It names the reference as the three-Spark
 * build its figures come from, but no band or figure, and appears only for stream counts the numbers list.
 * A median rule says "median"; any other rule makes no claim.
 */
function referenceClause(speed: HeadlineSpeed | null) {
  if (!speed || !speed.reference_streams.length || IS_PLACEHOLDER) return null;
  const at = streamCounts(speed.reference_streams);
  if (speed.rule === 'strict') return `Faster than the published three-Spark reference build on its own benchmark at ${at}, in every run.`;
  if (speed.rule === 'median_noise' || speed.rule === 'median') return `Median faster than the published three-Spark reference build on its own benchmark at ${at}.`;
  return null;
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
    /**
     * How each figure prints, one token: 'upto' prints "up to" and the top of the measured range;
     * 'asterisk' prints the top of the range with a mark, and the caption carries the mark.
     */
    figure: 'upto' as 'upto' | 'asterisk',
    /** The four figures, from the release's own start. 'prose_c1' is its decode_prose_c1; the rest are headline rows. */
    tiles: [
      { id: 'prefill', label: 'Prefill' },
      { id: 'decode_c1', label: 'Code, 1 stream' },
      { id: 'prose_c1', label: 'Prose, 1 stream' },
      { id: 'decode_c4', label: 'Code, 4 streams' },
    ],
    /** The card's one line under the figures, true for every tile: prefill is the best of its turns, decode of its sweeps. */
    caption: {
      upto: 'Best measured run for each. Full ranges on the release page.',
      asterisk: '* Best measured run for each. Full ranges on the release page.',
      none: 'Three DGX Sparks · stock weights by default',
    },
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
  speed: {
    /** Under the "up to" line: each figure is the top of its measured range; the results keep the full ranges. */
    best: `Best of ${counted(glm.headline.sweeps, 'run')}. Full ranges in the results below.`,
    reference: referenceClause(SPEED),
  },
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
    title: `Run ${INSTALL_RELEASE}`,
    body: 'You need three DGX Sparks, fast direct connections between them (RoCE), and enough disk space. The install guide checks your machines before anything starts.',
    guide: glm.links.install,
    /**
     * Shown only when installers get a later patch than the measured build. It holds while that patch
     * changes packaging and installation and not the serving code, as v1.8.1 does.
     */
    note: glm.install_tag === glm.tag ? null : `The numbers were measured on ${glm.tag}. ${glm.install_tag} fixes installation on other machines and does not change the serving code.`,
  },
  links: [
    { label: 'GitHub repository', href: glm.links.source, primary: true },
    { label: `Release ${glm.install_tag}`, href: glm.links.release },
    { label: 'Hugging Face: model card and provenance', href: glm.links.huggingface },
  ],
  /** The published v1.1 page, for history links. */
  previous: { label: 'JSPARK3 v1.1 (Cadence)', href: 'https://github.com/jakejharris/jspark3/releases/tag/v1.1.0' },
} as const;

export const TEMPO_COPY = {
  summary: 'A named JSPARK3 release: our DeepSeek experiment.',
  mainLineLink: 'Main line: latest JSPARK3 release (GLM-5.3 Flash)',
} as const;
