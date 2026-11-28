import type {
  BeforeAfterValue,
  OverlapGridValue,
  StatGridValue,
  StudyCardsValue,
  TimelineValue,
} from '@/app/types/sanity';

import BeforeAfter from './BeforeAfter';
import OverlapGrid from './OverlapGrid';
import StatGrid from './StatGrid';
import StudyCards from './StudyCards';
import Timeline from './Timeline';

/** Portable Text renderers for the figure blocks, keyed by their Sanity `_type`. */
export const postFigureComponents = {
  timeline: ({ value }: { value: TimelineValue }) => <Timeline value={value} />,
  statGrid: ({ value }: { value: StatGridValue }) => <StatGrid value={value} />,
  studyCards: ({ value }: { value: StudyCardsValue }) => <StudyCards value={value} />,
  overlapGrid: ({ value }: { value: OverlapGridValue }) => <OverlapGrid value={value} />,
  beforeAfter: ({ value }: { value: BeforeAfterValue }) => <BeforeAfter value={value} />,
};
