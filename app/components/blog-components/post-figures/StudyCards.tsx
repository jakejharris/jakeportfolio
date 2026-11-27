import type { StudyCardsValue } from '@/app/types/sanity';

import { FigureFrame, SourceLink } from './Frame';

const ERA_LABEL = { then: 'Then', now: 'Now' } as const;

/**
 * One to four research cards: when, the finding in a line, an optional big
 * number or verbatim quote, and the source. A "then" and "now" tag pairs an
 * early study with recent work.
 */
export default function StudyCards({ value }: { value: StudyCardsValue }) {
  const cards = (value.cards ?? []).filter((card) => card.studyTitle && card.finding).slice(0, 4);
  if (cards.length === 0) return null;

  return (
    <FigureFrame
      kind="studyCards"
      title={value.title}
      label={value.label}
      caption={value.caption}
      sourceTitle={value.sourceTitle}
      sourceUrl={value.sourceUrl}
      sourceDetail={value.sourceDetail}
      flush
    >
      <ul
        className="pf-studies"
        data-count={cards.length}
      >
        {cards.map((card) => (
          <li key={card._key} className="pf-study">
            <p className="pf-study-meta">
              {card.era && ERA_LABEL[card.era] && (
                <span className="pf-era" data-era={card.era}>
                  {ERA_LABEL[card.era]}
                </span>
              )}
              <span className="tabular">{card.date}</span>
            </p>
            {card.stat && (
              <p className="pf-study-stat">
                <strong className={card.stat.length > 12 ? 'tabular is-long' : 'tabular'}>{card.stat}</strong>
                {card.statLabel && <span>{card.statLabel}</span>}
              </p>
            )}
            <p className="pf-study-finding">{card.finding}</p>
            {card.quote && (
              <blockquote className="pf-study-quote">
                <p>&ldquo;{card.quote}&rdquo;</p>
              </blockquote>
            )}
            {card.note && <p className="pf-study-note">{card.note}</p>}
            <p className="pf-study-source">
              {card.authors && <>{card.authors}, </>}
              <SourceLink title={`“${card.studyTitle}”`} url={card.url} />
              {card.venue && <>, {card.venue}</>}
            </p>
          </li>
        ))}
      </ul>
    </FigureFrame>
  );
}
