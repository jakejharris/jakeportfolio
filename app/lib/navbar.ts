export const NAVBAR_DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

export function getActiveNav(pathname: string) {
  const normalizedPathname = pathname === '/'
    ? pathname
    : pathname.replace(/\/+$/, '');

  return {
    isHome: normalizedPathname === '/',
    isJspark3: normalizedPathname === '/jspark3' || normalizedPathname.startsWith('/jspark3/'),
    isAbout: normalizedPathname === '/about',
    isContact: normalizedPathname === '/contact',
  };
}
