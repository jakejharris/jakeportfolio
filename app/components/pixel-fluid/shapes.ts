// One body of water runs under the whole site and takes a shape from the page
// it is under. Open sea on the pages that list work, a quiet shore on the
// pages people read, none on the release pages that bring their own look.

export type WaterShape = 'hero' | 'hub' | 'open' | 'shore' | 'none';

function trim(pathname: string) {
  const path = pathname.split(/[?#]/)[0] || '/';
  return path === '/' ? path : path.replace(/\/+$/, '');
}

export function waterShape(pathname: string): WaterShape {
  const path = trim(pathname);
  if (path === '/') return 'hero';
  if (path === '/jspark3') return 'hub';
  if (path.startsWith('/jspark3/')) return 'none';
  if (path.startsWith('/tags/')) return 'open';
  if (path === '/viewadmin' || path === '/drafts' || path.startsWith('/studio')) return 'none';
  return 'shore';
}

/** The sea shapes share one engine; the shore is a separate, still layer. */
export function isSea(shape: WaterShape): shape is 'hero' | 'hub' | 'open' {
  return shape === 'hero' || shape === 'hub' || shape === 'open';
}

export function seaOptions(shape: 'hero' | 'hub' | 'open') {
  return {
    heroMode: shape !== 'open',
    quietShare: shape === 'hub' ? 0.75 : 0,
  };
}
