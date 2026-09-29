import type { Metadata } from 'next'
import PageLayout from '../../components/PageLayout'
import LinkLedger from '../../components/LinkLedger'
import CopyEmail from './CopyEmail'
import LocalTime from './LocalTime'
import { CALENDAR_LINK, EMAIL, PROFILE_LINKS } from '../../lib/profiles'
import { SHARE_IMAGE } from '../../lib/entity'
import '../../css/animations.css'
import '../../css/hero.css'
import './contact.css'

const description = "Get in touch with Jake Harris: email, a call on his calendar, GitHub, Hugging Face, X or LinkedIn.";

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
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@jakeharrisdev',
    creator: '@jakeharrisdev',
    title: 'Contact | Jake Harris',
    description,
    images: [SHARE_IMAGE],
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
        <LinkLedger links={[CALENDAR_LINK, ...PROFILE_LINKS]} />
        <p className="contact-local">
          Based in Chicago, IL<LocalTime />
        </p>
      </section>
    </PageLayout>
  )
}
