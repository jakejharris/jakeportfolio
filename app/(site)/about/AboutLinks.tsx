import Link from 'next/link';
import LinkLedger from '../../components/LinkLedger';

const PROJECT_LINKS = [
    { href: '/jspark3/', label: 'JSPARK3', detail: 'Every release, recipe and result' },
    { href: '/jspark3/glm/', label: 'GLM-5.3 Flash', detail: 'The latest release, on three DGX Sparks' },
    { href: '/jspark3/deepseek/', label: 'Tempo', detail: 'The DeepSeek experiment' },
];

export default function AboutLinks() {
    return (
        <section className="page-enter-3 about-projects" aria-labelledby="about-jspark3">
            <h2 id="about-jspark3" className="section-kicker">JSPARK3</h2>
            <p className="font-base text-base leading-relaxed mb-4">
                I also work on local inference in the open. <Link href="/jspark3/" className="text-[var(--accent-color)] underline underline-offset-[3px]">JSPARK3</Link> is
                my set of serving recipes for running large open models across three NVIDIA DGX Sparks. The numbered
                releases serve GLM-5.3 Flash from one OpenAI-compatible endpoint, and Tempo is an experiment with
                DeepSeek. Each recipe is pinned so anyone can rebuild it, and each release publishes its benchmarks
                with the misses left in.
            </p>
            <LinkLedger links={PROJECT_LINKS} />
        </section>
    );
}
