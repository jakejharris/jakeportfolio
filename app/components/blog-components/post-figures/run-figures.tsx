import '@/app/css/run-figures.css';

import type { RunChartValue, VideoLoopValue } from '@/app/types/run-figures';

import RunChart from './RunChart';
import VideoLoop from './VideoLoop';

/** Portable Text renderers for the run chart and looping video blocks, keyed by `_type`. */
export const runFigureComponents = {
  runChart: ({ value }: { value: RunChartValue }) => <RunChart value={value} />,
  videoLoop: ({ value }: { value: VideoLoopValue }) => <VideoLoop value={value} />,
};
