/**
 * ============================================================================
 * TEMPORARY PREVIEW / DEV PAGE. NOT FOR PRODUCTION. SAFE TO DELETE.
 * ============================================================================
 *
 * Route: /dgx-preview/
 *
 * WHY THIS EXISTS
 * ---------------
 * The DGX Spark article lives in Sanity as Portable Text, and its four
 * interactive components (DgxHeroStat, DgxPriceChart, DgxScenarioMatrix,
 * DgxSpeculationLab) are embedded via `interactiveComponent` blocks. That means
 * there is no way to eyeball the *finished* article (prose + components, in
 * real site chrome) until the post is actually drafted/published in the CMS.
 *
 * This page short-circuits that: it hard-codes the article prose as JSX inside
 * the exact same `.portable-text` wrapper and `PageLayout` container that
 * `app/(site)/posts/[slug]/page.tsx` uses, and drops the four components inline
 * at their intended positions. What you see here is what the real post will
 * look like.
 *
 * NON-PRODUCTION GUARDRAILS
 * -------------------------
 *  - `robots: { index: false, follow: false }` below: never indexed.
 *  - A visible "PREVIEW" banner at the top of the page body.
 *  - No Sanity fetch, no view counter, no JSON-LD, no sitemap entry
 *    (app/sitemap.ts only enumerates static pages + Sanity posts, so this route
 *    is absent from it by construction).
 *
 * DELETE ME once the article is live in Sanity. Deleting this single directory
 * is sufficient; nothing else in the app imports from it.
 * ============================================================================
 */

import type { Metadata } from 'next';
import PageLayout from '@/app/components/PageLayout';
import ScrollToTop from '@/app/components/ScrollToTop';

// The four interactive components under review. They are all `'use client'`,
// default-export, and take no props, so a server component can import them
// directly (Next.js inserts the client boundary). We import them statically
// rather than going through InteractiveBlock's `next/dynamic` registry so the
// preview fails loudly at build time if any of them is broken.
import DgxHeroStat from '@/app/components/blog-components/dgx-spark-tracker/DgxHeroStat';
import DgxPriceChart from '@/app/components/blog-components/dgx-spark-tracker/DgxPriceChart';
import DgxScenarioMatrix from '@/app/components/blog-components/dgx-spark-tracker/DgxScenarioMatrix';
import DgxSpeculationLab from '@/app/components/blog-components/dgx-spark-tracker/DgxSpeculationLab';

export const metadata: Metadata = {
  title: 'DGX Spark article preview (dev only)',
  description:
    'Non-production preview of the DGX Spark article with its four interactive components. Not for public consumption.',
  // Hard noindex/nofollow: this must never reach search results.
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Inline external link. Mirrors the `marks.link` renderer in the real post page
 * (`portable-text-link` class + external target/rel), so link styling and hover
 * behaviour match a genuine article exactly.
 */
function L({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="portable-text-link"
    >
      {children}
    </a>
  );
}

/**
 * Embed wrapper. Reproduces `InteractiveBlock`'s `my-8` spacing and centered
 * italic caption so the rhythm here is identical to a real post's
 * `interactiveComponent` block.
 */
function Embed({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-8">
      {children}
      <p className="text-sm text-muted-foreground text-center mt-3 italic">
        {caption}
      </p>
    </div>
  );
}

export default function DgxPreviewPage() {
  return (
    <PageLayout>
      <ScrollToTop />

      {/* ---- DEV-ONLY BANNER -------------------------------------------- */}
      {/* Deliberately visible on every render (not gated on NODE_ENV) so the  */}
      {/* page can never be mistaken for the real article, even if it somehow  */}
      {/* gets deployed to a preview/production build.                        */}
      <div className="mb-6 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        PREVIEW: not production. Article + interactive components for review
        only.
      </div>

      <div className="max-w-none">
        {/* Post title + byline row, matching the real post header treatment. */}
        <h1 className="page-enter text-3xl md:text-4xl font-extrabold mb-2">
          The Chip Is Depreciating. The 128GB Is Not.
        </h1>

        <div className="page-enter flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          {/* Static stand-in for the real <time> / ViewCounter / TagPill row. */}
          <time dateTime="2026-08-23">August 23, 2026</time>
          <span>Draft preview</span>
        </div>

        {/* Same wrapper the real post uses: `.portable-text` supplies all the
            heading sizes, paragraph rhythm, and link styling from globals.css. */}
        <article className="page-enter-2 max-w-none portable-text">
          {/* ---- INTRO -------------------------------------------------- */}
          <p>
            Right now, 128GB of bare DDR5 desktop memory (no processor, no
            case, no power supply){' '}
            <L href="https://www.tomshardware.com/pc-components/ram/memory-prices-climb-500-percent-in-12-months-up-to-10x-the-lowest-ever-tracked-prices-128gb-of-ddr5-now-usd3-399">
              retails for about $3,399
            </L>
            . That is most of the price of an entire ASUS Ascent GX10, a
            complete 128GB AI workstation. Spot memory is up roughly 500% in
            twelve months.
          </p>

          <p>
            That single comparison is the whole thesis. A GB10-class box, whether{' '}
            <L href="https://forums.developer.nvidia.com/t/2-23-2026-price-change-announcement/361713">
              NVIDIA&rsquo;s DGX Spark at $4,699
            </L>{' '}
            or the{' '}
            <L href="https://forums.developer.nvidia.com/t/gx10-price-increase-3499-3999/373025">
              GX10 at $3,999
            </L>
            , is not really a computer. It is 128GB of LPDDR5X, bid against the
            AI servers drawing on the same pool, with a Blackwell GPU attached.
            The silicon ages on the ordinary schedule. The memory does not.
          </p>

          <p>
            Buy one now. Through end-2028 this holds real value with genuine
            upside, and the downside is well-floored. Here is the case.
          </p>

          {/* ---- EMBED 1/4: DgxHeroStat --------------------------------- */}
          {/* Placed immediately after the intro: it is the at-a-glance key-  */}
          {/* facts card, so it front-loads every number the body then argues */}
          {/* from (reprice, MSRPs, resale hurdles, street range, sold comp). */}
          <Embed caption="The fixed figures the rest of the piece argues from: repriced MSRPs, the end-2028 real-flat hurdles, today's street range, and the first verified sold comp.">
            <DgxHeroStat />
          </Embed>

          {/* ---- BODY --------------------------------------------------- */}
          <h2 className="scroll-mt-20">
            The manufacturer has already told you which way this goes
          </h2>

          <p>
            Computers get cheaper. These got more expensive. NVIDIA raised the
            Spark 17.5% in February 2026 and named memory as the reason. ASUS
            followed on the GX10 in June, +14.3%. In July, NVIDIA quietly{' '}
            <L href="https://hwbusters.com/news/nvidia-jetson-prices-jump-up-to-101-the-249-orin-nano-super-is-now-399/">
              raised Jetson prices by up to 101%
            </L>
            : the $249 Orin Nano Super became $399.
          </p>

          <p>
            When a list price tracks a commodity&rsquo;s cost upward, you hold a
            pass-through instrument, not a depreciating good. Replacement cost
            is the floor under any resale, and the manufacturer keeps raising
            it.
          </p>

          <h2 className="scroll-mt-20">
            This exact experiment already ran, and it paid
          </h2>

          <p>
            The Spark&rsquo;s true class analog is the Jetson AGX Orin developer
            kit: NVIDIA-branded, fixed memory, developer-targeted. It{' '}
            <L href="https://www.engadget.com/nvidia-jetson-agx-orin-price-release-date-163327815.html">
              launched at $1,999 in March 2022
            </L>
            . NVIDIA&rsquo;s{' '}
            <L href="https://marketplace.nvidia.com/en-us/enterprise/robotics-edge/jetson-agx-orin-developer-kit/">
              own marketplace
            </L>{' '}
            now lists it at <strong>$3,499, up 75% nominal at year four</strong>
            . Used kits ask $1,500 to $3,000 on eBay, roughly 75 to 150% of
            launch, against the 20 to 30% a textbook workstation retains by year
            four.
          </p>

          <p>
            The control case names the failure mode exactly. DGX Station V100
            went from $69,000 in 2018 to roughly 25% retention by year seven,
            because a faster successor shipped at a comparable price, twice. Age
            is not what kills these boxes. A successor is. And through 2028
            there isn&rsquo;t one: the RTX Spark N1X is the same GB10 compute
            class with the same 128GB ceiling, and the announced 2027 roadmap
            parts add bandwidth, not capacity.
          </p>

          {/* ---- EMBED 2/4: DgxPriceChart ------------------------------- */}
          {/* Sits in the supply/price-trajectory discussion, right after the  */}
          {/* successor-risk argument, where the reader wants to see the price */}
          {/* path over time rather than read another paragraph about it.      */}
          <Embed caption="Modelled price paths for the GB10 class against the memory cycle. The successor gap through 2028 is the flat stretch.">
            <DgxPriceChart />
          </Embed>

          <h2 className="scroll-mt-20">The bar is lower than people assume</h2>

          <p>
            Holding real value here is not a demand for a collectible run. Using{' '}
            <L href="https://www.cbo.gov/publication/62105">CBO&rsquo;s</L>{' '}
            projected 2.4% (2027) and 2.3% (2028) inflation, real-flat through
            end-2028 means recovering about{' '}
            <strong>$4,923 for a Spark and $4,189 for a GX10</strong>, or 4.76%
            above end-2026 cost. Slightly better than cash. That&rsquo;s it.
          </p>

          <p>
            <L href="https://pricehistory.app/p/nvidia-dgx-spark-personal-ai-desktop-supercomputer-Qdtogsmb">
              Tracked Spark asks
            </L>{' '}
            already run <strong>$4,999 to $5,449</strong>. An ask is not a sale,
            and that qualifier stands. But the 2028 hurdle is being quoted two
            years early.
          </p>

          {/* ---- EMBED 3/4: DgxScenarioMatrix --------------------------- */}
          {/* Anchored to the scenario/hurdle section: the reader has just been */}
          {/* given one bar (end-2028 real-flat); the matrix lets them walk the  */}
          {/* same question across every scenario family and checkpoint year.   */}
          <Embed caption="The same question across every scenario family and December checkpoint. Toggle between the GB10-class low and the NVIDIA flagship street price.">
            <DgxScenarioMatrix />
          </Embed>

          <h2 className="scroll-mt-20">
            Appreciation is already realized, just not in dollars
          </h2>

          <p>
            Japan gives a clean read, with no exposure to the US MSRP decision.
            Lenovo&rsquo;s ThinkStation PGX, a GB10 twin, launched there
            2025-10-15 at{' '}
            <L href="https://news.mynavi.jp/article/20251015-3552457/">
              ¥759,000 tax-included
            </L>
            . The lowest tracked street price for that identical 1TB
            configuration in August 2026 is{' '}
            <L href="https://kakaku.com/item/K0001792529/">about ¥929,830</L>. That
            is <strong>+22.5% on the same box in ten months.</strong>
          </p>

          <p>
            And there are realized closes, not just asks. Three PGX units sold
            on{' '}
            <L href="https://auctions.yahoo.co.jp/jp/auction/t1235818029">
              Yahoo Auctions Japan
            </L>{' '}
            between June and July 2026 at ¥682,900, ¥681,000 and ¥730,000, or 90
            to 96% of tax-inclusive launch list. Strip the 10% consumption tax
            that a private auction sale does not carry, and the July 12 close
            printed{' '}
            <strong>
              5.8% above ex-tax launch list, nine months after launch
            </strong>
            : the first realized GB10-class transaction at or above an original
            list price in any currency.
          </p>

          <p>
            Two honest debits. At sale-date FX (~¥161/$, not the ¥150 the study
            first used) those closes are $4,207 to $4,510, around the GX10 bar and
            below the Spark&rsquo;s. And the PGX units carried Lenovo Premier
            Support into 2029, so they are not bare-Spark proxies. But the USD
            shortfall is a weak-yen artifact, not a weak market. The
            local-currency read is the real one, and it points up in two
            independent geographies at once.
          </p>

          <h2 className="scroll-mt-20">The objections, and why they lose</h2>

          <p>
            <strong>&ldquo;The cheap RTX Spark resets the class.&rdquo;</strong>{' '}
            Twelve weeks after Computex it still has no price. The{' '}
            <L href="https://www.pcworld.com/article/3156219/the-price-of-nvidia-rtx-spark-pcs-is-going-to-hurt.html">
              $2,500 figure
            </L>{' '}
            and Morgan Stanley&rsquo;s ~$2,899 &ldquo;floor&rdquo; were both set
            in early June, before two more months of DRAM inflation. And the
            memory BOM alone runs{' '}
            <L href="https://wccftech.com/mobile-dram-prices-expected-to-increase-by-100-quarter-over-quarter-as-long-term-agreements-now-getting-signed-at-prices-as-high-as-21-gb/">
              $21/GB on long-term agreements
            </L>
            , about $2,688 per 128GB, or ~$1,880 at July spot. Those leaks price
            the memory at nearly the whole machine. And ASUS&rsquo;s first
            allocation is{' '}
            <L href="https://videocardz.com/newz/asus-says-its-first-rtx-spark-allocation-is-already-fully-pre-ordered-by-channel-partners">
              fully preordered by channel partners
            </L>
            . The flood has no supply behind it.
          </p>

          <p>
            <strong>&ldquo;DRAM normalizes.&rdquo;</strong> The bear forecast,{' '}
            <L href="https://www.notebookcheck.net/DRAM-crisis-Analysts-expect-drastic-price-drop-in-2028.1337992.0.html">
              Bernstein and Jefferies at 15 to 20% off in 2028
            </L>
            , is a sell-side projection, and it falls from a far higher end-2027
            peak; Goldman has the{' '}
            <L href="https://www.benzinga.com/markets/tech/26/06/52907425/goldman-memory-shortage-2028-samsung-hynix-kioxia-sandisk-micron">
              squeeze running to 2028
            </L>
            . Device prices lag DRAM by one to two quarters, dragging the
            device-price peak into 2028 itself. The fabs that end this (Micron
            New York, SK hynix M17, Samsung P5) arrive 2029 to 2031. Relief
            lands after the measurement date.
          </p>

          <p>
            <strong>
              &ldquo;First-party still sells at $3,999.&rdquo;
            </strong>{' '}
            True, and it is the sharpest objection:{' '}
            <L href="https://forums.developer.nvidia.com/t/deal-alert-dgx-spark-for-3-999-at-micro-center-best-buy-price-match-works-too-if-not-in-area/374387">
              Micro Center held that price
            </L>{' '}
            months after the hike, and Best Buy ran a limited-quantity sale in
            August. But notice what the objection concedes: the pre-hike price
            is still occasionally available. That is not a reason to pass. That
            is the entry.
          </p>

          <p>
            <strong>&ldquo;Institutions will dump theirs.&rdquo;</strong> On
            five-to-six-year book lives, that wave lands 2029 to 2031, after
            the window shuts.
          </p>

          {/* ---- EMBED 4/4: DgxSpeculationLab --------------------------- */}
          {/* Follows the counter-arguments: having heard every way the trade   */}
          {/* can break, the reader can now price the branches themselves. This */}
          {/* is the EV tree, so it belongs after the objections, before the     */}
          {/* recommendation it feeds.                                          */}
          <Embed caption="The resale-only expected-value tree: drag the assumptions and watch the five branches reprice. Usage value is deliberately excluded.">
            <DgxSpeculationLab />
          </Embed>

          <h2 className="scroll-mt-20">The recommendation</h2>

          <p>
            Buy the GX10 at $3,999 for the cleanest expression: the same scarce
            memory, $700 less exposure, a list that has already moved +14.3% on
            its own. Buy the Spark if you can catch a first-party print at
            $3,999 to $4,699.
          </p>

          <p>
            The asymmetry makes this sound rather than clever. Downside is
            capped by a use-value floor: you own the machine, you run the models
            locally, and the compute is consumed whether or not a resale bid
            ever shows up. The worst print in the corpus is one US liquidator
            listing a used GX10 at $2,000, a single surplus-dealer ask, against
            a class whose new price keeps rising. The upside needs only one of:
            a second hike, a stockout, an EOL notice, or Japan&rsquo;s +22.5%
            pace merely continuing.
          </p>

          <p>
            Two observables settle it, both checkable in minutes: the first
            official RTX Spark price against that $2,899 floor, and any second
            US Spark hike or EOL notice. NVIDIA reprices developer hardware
            mid-cycle when memory forces it. Jetson proved that twice inside
            three weeks.
          </p>

          <p>
            Push the horizon to 2030 and the bar rises to about $5,151 while
            normalization, successors and institutional supply all arrive at
            once. Different bet, harder one. Through 2028 the shape is simple,
            and it is already visible in the tape: the silicon ages, but the
            memory sets the price.
          </p>
        </article>

        {/* ---- DEV-ONLY FOOTNOTE ------------------------------------------ */}
        <div className="mt-12 pt-6 border-t text-xs text-muted-foreground">
          Dev note: prose is hard-coded JSX, not fetched from Sanity. Delete{' '}
          <code>app/(site)/dgx-preview/</code> once the real post ships.
        </div>
      </div>
    </PageLayout>
  );
}
