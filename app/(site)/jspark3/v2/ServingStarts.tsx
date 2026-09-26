import React from 'react';
import Band from './Band';
import { GLM_COPY, GLM_RELEASE, HEADLINE_ROWS, IS_PLACEHOLDER, METRICS, SET_GROUPS, setCaption } from '../release-copy';
import { Marked, Ph } from '../Placeholder';

type Cell = { id: string; lo_text: string | null; hi_text: string | null };
type Start = { key: string; caption: string; label: string; cells: Cell[]; current?: boolean };

const { headline, sets } = GLM_RELEASE;

/** The release's own start leads the stock group, captioned with its build. When it is missing, no other start takes its place. */
const current: Start[] = HEADLINE_ROWS.length
  ? [{ key: 'current', caption: setCaption({ ...headline, mode: 0 }), label: GLM_COPY.sets.thisRelease, cells: HEADLINE_ROWS, current: true }]
  : [];

/** Our earlier release's figures, one per cell, where the release notes carry them. */
const earlier: Start[] = HEADLINE_ROWS.some(row => row.v1_1 !== null)
  ? [{ key: 'v1_1', caption: '', label: headline.baseline, cells: HEADLINE_ROWS.map(row => ({ id: row.id, lo_text: row.v1_1_text, hi_text: row.v1_1_text })) }]
  : [];

const GROUPS: { group: string; title: string; starts: Start[] }[] = [
  ...SET_GROUPS.map(({ group, title }) => ({
    group,
    title,
    starts: [
      ...(group === 'base_m0' ? current : []),
      ...sets.filter(set => set.group === group).map(set => ({ key: set.id, caption: setCaption(set), label: set.label, cells: set.rows })),
    ],
  })),
  { group: 'earlier', title: GLM_COPY.sets.earlier, starts: earlier },
].filter(group => group.starts.length);

const heading = (metric: (typeof METRICS)[number]) => (metric.label === 'Decode' ? `Decode ${metric.concurrency}` : metric.label);

/**
 * Every serving start in one table: this release first, then the base-recipe starts, the
 * edited-weight starts and our earlier release. Each start is labelled by the build it ran.
 * Explicit roles keep the table readable to screen readers when narrow screens restack it.
 */
export default function ServingStarts() {
  return <div className="glm-starts">
    <h3 id="starts-title">{GLM_COPY.sets.title}</h3>
    <p className="glm-starts-intro">{GLM_COPY.sets.intro}</p>
    <table role="table">
      <caption>{GLM_COPY.sets.caption}</caption>
      <thead role="rowgroup"><tr role="row">
        <th role="columnheader" scope="col">{GLM_COPY.sets.column}</th>
        {METRICS.map(metric => <th role="columnheader" scope="col" key={metric.id}>{heading(metric)}</th>)}
      </tr></thead>
      {GROUPS.map(group => <tbody role="rowgroup" key={group.group} data-group={group.group}>
        <tr role="row" className="glm-starts-group"><th role="rowheader" scope="rowgroup" colSpan={METRICS.length + 1}>{group.title}</th></tr>
        {group.starts.map(start => <tr role="row" key={start.key} data-start-id={start.key} className={start.current ? 'glm-starts-current' : undefined}>
          <th role="rowheader" scope="row">
            {start.caption ? <span className="glm-starts-caption"><Marked text={start.caption} /></span> : null}
            <span className="glm-starts-label">{IS_PLACEHOLDER && !start.current ? <Ph>{start.label}</Ph> : <Marked text={start.label} />}</span>
          </th>
          {METRICS.map(metric => {
            const cell = start.cells.find(row => row.id === metric.id);
            return <td role="cell" key={metric.id} data-label={heading(metric)}><Band lo={cell?.lo_text ?? null} hi={cell?.hi_text ?? null} /></td>;
          })}
        </tr>)}
      </tbody>)}
    </table>
    {sets.some(set => set.mode === 1) ? <p className="glm-small">{GLM_COPY.sets.unscaled}</p> : null}
  </div>;
}
