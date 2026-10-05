import { COMPARE, RELBENCH_LABEL, SOCIAL_IMAGE, TILE_FIGURES, TILES_LINE, VERSION, type CompareRow, type TileFigure } from '../glm-facts';
import share from '../glm-share.json';
import { CHARTS, COMPARE_NOTES, DATE, HERO, HERO_RELEASE_TILES, PLACEHOLDER, type LeadFigure, type RemeasuredChart } from './remeasured-data';

/**
 * The section ships once the placeholders are replaced; until then it shows only in a local preview ("1").
 * "0" leaves it out, and with it the hero's re-measured figures: the release's own page.
 */
export const remeasuredShown = (placeholder: boolean, preview: string | undefined) => preview !== '0' && (!placeholder || preview === '1');

/** Each chart with only the bars the table marks PUBLISHABLE; a group or chart left with none is dropped. */
export function publishable(charts: RemeasuredChart[]): RemeasuredChart[] {
  return charts
    .map(chart => ({ ...chart, groups: chart.groups.map(group => ({ ...group, bars: group.bars.filter(bar => bar.screen === 'PUBLISHABLE') })).filter(group => group.bars.length) }))
    .filter(chart => chart.groups.length);
}

/** Whether the section, and the hero figures it gives, show on this build. */
export const REMEASURED_ON = remeasuredShown(PLACEHOLDER, process.env.JSPARK3_REMEASURED_PREVIEW);

export const REMEASURED_DATE = new Date(`${DATE}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/**
 * Lead and hero figures with the group they come from, its label, and either the figure's own line or the
 * group's condition. The group's footnotes go with its condition, never without it. A figure shows only while
 * its group is drawn.
 */
export function resolve(figures: LeadFigure[], charts: RemeasuredChart[] = publishable(CHARTS)) {
  return figures.flatMap(figure => {
    const chart = charts.find(item => item.id === figure.chart);
    const group = chart?.groups.find(item => item.key === figure.group);
    if (!chart || !group) return [];
    const own = figure.line !== undefined;
    return [{ figure, chart, group, line: own ? figure.line : group.condition, notes: own ? undefined : group.notes, smallPrint: group.smallPrint ?? chart.smallPrint }];
  });
}

/**
 * A re-measured hero figure: its label, value and unit, captioned with its own line and the table's label as one
 * sentence, never its group's condition, whose timings need their footnotes.
 */
export type HeroFigure = { key: string; label: string; value: string; unit: string; caption: string; prompt?: string };

/**
 * The GLM page's hero, which the hub's latest card and the share card show too. With the re-measurement it leads
 * with its figures (remeasured-data.ts HERO) and keeps the release tiles HERO_RELEASE_TILES names, each captioned
 * with the table's label for it; without it, it is the release's tiles (glm-facts.ts TILE_FIGURES) and line.
 */
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
export const HERO_FIGURES: HeroFigure[] = (REMEASURED_ON ? resolve(HERO) : []).map(({ figure, chart, group, smallPrint }) => ({
  key: `remeasured.${chart.id}.${group.key}`, label: figure.label, value: figure.value, unit: figure.unit, caption: sentence([figure.line, smallPrint].filter(Boolean).join('. ')), prompt: figure.prompt,
}));
export type HeroTile = TileFigure & { prompt?: string };
export const HERO_TILES: HeroTile[] = HERO_FIGURES.length
  ? TILE_FIGURES.flatMap(tile => HERO_RELEASE_TILES.filter(kept => kept.key === tile.key).map(kept => ({ ...tile, caption: { text: kept.smallPrint, pending: false }, prompt: kept.prompt })))
  : TILE_FIGURES;

const WEIGHTS = 'base weights + draft model';

/** What the hero was measured with, then when; the GLM page links the date to its results. */
export const HERO_LINE = HERO_FIGURES.length
  ? { lead: `${WEIGHTS} · `, measured: `measured ${REMEASURED_DATE}` }
  : null;

const named = (figure: Pick<HeroFigure, 'label' | 'value' | 'unit' | 'prompt'>) => `${[figure.label, figure.prompt].filter(Boolean).join(', ')}: ${figure.value} ${figure.unit}`;
const tileNamed = (tile: HeroTile) => named({ ...tile, value: tile.value.slot.text });

/** What the re-measured hero was measured with, as a sentence: the share card's line and the page's description end with it. */
export const HERO_MEASURED: string | null = HERO_LINE ? `Measured with ${WEIGHTS} on ${REMEASURED_DATE}.` : null;

/** All dynamic copy rendered on the share card, also used to reject a raster with stale qualifications. */
export function heroCard(figures: HeroFigure[], tiles: HeroTile[], measured: string) {
  return {
    title: `JSpark3 ${VERSION.text}: GLM-5.3 Flash on three DGX Sparks.`,
    measured,
    cells: [
      ...figures.map(({ key, label, unit, value, caption }) => ({ key, label, unit, value, weights: null, caption })),
      ...tiles.map(({ key, label, unit, value, weights, caption }) => ({ key, label, unit, value: value.slot.text, weights: weights?.text ?? null, caption: caption?.text ?? null })),
    ],
  };
}

export const HERO_CARD = heroCard(HERO_FIGURES, HERO_TILES, HERO_MEASURED ?? `Measured with ${TILES_LINE?.text}${RELBENCH_LABEL ? `, ${RELBENCH_LABEL.short.text}` : ''}.`);
export const HERO_SIGNATURE = JSON.stringify(HERO_CARD);

/**
 * The hero's figures the GLM page's description gives: only those whose prompt's cache status is known, each with
 * its label and that status. A figure without one is left out, never listed bare.
 */
const DESCRIBED_TILES = HERO_TILES.filter(tile => tile.prompt);
export const DESCRIBED_FIGURES: string[] = [...HERO_FIGURES.filter(figure => figure.prompt).map(named), ...DESCRIBED_TILES.map(tileNamed)];

/** What the described figures were measured with, as the description's last sentence. */
export const DESCRIBED_MEASURED: string | null = HERO_MEASURED;

/**
 * The re-measured hero as the GLM page's description says it: each described figure, then what they were measured
 * with. Without the re-measurement, or a figure to describe, there is none.
 */
export const HERO_SUMMARY: string | null = DESCRIBED_MEASURED && DESCRIBED_FIGURES.length ? `${DESCRIBED_FIGURES.join('. ')}. ${DESCRIBED_MEASURED}` : null;

/** RigMark's comparison with v1.8.4, each row with the audit's caption for it where it has one (COMPARE_NOTES). */
export const COMPARE_ROWS: CompareRow[] = COMPARE.map(row => (COMPARE_NOTES[row.id] ? { ...row, note: { text: COMPARE_NOTES[row.id], pending: false } } : row));

/**
 * The share card, while it was rendered from these facts (glm-facts.ts SOCIAL_IMAGE) and shows these hero
 * figures: a card from an earlier hero never stands in for the page's numbers. Its address carries the image's
 * hash, so a link preview cached with an earlier card fetches this one.
 */
const card = share as { hero?: ReturnType<typeof heroCard>; image_sha256?: string };
export function shareImage(signature: string): string | null {
  return SOCIAL_IMAGE && card.image_sha256 && JSON.stringify(card.hero ?? null) === signature
    ? `${SOCIAL_IMAGE}?v=${card.image_sha256.slice(0, 12)}`
    : null;
}
export const SHARE_IMAGE = shareImage(HERO_SIGNATURE);
