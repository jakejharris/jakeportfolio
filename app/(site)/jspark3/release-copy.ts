/**
 * Release copy for the JSPARK3 hub and the GLM release page (/jspark3/glm/).
 * It holds no layout, so a redesign can import these strings as they are.
 *
 * GLM release facts live in glm-release.json. Fill them in when the release is
 * published, then run `node scripts/check-glm-release.mjs`. It fails while any
 * placeholder remains. Until then, placeholders render visibly as "v1.X" and "XX.X".
 */
import glm from './glm-release.json';

export type HeadlineRow = (typeof glm.headline.rows)[number];

export const GLM_RELEASE = glm;

/** "v1.2 through v1.7" for v1.8. Every build between v1.1 and this release was internal. */
function internalRange(version: string) {
  const minor = Number(/^v1\.(\d+)/.exec(version)?.[1]);
  return Number.isInteger(minor) && minor > 2 ? `v1.2 through v1.${minor - 1}` : 'v1.2 through v1.X';
}

/** A headline value, or a visible placeholder until the release numbers are filled in. */
export function headlineValue(value: number | null) {
  return value === null ? 'XX.X' : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
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
    action: 'Recipe, results, and release notes',
  },
  tempoCard: {
    meta: LABELS.named,
    version: LABELS.experimental,
    title: 'Tempo',
    action: 'Recipe, results, and limitations',
  },
} as const;

export const GLM_COPY = {
  title: `JSPARK3 ${glm.version}`,
  metaDescription: `JSPARK3 ${glm.version}: GLM-5.3 Flash across three NVIDIA DGX Sparks, with stock weights by default, a pinned recipe, and measured results.`,
  label: LABELS.latest,
  lede: 'GLM-5.3 Flash across three DGX Sparks as one OpenAI-compatible endpoint. The recipe is pinned so you can rebuild it, with public benchmarks and the misses left in.',
  internalBuilds: `${internalRange(glm.version)} were internal builds, so the public numbers go from v1.1 to ${glm.version}.`,
  weights: 'The default install uses the stock GLM-5.3 Flash weights. Abliteration is an explicit opt-in.',
  whyGlm:
    'Tempo was my DeepSeek experiment, and I measured it seriously. Its tok/s held up, but it overthinks, and time to finish a task is what I actually feel. GLM-5.3 Flash is better at agent and coding work, and better in almost every other way I use it, so the numbered line runs GLM again.',
  numbersNote:
    'Compared with our own v1.1. Mia’s published numbers appear only where we ran her benchmark exactly as she describes it.',
  credit: {
    text: 'Thanks to @unsaltedbutter-ai for the first community run of JSPARK3 on their own three Sparks, shared in PR #9.',
    handle: '@unsaltedbutter-ai',
    profile: 'https://github.com/unsaltedbutter-ai',
    pr: 'https://github.com/jakejharris/jspark3/pull/9',
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
