// Types for the run chart and looping video blocks (sanity-schemas/run-figures.ts).
// Like the other post figures, each block carries its own data.

interface RunFigureFrame {
  _key: string;
  /** Monospace title, top left of the card. */
  title?: string;
  /** Context, top right of the card. */
  label?: string;
  /** Caption below the card. */
  caption?: string;
}

export interface RunChartGroup {
  _key: string;
  /** Short id the lanes point at, e.g. "part-2". */
  key: string;
  /** Group name in Title Case, e.g. "Part 2". */
  label: string;
  /** Optional line above this group, for a run of groups that belong together. */
  heading?: string;
}

export interface RunChartCategory {
  _key: string;
  /** Short id the spans point at, e.g. "maker-a". */
  key: string;
  /** Legend name in Title Case. Colors follow the order of this list. */
  label: string;
}

export interface RunChartLane {
  _key: string;
  key: string;
  /** Row name for screen readers, e.g. "Builder 1". */
  label: string;
  /** Key of the group this row sits in. */
  group: string;
  /** Draw this row's bars thin, e.g. for reviewers. */
  thin?: boolean;
}

export interface RunChartSpan {
  _key: string;
  lane: string;
  /** 24-hour clock, "HH:MM". Times before the run's start are the next day. */
  start: string;
  end: string;
  category: string;
}

export interface RunChartMarker {
  _key: string;
  lane: string;
  time: string;
  /** "accent" draws a large dot in the reader's accent; "dot" a small one. */
  kind?: 'accent' | 'dot';
  /** Optional name for screen readers, e.g. "The Request". */
  label?: string;
}

export interface RunChartMilestone {
  _key: string;
  time: string;
  /** In Title Case, e.g. "First Result". */
  label: string;
}

export interface RunChartValue extends RunFigureFrame {
  _type: 'runChart';
  /** The run's first moment, "HH:MM". Earlier clock times count as the next day. */
  start: string;
  /** Optional end of the clock axis; otherwise the hour after the last span. */
  end?: string;
  /** Printed under the clock, e.g. "Local Time". */
  timeZone?: string;
  /** Legend heading, e.g. "Maker". */
  legendTitle?: string;
  /** Legend names for full and thin bars, e.g. "Work" and "Review". */
  fullLabel?: string;
  thinLabel?: string;
  /** The running count's words, e.g. "Turns Done". */
  countLabel?: string;
  groups: RunChartGroup[];
  categories: RunChartCategory[];
  lanes: RunChartLane[];
  spans: RunChartSpan[];
  markers?: RunChartMarker[];
  milestones?: RunChartMilestone[];
}

/** A Sanity file or image field: an asset reference, or a resolved url. */
export interface SanityAssetField {
  _type?: string;
  asset?: { _ref?: string; _id?: string; url?: string };
}

export interface VideoLoopValue extends RunFigureFrame {
  _type: 'videoLoop';
  /** H.264 MP4, muted. */
  mp4: SanityAssetField;
  /** Optional WebM source, offered first. */
  webm?: SanityAssetField;
  /** First or best frame; shown before playback, without JavaScript and with reduced motion. */
  poster: SanityImageField;
  /** Pixel size of the clip; defaults to the poster's size. */
  width?: number;
  height?: number;
  /** What the clip shows, for screen readers. */
  alt: string;
}

export interface SanityImageField extends SanityAssetField {
  alt?: string;
}
