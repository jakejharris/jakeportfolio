import type { CSSProperties } from 'react';

import type { BeforeAfterValue } from '@/app/types/sanity';
import { checkScale, decimalsOf, formatDelta, niceScale, scalePercent } from '@/app/lib/post-figures';

import { FigureFrame, SourceLink } from './Frame';

/**
 * A dumbbell chart: each row moves from a before value (hollow) to an after
 * value (filled) on one shared scale. The numbers are printed beside each
 * row, and a hidden table carries the same data for screen readers.
 *
 * Motion (CSS only, see MotionGate): each after dot sets out from its before
 * value and travels to where it ended up, uncovering its bar behind it, then
 * rests. The dot rides a track-wide layer, so its translateX is a share of
 * the track; the bar's window rides with it and the bar counter-translates.
 * Rows that did not change hold still. The HTML is the settled state.
 */
export default function BeforeAfter({ value }: { value: BeforeAfterValue }) {
  const rows = (Array.isArray(value.rows) ? value.rows : []).filter(
    (row): row is BeforeAfterValue['rows'][number] =>
      Boolean(row && typeof row.label === 'string' && row.label && Number.isFinite(row.before) && Number.isFinite(row.after))
  );
  if (rows.length === 0) return null;
  // Bounds Studio would refuse (max not above min, a value outside them) draw nothing.
  if (checkScale({ ...value, rows }) !== true) return null;
  const numbers = rows.flatMap((row) => [row.before, row.after]);
  const scale = niceScale(numbers, 5, value.scaleMin, value.scaleMax);
  const decimals = decimalsOf(numbers);
  const suffix = value.valueSuffix ?? '';
  const show = (n: number) => `${n.toFixed(decimals)}${suffix}`;
  const beforeLabel = value.beforeLabel || 'Before';
  const afterLabel = value.afterLabel || 'After';

  return (
    <FigureFrame
      kind="beforeAfter"
      motion
      title={value.title}
      label={value.label}
      caption={value.caption}
      sourceTitle={value.sourceTitle}
      sourceUrl={value.sourceUrl}
      sourceDetail={value.sourceDetail}
      note={
        value.note || value.noteSourceTitle ? (
          <>
            {value.note}
            {value.noteSourceTitle && (
              <>
                {value.note ? ' ' : ''}
                <SourceLink title={value.noteSourceTitle} url={value.noteSourceUrl} />
              </>
            )}
          </>
        ) : undefined
      }
    >
      {/* A table ignores a 1px width, so a clipped box holds it. */}
      <div className="sr-only">
      <table>
        {value.title && <caption>{value.title}</caption>}
        <thead>
          <tr>
            <th scope="col">Row</th>
            <th scope="col">{beforeLabel}</th>
            <th scope="col">{afterLabel}</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._key}>
              <th scope="row">{row.label}</th>
              <td>{show(row.before)}</td>
              <td>{show(row.after)}</td>
              <td>{formatDelta(row.before, row.after, decimals) ?? 'No Change'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div aria-hidden="true">
        <ul className="pf-db-legend">
          <li>
            <span className="pf-db-dot" data-at="before" />
            {beforeLabel}
          </li>
          <li>
            <span className="pf-db-dot" data-at="after" />
            {afterLabel}
          </li>
        </ul>
        <div className="pf-dumbbells">
          {rows.map((row, index) => {
            const from = scalePercent(row.before, scale);
            const to = scalePercent(row.after, scale);
            const delta = formatDelta(row.before, row.after, decimals);
            const down = row.after < row.before;
            return (
              <div key={row._key} style={{ '--pf-row': index } as CSSProperties}>
                <div className="pf-db-head">
                  <span className="pf-db-label">{row.label}</span>
                  <span className="pf-db-values tabular">
                    {delta ? (
                      <>
                        {show(row.before)} <span className="pf-db-arrow">→</span> {show(row.after)}
                        <span className="pf-db-delta"> ({delta})</span>
                      </>
                    ) : (
                      <>
                        {show(row.after)} <span className="pf-db-delta">(No Change)</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="pf-db-track">
                  {delta ? (
                    <>
                      {/* The bar sits in a window that ends at the after dot and rides with it,
                          so while the dot travels the bar is uncovered behind it, unscaled. */}
                      <span className="pf-db-travel" style={{ '--pf-from': `${from - to}%` } as CSSProperties}>
                        <span className="pf-db-reach" style={{ left: `${down ? to : to - 100}%` }}>
                          <span className="pf-db-reach-copy" style={{ left: `${down ? -to : 100 - to}%` }}>
                            <span
                              className="pf-db-bar"
                              data-down={down ? '' : undefined}
                              style={{ left: `${Math.min(from, to)}%`, width: `${Math.abs(to - from)}%` }}
                            />
                          </span>
                        </span>
                        <span className="pf-db-dot" data-at="after" style={{ left: `${to}%` }} />
                      </span>
                      <span className="pf-db-dot" data-at="before" style={{ left: `${from}%` }} />
                    </>
                  ) : (
                    <span className="pf-db-dot" data-at="same" style={{ left: `${to}%` }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="pf-db-scale">
          <div className="pf-db-axis tabular">
            {scale.ticks.map((tick, index) => (
              <span
                key={tick}
                // Counted from the right, so a phone always keeps the last tick.
                data-minor={(scale.ticks.length - 1 - index) % 2 === 1 ? '' : undefined}
                style={{ left: `${scalePercent(tick, scale)}%` }}
              >
                {tick}
              </span>
            ))}
          </div>
        </div>
      </div>
    </FigureFrame>
  );
}
