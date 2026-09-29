import PageLayout from '../../components/PageLayout';
import LinkLedger from '../../components/LinkLedger';
import LengthStory from './LengthStory';
import { PROFILES } from '../../lib/profiles';
import '../../css/animations.css';
import '../../css/hero.css';
import './about.css';

export const metadata = {
    title: "About",
    description: "Jake Harris is a software engineer in Chicago. He co-founded AdventureGenie, started JJH Digital, and now works on Docusign's Workspaces team while running his own AI assistant at home.",
    alternates: {
        canonical: 'https://jakejh.com/about/',
    },
};

// The resume link stays out until the resume is current again.
export default function AboutPage() {
    return (
        <PageLayout className="about-page">
            <header className="hero">
                <h1 className="hero-wordmark" data-fluid-island>About</h1>
            </header>

            {/* Without scripts the story stays at its medium length, so the
                switch would do nothing. */}
            <noscript>
                <style>{'.story-controls { display: none; }'}</style>
            </noscript>

            <div className="page-enter-2">
                <LengthStory />
            </div>

            <section className="page-enter-3 about-elsewhere" aria-labelledby="about-elsewhere-title">
                <h2 id="about-elsewhere-title" className="section-kicker">Elsewhere</h2>
                <LinkLedger links={[PROFILES.github, PROFILES.linkedin, PROFILES.x]} />
            </section>
        </PageLayout>
    );
}
