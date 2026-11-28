// Figure blocks for post content. Each one carries its own structured data,
// so any post can place one between paragraphs and fill it in Studio. The
// checks are the same ones the page uses to draw them (app/lib/post-figures).
import {
  checkClockSpan,
  checkOverlap,
  checkScale,
  checkTimelineLanes,
  safeHref,
} from '../app/lib/post-figures';

type Rule = any;

const asRule = (check: true | string) => check;

const webUrl = (Rule: Rule) =>
  Rule.custom((url?: string) => (!url || safeHref(url) ? true : 'Use a full http or https link.'));

/** Title, label and caption, shared by every figure block. */
const frameFields = (labelHint: string) => [
  {
    name: 'title',
    title: 'Title',
    type: 'string',
    description: 'Short monospace title, top left of the card, in Title Case.',
    validation: (Rule: Rule) => Rule.max(60),
  },
  {
    name: 'label',
    title: 'Label',
    type: 'string',
    description: `Unit or context, top right of the card, in Title Case. ${labelHint}`,
    validation: (Rule: Rule) => Rule.max(40),
  },
  {
    name: 'caption',
    title: 'Caption',
    type: 'text',
    rows: 2,
    description: 'Shown below the card. Say what to notice.',
    validation: (Rule: Rule) => Rule.max(300),
  },
];

const sourceFields = [
  {
    name: 'sourceTitle',
    title: 'Source title',
    type: 'string',
    description: 'Optional source line inside the card, under the chart.',
  },
  {
    name: 'sourceUrl',
    title: 'Source link',
    type: 'url',
    hidden: ({ parent }: { parent?: { sourceTitle?: string } }) => !parent?.sourceTitle,
    validation: webUrl,
  },
  {
    name: 'sourceDetail',
    title: 'Source detail',
    type: 'string',
    description: 'Optional plain text after the source title, e.g. what was tested.',
    validation: (Rule: Rule) => Rule.max(200),
  },
];

const clockField = (name: string, title: string, description: string) => ({
  name,
  title,
  type: 'string',
  description,
  placeholder: '13:05',
});

export const timeline = {
  name: 'timeline',
  type: 'object',
  title: 'Timeline',
  description: 'Moments on a real clock, in lanes, with labelled gaps. Shows as a time strip and a list.',
  fields: [
    ...frameFields('For example the day and time zone.'),
    {
      name: 'lanes',
      title: 'Lanes',
      type: 'array',
      of: [
        {
          type: 'string',
          validation: (Rule: Rule) =>
            Rule.custom((name: unknown) => (typeof name === 'string' && name.trim() ? true : 'Lane names cannot be empty.')),
        },
      ],
      description: 'One to three rows, in order, in Title Case, e.g. "Kitchen" and "Dining Room". The first lane takes the accent color.',
      validation: (Rule: Rule) => Rule.required().min(1).max(3).unique(),
    },
    {
      name: 'events',
      title: 'Events',
      type: 'array',
      description: 'A point (start only) or a span (start and end), on a 24-hour clock, within one day.',
      of: [
        {
          type: 'object',
          name: 'timelineEvent',
          title: 'Event',
          fields: [
            { ...clockField('start', 'Start', '24-hour time, e.g. 07:30.'), validation: (Rule: Rule) => Rule.required() },
            clockField('end', 'End', 'Only for a span. Later than start, same day.'),
            {
              name: 'lane',
              title: 'Lane',
              type: 'string',
              description: 'Exactly one of the lane names above.',
              validation: (Rule: Rule) => Rule.required(),
            },
            {
              name: 'text',
              title: 'What happened',
              type: 'string',
              description: 'A short label in Title Case. A quote stays as it was said.',
              validation: (Rule: Rule) => Rule.required().max(120),
            },
            {
              name: 'timeLabel',
              title: 'Time shown',
              type: 'string',
              description: 'Optional. Replaces the time printed in the list, e.g. "all afternoon".',
            },
          ],
          validation: (Rule: Rule) => Rule.custom((event: any) => asRule(checkClockSpan(event))),
          preview: {
            select: { start: 'start', end: 'end', lane: 'lane', text: 'text' },
            prepare({ start, end, lane, text }: Record<string, string | undefined>) {
              return { title: text || 'Event', subtitle: `${start ?? '?'}${end ? ` to ${end}` : ''} · ${lane ?? 'no lane'}` };
            },
          },
        },
      ],
      validation: (Rule: Rule) =>
        Rule.required()
          .min(1)
          .max(30)
          .custom((events: any[] | undefined, context: any) => asRule(checkTimelineLanes(context.parent?.lanes, events))),
    },
    {
      name: 'gaps',
      title: 'Gaps',
      type: 'array',
      description: 'Stretches to mark across every lane, in Title Case, e.g. "Closed for Lunch".',
      of: [
        {
          type: 'object',
          name: 'timelineGap',
          title: 'Gap',
          fields: [
            { ...clockField('start', 'Start', '24-hour time.'), validation: (Rule: Rule) => Rule.required() },
            { ...clockField('end', 'End', '24-hour time, later than start.'), validation: (Rule: Rule) => Rule.required() },
            { name: 'label', title: 'Label', type: 'string', validation: (Rule: Rule) => Rule.required().max(30) },
          ],
          validation: (Rule: Rule) => Rule.custom((gap: any) => asRule(checkClockSpan(gap, true))),
          preview: {
            select: { start: 'start', end: 'end', label: 'label' },
            prepare({ start, end, label }: Record<string, string | undefined>) {
              return { title: label || 'Gap', subtitle: `${start ?? '?'} to ${end ?? '?'}` };
            },
          },
        },
      ],
      validation: (Rule: Rule) => Rule.max(3),
    },
    ...sourceFields,
  ],
  preview: {
    select: { title: 'title', label: 'label', events: 'events' },
    prepare({ title, label, events }: { title?: string; label?: string; events?: unknown[] }) {
      return {
        title: `Timeline: ${title || 'Untitled'}`,
        subtitle: [label, `${events?.length ?? 0} events`].filter(Boolean).join(' · '),
      };
    },
  },
};

export const statGrid = {
  name: 'statGrid',
  type: 'object',
  title: 'Stat grid',
  description: 'Two to six big numbers, each with a short label.',
  fields: [
    ...frameFields(''),
    {
      name: 'stats',
      title: 'Numbers',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'statItem',
          title: 'Number',
          fields: [
            {
              name: 'value',
              title: 'Figure',
              type: 'string',
              description: 'The big part, kept short: "40", "2.5", "3x". Put words in Unit.',
              validation: (Rule: Rule) => Rule.required().max(12),
            },
            {
              name: 'unit',
              title: 'Unit',
              type: 'string',
              description: 'Optional words after the figure, in the accent color and Title Case: "Boats", "a Week", "of 90".',
              validation: (Rule: Rule) => Rule.max(20),
            },
            {
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'What the number counts, short and in Title Case.',
              validation: (Rule: Rule) => Rule.required().max(80),
            },
            {
              name: 'detail',
              title: 'Detail',
              type: 'text',
              rows: 2,
              description: 'Optional sentence under the label that explains the number.',
              validation: (Rule: Rule) => Rule.max(300),
            },
            {
              name: 'note',
              title: 'Note',
              type: 'string',
              description: 'Optional small print, e.g. a breakdown.',
              validation: (Rule: Rule) => Rule.max(120),
            },
            { name: 'sourceTitle', title: 'Source title', type: 'string' },
            {
              name: 'sourceUrl',
              title: 'Source link',
              type: 'url',
              hidden: ({ parent }: { parent?: { sourceTitle?: string } }) => !parent?.sourceTitle,
              validation: webUrl,
            },
          ],
          preview: {
            select: { value: 'value', unit: 'unit', label: 'label' },
            prepare({ value, unit, label }: Record<string, string | undefined>) {
              return { title: [value, unit].filter(Boolean).join(' '), subtitle: label };
            },
          },
        },
      ],
      validation: (Rule: Rule) => Rule.required().min(2).max(6),
    },
    ...sourceFields,
  ],
  preview: {
    select: { title: 'title', stats: 'stats' },
    prepare({ title, stats }: { title?: string; stats?: Array<{ value?: string; unit?: string }> }) {
      return {
        title: `Stats: ${title || 'Untitled'}`,
        subtitle: (stats ?? []).map((s) => [s.value, s.unit].filter(Boolean).join(' ')).join(' · '),
      };
    },
  },
};

export const studyCards = {
  name: 'studyCards',
  type: 'object',
  title: 'Study cards',
  description: 'One to four research cards. Tag an early study "Then" and recent work "Now" to pair them.',
  fields: [
    ...frameFields(''),
    {
      name: 'cards',
      title: 'Studies',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'studyCard',
          title: 'Study',
          fields: [
            {
              name: 'era',
              title: 'Then or Now',
              type: 'string',
              options: { list: [{ title: 'Then', value: 'then' }, { title: 'Now', value: 'now' }], layout: 'radio', direction: 'horizontal' },
              description: 'Optional tag, shown in Title Case as "Then" or "Now". "Now" takes the accent color.',
            },
            {
              name: 'date',
              title: 'When',
              type: 'string',
              description: 'As precise as the source: "1998", "June 2024".',
              validation: (Rule: Rule) => Rule.required().max(24),
            },
            { name: 'authors', title: 'Authors or publisher', type: 'string', description: 'e.g. "Smith et al." or a lab name.' },
            { name: 'studyTitle', title: 'Study title', type: 'string', validation: (Rule: Rule) => Rule.required() },
            { name: 'venue', title: 'Venue', type: 'string', description: 'e.g. "ICML 2025", "preprint". Shown after the title in the source line.' },
            { name: 'url', title: 'Link', type: 'url', validation: webUrl },
            {
              name: 'stat',
              title: 'Big number',
              type: 'string',
              description: 'Optional headline figure in Title Case, e.g. "About a Third" or "40% vs. 25%".',
              validation: (Rule: Rule) => Rule.max(28),
            },
            {
              name: 'statLabel',
              title: 'Big number label',
              type: 'string',
              hidden: ({ parent }: { parent?: { stat?: string } }) => !parent?.stat,
              validation: (Rule: Rule) => Rule.max(60),
            },
            {
              name: 'finding',
              title: 'Finding',
              type: 'text',
              rows: 3,
              description: 'What it found, in one to three sentences. May quote the source.',
              validation: (Rule: Rule) => Rule.required().max(520),
            },
            {
              name: 'quote',
              title: 'Quote',
              type: 'text',
              rows: 2,
              description: 'Optional. Verbatim from the source, without quote marks.',
              validation: (Rule: Rule) => Rule.max(240),
            },
            { name: 'note', title: 'Note', type: 'string', description: 'Optional small print, e.g. which models were tested.' },
          ],
          preview: {
            select: { title: 'studyTitle', date: 'date', era: 'era', authors: 'authors' },
            prepare({ title, date, era, authors }: Record<string, string | undefined>) {
              const tag = era === 'now' ? 'Now' : era === 'then' ? 'Then' : era;
              return { title: title || 'Study', subtitle: [tag, authors, date].filter(Boolean).join(' · ') };
            },
          },
        },
      ],
      validation: (Rule: Rule) => Rule.required().min(1).max(4),
    },
  ],
  preview: {
    select: { title: 'title', cards: 'cards' },
    prepare({ title, cards }: { title?: string; cards?: Array<{ studyTitle?: string }> }) {
      return {
        title: `Studies: ${title || cards?.[0]?.studyTitle || 'Untitled'}`,
        subtitle: `${cards?.length ?? 0} card${cards?.length === 1 ? '' : 's'}`,
      };
    },
  },
};

export const overlapGrid = {
  name: 'overlapGrid',
  type: 'object',
  title: 'Overlap grid',
  description: 'Two checkers that each miss some questions out of a set, and the misses they share.',
  fields: [
    ...frameFields('Defaults to "Illustration" when the numbers are made up.'),
    {
      name: 'illustration',
      title: 'Illustration',
      type: 'boolean',
      description: 'On when the numbers are made up to show an idea rather than measured. Screen readers hear it too.',
      initialValue: true,
    },
    {
      name: 'total',
      title: 'Questions',
      type: 'number',
      description: 'Cells in each grid, in rows of ten. 100 draws ten by ten.',
      initialValue: 100,
      validation: (Rule: Rule) => Rule.required().integer().min(10).max(200),
    },
    { name: 'aName', title: 'First checker', type: 'string', validation: (Rule: Rule) => Rule.required().max(24) },
    { name: 'aMisses', title: 'First checker misses', type: 'number', validation: (Rule: Rule) => Rule.required().integer().min(0) },
    { name: 'bName', title: 'Second checker', type: 'string', validation: (Rule: Rule) => Rule.required().max(24) },
    { name: 'bMisses', title: 'Second checker misses', type: 'number', validation: (Rule: Rule) => Rule.required().integer().min(0) },
    {
      name: 'shared',
      title: 'Shared misses',
      type: 'number',
      description: 'Questions both miss. What is left after each checks the other.',
      validation: (Rule: Rule) => Rule.required().integer().min(0),
    },
    {
      name: 'bothLabel',
      title: 'Third grid label',
      type: 'string',
      description: 'Defaults to "Missed by Both".',
      validation: (Rule: Rule) => Rule.max(32),
    },
    ...sourceFields,
  ],
  validation: (Rule: Rule) => Rule.custom((value: any) => (value ? asRule(checkOverlap(value)) : true)),
  preview: {
    select: { title: 'title', aMisses: 'aMisses', bMisses: 'bMisses', shared: 'shared', total: 'total' },
    prepare({ title, aMisses, bMisses, shared, total }: Record<string, any>) {
      return {
        title: `Overlap: ${title || 'Untitled'}`,
        subtitle: `${aMisses ?? '?'} and ${bMisses ?? '?'} of ${total ?? '?'} missed, ${shared ?? '?'} shared`,
      };
    },
  },
};

export const beforeAfter = {
  name: 'beforeAfter',
  type: 'object',
  title: 'Before and after',
  description: 'A dumbbell chart: each row moves from a before value to an after value on one scale.',
  fields: [
    ...frameFields('For example the unit: "score, %".'),
    { name: 'beforeLabel', title: 'Before label', type: 'string', description: 'Legend for the hollow dot, in Title Case. Defaults to "Before".' },
    { name: 'afterLabel', title: 'After label', type: 'string', description: 'Legend for the filled dot, in Title Case. Defaults to "After".' },
    {
      name: 'valueSuffix',
      title: 'Value suffix',
      type: 'string',
      description: 'Added after every printed value, e.g. "%". Leave empty when the label carries the unit.',
      validation: (Rule: Rule) => Rule.max(4),
    },
    { name: 'scaleMin', title: 'Scale min', type: 'number', description: 'Optional. Otherwise a round number below the data.' },
    { name: 'scaleMax', title: 'Scale max', type: 'number', description: 'Optional. Otherwise a round number above the data.' },
    {
      name: 'rows',
      title: 'Rows',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'beforeAfterRow',
          title: 'Row',
          fields: [
            { name: 'label', title: 'Label', type: 'string', description: 'In Title Case.', validation: (Rule: Rule) => Rule.required().max(80) },
            { name: 'before', title: 'Before', type: 'number', validation: (Rule: Rule) => Rule.required() },
            { name: 'after', title: 'After', type: 'number', validation: (Rule: Rule) => Rule.required() },
          ],
          preview: {
            select: { label: 'label', before: 'before', after: 'after' },
            prepare({ label, before, after }: Record<string, any>) {
              return { title: label || 'Row', subtitle: `${before ?? '?'} to ${after ?? '?'}` };
            },
          },
        },
      ],
      validation: (Rule: Rule) => Rule.required().min(1).max(8),
    },
    ...sourceFields,
    {
      name: 'note',
      title: 'Note',
      type: 'text',
      rows: 2,
      description: 'Optional second line under the source, e.g. a related study.',
      validation: (Rule: Rule) => Rule.max(320),
    },
    { name: 'noteSourceTitle', title: 'Note source title', type: 'string', description: 'Optional linked title at the end of the note.' },
    {
      name: 'noteSourceUrl',
      title: 'Note source link',
      type: 'url',
      hidden: ({ parent }: { parent?: { noteSourceTitle?: string } }) => !parent?.noteSourceTitle,
      validation: webUrl,
    },
  ],
  validation: (Rule: Rule) => Rule.custom((value: any) => (value ? asRule(checkScale(value)) : true)),
  preview: {
    select: { title: 'title', rows: 'rows' },
    prepare({ title, rows }: { title?: string; rows?: unknown[] }) {
      return { title: `Before and after: ${title || 'Untitled'}`, subtitle: `${rows?.length ?? 0} rows` };
    },
  },
};

export const postFigureTypes = [timeline, statGrid, studyCards, overlapGrid, beforeAfter];
