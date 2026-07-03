import type { Metadata } from 'next';

import InteractiveBlock from '@/app/components/blog-components/InteractiveBlock';
import PageLayout from '@/app/components/PageLayout';

export const metadata: Metadata = {
  title: 'Dev Blocks',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DevBlocksPage() {
  return (
    <PageLayout>
      <div className="py-8">
        <InteractiveBlock componentName="DispatchFlow" />
        <InteractiveBlock componentName="RuleLedger" />
      </div>
    </PageLayout>
  );
}
