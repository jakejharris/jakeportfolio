import type { Metadata } from 'next';
import { badgeVariants } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { cn } from '@/app/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import '@/app/css/animations.css';
import ArchitectureDiagram from './ArchitectureDiagram';
import { SameTaskComparison, ScreenComparison } from './ComparisonFigures';
import OverlayDeltaFigure from './OverlayDeltaFigure';
import Rich from './Rich';
import SectionNav from './SectionNav';
import {
  ABLATION_CONTROL,
  ABLATION_NOTES,
  ABLATION_READING,
  ARCHITECTURE_CAPTION,
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
  INSTALL_COMMANDS,
  INSTALL_NOTE,
  LICENSES,
  LICENSING_LEDE,
  LICENSING_NOTE,
  LOCAL_RUNS,
  LOCAL_RUNS_METHOD,
  NOT_YET_LIVE,
  PINNED_INPUTS,
  PROVENANCE_LEDE,
  REFERENCE_NOTE,
  REFERENCE_ROWS,
  REFERENCE_SCROLL_HINT,
  REFUSE_CARDS,
  REPRODUCIBILITY_LEDE,
  SCOPE_IS,
  SCOPE_IS_NOT,
} from './content';

const DESCRIPTION =
  'One GLM-5.3 Flash endpoint across three NVIDIA DGX Sparks, pinned to the byte and measured in the open.';

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
  },
  twitter: {
    card: 'summary',
    title: 'JSpark3',
    description: DESCRIPTION,
    site: '@jakeharrisdev',
    creator: '@jakeharrisdev',
  },
};

/** The accent token, so the page follows the reader's chosen accent in both themes. */
const ACCENT_TEXT = 'text-[color:var(--accent-color)]';
const OURS_TINT =
  'bg-[color-mix(in_srgb,var(--accent-color)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent-color)_16%,transparent)]';

function JSpark3Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <path
        d="M20 6 L34 31 L6 31 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="6" r="4.2" fill="currentColor" />
      <circle cx="34" cy="31" r="4.2" fill="currentColor" />
      <circle cx="6" cy="31" r="4.2" fill="currentColor" />
    </svg>
  );
}

function Section({
  id,
  legacyId,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string;
  legacyId: string;
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 border-t border-border pt-10 md:pt-14">
      {/* The site block published these anchor ids; keep them working for inbound links. */}
      <span id={legacyId} aria-hidden="true" className="block scroll-mt-32" />
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${ACCENT_TEXT}`}>{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      {lede ? (
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{lede}</p>
      ) : null}
      {children}
    </section>
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

function ScopeCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: ReadonlyArray<string>;
  tone: 'is' | 'isnot';
}) {
  return (
    <Card className="p-5 md:p-6">
      <h3 className="flex items-center gap-2.5 text-lg font-semibold">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            tone === 'is' ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-600 dark:bg-rose-400'
          }`}
        />
        {title}
      </h3>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed marker:text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}

export default function JSpark3Page() {
  return (
    <div className="min-h-[calc(100vh-4rem)] pb-8 pt-6 transition-all duration-200">
      {/* Wider than the site's max-w-2xl reading column: the reference table and the
          architecture diagram are the point of the page and need the measure. */}
      <div className="mx-auto w-full max-w-5xl px-4">
        <header className="page-enter pt-10 md:pt-14">
          <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${ACCENT_TEXT}`}>
            {HERO.eyebrow}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <JSpark3Mark className={`h-8 w-8 shrink-0 md:h-10 md:w-10 ${ACCENT_TEXT}`} />
            <h1
              className="text-5xl font-bold leading-[0.95] tracking-[-0.01em] md:text-6xl"
              style={{ fontFamily: 'var(--font-wordmark), ui-serif, Georgia, serif' }}
            >
              {HERO.title}
            </h1>
          </div>
          <p className="mt-5 max-w-3xl text-xl font-medium leading-snug md:text-2xl">
            {HERO.tagline}
          </p>
          <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{HERO.lede}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {HERO_LINKS.map((link) => (
              <Button
                key={link.href}
                asChild
                variant={link.primary ? 'default' : 'outline'}
                className="h-auto whitespace-normal px-4 py-2.5 text-left"
              >
                <a href={link.href} target="_blank" rel="noopener">
                  <span className="flex flex-wrap items-center gap-2">
                    {link.label}
                    <span
                      className={cn(
                        badgeVariants({ variant: 'outline' }),
                        'rounded-full border px-1.5 py-0 text-[10px] font-bold uppercase leading-[1.4] tracking-[0.08em]',
                        link.primary
                          ? 'border-current bg-transparent text-primary-foreground opacity-90'
                          : 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      )}
                    >
                      {NOT_YET_LIVE}
                    </span>
                  </span>
                </a>
              </Button>
            ))}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
            {HERO_FACTS.map((fact) => (
              <div key={fact.value} className="bg-card p-4">
                <dt className="text-[22px] font-bold leading-[1.1] tabular-nums md:text-3xl">
                  {fact.value}
                </dt>
                <dd className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
                  {fact.label}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <SectionNav />

        <div className="mt-10 space-y-10 md:mt-14 md:space-y-14">
          {/* ------------------------------------------------------------ scope --- */}
          <Section id="scope" legacyId="js3-scope" eyebrow="Scope" title="What it is, and what it is not">
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ScopeCard title="It is" items={SCOPE_IS} tone="is" />
              <ScopeCard title="It is not" items={SCOPE_IS_NOT} tone="isnot" />
            </div>
          </Section>

          {/* ----------------------------------------------------- architecture --- */}
          <Section
            id="architecture"
            legacyId="js3-architecture"
            eyebrow="Architecture"
            title="How three Sparks become one endpoint"
            lede={ARCHITECTURE_LEDE}
          >
            <figure className="mt-6">
              <div className="overflow-x-auto rounded-lg border border-border bg-card p-2.5">
                <ArchitectureDiagram />
              </div>
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
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {ARCHITECTURE_CARDS.map((card) => (
                <Card key={card.title} className="p-4">
                  <h3 className="text-[15px] font-semibold">{card.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                </Card>
              ))}
            </div>
          </Section>

          {/* --------------------------------------------------------- evidence --- */}
          <Section
            id="evidence"
            legacyId="js3-evidence"
            eyebrow="Evidence"
            title="Measured, and compared with what you could already get"
          >
            {/* Headline: the same frozen screen on this fleet, three Sparks against two,
                then the same agent prompt across all four builds. */}
            <div className="mt-6 space-y-4">
              <ScreenComparison />
              <SameTaskComparison />
            </div>

            {/* Evidence class two: local runs, the detail behind the same-task figure. */}
            <h3 className="mt-10 text-lg font-semibold md:text-xl">
              Local runs of published recipes
            </h3>
            <p className="mt-2 max-w-[82ch] text-sm leading-relaxed text-muted-foreground">
              {LOCAL_RUNS_METHOD}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

            {/* Evidence class one: the published reference table, author-reported. */}
            <h3 className="mt-10 text-lg font-semibold md:text-xl">Published reference recipes</h3>
            <p className="mt-2 max-w-[82ch] text-sm leading-relaxed text-muted-foreground">
              {EVIDENCE_LEDE}
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
              <Table className="min-w-[980px] text-[13.5px] tabular-nums">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[11%] px-3.5 py-2.5 text-xs uppercase tracking-[0.05em]">
                      Recipe
                    </TableHead>
                    <TableHead className="w-[7%] px-3.5 py-2.5 text-center text-xs uppercase tracking-[0.05em]">
                      Sparks
                    </TableHead>
                    <TableHead className="w-[24%] px-3.5 py-2.5 text-xs uppercase tracking-[0.05em]">
                      Lane
                    </TableHead>
                    <TableHead className="w-[9%] px-3.5 py-2.5 text-xs uppercase tracking-[0.05em]">
                      Context
                    </TableHead>
                    <TableHead className="w-[25%] px-3.5 py-2.5 text-xs uppercase tracking-[0.05em]">
                      Single-stream decode, tok/s
                    </TableHead>
                    <TableHead className="w-[24%] px-3.5 py-2.5 text-xs uppercase tracking-[0.05em]">
                      Basis
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {REFERENCE_ROWS.map((row) => (
                    <TableRow key={row.recipe} className={row.ours ? OURS_TINT : undefined}>
                      <TableCell
                        className={`whitespace-nowrap px-3.5 py-2.5 align-top leading-[1.45] ${
                          row.ours
                            ? 'border-l-2 border-l-[color:var(--accent-color)] font-semibold'
                            : ''
                        }`}
                      >
                        {row.recipe}
                      </TableCell>
                      <TableCell className="px-3.5 py-2.5 text-center align-top text-base font-semibold leading-[1.45]">
                        {row.sparks}
                      </TableCell>
                      <TableCell className="px-3.5 py-2.5 align-top leading-[1.45]">
                        {row.lane}
                      </TableCell>
                      <TableCell className="px-3.5 py-2.5 align-top leading-[1.45]">
                        {row.context}
                      </TableCell>
                      <TableCell className="px-3.5 py-2.5 align-top leading-[1.45]">
                        {typeof row.decode === 'string'
                          ? row.decode
                          : row.decode.map((part, index) => (
                              <span key={part.label}>
                                {index > 0 ? ' · ' : ''}
                                {part.label}{' '}
                                <strong className="font-semibold">{part.value}</strong>
                              </span>
                            ))}
                      </TableCell>
                      <TableCell className="px-3.5 py-2.5 align-top leading-[1.45] text-muted-foreground">
                        {row.basis}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground min-[560px]:hidden">
              {REFERENCE_SCROLL_HINT}
            </p>
            <p className="mt-2.5 max-w-3xl text-sm text-muted-foreground">{REFERENCE_NOTE}</p>

            {/* Evidence class three: the internal ablation. Deliberately compact and
                secondary: it is an internal control, not the page's headline. */}
            <div className="mt-10 max-w-3xl rounded-lg border border-border bg-muted/30 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Internal ablation
              </p>
              <h3 className="mt-1 text-base font-semibold">What the overlay alone changed</h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
                <Rich parts={ABLATION_CONTROL} />
              </p>
              <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
                {ABLATION_READING}
              </p>
              <figure className="mt-4 rounded-lg border border-border bg-card p-4">
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
            </div>

            <p className="mt-4 max-w-[80ch] text-sm text-muted-foreground">{EVIDENCE_GRADE}</p>
          </Section>

          {/* -------------------------------------------------- reproducibility --- */}
          <Section
            id="reproducibility"
            legacyId="js3-reproducibility"
            eyebrow="Reproducibility"
            title="It refuses to drift"
            lede={REPRODUCIBILITY_LEDE}
          >
            <div className="mt-6 grid gap-3.5 md:grid-cols-2">
              {REFUSE_CARDS.map((card) => (
                <Card key={card.title} className="p-4">
                  <h3 className="text-[15px] font-semibold">{card.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    <Rich parts={card.body} />
                  </p>
                </Card>
              ))}
            </div>
            <pre className="mt-5 overflow-x-auto rounded-lg border border-border bg-muted p-4 text-[13px] leading-relaxed">
              <code className="font-mono">{INSTALL_COMMANDS}</code>
            </pre>
            <p className="mt-2.5 max-w-3xl text-sm text-muted-foreground">
              <Rich parts={INSTALL_NOTE} />
            </p>
          </Section>

          {/* ------------------------------------------------------- provenance --- */}
          <Section
            id="provenance"
            legacyId="js3-provenance"
            eyebrow="Provenance"
            title="Pinned inputs"
            lede={PROVENANCE_LEDE}
          >
            <dl className="mt-6 overflow-hidden rounded-lg border border-border bg-card text-sm">
              {PINNED_INPUTS.map((row, index) => (
                <div
                  key={row.label}
                  className={`grid gap-1 p-4 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4 ${
                    index > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="leading-relaxed">
                    <Rich parts={row.value} />
                  </dd>
                </div>
              ))}
            </dl>
          </Section>

          {/* -------------------------------------------------------- licensing --- */}
          <Section
            id="licensing"
            legacyId="js3-licensing"
            eyebrow="Licensing"
            title="Three licenses, plainly"
            lede={LICENSING_LEDE}
          >
            <div className="mt-6 grid gap-3.5 lg:grid-cols-3">
              {LICENSES.map((license, index) => (
                <Card
                  key={license.name}
                  className={`border-t-[3px] p-4 ${
                    index === 0
                      ? 'border-t-emerald-600 dark:border-t-emerald-400'
                      : index === 1
                        ? 'border-t-[color:var(--accent-color)]'
                        : 'border-t-amber-600 dark:border-t-amber-400'
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
            <p className="mt-4 max-w-[80ch] text-sm text-muted-foreground">{LICENSING_NOTE}</p>
          </Section>

          {/* ---------------------------------------------------------- credits --- */}
          <Section
            id="credits"
            legacyId="js3-credits"
            eyebrow="Credits"
            title="Built on other people's work"
          >
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
              <div className="space-y-2.5 leading-relaxed">
                <p>{CREDITS_INTRO}</p>
                <p>
                  <Rich parts={CREDITS_ROLL} />
                </p>
                <p className="text-sm text-muted-foreground">{CREDITS_NOTE}</p>
              </div>
              <Card className="p-4">
                <h3 className="text-[15px] font-semibold">{CITE.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  <Rich parts={CITE.body} />
                </p>
                <pre className="mt-2.5 overflow-x-auto rounded-lg border border-border bg-muted p-3 text-[12.5px] leading-relaxed">
                  <code className="font-mono">{CITE.citation}</code>
                </pre>
              </Card>
            </div>
          </Section>
        </div>

        <div className="mt-12 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-border pt-6 text-[13px] text-muted-foreground">
          {BLOCK_FOOTER.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
