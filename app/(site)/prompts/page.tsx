import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import PageLayout from '../../components/PageLayout'
import CopyPrompt from './CopyPrompt'
import { PROMPTS } from './prompts'
import { SHARE_IMAGE } from '../../lib/entity'
import '../../css/animations.css'
import '../../css/hero.css'
import './prompts.css'

const description = "Prompts Jake Harris sends people, ready to copy and paste.";

// The text is drawn as paragraphs of lines, so a reader who selects it by
// hand gets the same text the button copies. A line that wraps carries on
// under its own text, past its indentation and any list marker, so nested
// steps still read as nested on a phone.
function hang(line: string) {
  return /^\s*(?:(?:[-*]|\d+\.)\s+)?/.exec(line)![0].length;
}

export const metadata: Metadata = {
  title: "Prompts",
  description,
  alternates: {
    canonical: 'https://jakejh.com/prompts/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Jake Harris',
    url: 'https://jakejh.com/prompts/',
    title: 'Prompts | Jake Harris',
    description,
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@jakeharrisdev',
    creator: '@jakeharrisdev',
    title: 'Prompts | Jake Harris',
    description,
    images: [SHARE_IMAGE],
  },
};

export default function PromptsPage() {
  return (
    <PageLayout className="prompts-page">
      <header className="hero">
        <h1 className="hero-wordmark" data-fluid-island>Prompts</h1>
        <p className="hero-standfirst" data-fluid-island>
          Prompts I send people, ready to copy and paste.
        </p>
      </header>

      <div className="page-enter-2 prompts-list">
        {PROMPTS.map(({ slug, title, description, text }) => (
          <section key={slug} id={slug} className="prompt" aria-labelledby={`${slug}-title`}>
            <h2 id={`${slug}-title`} className="prompt-title">{title}</h2>
            {description ? <p className="prompt-description">{description}</p> : null}
            <div className="prompt-frame">
              <div className="prompt-bar">
                <CopyPrompt text={text} title={title} textId={`${slug}-text`} />
              </div>
              <div id={`${slug}-text`} className="prompt-text">
                {text.split('\n\n').map((paragraph, index) => (
                  <p key={index}>
                    {paragraph.split('\n').map((line, index) => (
                      <span key={index} className="prompt-line" style={{ '--hang': `${hang(line)}ch` } as CSSProperties}>
                        {line}
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </PageLayout>
  )
}
