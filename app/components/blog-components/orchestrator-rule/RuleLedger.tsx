'use client';

// A two-column ledger of what the orchestrator agent may and may not do,
// condensed from the actual rule file that governs it (identity.md in the
// agent's workspace). Static on purpose. The rule is the point, not motion.

const ALLOWED: string[] = [
  'plans, contracts, impl prompts',
  'branches, worktrees, git and PR ops',
  'memory writes',
  'predeclared smoke commands',
  'status updates to me',
];

const FORBIDDEN: string[] = [
  'editing source code',
  'ad hoc curl, DB queries, log pulls',
  'reading file after file to chase a bug',
  'a second experimental command after a smoke fails',
];

const lineColor = 'color-mix(in srgb, hsl(var(--foreground)) 14%, transparent)';
const faintText = 'color-mix(in srgb, hsl(var(--foreground)) 55%, transparent)';
const dimText = 'color-mix(in srgb, hsl(var(--foreground)) 78%, transparent)';

function Column({
  heading,
  marker,
  items,
}: {
  heading: string;
  marker: string;
  items: string[];
}) {
  return (
    <div className="p-5">
      <h4
        className="text-[11px] uppercase tracking-[0.15em] mb-3"
        style={{ color: faintText }}
      >
        {heading}
      </h4>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-[13px] leading-snug">
            <span aria-hidden="true" className="select-none" style={{ color: faintText }}>
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
        <Column heading="Allowed" marker="+" items={ALLOWED} />
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
