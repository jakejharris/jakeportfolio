# Hero wordmark shift on mobile load: findings

Report (Jake, 2026-09-01, iPhone): "The main page has a weird layout shift on
load in. Haven't noticed it before. The text Jake Harris + building agent...
seems like it might be loading in weird."

Each item below is labelled **measured** (observed on a harness or in a file)
or **reasoned** (inference, not observed on an iPhone). Nothing here was
observed on an actual iPhone; that device is the one thing this branch could
not drive.

## What it is

**Measured.** `h1.hero-wordmark` is loaded through `next/font/local` with
`display: 'swap'` and `adjustFontFallback: false`, so on a cold cache the first
paint uses the CSS fallback stack (`ui-serif, Georgia, serif`) and swaps to
Sentient Bold when the woff2 arrives. Sentient Bold and Georgia Bold do not
share metrics:

| face | "Jake Harris" advance width | hhea ascent / descent / line gap (per em) |
|---|---|---|
| Sentient Bold (from `public/fonts/Sentient-Bold.woff2`, fontTools) | 5.599 em | 0.960 / 0.320 / 0.080 |
| Georgia Bold (Windows `georgiab.ttf`, fontTools) | 6.064 em | 0.917 / 0.219 / 0 |

At the mobile wordmark size (`clamp(2.9rem, 11vw, 5.5rem)` resolves to
46.4px at 390px wide) that is, in headless Chromium with Georgia installed as
the fallback:

| state | wordmark text width | text box top relative to h1 | text box height | h1 height |
|---|---|---|---|---|
| before, fallback (Georgia Bold) | 276.2 px | -5 px | 53 px | 44 px |
| Sentient Bold | 252.1 px | -8 px | 60 px | 44 px |
| after, fallback ("Sentient Fallback") | 254.6 px | -8 px | 60 px | 44 px |

So the swap moved the right edge of "Harris" 24px to the left and dropped the
glyphs about 3px, while the h1 box itself stayed 44px tall because
`line-height: 0.95` is explicit. Nothing below the h1 moves. This is a
horizontal and baseline jump of the wordmark text, not a vertical reflow.

**Measured.** On the live site (Slow 4G, 4x CPU throttle, cold cache, 390x844
viewport) the fallback was on screen for roughly 360ms (first frame with the
DOM at ~1.55s, Sentient applied at ~1.92s). The hero entrance animation is
700ms from first paint, so the swap lands mid-entrance, which is the "loading
in weird" look.

**Reasoned.** Why it reads as mobile-only: on desktop the font is usually
cached or arrives inside the same frame as the CSS, and the wordmark is
proportionally smaller. On the iPhone `ui-serif` resolves to New York rather
than Georgia, so the exact fallback geometry on the phone differs from the
table above, but the mechanism (a wide serif fallback swapped for a narrower
Sentient) is the same.

**Reasoned.** Why "haven't noticed it before": nothing in git changed the
loading path. Sentient with `adjustFontFallback: false` landed 2026-07-02
(`e9b1e1b`) and inherited the flag from the Cabinet Grotesk setup the day
before (`5c121d1`, no PR, no stated reason). The font URL hash is unchanged
across the August deploys, so those did not bust the font cache either. The
most likely explanation is a cold-cache cellular load that had not happened
before. This was not proven.

## The fix

`app/css/hero.css` declares a `"Sentient Fallback"` face: local Georgia Bold
with `size-adjust: 92.34%` (the advance-width ratio of the literal string
"Jake Harris", Sentient 5.599em over Georgia Bold 6.064em) and
`ascent-override` / `descent-override` / `line-gap-override` set to Sentient's
hhea values divided by that ratio, following the formula `next/font` uses for
its own generated fallbacks. It is inserted in the wordmark stack right after
`--font-wordmark`, ahead of `ui-serif`, so iOS also uses the tuned Georgia
instead of untuned New York.

Result on the same harness: fallback width 254.6px against Sentient's 252.1px
(a 2.5px residual, down from 24px), text box top and height identical, h1
height identical. The glyph shapes still change when Sentient arrives; that
part is inherent to `font-display: swap` and is not a layout change.

Why not re-enable `adjustFontFallback`: Next's generator would pick Times New
Roman at `size-adjust` ~115.8% computed from a generic letter-frequency
string. For a two-word wordmark that is ~5% off (about 12px at this size),
and it changes the fallback family away from the Georgia the stack already
names. The explicit face keeps the family, matches the actual string, and is
readable in one place.

## Ruled out

- **Font preload missing on the homepage.** Measured: the homepage HTML has no
  `<link rel="preload" as="font">` tags in `<head>` (the static `/about` page
  does). The homepage is dynamic (`revalidate: 0` fetch since before #48;
  `force-dynamic` added in #48), and on dynamic renders Next 15.5 emits the
  font preloads as an HTTP `Link: <...woff2>; rel=preload; as="font"` response
  header instead. Chromium honours it (font requests start in the same
  millisecond as the CSS requests). WebKit's `LinkLoader::loadLinksFromHeader`
  routes `rel=preload` from headers through `preloadIfNeeded`, so Safari should
  too (reasoned from source, not observed). A build of `ea16c37` (pre-#48)
  delivers the preload the same way, so this did not change recently.
- **Standfirst reflow.** Measured: `p.hero-standfirst` stays 49px tall and at
  the same top across the Geist swap; Geist ships a metric-matched Arial
  fallback (`size-adjust: 106.28%`) and the hard `<br>` fixes the line count.
- **`white-space: nowrap` overflow.** Measured: `document.documentElement.scrollWidth`
  stays 390 in every state; the widest wordmark (276px) fits the 358px column.
- **Things above the hero.** Read: `PixelFluidBackground` is `fixed inset-0
  -z-10` and its glow is `absolute` inside it, so neither is in flow.
  `AccentScript` only sets `data-accent` before hydration. Both navbars render
  in SSR at a fixed `h-16`; `ThemeToggle` and `AccentPicker` swap icons by
  opacity or render inside fixed-size slots. `TransitionOverlay` returns null
  (flag off). `Toaster` is fixed-position.
- **iOS viewport units.** Grep: the wordmark clamp uses `vw`, not `vh`. `vh`
  appears in `PageLayout`'s `min-h-[calc(100vh-4rem)]` (a minimum
  on a block that is already taller than the viewport), in the drawer
  (`h-[65vh]`, closed on load) and in unused `.mobile-sidebar` CSS. None sits
  above the hero.
- **Entrance animation.** Read: `opacity` + `transform: translateY` only, no
  layout properties. The sampler in the harness confirmed it moves the
  bounding rect but not `offsetTop`.
- **Layout Instability API.** Measured: CLS 0.00001 to 0.00002 before and
  after (one entry, the view-count badge widening by 3 to 5px when Geist
  lands). Chromium does not score the wordmark width change because the h1
  block does not move.

## Not verified

- The iPhone itself. Headless Chromium is not mobile Safari; the harness shows
  geometry and timing, not the phone.
- `local("Georgia Bold")` name matching on iOS. If it misses, the third `src`
  entry (`local("Georgia")`) is used with synthetic bold, which is a little
  narrower than true Georgia Bold; still far closer than untuned New York.

## Out of scope, worth doing later

- The view-count badge (`div.ms-4` in the post list) widens by a few pixels
  when Geist lands because the count is right-aligned in a flex row. It is the
  only CLS entry Chromium records (0.00002). A `min-width` or `font-variant-numeric:
  tabular-nums` would remove it.
- Geist Sans variable (the largest font) lands last on a slow link (~2.2s in
  the harness), so the standfirst and post list also swap late. Metrics are
  matched so nothing moves, but a subsetted or non-variable weight would
  shorten the window.
- If a real head `<link rel="preload">` for the wordmark is ever wanted (for
  example to sidestep any Link-header priority quirks), the font would have to
  leave `next/font/local` for a hand-written `@font-face` against
  `/fonts/Sentient-Bold.woff2`, plus a `headers()` rule for immutable caching
  (Vercel serves `public/` with `max-age=0`). Not done here because the header
  preload was shown to work in Chromium and reasoned to work in WebKit.
