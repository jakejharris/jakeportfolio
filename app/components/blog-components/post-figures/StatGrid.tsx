import type { CSSProperties } from 'react';

import type { StatGridValue } from '@/app/types/sanity';
import { statColumns } from '@/app/lib/post-figures';

import { FigureFrame, SourceLink } from './Frame';

/** Two to six headline numbers, each with a short label and an optional note or source. */
export default function StatGrid({ value }: { value: StatGridValue }) {
  const stats = (Array.isArray(value.stats) ? value.stats : [])
    .filter((stat): stat is StatGridValue['stats'][number] =>
      Boolean(stat && typeof stat.value === 'string' && stat.value && typeof stat.label === 'string' && stat.label)
    )
    .slice(0, 6);
  if (stats.length === 0) return null;
  const longest = Math.max(
    ...stats.map((stat) => stat.label.length + (typeof stat.detail === 'string' ? stat.detail.length : 0))
  );
  const { phone, wide } = statColumns(stats.length, longest);
  // Five stats in three columns leave a hole; filling it carries the row rule across.
  const fill = wide === 3 && stats.length % 3 !== 0;

  return (
    <FigureFrame
      kind="statGrid"
      title={value.title}
      label={value.label}
      caption={value.caption}
      sourceTitle={value.sourceTitle}
      sourceUrl={value.sourceUrl}
      sourceDetail={value.sourceDetail}
      flush
    >
      <ul
        className="pf-stats"
        data-fill={fill ? '' : undefined}
        style={{ '--pf-cols-phone': phone, '--pf-cols-wide': wide } as CSSProperties}
      >
        {stats.map((stat) => (
          <li key={stat._key} className="pf-stat sm:px-4">
            <p className="pf-stat-figure">
              <span className={stat.value.length > 6 ? 'pf-stat-value tabular is-long' : 'pf-stat-value tabular'}>
                {stat.value}
              </span>
              {stat.unit && <span className="pf-stat-unit">{stat.unit}</span>}
            </p>
            <p className="pf-stat-label">{stat.label}</p>
            {stat.detail && <p className="pf-stat-detail">{stat.detail}</p>}
            {stat.note && <p className="pf-stat-note">{stat.note}</p>}
            {stat.sourceTitle && (
              <p className="pf-stat-source">
                <SourceLink title={stat.sourceTitle} url={stat.sourceUrl} />
              </p>
            )}
          </li>
        ))}
      </ul>
    </FigureFrame>
  );
}
