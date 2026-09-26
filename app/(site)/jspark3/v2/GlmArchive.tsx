import React from 'react';
import { Card } from '@/app/components/ui/card';
import ArchitectureDiagram from '../ArchitectureDiagram';
import Fold from '../Fold';
import { AuthorBenchmarks, SameTaskComparison, ScreenComparison } from '../ComparisonFigures';
import OverlayDeltaFigure from '../OverlayDeltaFigure';
import ReferenceRecipes from '../ReferenceRecipes';
import Rich from '../Rich';
import {
  ABLATION_CONTROL,
  ABLATION_NOTES,
  ABLATION_READING,
  ARCHITECTURE_CAPTION,
  ARCHITECTURE_CARDS,
  ARCHITECTURE_LEDE,
  BENCHMARK_FACTS,
  BENCHMARK_FACTS_CONDITION,
  BENCHMARKS_LEDE,
  CITE,
  CREDITS_INTRO,
  CREDITS_NOTE,
  CREDITS_ROLL,
  EVIDENCE_GRADE,
  EVIDENCE_LEDE,
  HERO,
  HERO_FACTS,
  LICENSES,
  LICENSING_LEDE,
  LICENSING_NOTE,
  LOCAL_RUNS,
  LOCAL_RUNS_METHOD,
  PINNED_INPUTS,
  PROVENANCE_LEDE,
  REFERENCE_NOTE,
  REFUSE_CARDS,
  REFUSE_LEDE,
  RUN_LEDE,
  RUN_LINKS,
} from '../content';
import { GLM_COPY, GLM_RELEASE, RELEASE } from '../release-copy';
import { Ph } from '../Placeholder';

/*
 * The foot of the GLM release page: the known-limitations link, the v1.1 page's
 * sections kept as published, and the earlier GLM releases. Every v1.1 section id
 * and legacy anchor survives, on the fold itself or as an alias just before it, and
 * FoldAnchors opens the fold a link points into. The v1.1 blocks keep the portfolio
 * components, so this part runs on the dark portfolio tokens remapped to GLM colors.
 */

/** The accent token, so the v1.1 blocks follow the GLM page's gold. */
const ACCENT_TEXT = 'text-[color:var(--accent-color)]';

/** A secondary heading inside a section, with its method note. */
function Subsection({ title, note }: { title: string; note: React.ReactNode }) {
  return (
    <>
      <h3 className="mt-8 text-lg font-semibold md:text-xl">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{note}</p>
    </>
  );
}

/** Node count, kept visible on every comparison row and card. */
function SparkCount({ count }: { count: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      <span className="tabular-nums">{count}</span> Sparks
    </span>
  );
}

function V11Fold({
  id,
  legacyIds,
  title,
  summary,
  lede,
  children,
}: {
  id: string;
  legacyIds: ReadonlyArray<string>;
  title: string;
  summary: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Earlier anchor ids for this section, kept so inbound links still land. */}
      {legacyIds.map((legacyId) => <span key={legacyId} id={legacyId} data-fold={id} className="glm-anchor" aria-hidden="true" />)}
      <details id={id}>
        <summary><span>{title}<small>{summary}</small></span><span aria-hidden="true">+</span></summary>
        <div className="glm-fold-body">
          {lede ? <p className="leading-relaxed text-muted-foreground">{lede}</p> : null}
          {children}
        </div>
      </details>
    </>
  );
}

export default function GlmArchive() {
  return (
    <section className="glm-shell glm-notes" aria-labelledby="glm-notes-title">
      <h2 id="glm-notes-title" className="glm-sr-only">Release details and history</h2>
      <a className="glm-notes-link" href={GLM_RELEASE.links.release}>
        <span>{GLM_COPY.notesLink.title}<small><Ph>{RELEASE}</Ph> {GLM_COPY.notesLink.detail}</small></span>
        <span aria-hidden="true">↗</span>
      </a>
      <p className="glm-notes-label">From the v1.1 page, kept as published</p>
      <div className="dark glm-archive">
      <V11Fold id="architecture" legacyIds={["js3-architecture"]} title="Architecture" summary="How three Sparks become one endpoint" lede={ARCHITECTURE_LEDE}>
        <figure className="mt-5">
          <ArchitectureDiagram />
          <figcaption className="mt-2 px-1 text-sm text-muted-foreground">
            {ARCHITECTURE_CAPTION}{' '}
            <a
              href="/jspark3/architecture.svg"
              className="underline decoration-border underline-offset-2 transition-colors hover:decoration-current"
            >
              Open the SVG
            </a>
            .
          </figcaption>
        </figure>
        <Fold
          className="mt-6 border-t border-border pt-5"
          level={3}
          title="The four parts, in detail"
          summary="Topology, fabric, overlay and lifecycle, with the exact counts, sizes and start order."
        >
          <div className="grid gap-3.5 sm:grid-cols-2">
            {ARCHITECTURE_CARDS.map((card) => (
              <Card key={card.title} className="p-4">
                <h4 className="text-[15px] font-semibold">{card.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </Card>
            ))}
          </div>
        </Fold>
      </V11Fold>
      <V11Fold id="benchmarks" legacyIds={["evidence", "js3-evidence"]} title="v1.1 benchmarks" summary="The numbers, then the comparisons" lede={BENCHMARKS_LEDE}>
        {/* Current decode and explicitly historical prefill, with the configured
            context kept separate from measured capacity. */}
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {BENCHMARK_FACTS.map((fact) => (
            <div key={fact.label} className="bg-card p-3.5 sm:p-4">
              <dt className="flex flex-wrap items-baseline gap-x-1.5">
                <span className={`text-[26px] font-bold leading-[1.05] tabular-nums sm:text-[32px] ${ACCENT_TEXT}`}>
                  {fact.value}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">{fact.unit}</span>
              </dt>
              <dd className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{fact.label}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2.5 text-sm text-muted-foreground">{BENCHMARK_FACTS_CONDITION}</p>

        {/* The comparisons: the authors' own benchmark scripts first, then the same frozen
            screen on this fleet, then the same agent prompt across all four builds. */}
        <Subsection
          title="Historical comparisons with other recipes"
          note="These v1.0.0 tables retain their original measurements. Each row names its node count."
        />
        <div className="mt-4 space-y-3.5">
          <AuthorBenchmarks />
          <ScreenComparison />
          <SameTaskComparison />
        </div>

        {/* Evidence class two: local runs, the detail behind the same-task figure. */}
        <Fold
          className="mt-8 border-t border-border pt-5"
          level={3}
          title="Local runs of published recipes"
          summary="The four runs behind the same-task figure, each with its adaptation disclosed."
        >
        <p className="text-sm leading-relaxed text-muted-foreground">{LOCAL_RUNS_METHOD}</p>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          {LOCAL_RUNS.map((run) => (
            <Card
              key={run.title}
              className={`p-4 ${
                run.ours
                  ? 'border-[color-mix(in_srgb,var(--accent-color)_40%,hsl(var(--border)))]'
                  : ''
              }`}
            >
              <h4 className="text-[15px] font-semibold">{run.title}</h4>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <SparkCount count={run.sparks} />
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] ${
                    run.ours
                      ? 'bg-[color-mix(in_srgb,var(--accent-color)_16%,transparent)] text-foreground'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {run.flag}
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                <Rich parts={run.body} />
              </p>
            </Card>
          ))}
        </div>
        </Fold>

        {/* Evidence class one: the published reference table, author-reported. */}
        <Fold
          className="mt-8 border-t border-border pt-5"
          level={3}
          title="Published reference recipes"
          summary="The authors’ reports of how their setups performed. The tests used different machines and settings, so the figures are not a ranking."
        >
          <p className="text-sm leading-relaxed text-muted-foreground">{EVIDENCE_LEDE}</p>
          <div className="mt-4">
            <ReferenceRecipes />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{REFERENCE_NOTE}</p>
        </Fold>

        {/* Evidence class three: the internal ablation. Deliberately compact and
            secondary: it is an internal control, not the page's headline. */}
        <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Internal ablation
          </p>
          <Fold
            className="mt-1.5"
            level={3}
            title="What the v1.0.0 overlay alone changed"
            summary="JSpark3 against itself with the trunk overlay switched off: single-stream decode up, long prefill down, two internal gates missed."
          >
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            <Rich parts={ABLATION_CONTROL} />
          </p>
          <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
            {ABLATION_READING}
          </p>
          <figure className="mt-4 rounded-lg border border-border bg-card p-3 sm:p-4">
            <OverlayDeltaFigure />
          </figure>
          <div className="mt-4 grid gap-3">
            {ABLATION_NOTES.map((note) => (
              <p
                key={note.tone}
                className={`rounded-r-lg border border-l-[3px] border-border bg-card p-3 text-[13px] leading-relaxed text-muted-foreground ${
                  note.tone === 'good'
                    ? 'border-l-emerald-600 dark:border-l-emerald-400'
                    : 'border-l-rose-600 dark:border-l-rose-400'
                }`}
              >
                <Rich parts={note.body} />
              </p>
            ))}
          </div>
          </Fold>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{EVIDENCE_GRADE}</p>
      </V11Fold>
      <V11Fold id="run" legacyIds={["reproducibility", "js3-reproducibility"]} title="Run v1.1" summary="Get the setup software and model files" lede={RUN_LEDE}>
        <div className="mt-5 grid gap-3.5">
          {RUN_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener"
              className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-[color-mix(in_srgb,var(--accent-color)_50%,hsl(var(--border)))] hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <h3 className="text-[15px] font-semibold">{link.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{link.body}</p>
              <p className={`mt-2.5 break-all font-mono text-[12.5px] underline decoration-border underline-offset-2 transition-colors group-hover:decoration-current ${ACCENT_TEXT}`}>
                {link.cta}
              </p>
            </a>
          ))}
        </div>

        <Fold
          className="mt-8 border-t border-border pt-5"
          level={3}
          title="Checks before the server starts"
          summary="The server will not start with the wrong files, settings, or setup records."
        >
          <p className="text-sm leading-relaxed text-muted-foreground">{REFUSE_LEDE}</p>
          <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
            {REFUSE_CARDS.map((card) => (
              <Card key={card.title} className="p-4">
                <h4 className="text-[15px] font-semibold">{card.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  <Rich parts={card.body} />
                </p>
              </Card>
            ))}
          </div>
        </Fold>
      </V11Fold>
      <V11Fold id="provenance" legacyIds={["js3-provenance"]} title="Download versions" summary="Model and software versions" lede={PROVENANCE_LEDE}>
        <Fold
          className="mt-5 border-t border-border pt-5"
          level={3}
          title="Exact versions and server settings"
          summary={PINNED_INPUTS.map((row) => row.label).join(', ') + '.'}
        >
        <dl className="overflow-hidden rounded-lg border border-border bg-card text-sm">
          {PINNED_INPUTS.map((row, index) => (
            <div
              key={row.label}
              className={`grid gap-1 p-4 ${index > 0 ? 'border-t border-border' : ''}`}
            >
              <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {row.label}
              </dt>
              <dd className="min-w-0 leading-relaxed">
                <Rich parts={row.value} />
              </dd>
            </div>
          ))}
        </dl>
        </Fold>
      </V11Fold>
      <V11Fold id="licensing" legacyIds={["js3-licensing"]} title="Licensing" summary="Three licenses, plainly" lede={LICENSING_LEDE}>
        <div className="mt-5 grid gap-3.5">
          {LICENSES.map((license, index) => (
            <Card
              key={license.name}
              className={`border-l-[3px] p-4 ${
                index === 0
                  ? 'border-l-emerald-600 dark:border-l-emerald-400'
                  : index === 1
                    ? 'border-l-[color:var(--accent-color)]'
                    : 'border-l-amber-600 dark:border-l-amber-400'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {license.kind}
              </p>
              <h3 className="mb-1.5 mt-1 text-lg font-semibold">{license.name}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{license.body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{LICENSING_NOTE}</p>
      </V11Fold>
      <V11Fold id="credits" legacyIds={["js3-credits"]} title="Credits" summary="Built on other people's work">
        <div className="mt-5 space-y-2.5 leading-relaxed">
          <p>{CREDITS_INTRO}</p>
          <p>
            <Rich parts={CREDITS_ROLL} />
          </p>
          <p className="text-sm text-muted-foreground">{CREDITS_NOTE}</p>
        </div>
        <Card className="mt-5 p-4">
          <h3 className="text-[15px] font-semibold">{CITE.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            <Rich parts={CITE.body} />
          </p>
          <pre className="mt-2.5 max-w-full overflow-x-auto rounded-lg border border-border bg-muted p-3 text-[12.5px] leading-relaxed">
            <code className="font-mono">{CITE.citation}</code>
          </pre>
        </Card>
      </V11Fold>
      </div>
      <details id="releases">
        <summary><span>Earlier GLM releases<small>v1.1 Cadence, Sep 7 · v1.0, Sep 2</small></span><span aria-hidden="true">+</span></summary>
        <div className="glm-fold-body">
          <article className="glm-past">
            <h3>v1.1 Cadence <span>Sep 7, 2026</span></h3>
            <p>{HERO.lede}</p>
            <dl className="glm-facts">
              {HERO_FACTS.map((fact) => <div key={fact.value}><dt>{fact.value}</dt><dd>{fact.label}</dd></div>)}
            </dl>
            <p><a href={GLM_COPY.previous.href}>Release v1.1.0 on GitHub ↗</a></p>
          </article>
          <article className="glm-past">
            <h3>v1.0 <span>Sep 2, 2026</span></h3>
            <p>The first public release. The historical comparisons in the v1.1 benchmarks above use its measurements.</p>
            <p><a href="https://github.com/jakejharris/jspark3/releases/tag/v1.0.0">Release v1.0.0 on GitHub ↗</a></p>
          </article>
        </div>
      </details>
    </section>
  );
}
