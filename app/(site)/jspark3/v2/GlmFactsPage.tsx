import React from 'react';
import ClusterIllustration from './ClusterIllustration';
import FoldAnchors from './FoldAnchors';
import LegacyFragments from '../LegacyFragments';
import ProjectHeader from './ProjectHeader';
import { ColdStartChart, CompareFigure, ConcurrencyChart, DecodeChart, Relbench, RelbenchNote, RigmarkBlocks, SetFigure } from './FactsCharts';
import { Fact, FactLink } from './Fact';
import {
  ACCEPTANCE_KINDS, COMPATIBILITY, CONDITIONS, COPY, CREDITS, DEFAULT_DECIDED, DEFAULT_PROVISIONAL, DEFAULT_VARIANT, DRAFT, DRAFTER, DRAFTER_LINK, ENGINE, HISTORY,
  DISK_PARTS, ERRATA, ROLLBACK_COMMANDS, INSTALL_COSTS, INSTALL_COSTS_CONDITIONS, INSTALL_TAG, KNOWN_ISSUES, LICENSES, LINKS, PROFILES_LINE, PROMPT_MIX_LINE, RIGMARK, TEMPLATE_SETTINGS, RIGMARK_SHOWN, RUNNABLE, SETS, SETS_CONDITIONS, SWITCH, SOURCE, VARIANTS_ORDERED, VERSION,
  TILES_LINE, TILE_FIGURES, cell, linkPath, metricInfo, pinned, releaseDate,
  type Slot, type Variant,
} from '../glm-facts';
import { GLM_COPY, LABELS } from '../release-copy';

const NAV = [
  { href: '#results', label: 'Results' },
  { href: '#install', label: 'Install' },
  { href: '#history', label: 'History' },
] as const;

/** Figures shown on their own, beside the charts: one large for the default set, the others beneath it. */
const SINGLE_FIGURES = [
  { metric: 'c8_ttft_p50_s' },
  { metric: 'c8_stall_s.median', worst: 'c8_stall_s.max' },
];

/**
 * The release's tiles, as the hub and the share card show them (glm-facts.ts TILE_FIGURES), and what they were
 * measured with. A figure from other weights names them, keyed in their series color; a concurrency figure carries
 * its condition.
 */
function HeroTiles() {
  return <div className="glm-tiles">
    <dl className="glm-tiles-grid">
      {TILE_FIGURES.map(({ key, label, unit, set, value, weights, caption }) => <div key={key} className="glm-tile" data-metric-id={key} data-tone={weights ? set?.tone : undefined}>
        <dt>{label}</dt>
        <dd className="glm-tile-value"><Fact slot={value.slot} />{unit && value.state !== 'absent' ? <small>{unit}</small> : null}</dd>
        {weights ? <dd className="glm-tile-weights"><Fact slot={weights} /></dd> : null}
        {caption ? <dd className="glm-tile-condition" data-condition-of={key}><Fact slot={caption} /></dd> : null}
      </div>)}
    </dl>
    {TILES_LINE ? <p className="glm-tiles-line"><Fact slot={TILES_LINE} /><Relbench /></p> : null}
  </div>;
}

/** A set of weights as the specs row names it: its label without "weights", in running text after the first. */
function variantName(label: Slot, index: number): Slot {
  if (label.pending) return label;
  const name = label.text.replace(/\s+weights$/i, '');
  return { text: index ? name.charAt(0).toLowerCase() + name.slice(1) : name, pending: false };
}

/** Draft acceptance for each set that runs the draft model. */
function Acceptance() {
  return <>{SETS.filter(set => set.drafter).map(set => <div key={set.id}>
    <dt>Acceptance, <Fact slot={set.label} /></dt>
    <dd>{ACCEPTANCE_KINDS.map(kind => {
      const step = cell(set, `${kind.key}.accepted_per_verify_step`);
      const share = cell(set, `${kind.key}.accepted_over_proposed`);
      if (step.state === 'absent') return null;
      return <span key={kind.key} className="glm2-acceptance">{kind.label ? `${kind.label}: ` : null}<Fact slot={step.slot} /> tokens accepted per verify step{share.state === 'absent' ? null : <>, <Fact slot={share.slot} /> of drafted tokens</>}<Relbench /></span>;
    })}</dd>
  </div>)}</>;
}

/**
 * A command or switch as code, with a trailing explanation in parentheses kept as text; or the pending
 * slot. A sentence that marks its own code with backticks is shown as written.
 */
function Code({ slot }: { slot: Slot }) {
  if (slot.pending || slot.text.includes('`')) return <Fact slot={slot} />;
  const [, command, note] = slot.text.match(/^([\s\S]*?)(?:\s+(\([\s\S]*\)))?$/) ?? [];
  return <><code>{command}</code>{note ? ` ${note}` : null}</>;
}

/** A pinned source: the repository linked at its revision, with the revision shortened beside it. */
function Pinned({ source, url }: { source: Slot; url: Slot }) {
  const { repo, revision } = pinned(source);
  return <><FactLink href={url}><Fact slot={repo} /></FactLink>{revision ? <span className="glm2-rev"> @ <Fact slot={revision} /></span> : null}</>;
}

/** **bold** spans of a source's own Markdown, as strong text. */
function Strong({ text }: { text: string }) {
  return <>{text.split(/\*\*([^*]+)\*\*/).map((part, index) => (index % 2 ? <strong key={index}>{part}</strong> : part))}</>;
}

/** The source's own terms, quoted as its model card writes them: "- " lines as a list, the rest as paragraphs. */
function SourceTerms({ terms }: { terms: Slot }) {
  if (terms.pending) return <p><Fact slot={terms} /></p>;
  const blocks = terms.text.split(/\n{2,}/);
  return <figure className="glm2-terms">
    <figcaption>The source&apos;s terms, quoted from its model card</figcaption>
    <blockquote>
      {blocks.map((block, index) => block.trim().startsWith('- ')
        ? <ul key={index}>{block.split('\n').filter(line => line.trim()).map(line => <li key={line}><Strong text={line.replace(/^\s*-\s+/, '')} /></li>)}</ul>
        : <p key={index}><Strong text={block} /></p>)}
    </blockquote>
  </figure>;
}

/** One set of weights a user can choose at install: its source, license, how to choose it, and what it costs. */
function VariantCard({ item }: { item: Variant }) {
  const isDefault = item === DEFAULT_VARIANT && (DEFAULT_DECIDED || DEFAULT_PROVISIONAL);
  const role = isDefault ? 'Default' : 'Chosen at install';
  return <article className="glm2-variant" data-variant={item.id} data-default={isDefault || undefined}>
    <p className="glm2-variant-kicker">{DEFAULT_DECIDED ? role : <span className="jspark-ph jspark-tbd">{DEFAULT_PROVISIONAL ? `${role} (provisional)` : 'TBD: default or chosen at install'}</span>}</p>
    <h3><Fact slot={item.label} /></h3>
    <p>{[item.description, item.framing].filter((part): part is Slot => part !== null).map((part, index) => <React.Fragment key={index}>{index ? ' ' : ''}<Fact slot={part} />{/[.!?]$/.test(part.text) ? '' : '.'}</React.Fragment>)}</p>
    <dl>
      {item.status ? <div><dt>Status</dt><dd><Fact slot={item.status} /></dd></div> : null}
      <div><dt>Source</dt><dd><Pinned source={item.source} url={item.url} /></dd></div>
      {item.access ? <div><dt>Access</dt><dd><Fact slot={item.access} /></dd></div> : null}
      {item.how ? <div><dt>How you get them</dt><dd><Fact slot={item.how} /></dd></div> : null}
      <div><dt>License</dt><dd><Fact slot={item.license} /></dd></div>
      {item.installSwitch ? <div><dt>Choose it</dt><dd><Code slot={item.installSwitch} /></dd></div> : null}
      {item.download ? <div><dt>Download</dt><dd><Fact slot={item.download} /></dd></div> : null}
      {item.otherInputs ? <div><dt>Also built from</dt><dd><Fact slot={item.otherInputs} /></dd></div> : null}
      {item.conversion ? <div><dt>Conversion</dt><dd><Fact slot={item.conversion} /></dd></div> : null}
      {item.conversionCost ? <div><dt>It takes</dt><dd><Fact slot={item.conversionCost} /></dd></div> : null}
      {item.measuredVsFresh ? <div><dt>Your conversion</dt><dd><Fact slot={item.measuredVsFresh} /></dd></div> : null}
      {item.freshSplit ? <div><dt>Your download</dt><dd><Fact slot={item.freshSplit} /></dd></div> : null}
    </dl>
    {item.responsibility ? <p className="glm2-responsibility"><Fact slot={item.responsibility} /></p> : null}
    {item.terms ? <SourceTerms terms={item.terms} /> : null}
  </article>;
}

/**
 * The current GLM release page. It keeps the GLM page's design (graphite and chassis gold, the
 * three-Spark illustration, the light results band) and renders every number and factual sentence
 * from glm-facts.json. The release before it stays whole at /jspark3/glm/v1.8.4.
 */
export default function GlmFactsPage() {
  const date = releaseDate();
  // The shipped context length: the set's own cell once measured, else the setting the template gives every set.
  const measuredContext = cell(SETS[0], 'max_context_tokens');
  const setting = TEMPLATE_SETTINGS.max_context_tokens;
  const context = measuredContext.state !== 'value' && typeof setting === 'string' ? { state: 'value' as const, slot: { text: setting, pending: false } } : measuredContext;
  return <div className="glm glm2" id="glm-top">
    <a className="glm-skip" href="#results">Skip to results</a>
    <LegacyFragments />
    <FoldAnchors />
    {DRAFT ? <p className="glm2-draft" role="note">Draft from the release facts ({SOURCE.status}, {SOURCE.sha256.slice(0, 12)}). Marked values are not final.</p> : null}
    <div className="glm-shell">
      <ProjectHeader prefix="glm" nav={NAV} />
      <header className="glm-hero">
        <div>
          <p className="glm-kicker">JSPARK3 · {LABELS.latest}</p>
          <h1>
            <span className="glm-sr-only">JSPARK3 </span>
            <span className="glm-version"><Fact slot={VERSION} /></span>
            <span className="glm-sr-only">: </span>
            <span className="glm-lede">GLM-5.3 Flash <br />on three DGX Sparks.</span>
          </h1>
          <HeroTiles />
          <nav className="glm-actions" aria-label="Release resources">
            <FactLink className="glm-button" href={LINKS.install}>{RUNNABLE ? <>Install <Fact slot={INSTALL_TAG} /></> : 'Install guide'} ↗</FactLink>
            <a href="#results">Results ↓</a>
            <FactLink href={LINKS.release}>Release notes ↗</FactLink>
          </nav>
        </div>
        <ClusterIllustration note="One Spark answers requests; all three run the model." />
      </header>
      <dl className="glm-specs glm2-specs">
        <div><dt>Release</dt><dd><Fact slot={VERSION} /> · {date ?? <Fact slot={{ text: 'TBD: release date', pending: true }} />}</dd></div>
        <div><dt>Engine</dt><dd><Fact slot={ENGINE.provenanceStart} /> · replaces <Fact slot={ENGINE.previous} /></dd></div>
        <div><dt>Weights</dt><dd>{VARIANTS_ORDERED.map((item, index) => <React.Fragment key={item.id}>{index ? ' or ' : ''}<Fact slot={variantName(item.label, index)} /></React.Fragment>)}, chosen at install</dd></div>
        <div><dt>Hardware</dt><dd>Three DGX Sparks · one endpoint</dd></div>
        <div><dt>Longest context</dt><dd><Fact slot={context.slot} />{context.state === 'value' ? ' tokens' : null}</dd></div>
      </dl>
    </div>

    <section className="glm-results" id="results" aria-labelledby="results-title">
      <div className="glm-shell">
        <div className="glm-section-heading">
          <h2 id="results-title"><Fact slot={VERSION} />, measured on our three Sparks.</h2>
          <p className="glm-band-line">Every figure names the weights it was measured with, and whether the draft model was on.</p>
          {CONDITIONS.all ? null : <p><Fact slot={SETS_CONDITIONS} /></p>}
        </div>
        {RIGMARK_SHOWN ? <>
          <h3 className="glm2-subhead" id="against-v184"><Fact slot={VERSION} /> against the v1.8.4 baseline</h3>
          {RIGMARK === 'undecided' ? <p className="glm2-decision"><span className="jspark-ph jspark-tbd">Shown only if RigMark is published with this release</span></p> : null}
          <CompareFigure />
          <RigmarkBlocks />
        </> : null}
        <h3 className="glm2-subhead" id="sets">Every measured <Fact slot={VERSION} /> set</h3>
        <div className="glm2-pair">
          <ColdStartChart />
          <ConcurrencyChart />
        </div>
        <div className="glm2-pair">
          <DecodeChart />
          <div className="glm2-figcol">{SINGLE_FIGURES.map(item => <SetFigure key={item.metric} {...item} />)}</div>
        </div>
        <RelbenchNote />
        {CONDITIONS.all
          ? <div className="glm2-method glm2-method-all"><p className="glm-label">How every figure was measured</p><p><Fact slot={CONDITIONS.all} /></p>{CONDITIONS.results ? <p><Fact slot={CONDITIONS.results} /></p> : null}{PROMPT_MIX_LINE ? <p><Fact slot={PROMPT_MIX_LINE} /></p> : null}</div>
          : <dl className="glm2-method">
            <div><dt>Cold first token</dt><dd><Fact slot={CONDITIONS.cold} /></dd></div>
            <div><dt>Decode</dt><dd><Fact slot={CONDITIONS.decode} /></dd></div>
            <div><dt>Requests at once</dt><dd><Fact slot={CONDITIONS.concurrency} /></dd></div>
            <div><dt>Stall</dt><dd><Fact slot={CONDITIONS.stall} /></dd></div>
            <div><dt>Draft acceptance</dt><dd><Fact slot={CONDITIONS.acceptance} /></dd></div>
          </dl>}
        <p className="glm-evidence-link">
          <FactLink href={LINKS.results}>Results file ↗</FactLink>
          {LINKS.measurements ? <FactLink href={LINKS.measurements}>Measurements ↗</FactLink> : null}
          {LINKS.promptMix ? <FactLink href={LINKS.promptMix}>Prompt mix ↗</FactLink> : null}
          <FactLink href={LINKS.release}>Release notes ↗</FactLink>
          <a href="/jspark3/glm/v1.8.4#results">v1.8.4 results ↗</a>
        </p>
      </div>
    </section>

    <section className="glm-shell glm2-section" id="weights" aria-labelledby="weights-title">
      <h2 id="weights-title">Two sets of weights, chosen at install.</h2>
      {VARIANTS_ORDERED.some(item => !item.installSwitch) ? <p className="glm2-switch">Choose with <Code slot={SWITCH.weights} />{PROFILES_LINE ? <>. <Fact slot={PROFILES_LINE} /></> : null}</p> : PROFILES_LINE ? <p className="glm2-switch"><Fact slot={PROFILES_LINE} /></p> : null}
      <div className="glm2-variants">{VARIANTS_ORDERED.map(item => <VariantCard key={item.id} item={item} />)}</div>
    </section>

    <section className="glm-shell glm2-section glm2-split" id="draft-model" aria-labelledby="draft-title">
      <h2 id="draft-title">The draft model and the licenses.</h2>
      <div className="glm2-prose">
        <dl className="glm2-defs">
          <div><dt>Draft model</dt><dd><Pinned source={DRAFTER.source} url={DRAFTER_LINK} /></dd></div>
          <div><dt>Its license</dt><dd><Fact slot={DRAFTER.license} /></dd></div>
          <div><dt>How you get it</dt><dd><Fact slot={DRAFTER.distribution} /></dd></div>
          {SWITCH.drafter ? <div><dt>Run without it</dt><dd><Code slot={SWITCH.drafter} /></dd></div> : null}
          {DRAFTER.commercialPath
            ? <div><dt>Commercial use</dt><dd className="glm2-paras"><p><Fact slot={DRAFTER.commercialPath} /></p>{DRAFTER.commercialContact ? <p><Fact slot={DRAFTER.commercialContact} /></p> : null}</dd></div>
            : <div><dt>{SWITCH.drafter ? 'No-draft mode' : 'Run without it'}</dt><dd><Code slot={DRAFTER.commercial} /></dd></div>}
          <Acceptance />
        </dl>
        <dl className="glm2-defs">
          {LICENSES.map(row => <div key={row.key}><dt>{row.label}</dt><dd><Fact slot={row.value} /></dd></div>)}
        </dl>
        <p><Fact slot={COPY.license} /></p>
        {LINKS.licensing || LINKS.notices ? <p className="glm-evidence-link">
          {LINKS.licensing ? <FactLink href={LINKS.licensing}>Licensing ↗</FactLink> : null}
          {LINKS.notices ? <FactLink href={LINKS.notices}>Third-party notices ↗</FactLink> : null}
        </p> : null}
      </div>
    </section>

    <section className="glm-shell glm2-section glm2-split" id="compatibility" aria-labelledby="compat-title">
      <h2 id="compat-title">What the endpoint supports.</h2>
      <div className="glm2-prose">
        <dl className="glm2-defs">{COMPATIBILITY.map(row => <div key={row.key}><dt>{row.label}</dt><dd><Fact slot={row.value} /></dd></div>)}</dl>
        <p><Fact slot={COPY.security} /></p>
      </div>
    </section>

    <section className="glm-shell glm-install" id="install" aria-labelledby="install-title">
      <div>
        <h2 id="install-title">{RUNNABLE ? <>Run <Fact slot={INSTALL_TAG} /></> : <>The <Fact slot={INSTALL_TAG} /> install guide</>}</h2>
        <p><Fact slot={COPY.installClaim} /></p>
        <dl className="glm2-defs glm2-install-defs">
          <div><dt>Hardware</dt><dd><Fact slot={COPY.hardware} />, <Fact slot={COPY.hardwareLink} /></dd></div>
          <div><dt>Network</dt><dd><Fact slot={COPY.network} /></dd></div>
          <div><dt>Disk per host</dt><dd>{DISK_PARTS.length
            ? <ul className="glm2-disk">{DISK_PARTS.map(part => <li key={part.key}><span className="glm2-cost-label">{part.label}</span> <Fact slot={part.value} /></li>)}</ul>
            : <Fact slot={COPY.disk} />}</dd></div>
          <div><dt>Session cache</dt><dd><Fact slot={COPY.sessions} /></dd></div>
          <div><dt>From v1.8</dt><dd><Fact slot={COPY.upgrade} /></dd></div>
          <div><dt>Reasoning</dt><dd><Fact slot={COPY.upgradeThinking} /></dd></div>
          {COPY.whoShouldStay ? <div><dt>Who should stay on v1.8.4</dt><dd><Fact slot={COPY.whoShouldStay} /></dd></div> : null}
          <div><dt>Rolling back</dt><dd><Fact slot={COPY.rollback} />{ROLLBACK_COMMANDS.map(item => <div key={item.key} className="glm2-command"><p>{item.where}:</p>{item.command.pending ? <Fact slot={item.command} /> : <pre><code>{item.command.text}</code></pre>}</div>)}</dd></div>
        </dl>
        {INSTALL_COSTS.length ? <>
          <h3 className="glm2-subhead" id="install-costs">What each step takes</h3>
          <dl className="glm2-defs glm2-install-defs glm2-costs">
            {INSTALL_COSTS.map(step => <div key={step.label}><dt>{step.label}</dt><dd>{step.parts.map(part => <span key={part.label}><span className="glm2-cost-label">{part.label}</span> <Fact slot={part.value} /></span>)}</dd></div>)}
          </dl>
          {INSTALL_COSTS_CONDITIONS ? <p className="glm2-costs-note"><Fact slot={INSTALL_COSTS_CONDITIONS} /></p> : null}
        </> : null}
      </div>
      <ul className="glm-runlinks">
        <li><FactLink href={LINKS.install}><span>The full install</span><span>{linkPath(LINKS.install, 'docs/INSTALL.md')}</span></FactLink></li>
        {LINKS.upgrade ? <li><FactLink href={LINKS.upgrade}><span>Upgrading and rolling back</span><span>{linkPath(LINKS.upgrade, 'the install guide')}</span></FactLink></li> : null}
        <li><FactLink href={LINKS.source}><span>The recipe on GitHub</span><span>jakejharris/jspark3</span></FactLink></li>
        {LINKS.engine ? <li><FactLink href={LINKS.engine}><span>The engine source</span><span>{linkPath(LINKS.engine, 'engine/')}</span></FactLink></li> : null}
        <li><FactLink href={LINKS.card}><span>Model card on Hugging Face</span><span>jakejharris/jspark3</span></FactLink></li>
      </ul>
    </section>

    <section className="glm-shell glm2-section glm2-split" id="known-issues" aria-labelledby="issues-title">
      <h2 id="issues-title">Known issues.</h2>
      <div>
        <ul className="glm2-list">{KNOWN_ISSUES.map((issue, index) => <li key={index}><Fact slot={issue} /></li>)}</ul>
        {LINKS.limitations ? <p className="glm-evidence-link"><FactLink href={LINKS.limitations}>Every known limitation ↗</FactLink></p> : null}
        {ERRATA ? <div className="glm2-errata"><h3 className="glm2-subhead" id="errata">Errata</h3><p><Fact slot={ERRATA} /></p></div> : null}
      </div>
    </section>

    <section className="glm-shell glm2-section glm2-split" id="built-on" aria-labelledby="built-on-title">
      <h2 id="built-on-title">Built on other people&apos;s work.</h2>
      <ul className="glm2-list glm2-credits">{CREDITS.map((credit, index) => <li key={index}>
        {credit.url ? <FactLink href={credit.url}><Fact slot={credit.name} /></FactLink> : <span><Fact slot={credit.name} /></span>}{credit.role.text ? <span><Fact slot={credit.role} /></span> : null}
      </li>)}</ul>
    </section>

    <section className="glm-shell glm-why" id="why-glm" aria-labelledby="why-title">
      <h2 id="why-title">{GLM_COPY.whyGlmTitle}</h2>
      <div>
        <p>{GLM_COPY.whyGlm}</p>
        <a className="glm-olive" href="/jspark3/deepseek/">{GLM_COPY.whyGlmLink} →</a>
      </div>
    </section>

    <section className="glm-shell glm2-section glm2-split" id="history" aria-labelledby="history-title">
      <h2 id="history-title">Earlier releases.</h2>
      <div className="glm-notes glm2-history">
        {HISTORY.map((item, index) => <p key={index} className="glm-notes-link glm2-history-internal"><span><Fact slot={item.version} /><small><Fact slot={item.note} /></small></span></p>)}
        <a className="glm-notes-link" href="/jspark3/glm/v1.8.4"><span>v1.8.4<small>On vLLM · its page, results and install, kept as published</small></span><span aria-hidden="true">↗</span></a>
        <a className="glm-notes-link" href="/jspark3/glm/v1.8.4#v180-results"><span>v1.8.0<small>Results, kept as published</small></span><span aria-hidden="true">↗</span></a>
        <a className="glm-notes-link" href="/jspark3/glm/v1.8.4#releases"><span>v1.1 Cadence and v1.0<small>The first releases, their benchmarks and the first community run</small></span><span aria-hidden="true">↗</span></a>
        <a className="glm-notes-link" href="/jspark3/deepseek/"><span>Tempo<small>A named release: the DeepSeek experiment, with its own recipe versions</small></span><span aria-hidden="true">↗</span></a>
      </div>
    </section>
    <footer className="glm-shell glm-footer"><a href="/jspark3/">← All JSPARK3 releases</a><a href="/about/">Jake Harris ↗</a></footer>
  </div>;
}
