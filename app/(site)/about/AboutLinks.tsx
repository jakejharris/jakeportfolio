import Link from 'next/link';
import type { ComponentType } from 'react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { SiHuggingface } from 'react-icons/si';
import { MdArrowForward } from 'react-icons/md';
import { PROFILES } from '../../lib/entity';

const PROJECT_LINKS = [
    { href: '/jspark3/', title: 'JSPARK3', detail: 'Every release, recipe and result' },
    { href: '/jspark3/glm/', title: 'GLM-5.3 Flash', detail: 'The latest release, on three DGX Sparks' },
    { href: '/jspark3/deepseek/', title: 'Tempo', detail: 'The DeepSeek experiment' },
] as const;

const PROFILE_ICONS: Record<(typeof PROFILES)[number]['label'], ComponentType<{ className?: string }>> = {
    GitHub: FaGithub,
    'Hugging Face': SiHuggingface,
    X: FaXTwitter,
    LinkedIn: FaLinkedin,
};

const card = 'pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group';

function CardText({ title, detail }: { title: string; detail: string }) {
    return (
        <div>
            <div className="text-primary font-medium">{title}</div>
            <div className="text-sm text-muted-foreground">{detail}</div>
        </div>
    );
}

// What Jake builds in the open, then the profiles that are also him. rel="me"
// tells crawlers those profiles and this page describe the same person.
export default function AboutLinks() {
    return (
        <>
            <section className="page-enter-3 mb-8" aria-labelledby="about-jspark3">
                <h2 id="about-jspark3" className="section-kicker">JSPARK3</h2>
                <p className="prose dark:prose-invert font-base text-base mb-4">
                    I also work on local inference in the open. <Link href="/jspark3/" className="text-[var(--accent-color)] underline underline-offset-[3px]">JSPARK3</Link> is
                    my set of serving recipes for running large open models across three NVIDIA DGX Sparks. The numbered
                    releases serve GLM-5.3 Flash from one OpenAI-compatible endpoint, and Tempo is an experiment with
                    DeepSeek. Each recipe is pinned so anyone can rebuild it, and each release publishes its benchmarks
                    with the misses left in.
                </p>
                <ul className="space-y-2">
                    {PROJECT_LINKS.map(link => (
                        <li key={link.href} className="relative">
                            <Link href={link.href} className={card}>
                                <CardText title={link.title} detail={link.detail} />
                                <div className="text-sm text-muted-foreground">
                                    <MdArrowForward />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="page-enter-3" aria-labelledby="about-elsewhere">
                <h2 id="about-elsewhere" className="section-kicker">Elsewhere</h2>
                <ul className="space-y-2">
                    {PROFILES.map(profile => {
                        const Icon = PROFILE_ICONS[profile.label];
                        return (
                            <li key={profile.href} className="relative">
                                <a
                                    href={profile.href}
                                    target="_blank"
                                    rel="me noopener noreferrer"
                                    className={card}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="text-primary text-xl" />
                                        <CardText title={profile.label} detail={profile.handle} />
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        <MdArrowForward />
                                    </div>
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </section>
        </>
    );
}
