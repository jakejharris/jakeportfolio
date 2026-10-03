// Figures never shown without a partner sentence, as the release declares them.
//
// The release lists them in metrics_template._first_token_partners, one entry per set:
//   { figure: 'result_sets.V-D.metrics.c8_ttft_p50_s', partner_public: 'result_sets.V-D.metrics.c8_ttft_partner_public',
//     partner_keys: ['result_sets.V-D.metrics.c8_visible_text_p50_s', ...] }
// Underscore keys never reach the pages, so sync-glm-facts.mjs writes the list as first_token_partners, one pair
// per figure key ({ [figure]: { partner, keys } }), and check-glm-facts.mjs reads the release's own list at check
// time. A pair the release declares needs no edit here. A pair holds in every set that shows its figure, not
// only the sets the list names. Every set names the same partner sentence; the keys it must give are every key
// any set names (a set without one of them gives nothing to check).

/**
 * The 8-at-once first token is the first streamed token, often reasoning: it never shows without the sentence
 * saying when visible text arrived. This pair stands even where the facts list none (facts before 7dff89e8);
 * a pair the facts declare for the same figure replaces it. glm-facts.ts keeps the same floor.
 */
export const FLOOR = { c8_ttft_p50_s: { partner: 'c8_ttft_partner_public', keys: ['c8_visible_text_p50_s', 'c8_no_text_replies'] } };

const metricOf = path => {
  const match = typeof path === 'string' ? path.match(/^result_sets\.([^.]+)\.metrics\.(.+)$/) : null;
  return match ? { set: match[1], key: match[2] } : null;
};

/** The release's list as { pairs: { [figure]: { partner, keys } }, problems: [why an entry was not taken] }. */
export function partnersOf(list) {
  const pairs = {};
  const problems = [];
  if (list === undefined) return { pairs, problems };
  if (!Array.isArray(list)) return { pairs, problems: ['metrics_template._first_token_partners is not a list'] };
  for (const [index, entry] of list.entries()) {
    const where = `metrics_template._first_token_partners[${index}]`;
    const figure = metricOf(entry?.figure);
    const partner = metricOf(entry?.partner_public);
    const keys = Array.isArray(entry?.partner_keys) ? entry.partner_keys.map(metricOf) : [];
    if (!figure || !partner || !keys.length || keys.some(key => !key)) {
      problems.push(`${where} needs figure, partner_public and partner_keys as result_sets.<set>.metrics.<key> paths`);
      continue;
    }
    if ([partner, ...keys].some(path => path.set !== figure.set)) {
      problems.push(`${where} pairs ${figure.set}'s ${figure.key} with another set's cells`);
      continue;
    }
    const known = pairs[figure.key];
    if (known && known.partner !== partner.key) problems.push(`${where}: ${figure.set} gives ${figure.key} the partner ${partner.key}, an earlier set ${known.partner}`);
    else if (known) known.keys.push(...keys.map(key => key.key).filter(key => !known.keys.includes(key)));
    else pairs[figure.key] = { partner: partner.key, keys: keys.map(key => key.key) };
  }
  return { pairs, problems };
}

/** Every pair in force: the floor, with the declared pairs over it. */
export const partnersWith = pairs => ({ ...FLOOR, ...pairs });

/**
 * Cells that are not figures. A results file may point a card reader from a partner key to the note under its
 * table ("see the note below the table"): card-only wording, so the sync drops it and the pages never print it;
 * the partner sentence carries what it points to. A figure the release measured and decided not to publish reads
 * "not published": no unit and no partner, and never "not measured".
 */
export const CARD_POINTER = /^see the note below the table\.?$/i;
export const UNPUBLISHED = /^not published\.?$/i;
