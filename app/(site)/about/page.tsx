import PageLayout from '../../components/PageLayout';
import LinkLedger from '../../components/LinkLedger';
import LengthStory from './LengthStory';
import { PROFILE_LINKS } from '../../lib/profiles';
import type { Metadata } from 'next';
import { ABOUT_URL, PERSON_DESCRIPTION, PERSON_ID, SHARE_IMAGE, WEBSITE_ID, jsonLd } from '../../lib/entity';
import '../../css/animations.css';
import '../../css/hero.css';
import './about.css';

const title = "About Jake Harris | ML Researcher";
const description = PERSON_DESCRIPTION;

export const metadata: Metadata = {
    title: { absolute: title },
    description,
    alternates: {
        canonical: ABOUT_URL,
    },
    openGraph: {
        type: 'profile',
        firstName: 'Jake',
        lastName: 'Harris',
        locale: 'en_US',
        siteName: 'Jake Harris',
        url: ABOUT_URL,
        title,
        description,
        images: [SHARE_IMAGE],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@jakeharrisdev',
        creator: '@jakeharrisdev',
        title,
        description,
        images: [SHARE_IMAGE],
    },
};

// This page is the Person's home: the site layout carries the Person node,
// and the ProfilePage names it as the page's subject.
const profilePage = {
    '@type': 'ProfilePage',
    '@id': `${ABOUT_URL}#profilepage`,
    url: ABOUT_URL,
    name: title,
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: { '@id': PERSON_ID },
};

// The resume link stays out until the resume is current again.
export default function AboutPage() {
    return (
        <PageLayout className="about-page">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(profilePage) }} />
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
                <LinkLedger links={PROFILE_LINKS} />
            </section>
        </PageLayout>
    );
}
