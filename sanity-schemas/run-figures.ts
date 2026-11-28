// The run chart and looping video blocks for post content. Like the figure
// blocks in post-figures.ts, each carries its own data; the checks are the
// ones the page uses to draw them (app/lib/run-chart, app/lib/video-loop).
import { parseClock } from '../app/lib/post-figures';
import { checkRunChart, RUN_LIMITS } from '../app/lib/run-chart';
import { checkVideoLoop } from '../app/lib/video-loop';

type Rule = any;

const KEY = /^[a-z0-9][a-z0-9-]{0,39}$/;

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
    description: `Context, top right of the card, in Title Case. ${labelHint}`,
    validation: (Rule: Rule) => Rule.max(40),
  },
  {
    name: 'caption',
    title: 'Caption',
    type: 'text',
    rows: 3,
    description: 'Shown below the card, as a full sentence. Say what to notice.',
    validation: (Rule: Rule) => Rule.max(400),
  },
];

const keyField = (what: string) => ({
  name: 'key',
  title: 'Key',
  type: 'string',
  description: `Short id that ${what} point at: lowercase letters, digits and dashes, e.g. "part-2".`,
  validation: (Rule: Rule) =>
    Rule.required().custom((key?: string) => (!key || KEY.test(key) ? true : 'Use lowercase letters, digits and dashes.')),
});

const clockField = (name: string, title: string, description: string, required = true) => ({
  name,
  title,
  type: 'string',
  description,
  placeholder: '13:05',
  validation: (Rule: Rule) => {
    const rule = Rule.custom((value?: string) =>
      value == null || value === '' || parseClock(value) !== null ? true : 'Use a 24-hour time like 07:30.'
    );
    return required ? rule.required() : rule;
  },
});

const pointer = (name: string, title: string, description: string) => ({
  name,
  title,
  type: 'string',
  description,
  validation: (Rule: Rule) => Rule.required(),
});

export const runChart = {
  name: 'runChart',
  type: 'object',
  title: 'Run Chart',
  description:
    'A run on one clock: a row per lane, a bar per span at its real start and finish, colored by category, rows in named groups. Replays on a loop while in view.',
  fields: [
    ...frameFields('For example the day.'),
    clockField('start', 'Start', "The run's first moment, 24-hour. Any earlier time counts as the next day, so a run can cross midnight."),
    clockField('end', 'Axis end', 'Optional. Where the clock ends; leave empty to end on the hour after the last span. Milestones after it are listed, not drawn.', false),
    {
      name: 'timeZone',
      title: 'Time zone',
      type: 'string',
      description: 'Printed under the clock, in Title Case, e.g. "Local Time".',
      validation: (Rule: Rule) => Rule.max(30),
    },
    {
      name: 'legendTitle',
      title: 'Legend title',
      type: 'string',
      description: 'Heading over the category colors, in Title Case, e.g. "Maker".',
      validation: (Rule: Rule) => Rule.max(40),
    },
    {
      name: 'fullLabel',
      title: 'Full bar name',
      type: 'string',
      description: 'Legend name for full bars when some rows are thin, e.g. "Work".',
      validation: (Rule: Rule) => Rule.max(30),
    },
    {
      name: 'thinLabel',
      title: 'Thin bar name',
      type: 'string',
      description: 'Legend name for thin bars, e.g. "Review". Also read out for those rows.',
      validation: (Rule: Rule) => Rule.max(30),
    },
    {
      name: 'countLabel',
      title: 'Count words',
      type: 'string',
      description: 'Words after the running count, in Title Case. Default "Turns Done".',
      validation: (Rule: Rule) => Rule.max(30),
    },
    {
      name: 'groups',
      title: 'Groups',
      type: 'array',
      description: 'Row groups, top to bottom. Each group name shows once, beside or above its rows.',
      of: [
        {
          type: 'object',
          name: 'runChartGroup',
          title: 'Group',
          fields: [
            keyField('rows'),
            { name: 'label', title: 'Name', type: 'string', description: 'In Title Case, e.g. "Part 2".', validation: (Rule: Rule) => Rule.required().max(24) },
            {
              name: 'heading',
              title: 'Heading above',
              type: 'string',
              description: 'Optional line above this group, for groups that belong together, e.g. "Four Parts at Once".',
              validation: (Rule: Rule) => Rule.max(48),
            },
          ],
          preview: {
            select: { title: 'label', subtitle: 'key' },
          },
        },
      ],
      validation: (Rule: Rule) => Rule.required().min(1).max(RUN_LIMITS.groups),
    },
    {
      name: 'categories',
      title: 'Categories',
      type: 'array',
      description: 'What the bar colors mean, in legend order. The colors are fixed by place in this list, up to six.',
      of: [
        {
          type: 'object',
          name: 'runChartCategory',
          title: 'Category',
          fields: [
            keyField('spans'),
            { name: 'label', title: 'Name', type: 'string', description: 'In Title Case.', validation: (Rule: Rule) => Rule.required().max(40) },
          ],
          preview: { select: { title: 'label', subtitle: 'key' } },
        },
      ],
      validation: (Rule: Rule) => Rule.required().min(1).max(RUN_LIMITS.categories),
    },
    {
      name: 'lanes',
      title: 'Rows',
      type: 'array',
      description: 'One row per lane (for example per agent), in order within their groups.',
      of: [
        {
          type: 'object',
          name: 'runChartLane',
          title: 'Row',
          fields: [
            keyField('spans and markers'),
            {
              name: 'label',
              title: 'Name',
              type: 'string',
              description: 'Read to screen readers, in Title Case, e.g. "Builder 1".',
              validation: (Rule: Rule) => Rule.required().max(40),
            },
            pointer('group', 'Group', 'Key of the group this row sits in.'),
            { name: 'thin', title: 'Thin bars', type: 'boolean', description: 'Draw this row thin, e.g. for reviewers.', initialValue: false },
          ],
          preview: {
            select: { label: 'label', group: 'group', thin: 'thin' },
            prepare({ label, group, thin }: Record<string, any>) {
              return { title: label || 'Row', subtitle: `${group ?? 'no group'}${thin ? ' · thin' : ''}` };
            },
          },
        },
      ],
      validation: (Rule: Rule) => Rule.required().min(1).max(RUN_LIMITS.lanes),
    },
    {
      name: 'spans',
      title: 'Spans',
      type: 'array',
      description: 'The bars: a row, a start and end on the 24-hour clock, and a category.',
      of: [
        {
          type: 'object',
          name: 'runChartSpan',
          title: 'Span',
          fields: [
            pointer('lane', 'Row', 'Key of the row.'),
            clockField('start', 'Start', '24-hour time, e.g. 03:10.'),
            clockField('end', 'End', 'Later than start. Before the run start counts as the next day.'),
            pointer('category', 'Category', 'Key of the category, which sets the color.'),
          ],
          preview: {
            select: { lane: 'lane', start: 'start', end: 'end', category: 'category' },
            prepare({ lane, start, end, category }: Record<string, string | undefined>) {
              return { title: `${lane ?? '?'} · ${start ?? '?'} to ${end ?? '?'}`, subtitle: category };
            },
          },
        },
      ],
      validation: (Rule: Rule) => Rule.max(RUN_LIMITS.spans),
    },
    {
      name: 'markers',
      title: 'Markers',
      type: 'array',
      description: 'Dots on a row at one moment, e.g. a message. An accent dot is large and in the reader’s accent color.',
      of: [
        {
          type: 'object',
          name: 'runChartMarker',
          title: 'Marker',
          fields: [
            pointer('lane', 'Row', 'Key of the row.'),
            clockField('time', 'Time', '24-hour time.'),
            {
              name: 'kind',
              title: 'Kind',
              type: 'string',
              options: { list: [{ title: 'Accent Dot', value: 'accent' }, { title: 'Dot', value: 'dot' }], layout: 'radio' },
              initialValue: 'dot',
            },
            { name: 'label', title: 'Name', type: 'string', description: 'Optional, read to screen readers, e.g. "The Request".', validation: (Rule: Rule) => Rule.max(40) },
          ],
          preview: {
            select: { lane: 'lane', time: 'time', kind: 'kind', label: 'label' },
            prepare({ lane, time, kind, label }: Record<string, string | undefined>) {
              return { title: label || `${kind === 'accent' ? 'Accent dot' : 'Dot'} at ${time ?? '?'}`, subtitle: lane };
            },
          },
        },
      ],
      validation: (Rule: Rule) => Rule.max(RUN_LIMITS.markers),
    },
    {
      name: 'milestones',
      title: 'Milestones',
      type: 'array',
      description: 'Named moments drawn as a dashed line across all rows, labelled above the chart.',
      of: [
        {
          type: 'object',
          name: 'runChartMilestone',
          title: 'Milestone',
          fields: [
            clockField('time', 'Time', '24-hour time.'),
            { name: 'label', title: 'Name', type: 'string', description: 'In Title Case, e.g. "First Result".', validation: (Rule: Rule) => Rule.required().max(40) },
          ],
          preview: { select: { title: 'label', subtitle: 'time' } },
        },
      ],
      validation: (Rule: Rule) => Rule.max(RUN_LIMITS.milestones),
    },
  ],
  validation: (Rule: Rule) => Rule.custom((value: unknown) => checkRunChart(value)),
  preview: {
    select: { title: 'title', lanes: 'lanes', spans: 'spans' },
    prepare({ title, lanes, spans }: { title?: string; lanes?: unknown[]; spans?: unknown[] }) {
      return { title: `Run chart: ${title || 'Untitled'}`, subtitle: `${lanes?.length ?? 0} rows, ${spans?.length ?? 0} spans` };
    },
  },
};

export const videoLoop = {
  name: 'videoLoop',
  type: 'object',
  title: 'Looping Video',
  description: 'A short muted clip that loops while on screen, with a poster for no JavaScript and reduced motion, and a Play/Pause button.',
  fields: [
    ...frameFields('For example "Clip" or the length.'),
    {
      name: 'mp4',
      title: 'MP4',
      type: 'file',
      description: 'H.264 MP4, muted, a few seconds long. Keep it small; it loads only when played.',
      options: { accept: 'video/mp4' },
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'webm',
      title: 'WebM (optional)',
      type: 'file',
      description: 'Optional smaller WebM of the same clip; browsers that can play it take it first.',
      options: { accept: 'video/webm' },
    },
    {
      name: 'poster',
      title: 'Poster',
      type: 'image',
      description: 'A frame of the clip at the same size. Shows before playback, without JavaScript and with reduced motion.',
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'width',
      title: 'Width',
      type: 'number',
      description: 'Optional pixel width of the clip. Leave width and height empty to use the poster size.',
      validation: (Rule: Rule) => Rule.integer().min(1).max(8000),
    },
    {
      name: 'height',
      title: 'Height',
      type: 'number',
      description: 'Optional pixel height of the clip.',
      validation: (Rule: Rule) => Rule.integer().min(1).max(8000),
    },
    {
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description: 'What the clip shows, for screen readers, as a sentence.',
      validation: (Rule: Rule) => Rule.required().max(400),
    },
  ],
  validation: (Rule: Rule) => Rule.custom((value: any) => checkVideoLoop(value)),
  preview: {
    select: { title: 'title', alt: 'alt', media: 'poster' },
    prepare({ title, alt, media }: Record<string, any>) {
      return { title: `Looping video: ${title || 'Untitled'}`, subtitle: alt, media };
    },
  },
};

export const runFigureTypes = [runChart, videoLoop];
