export const NAVBAR_DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

export function getActiveNav(pathname: string) {
  const normalizedPathname = pathname === '/'
    ? pathname
    : pathname.replace(/\/+$/, '');

  return {
    isHome: normalizedPathname === '/',
    isAbout: normalizedPathname === '/about',
    isContact: normalizedPathname === '/contact',
  };
}
