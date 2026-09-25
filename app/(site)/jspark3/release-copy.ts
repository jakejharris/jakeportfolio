/**
 * Release copy for the JSPARK3 hub and the GLM release page (/jspark3/glm/).
 * It holds no layout, so a redesign can import these strings as they are.
 *
 * GLM release facts live in glm-release.json. Fill them in when the release is
 * published, then run `node scripts/check-glm-release.mjs`. It fails while any
 * placeholder remains. Until then, placeholders render visibly as "v1.X" and "XX.X".
 */
import glm from './glm-release.json';

/** One headline measurement. `value` is the aggregate across all streams; `per_stream` is the optional mean per stream. */
export interface HeadlineRow {
  id: string;
  label: string;
  concurrency: string;
  unit: string;
  value: number | null;
  per_stream: number | null;
  v1_1: number | null;
  mia: number | null;
}

export interface GlmRelease {
  placeholder: boolean;
  version: string;
  tag: string;
  name: string | null;
  published: string;
  social_image: string | null;
  links: { release: string; source: string; huggingface: string };
  headline: { baseline: string; conditions: string; rows: HeadlineRow[] };
  mia: { benchmark: string | null; source: string | null; ran_exactly_as_published: boolean };
}

export const GLM_RELEASE: GlmRelease = glm;

/** True until the release facts are filled in. Pages mark every unfilled value while it holds. */
export const IS_PLACEHOLDER = GLM_RELEASE.placeholder;

/** "Sep 26, 2026" from "2026-09-26". */
export function releaseDate(iso: string, year = true) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });
}

/**
 * The internal builds between v1.1 and this release: v1.2 through v1.7 for v1.8,
 * only v1.2 for v1.3, and none for v1.2.
 */
function internalBuilds(version: string) {
  const minor = Number(/^v1\.(\d+)$/.exec(version)?.[1]);
  if (!Number.isInteger(minor)) return { first: 'v1.2', last: 'v1.X' };
  if (minor <= 2) return null;
  return { first: 'v1.2', last: minor === 3 ? null : `v1.${minor - 1}` };
}

export const INTERNAL_BUILDS = internalBuilds(glm.version);

/** A headline value, or a visible placeholder until the release numbers are filled in. */
export function headlineValue(value: number | null) {
  return value === null ? 'XX.X' : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** A comparison value (v1.1 or Mia). null is a placeholder before the fill and "no matched run" after it. */
export function comparisonValue(value: number | null) {
  return value === null && !IS_PLACEHOLDER ? 'n/a' : headlineValue(value);
}

/** The change from v1.1, or null when either side is missing. */
export function changeFromBaseline(row: HeadlineRow) {
  if (row.value === null || row.v1_1 === null || row.v1_1 === 0) return null;
  const change = ((row.value - row.v1_1) / row.v1_1) * 100;
  return `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(1)}%`;
}

/** Mia's column appears only where we ran her benchmark exactly as she describes it. */
export const SHOW_MIA = glm.mia.ran_exactly_as_published && GLM_RELEASE.headline.rows.some(row => row.mia !== null);

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
    version: glm.version,
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

export const GLM_COPY = {
  title: `JSPARK3 ${glm.version}`,
  metaDescription: `JSPARK3 ${glm.version}: GLM-5.3 Flash across three NVIDIA DGX Sparks, with stock weights by default, a pinned recipe, and measured results.`,
  label: LABELS.latest,
  lede: 'GLM-5.3 Flash across three DGX Sparks as one OpenAI-compatible endpoint. The recipe is pinned so you can rebuild it, with public benchmarks and the misses left in.',
  intro: 'One OpenAI-compatible endpoint across all three. The recipe is pinned so you can rebuild it, with public benchmarks and the misses left in.',
  internalBuilds: INTERNAL_BUILDS
    ? `${INTERNAL_BUILDS.last ? `${INTERNAL_BUILDS.first} through ${INTERNAL_BUILDS.last} were internal builds` : `${INTERNAL_BUILDS.first} was an internal build`}, so the public numbers go from v1.1 to ${glm.version}.`
    : null,
  weights: 'The default install uses the stock GLM-5.3 Flash weights. Abliteration is an explicit opt-in.',
  whyGlmTitle: 'We tried DeepSeek, measured it, and came back.',
  whyGlm:
    'Tempo was my DeepSeek experiment, and I measured it seriously. Its tok/s held up, but it overthinks, and time to finish a task is what I actually feel. GLM-5.3 Flash is better at agent and coding work, and better in almost every other way I use it, so the numbered line runs GLM again.',
  whyGlmLink: 'Tempo, the DeepSeek experiment',
  numbersNote:
    'Compared with our own v1.1. Mia’s published numbers appear only where we ran her benchmark exactly as she describes it.',
  /** The results heading. With a Mia series, it says her figures are hers, not ours. */
  resultsTitle: SHOW_MIA ? 'Measured on our three Sparks, beside Mia’s published results.' : 'Measured on our three Sparks.',
  mia: {
    series: 'Mia, published',
    source: 'Her figures are her published results for',
    rows: 'In rows that show them, our numbers come from that same benchmark.',
  },
  notesLink: { title: 'Release notes and known issues', detail: 'release notes on GitHub' },
  credit: {
    text: 'Thanks to @unsaltedbutter-ai for the first community run of JSPARK3 on their own three GB10 machines, shared in PR #9.',
    handle: '@unsaltedbutter-ai',
    profile: 'https://github.com/unsaltedbutter-ai',
    pr: 'https://github.com/jakejharris/jspark3/pull/9',
  },
  proof: {
    title: 'Run on someone else’s hardware.',
    scope: `Their run used JSPARK3 v1.1 with one added patch. It was not a run of ${glm.version}.`,
  },
  install: {
    title: `Run ${glm.version}`,
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
