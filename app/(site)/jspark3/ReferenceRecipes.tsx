import * as React from 'react';
import { REFERENCE_ROWS } from './content';

/**
 * The published reference recipes, one card per recipe. The source is a
 * six-column table that needs about a thousand pixels; in the site's column the
 * headers become row labels inside each card so no cell is truncated and
 * nothing scrolls sideways. Every string is verbatim from content.ts.
 */

const OURS_TINT = 'bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]';

function SparkCount({ count }: { count: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border bg-muted px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      <span className="tabular-nums">{count}</span> Sparks
    </span>
  );
}

function Field({
  label,
  children,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground sm:pt-0.5">
        {label}
      </dt>
      <dd className={`text-[13.5px] leading-relaxed ${muted ? 'text-muted-foreground' : ''}`}>
        {children}
      </dd>
    </div>
  );
}

export default function ReferenceRecipes() {
  return (
    <div className="grid gap-3">
      {REFERENCE_ROWS.map((row) => (
        <article
          key={row.recipe}
          aria-label={row.recipe}
          className={`rounded-lg border border-border bg-card p-4 ${
            row.ours ? `border-l-[3px] border-l-[color:var(--accent-color)] ${OURS_TINT}` : ''
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <h4 className={`text-[15px] leading-snug ${row.ours ? 'font-bold' : 'font-semibold'}`}>
              {row.recipe}
            </h4>
            <SparkCount count={row.sparks} />
          </div>
          <dl className="mt-3 space-y-2.5 tabular-nums">
            <Field label="Lane">{row.lane}</Field>
            <Field label="Context">{row.context}</Field>
            <Field label="Single-stream decode, tok/s">
              {typeof row.decode === 'string' ? (
                row.decode
              ) : (
                <span className="grid grid-cols-3 gap-2">
                  {row.decode.map((part) => (
                    <span key={part.label} className="min-w-0">
                      <span className="block text-lg font-bold leading-tight">{part.value}</span>
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        {part.label}
                      </span>
                    </span>
                  ))}
                </span>
              )}
            </Field>
            <Field label="Basis" muted>
              {row.basis}
            </Field>
          </dl>
        </article>
      ))}
    </div>
  );
}
