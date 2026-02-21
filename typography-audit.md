# Typography Audit: Portable Text Rendering

## Current State

### Headers (H1–H4)

**No Portable Text heading renderers exist.** The `components` object in `app/posts/[slug]/page.tsx` only defines a `normal` block handler — no `h1`, `h2`, `h3`, or `h4` block types. If Sanity content contains heading blocks, they fall through to default rendering with zero styling.

What does exist:
- **Post title** (hardcoded `<h1>`): `text-2xl md:text-3xl font-bold mb-2` → 24px mobile / 30px desktop
- **Bold text in paragraphs** acts as section headings — gets an `id` for TableOfContents anchoring and `scroll-mt-20`

### Bold Text

In `globals.css:158-161`:
```css
.portable-text p strong {
  font-size: 1.125rem;    /* 18px */
  line-height: 1.75;
}
```
This is the only differentiation bold gets. No extra margin-top to visually separate it as a heading, no font-weight escalation, no letter-spacing. It functions as a section heading for the TOC system but visually barely stands out.

### New Lines & Spacing

| Element | Current Value | Best Practice |
|---------|--------------|---------------|
| Paragraph margin | `margin-bottom: 1rem` (16px) | 1.25em (~22px at 18px base) |
| List margin | `margin: 1rem 0` | 1.25em |
| List item margin | `margin-bottom: 0.5rem` (8px) | 0.35em (~6px) |
| Custom blocks (images, code, quotes) | `my-8` (32px) | 1.75em (~32px) — fine |

### Font Size & Line Height

| Element | Current | Best Practice |
|---------|---------|---------------|
| Base body text | No explicit size (inherits 16px browser default) | 18–20px for long-form reading |
| Base line-height | Not set (browser default ~1.2) | 1.5–1.7 (WCAG AAA requires 1.5 minimum) |
| Bold "headings" | 18px / line-height 1.75 | Should follow a heading scale |
| Content max-width | `max-w-none` (unlimited) | 42rem / 65ch (~65 characters per line) |

### The `prose` Class Red Herring

The wrapper has `className="prose dark:prose-invert max-w-none portable-text"` but **`@tailwindcss/typography` is not installed** — those prose classes do absolutely nothing. All styling relies on the minimal `.portable-text` rules in globals.css.

---

## Key Issues Ranked by Impact

1. **No base line-height** — Body text at browser-default ~1.2 is well below the 1.5 WCAG minimum and far from the 1.6–1.7 readability sweet spot
2. **No content width constraint** — Text runs edge-to-edge of its container. Optimal is 45–75 characters per line (~42rem)
3. **No heading renderers** — H2/H3/H4 from Sanity render unstyled
4. **Base font size too small** — 16px default is acceptable for UI but tight for sustained reading; 18–20px is the consensus for blogs
5. **Bold-as-headings lack visual hierarchy** — Only 2px larger than body text, no margin-top separation from preceding content

---

## Web Typography Best Practices (Research)

### Line Height

- Consensus: **1.5–1.75** for body text (unitless values)
- Matthew Butterick: **120–145%** (1.2–1.45)
- WCAG 2.0 Level AAA: minimum **1.5**
- Medium: approximately **1.58**
- Sweet spot for 16–18px body text: **1.6–1.7**

**Headings** should use tighter line-height:
- H1, H2: **1.1–1.2**
- H3, H4: **1.2–1.35**

```css
body { line-height: 1.65; }
h1   { line-height: 1.1; }
h2   { line-height: 1.15; }
h3   { line-height: 1.25; }
h4   { line-height: 1.3; }
```

### Kerning / Letter-Spacing

- **Body text**: Do not adjust. Fonts are optimized at their intended size.
- **Large headings**: Slight negative tracking: `-0.01em` to `-0.02em`
- **All-caps text**: Positive tracking: `0.05em` to `0.1em`
- **Small text** (<14px): Slightly increased: `0.01em` to `0.02em`

```css
body         { letter-spacing: normal; }
h1, h2       { letter-spacing: -0.02em; }
h3, h4       { letter-spacing: -0.01em; }
```

Additional kerning settings:
```css
body {
  font-kerning: auto;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

### Font Size

- Modern consensus: **16px minimum**, **18–21px** preferred for long-form
- Medium: **21px** on desktop
- Smashing Magazine: **18px**
- Butterick: **15–25px** depending on font and line length
- Mobile minimum: **16px** (below this, iOS Safari zooms on inputs)

Responsive approach using `clamp()`:
```css
html {
  font-size: clamp(1rem, 0.925rem + 0.375vw, 1.25rem);
  /* Scales from 16px to 20px between 320px and 1600px viewport */
}
```

### Heading Hierarchy — Major Third Scale (1.25 ratio)

| Element | Scale | Size at 18px base | Size at 20px base |
|---------|-------|--------------------|--------------------|
| body    | 1     | 18px (1rem)        | 20px (1rem)        |
| h4      | 1.25  | 22.5px (1.25rem)   | 25px (1.25rem)     |
| h3      | 1.563 | 28px (1.563rem)    | 31px (1.563rem)    |
| h2      | 1.953 | 35px (1.953rem)    | 39px (1.953rem)    |
| h1      | 2.441 | 44px (2.441rem)    | 49px (2.441rem)    |

Mobile scale should compress (use Minor Third / 1.2 ratio):
```css
/* Mobile */
h1 { font-size: 1.728rem; }
h2 { font-size: 1.44rem; }
h3 { font-size: 1.2rem; }
h4 { font-size: 1.1rem; }

/* Desktop (768px+) */
h1 { font-size: 2.441rem; }
h2 { font-size: 1.953rem; }
h3 { font-size: 1.563rem; }
h4 { font-size: 1.25rem; }
```

Weight guidance:
- h1: **700–800**
- h2: **700**
- h3: **600–700**
- h4: **600**

### Paragraph & Block Spacing

- **Between paragraphs**: 1.25em (space should be noticeably larger than line-height)
- **Before headings**: 2em (to separate from previous section)
- **After headings**: 0.5em (to associate with their content)
- **Between list items**: 0.25–0.5em
- **Blockquotes and code blocks**: 1.75em margin

```css
p              { margin-bottom: 1.25em; }
h1, h2, h3, h4 { margin-top: 2em; margin-bottom: 0.5em; }
h1:first-child { margin-top: 0; }
li             { margin-bottom: 0.35em; }
blockquote     { margin: 1.75em 0; }
pre            { margin: 1.75em 0; }
```

### Line Length / Measure

- **45–75 characters per line** (Bringhurst's *Elements of Typographic Style*)
- Ideal: **~65 characters**
- At 18px body text, 65 chars ≈ **650–700px** depending on font
- Common max-width values: **640–720px** (38–42rem at 16px root)
- Medium: ~680px, Smashing Magazine: ~720px

```css
.blog-content {
  max-width: 42rem;       /* ~672px at 16px root, ~65 chars at 18px */
  margin: 0 auto;
  padding: 0 1.25rem;
}
```

---

## Complete Reference Stylesheet

```css
/* === Base === */
html {
  font-size: clamp(1rem, 0.925rem + 0.375vw, 1.25rem);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  line-height: 1.65;
  letter-spacing: normal;
  font-kerning: auto;
}

/* === Content Container === */
.blog-content {
  max-width: 42rem;
  margin: 0 auto;
  padding: 0 1.25rem;
}

/* === Headings === */
h1 {
  font-size: 2.441rem;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-weight: 800;
  margin-top: 0;
  margin-bottom: 0.5em;
}

h2 {
  font-size: 1.953rem;
  line-height: 1.15;
  letter-spacing: -0.02em;
  font-weight: 700;
  margin-top: 2em;
  margin-bottom: 0.5em;
}

h3 {
  font-size: 1.563rem;
  line-height: 1.25;
  letter-spacing: -0.01em;
  font-weight: 600;
  margin-top: 1.75em;
  margin-bottom: 0.5em;
}

h4 {
  font-size: 1.25rem;
  line-height: 1.3;
  letter-spacing: -0.01em;
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

/* === Body Text === */
p {
  margin-bottom: 1.25em;
}

/* === Lists === */
ul, ol {
  margin-bottom: 1.25em;
  padding-left: 1.5em;
}

li {
  margin-bottom: 0.35em;
}

/* === Blockquote === */
blockquote {
  margin: 1.75em 0;
  padding-left: 1.25em;
  border-left: 3px solid currentColor;
  font-style: italic;
}

/* === Code === */
pre {
  margin: 1.75em 0;
  padding: 1.25em;
  overflow-x: auto;
  font-size: 0.875em;
  line-height: 1.6;
}

/* === Responsive Heading Scale === */
@media (max-width: 767px) {
  h1 { font-size: 1.728rem; }
  h2 { font-size: 1.44rem; }
  h3 { font-size: 1.2rem; }
  h4 { font-size: 1.1rem; }
}
```

---

## Sources

- Matthew Butterick, *Practical Typography* — line spacing, line length, font size
- Robert Bringhurst, *The Elements of Typographic Style* — 45–75 character line length
- WCAG 2.0/2.1 Success Criterion 1.4.8 (Level AAA) — line spacing ≥1.5, line length ≤80 chars
- Smashing Magazine — 18px body, ~720px content width
- Type-Scale.com — Major Third (1.25), Perfect Fourth (1.333) scales
- Medium's design — 21px body, ~1.58 line-height, ~680px content width
- iA (Information Architects) — 50–75 chars per line optimal
- Google Fonts Knowledge — optical sizing, line-height guidance
