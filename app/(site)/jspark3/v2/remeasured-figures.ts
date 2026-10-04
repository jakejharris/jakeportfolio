import { SOCIAL_IMAGE, TILE_FIGURES, type TileFigure } from '../glm-facts';
import share from '../glm-share.json';
import { CHARTS, DATE, HERO, HERO_RELEASE_TILES, PLACEHOLDER, type LeadFigure, type RemeasuredChart } from './remeasured-data';

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
 * A re-measured hero figure: its label, value and unit, captioned with its own line and the table's label, never
 * its group's condition, whose timings need their footnotes.
 */
export type HeroFigure = { key: string; label: string; value: string; unit: string; caption: string };

/**
 * The GLM page's hero, which the hub's latest card and the share card show too. With the re-measurement it leads
 * with its figures (remeasured-data.ts HERO) and keeps the release tiles HERO_RELEASE_TILES names; without it,
 * it is the release's tiles (glm-facts.ts TILE_FIGURES) and line.
 */
export const HERO_FIGURES: HeroFigure[] = (REMEASURED_ON ? resolve(HERO) : []).map(({ figure, chart, group, smallPrint }) => ({
  key: `remeasured.${chart.id}.${group.key}`, label: figure.label, value: figure.value, unit: figure.unit, caption: [figure.line, smallPrint].filter(Boolean).join('. '),
}));
export const HERO_TILES: TileFigure[] = HERO_FIGURES.length ? TILE_FIGURES.filter(tile => HERO_RELEASE_TILES.includes(tile.key)) : TILE_FIGURES;

/** What the re-measured hero was measured with, then when; the GLM page links the date to the section. */
export const HERO_LINE = HERO_FIGURES.length
  ? { lead: `base weights + draft model · ${HERO_TILES.length ? 'RigMark from the release; the rest ' : ''}`, measured: `re-measured ${REMEASURED_DATE}` }
  : null;

/** The hero's figures as a share card records them: a card is current only while they match. */
export const HERO_SIGNATURE: string[] = [
  ...HERO_FIGURES.map(figure => `${figure.label}: ${figure.value} ${figure.unit}`),
  ...HERO_TILES.map(tile => `${tile.label}: ${tile.value.slot.text} ${tile.unit}`),
];

/** What the re-measured hero was measured with, as a sentence: the share card's line and the page's description end with it. */
export const HERO_MEASURED: string | null = HERO_LINE ? `Measured with ${HERO_LINE.lead}${HERO_LINE.measured}.` : null;

/**
 * The re-measured hero as the GLM page's description says it: each figure with its label, then what they were
 * measured with. Without the re-measurement there is none.
 */
export const HERO_SUMMARY: string | null = HERO_MEASURED ? `${HERO_SIGNATURE.join('. ')}. ${HERO_MEASURED}` : null;

/**
 * The share card, while it was rendered from these facts (glm-facts.ts SOCIAL_IMAGE) and shows these hero
 * figures: a card from an earlier hero never stands in for the page's numbers.
 */
export const SHARE_IMAGE: string | null = SOCIAL_IMAGE && JSON.stringify((share as { figures?: string[] }).figures ?? null) === JSON.stringify(HERO_SIGNATURE) ? SOCIAL_IMAGE : null;
