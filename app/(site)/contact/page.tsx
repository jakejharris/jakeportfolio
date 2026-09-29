import type { Metadata } from 'next'
import PageLayout from '../../components/PageLayout'
import LinkLedger from '../../components/LinkLedger'
import CopyEmail from './CopyEmail'
import LocalTime from './LocalTime'
import { EMAIL, PROFILES } from '../../lib/profiles'
import '../../css/animations.css'
import '../../css/hero.css'
import './contact.css'

const description = "Get in touch with Jake Harris: email, a call on his calendar, LinkedIn, X or GitHub.";

export const metadata: Metadata = {
  title: "Contact",
  description,
  alternates: {
    canonical: 'https://jakejh.com/contact/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Jake Harris',
    url: 'https://jakejh.com/contact/',
    title: 'Contact | Jake Harris',
    description,
  },
  twitter: {
    card: 'summary',
    site: '@jakeharrisdev',
    creator: '@jakeharrisdev',
    title: 'Contact | Jake Harris',
    description,
  },
};

export default function ContactPage() {
  return (
    <PageLayout className="contact-page">
      <header className="hero">
        <h1 className="hero-wordmark" data-fluid-island>Say hello</h1>
        <p className="hero-standfirst" data-fluid-island>
          I’m always open to new opportunities and conversations.
        </p>
      </header>

      <section className="page-enter-2 contact-email" aria-labelledby="contact-email-title">
        <h2 id="contact-email-title" className="section-kicker">Email</h2>
        <CopyEmail address={EMAIL} />
      </section>

      <section className="page-enter-3 contact-elsewhere" aria-labelledby="contact-elsewhere-title">
        <h2 id="contact-elsewhere-title" className="section-kicker">Elsewhere</h2>
        <LinkLedger links={[PROFILES.calendar, PROFILES.linkedin, PROFILES.x, PROFILES.github]} />
        <p className="contact-local">
          Based in Chicago, IL<LocalTime />
        </p>
      </section>
    </PageLayout>
  )
}
