import type { Metadata } from 'next';

import InteractiveBlock from '@/app/components/blog-components/InteractiveBlock';

export const metadata: Metadata = {
  title: 'Dev Blocks',
  robots: {
    index: false,
    follow: false,
  },
};

const BLOCKS = [
  'SymphonyFlow',
  'DispatchFlow',
  'SymphonyTimeline',
  'RuleLedger',
];

export default function DevBlocksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="space-y-10">
        {BLOCKS.map((componentName) => (
          <InteractiveBlock key={componentName} componentName={componentName} />
        ))}
      </div>
    </div>
  );
}
