'use client';

// A two-column ledger of what the orchestrator agent may and may not do,
// condensed from the actual rule file that governs it (identity.md in the
// agent's workspace). Static on purpose. The rule is the point, not motion.

const ALLOWED: string[] = [
  'Plans, Contracts, Impl Prompts',
  'Branches, Worktrees, Git and PR Ops',
  'Memory Writes',
  'Predeclared Smoke Commands',
  'Status Updates to Me',
];

const FORBIDDEN: string[] = [
  'Editing Source Code',
  'Ad Hoc curl, DB Queries, Log Pulls',
  'Reading File After File to Chase a Bug',
  'A Second Experimental Command After a Smoke Fails',
];

const lineColor = 'color-mix(in srgb, hsl(var(--foreground)) 14%, transparent)';
const faintText = 'color-mix(in srgb, hsl(var(--foreground)) 55%, transparent)';
const dimText = 'color-mix(in srgb, hsl(var(--foreground)) 78%, transparent)';

const accentText = 'var(--accent-color)';
const accentMarker = 'color-mix(in srgb, var(--accent-color) 70%, transparent)';

function Column({
  heading,
  marker,
  items,
  accent,
}: {
  heading: string;
  marker: string;
  items: string[];
  accent?: boolean;
}) {
  return (
    <div className="p-5">
      <h4
        className="text-[11px] uppercase tracking-[0.15em] mb-3"
        style={{ color: accent ? accentText : faintText }}
      >
        {heading}
      </h4>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-[13px] leading-snug">
            <span
              aria-hidden="true"
              className="select-none"
              style={{ color: accent ? accentMarker : faintText }}
            >
              {marker}
            </span>
            <span style={{ color: dimText }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RuleLedger() {
  return (
    <div
      className="rounded-lg border font-mono"
      style={{ borderColor: lineColor }}
      aria-label="Ledger of allowed and forbidden work for the orchestrator agent, from its rule file"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <Column heading="Allowed" marker="+" items={ALLOWED} accent />
        <div
          className="border-t sm:border-t-0 sm:border-l"
          style={{ borderColor: lineColor }}
        >
          <Column heading="Forbidden" marker="&times;" items={FORBIDDEN} />
        </div>
      </div>
      <div
        className="border-t px-5 py-2.5 text-[11px]"
        style={{ borderColor: lineColor, color: faintText }}
      >
        from .claude/rules/identity.md, the file the agent reads every session
      </div>
    </div>
  );
}
