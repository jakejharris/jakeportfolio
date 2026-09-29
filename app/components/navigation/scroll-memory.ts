// Where the reader was on each page, so back and forward return them there.
// The browser's own restoration runs before the returning page is on screen:
// it scrolls the page being left (one visible jump), and it clamps to that
// page's height, so a long page reached from a short one comes back short.
// Here the position is put back in the same frame the page arrives.

const STORAGE_KEY = 'scroll-positions';
const LIMIT = 50;

export function scrollKey(location: { pathname: string; search: string }) {
  const path = location.pathname === '/' ? '/' : location.pathname.replace(/\/+$/, '');
  return path + location.search;
}

export class ScrollMemory {
  private positions = new Map<string, number>();

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
    try {
      const saved = storage?.getItem(STORAGE_KEY);
      if (saved) {
        for (const [key, value] of JSON.parse(saved) as Array<[string, number]>) {
          if (typeof key === 'string' && Number.isFinite(value)) this.positions.set(key, value);
        }
      }
    } catch {}
  }

  save(key: string, y: number) {
    // Most recent last, so the oldest pages fall off first.
    this.positions.delete(key);
    this.positions.set(key, Math.max(0, Math.round(y)));
    if (this.positions.size > LIMIT) {
      const oldest = this.positions.keys().next().value;
      if (oldest !== undefined) this.positions.delete(oldest);
    }
  }

  get(key: string) {
    return this.positions.get(key);
  }

  persist() {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.positions)));
    } catch {}
  }
}
