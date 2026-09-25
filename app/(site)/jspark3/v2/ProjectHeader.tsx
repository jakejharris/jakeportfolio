import React from 'react';
import Image from 'next/image';

type NavLink = { href: string; label: string };

const TEMPO_NAV: ReadonlyArray<NavLink> = [{ href: '#results', label: 'Results' }, { href: '/jspark3/glm/', label: 'GLM' }];

/** The JSPARK3 project header. Each release page passes its own nav and class prefix; Tempo's output is the default. */
export default function ProjectHeader({ nav = TEMPO_NAV, prefix = 'tempo' }: { nav?: ReadonlyArray<NavLink>; prefix?: 'tempo' | 'glm' }) {
  return <header className={`${prefix}-header`}>
    <a href="/jspark3/" className={`${prefix}-wordmark`} aria-label="JSPARK3 releases">
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcSet="/jspark3/jspark3-mark-static.svg" />
        <Image src="/jspark3/jspark3-mark.svg" alt="" width={40} height={40} unoptimized />
      </picture>
      <span>JSPARK3</span>
    </a>
    <nav aria-label="Project navigation">
      {nav.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
      <a href="/about/" className={`${prefix}-author`}>Jake Harris ↗</a>
    </nav>
  </header>;
}
