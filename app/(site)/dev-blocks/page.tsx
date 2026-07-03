import InteractiveBlock from '../../components/blog-components/InteractiveBlock';

export const metadata = {
    title: 'Dev Blocks',
    robots: {
        index: false,
        follow: false,
    },
};

export default function DevBlocksPage() {
    return (
        <div className="mx-auto max-w-2xl px-4 py-12">
            <InteractiveBlock componentName="SymphonyFlow" />
        </div>
    );
}
