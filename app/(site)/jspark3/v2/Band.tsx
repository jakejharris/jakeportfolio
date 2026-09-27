import React from 'react';
import { IS_PLACEHOLDER, valueText } from '../release-copy';
import { Ph } from '../Placeholder';

/**
 * A within-start band as its two measured ends, as the release files write them, or one value when
 * they are the same. Screen readers hear "lo to hi". Before the fill the band stays a marked placeholder.
 */
export default function Band({ lo, hi }: { lo: string | null; hi: string | null }) {
  if (lo === hi && (lo !== null || !IS_PLACEHOLDER)) return <Ph>{valueText(lo)}</Ph>;
  return <Ph>{valueText(lo)}<span aria-hidden="true">–</span><span className="sr-only"> to </span>{valueText(hi)}</Ph>;
}
