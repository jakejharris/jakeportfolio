import type { Metadata } from 'next';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import PageLayout from '@/app/components/PageLayout';
import '@/app/css/animations.css';
import ArchitectureDiagram from './ArchitectureDiagram';
import Fold from './Fold';
import { AuthorBenchmarks, SameTaskComparison, ScreenComparison } from './ComparisonFigures';
import JSpark3Mark from './JSpark3Mark';
import OverlayDeltaFigure from './OverlayDeltaFigure';
import ReferenceRecipes from './ReferenceRecipes';
import Rich from './Rich';
import SectionNav from './SectionNav';
import {
  ABLATION_CONTROL,
  ABLATION_NOTES,
  ABLATION_READING,
  ARCHITECTURE_CAPTION,
  BENCHMARK_FACTS,
  BENCHMARK_FACTS_CONDITION,
  BENCHMARKS_LEDE,
  ARCHITECTURE_CARDS,
  ARCHITECTURE_LEDE,
  BLOCK_FOOTER,
  CITE,
  CREDITS_INTRO,
  CREDITS_NOTE,
  CREDITS_ROLL,
  EVIDENCE_GRADE,
  EVIDENCE_LEDE,
  HERO,
  HERO_FACTS,
  HERO_LINKS,
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
} from './content';

const DESCRIPTION =
  'One GLM-5.3 Flash endpoint across three NVIDIA DGX Sparks, pinned to the byte and measured in the open.';
const SOCIAL_IMAGE = '/og/jspark3.png';

export const metadata: Metadata = {
  title: 'JSpark3',
  description: DESCRIPTION,
  alternates: {
    canonical: 'https://jakejh.com/jspark3/',
  },
  openGraph: {
    title: 'JSpark3',
    description: DESCRIPTION,
    type: 'website',
    url: 'https://jakejh.com/jspark3/',
    images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JSpark3',
    description: DESCRIPTION,
    site: '@jakeharrisdev',
    creator: '@jakeharrisdev',
    images: [SOCIAL_IMAGE],
  },
};

/** The accent token, so the page follows the reader's chosen accent in both themes. */
const ACCENT_TEXT = 'text-[color:var(--accent-color)]';

function Section({
  id,
  legacyIds,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string;
  legacyIds: ReadonlyArray<string>;
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 border-t border-border pt-8 md:pt-10">
      {/* Earlier anchor ids for this section, kept so inbound links still land. */}
      {legacyIds.map((legacyId) => (
        <span key={legacyId} id={legacyId} aria-hidden="true" className="block scroll-mt-32" />
      ))}
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${ACCENT_TEXT}`}>{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      {lede ? <p className="mt-3 leading-relaxed text-muted-foreground">{lede}</p> : null}
      {children}
    </section>
  );
}

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

export default function JSpark3Page() {
  return (
    <PageLayout>
      <header className="page-enter pt-6 md:pt-10">
        <div className="flex items-center gap-3">
          <JSpark3Mark className={`h-8 w-8 shrink-0 md:h-10 md:w-10 ${ACCENT_TEXT}`} />
          <h1
            className="text-5xl font-bold leading-[0.95] tracking-[-0.01em] md:text-6xl"
            style={{ fontFamily: 'var(--font-wordmark-stack)' }}
          >
            {HERO.title}
          </h1>
        </div>
        <p className="mt-5 text-xl font-medium leading-snug md:text-2xl">{HERO.tagline}</p>
        <p className="mt-4 leading-relaxed text-muted-foreground">{HERO.lede}</p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {HERO_LINKS.map((link) => (
            <Button
              key={link.href}
              asChild
              variant={link.primary ? 'default' : 'outline'}
              className="h-auto whitespace-normal px-4 py-2.5 text-left"
            >
              <a href={link.href} target="_blank" rel="noopener">
                {link.label}
              </a>
            </Button>
          ))}
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {HERO_FACTS.map((fact) => (
            <div key={fact.value} className="bg-card p-3.5 sm:p-4">
              <dt className="text-[22px] font-bold leading-[1.1] tabular-nums sm:text-[26px]">
                {fact.value}
              </dt>
              <dd className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </header>

      <SectionNav />

      <div className="mt-8 space-y-8 md:mt-10 md:space-y-10">
        {/* ----------------------------------------------------- architecture --- */}
        <Section
          id="architecture"
          legacyIds={["js3-architecture"]}
          eyebrow="Architecture"
          title="How three Sparks become one endpoint"
          lede={ARCHITECTURE_LEDE}
        >
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
        </Section>

        {/* ------------------------------------------------------- benchmarks --- */}
        <Section
          id="benchmarks"
          legacyIds={["evidence", "js3-evidence"]}
          eyebrow="Benchmarks"
          title="The numbers, then the comparisons"
          lede={BENCHMARKS_LEDE}
        >
          {/* The absolute story: four measurements of the release build with nothing
              else in the frame. The hero facts carry the comparisons. */}
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
            title="Compared with what you could already get"
            note="Every row names its node count. The hero figures come from these tables."
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
            summary="Four recipes as their authors reported them: node count, lane, context, decode and basis. Context, not a ranking."
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
              title="What the overlay alone changed"
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
        </Section>

        {/* ----------------------------------------------------------- run it --- */}
        <Section
          id="run"
          legacyIds={["reproducibility", "js3-reproducibility"]}
          eyebrow="Run it yourself"
          title="Get the recipe and the weights"
          lede={RUN_LEDE}
        >
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
            title="It refuses to drift"
            summary="Unpinned inputs, a changed environment, a mismatched identity or drifted bytes, and it does not start."
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
        </Section>

        {/* ------------------------------------------------------- provenance --- */}
        <Section
          id="provenance"
          legacyIds={["js3-provenance"]}
          eyebrow="Provenance"
          title="Pinned inputs"
          lede={PROVENANCE_LEDE}
        >
          <Fold
            className="mt-5 border-t border-border pt-5"
            level={3}
            title="What is pinned, and to what"
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
        </Section>

        {/* -------------------------------------------------------- licensing --- */}
        <Section
          id="licensing"
          legacyIds={["js3-licensing"]}
          eyebrow="Licensing"
          title="Three licenses, plainly"
          lede={LICENSING_LEDE}
        >
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
        </Section>

        {/* ---------------------------------------------------------- credits --- */}
        <Section id="credits" legacyIds={["js3-credits"]} eyebrow="Credits" title="Built on other people's work">
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
        </Section>
      </div>

      <div className="mt-10 flex flex-col gap-y-1.5 border-t border-border pt-5 text-[13px] text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-between sm:gap-x-6">
        {BLOCK_FOOTER.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    </PageLayout>
  );
}
