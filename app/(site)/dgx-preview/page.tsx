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
 * there is no way to eyeball the finished article (prose + components, in
 * real site chrome) until the post is actually drafted or published in the CMS.
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
import DgxHeroStat from '@/app/components/blog-components/dgx-spark-tracker/DgxHeroStat';
import DgxPriceChart from '@/app/components/blog-components/dgx-spark-tracker/DgxPriceChart';
import DgxScenarioMatrix from '@/app/components/blog-components/dgx-spark-tracker/DgxScenarioMatrix';
import DgxSpeculationLab from '@/app/components/blog-components/dgx-spark-tracker/DgxSpeculationLab';

export const metadata: Metadata = {
  title: 'DGX Spark Worth It? Why 128GB Holds Value Through 2028',
  description:
    'NVIDIA raised the DGX Spark to $4,699 as memory surged: 128GB of desktop DDR5 alone costs $3,399. Why memory, not the chip, sets resale value through 2028.',
  robots: {
    index: false,
    follow: false,
  },
};

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

export default function DgxPreviewPage() {
  return (
    <PageLayout>
      <ScrollToTop />

      <div className="mb-6 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        PREVIEW: not production. Article + interactive components for review
        only.
      </div>

      <div className="max-w-none">
        <p className="page-enter mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          The Chip Is Depreciating. The 128GB Is Not.
        </p>
        <h1 className="page-enter text-3xl md:text-4xl font-extrabold mb-2">
          DGX Spark Worth It? Why 128GB Holds Value Through 2028
        </h1>

        <p className="page-enter mb-4 text-lg leading-relaxed text-muted-foreground md:text-xl">
          NVIDIA raised the DGX Spark to $4,699 as memory surged: 128GB of
          desktop DDR5 alone costs $3,399. Why memory, not the chip, sets resale
          value through 2028.
        </p>

        <div className="page-enter flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <time dateTime="2026-08-23">August 23, 2026</time>
          <span>Draft preview</span>
        </div>

        <article className="page-enter-2 max-w-none portable-text">
          <p>
            Is the DGX Spark worth it? For a buyer who will actually use 128GB
            locally, conditionally yes. The current DGX Spark price is $4,699,
            while 128GB of bare desktop DDR5, no processor or case or power
            supply,{' '}
            <L href="https://www.tomshardware.com/pc-components/ram/memory-prices-climb-500-percent-in-12-months-up-to-10x-the-lowest-ever-tracked-prices-128gb-of-ddr5-now-usd3-399">
              retailed for about $3,399
            </L>{' '}
            in August 2026. That is a comparison, not Spark&apos;s bill of
            materials: Spark packages 128GB of LPDDR5X unified memory into a
            complete GB10 workstation. But it names the mechanism. A GB10 box
            is 128GB of scarce memory, bid against the AI servers drawing on the
            same pool, with a Blackwell GPU attached.
          </p>

          <p>
            The bull case ends at 2028, not forever. Memory pressure, thin used
            supply, and demand for large local models can hold replacement cost
            high enough to preserve real value with genuine resale upside.
            Three things break it: a cheap 128GB successor or reliable
            first-party stock at $3,999, a faster DRAM correction, or an early
            institutional disposal wave. Searches for NVIDIA Spark also surface
            RTX Spark, a separate and still unpriced consumer PC family. The
            chip is depreciating. The 128GB is not.
          </p>

          <div className="my-8">
            <DgxHeroStat />
          </div>

          <p>
            The card anchors launch price, current MSRP, GX10 price, real-flat
            hurdles, asking range, and the first sold comp, all dated snapshots
            rather than live quotes. Later evidence includes three completed
            PGX auctions.
          </p>

          <h2 className="scroll-mt-20">Is the DGX Spark worth it?</h2>

          <p>
            Yes, when the machine has immediate utility and the entry price is
            defensible. The{' '}
            <L href="https://forums.developer.nvidia.com/t/gx10-price-increase-3499-3999/373025">
              GX10 at $3,999
            </L>{' '}
            is the cleaner purchase: same GB10 chip, same 128GB, $700 less
            exposure. A{' '}
            <L href="https://forums.developer.nvidia.com/t/2-23-2026-price-change-announcement/361713">
              Spark FE
            </L>{' '}
            bought between $3,999 and $4,699 still earns its keep on the 4TB
            configuration, reference platform, and NVIDIA channel. Bought
            purely for resale, either is a speculative trade. Usage creates a
            floor the resale spreadsheet omits, and end-2028 real-value
            retention is plausible rather than guaranteed. It does not require
            collectibility.
          </p>

          <h2 className="scroll-mt-20">
            DGX Spark price: memory is setting the near-term replacement cost
          </h2>

          <p>
            Computers get cheaper. These got more expensive. NVIDIA{' '}
            <L href="https://www.tomshardware.com/desktops/mini-pcs/nvidia-dgx-spark-gets-18-percent-price-increase-as-memory-shortages-bite-founders-edition-now-usd4-699-up-from-usd3-999">
              raised Spark from $3,999 to $4,699 in February 2026
            </L>, a 17.5 percent memory-driven increase, and honored existing
            orders. ASUS followed in June, taking the GX10 up 14.3 percent. In
            July, NVIDIA{' '}
            <L href="https://hwbusters.com/news/nvidia-jetson-prices-jump-up-to-101-the-249-orin-nano-super-is-now-399/">
              raised Jetson prices by as much as 101 percent
            </L>: the $249 Orin Nano Super became $399. Spot memory was up roughly
            500 percent year over year, and Q2 2026 DRAM contract prices rose
            about 63 percent quarter over quarter.
          </p>

          <p>
            The pressure runs up the ladder too. MSI&apos;s GB300-based
            XpertStation WS300{' '}
            <L href="https://www.techradar.com/pro/msi-re-launches-usd85-000-nvidia-dgx-station-workstation-with-the-nvidia-gb300-ultra-a-pair-of-400gbe-lan-ports-and-768gb-of-ram">
              launched at $85,000 in March 2026
            </L>, then surfaced as reseller asks of{' '}
            <L href="https://www.centralcomputer.com/msi-xpertstation-ws300-ai-workstation-nvidia-gb300-grace-72-core-cpu-496gb-lpddr5x-ram-blackwell-gpu-252gb-hbm3e.html">
              $99,999.99
            </L>{' '}
            and{' '}
            <L href="https://www.avadirect.com/MSI-XpertStation-WS300-AI-Workstation-NVIDIA-DGX-Station-Architecture/Configure/20211619">
              $113,299 with delayed shipping
            </L>, 18 to 22 times Spark&apos;s price. Its 748GB pool is 496GB of
            LPDDR5X plus 252GB of HBM3e, the same squeezed class Spark is built
            from.
          </p>

          <p>
            When a list price tracks a commodity upward, you hold a
            pass-through instrument, not a depreciating good. Replacement cost
            is the floor under any resale, but it supports that resale only
            while demand survives.
          </p>

          <h3 className="scroll-mt-20">
            Used prices for Jetson AGX Orin, DGX Station V100, and A100
          </h3>

          <p>
            The closest class analog is NVIDIA&apos;s Jetson AGX Orin developer
            kit: NVIDIA-branded, fixed memory, developer-targeted. It{' '}
            <L href="https://www.engadget.com/nvidia-jetson-agx-orin-price-release-date-163327815.html">
              launched at $1,999 in March 2022
            </L>. NVIDIA&apos;s{' '}
            <L href="https://marketplace.nvidia.com/en-us/enterprise/robotics-edge/jetson-agx-orin-developer-kit/">
              own marketplace
            </L>{' '}
            now lists it at $3,499, up 75 percent nominal at year four, and used
            kits ask $1,500 to $3,000, or 75 to 150 percent of launch, against
            the 20 to 30 percent a textbook workstation retains at year four.
          </p>

          <p>
            The control case names the failure mode. DGX Station V100, a
            $69,000 system launched in 2018, retained about 25 percent by year
            seven because a faster successor shipped at a comparable price,
            twice. Age is not what kills these boxes. A successor is. Through
            2028 there is no faster one in view: the RTX Spark N1X is the same
            GB10 compute class with the same 128GB ceiling, and the announced
            2027 roadmap parts add bandwidth, not capacity. Its price is the
            open question, and that belongs to the falsifiers below.
          </p>

          <p>
            Datacenter parts show the split. Against a roughly $30,000 list the
            H100{' '}
            <L href="https://pantheon.run/research/h100-cliff-gpu-secondary-market">
              peaked near $50,000 in mid-2024
            </L>, then traded{' '}
            <L href="https://compute.exchange/blogs/h100-gpu-price-2026">
              $15,000 to $28,000 used by August 2026
            </L>, a drawdown past 50 percent for whoever bought that top. But
            compute scarcity normalized, and the older A100 moved the other way
            in the same window: GPU Poet&apos;s low-average series{' '}
            <L href="https://gpupoet.com/gpu/learn/price/august-2026/nvidia-a100-pcie">
              rose from $9,089 in March 2026 to $11,837 in August
            </L>, roughly 30 percent on a five-year-old part, while still sitting
            35 to 60 percent below launch. Calling that the memory squeeze
            reaching stale inventory is an inference, not a proved
            decomposition. But the split it points at is the thesis: parts
            constrained by memory and allocation rather than raw compute rise
            late in life, and Spark is a memory-tier product.
          </p>

          <h2 className="scroll-mt-20">
            DGX Spark resale value: what an end-2028 sale must clear
          </h2>

          <p>
            On <L href="https://www.cbo.gov/publication/62105">CBO&apos;s</L>{' '}
            projected inflation of 2.4 percent in 2027 and 2.3 percent in 2028,
            an end-2026 purchase must recover about $4,923 for a Spark or $4,189
            for a GX10 at end-2028 to stay flat in real terms, before selling
            costs. That is 4.76 percent above end-2026 cost. Slightly better
            than cash. That&apos;s it.
          </p>

          <p>
            Purchase-date inflation and platform fees, a tiered marketplace
            rate of about 4.7 percent on a $5,000 sale rather than the 13 percent
            a casual model assumes, can together lift Spark&apos;s required
            gross sale above $5,200, or about $4,400 for the GX10. Local cash
            avoids that drag. The warranty question answers itself by then:
            NVIDIA&apos;s Spark warranty runs one year and does not transfer, so
            by the 2028 measurement date seller and buyer face the same
            zero-warranty asset, and the used discount against a fresh unit is
            narrower than the generic rule implies.
          </p>

          <p>
            <L href="https://pricehistory.app/p/nvidia-dgx-spark-personal-ai-desktop-supercomputer-Qdtogsmb">
              Tracked Spark asks
            </L>{' '}
            already run $4,999 to $5,449. An ask is not a sale, and that
            qualifier stands. But the 2028 hurdle is being quoted two years
            early.
          </p>

          <p>
            The mechanism is arithmetic: used proceeds equal a condition ratio
            times the contemporaneous new price, and that ratio for scarce
            consumer compute runs above workstation intuition. A used RTX 4090
            marks{' '}
            <L href="https://www.getpcparts.com/market-prices/gpu-graphics-cards/rtx-4090">
              around $2,200
            </L>{' '}
            against roughly{' '}
            <L href="https://bestvaluegpu.com/history/new-and-used-rtx-4090-price-history-and-specs/">
              $2,755 for remaining new stock
            </L>, near 0.80, both far above its $1,599 launch MSRP. Withdraw a
            configuration with no same-memory replacement and the ratio
            approaches one: Apple&apos;s refurbished channel priced the retired{' '}
            <L href="https://www.reddit.com/r/MacStudio/comments/1ufabhh/refurb_m3_ultra_512gb_now_starts_at_14609_m5/">
              M3 Ultra 512GB Mac Studio at $14,609
            </L>{' '}
            against a $9,499 to $10,499 original. The 0.3 to 0.6 discount regime
            people expect is an enterprise-workstation phenomenon, absent from
            every consumer scarce-compute channel on record. As proxy
            scenarios, not observed Spark ratios: at 0.95 the GX10 clears once
            equivalent new reaches about $4,640, roughly where the class
            already trades, while Spark needs about $5,490, or $6,520 at 0.80.
          </p>

          <p>
            Thin float is why those ratios print. In August 2026 the 4090 showed
            roughly{' '}
            <L href="https://rigprice.com/gpu/rtx-4090/">
              65 active used listings
            </L>{' '}
            against about{' '}
            <L href="https://www.pcprice.watch/search/RTX4090/US/GPU">
              59 sold per month
            </L>, one month of visible inventory for a card that shipped in the
            hundreds of thousands. The GB10 class is thinner: a handful of
            Kleinanzeigen listings, and{' '}
            <L href="https://swappa.com/prices/nvidia-dgx-spark">
              Swappa still averaging $0 because no sale has completed
            </L>. Ten months post-launch the visible worldwide float is countable
            on two hands. The modal owner is keeping the box.
          </p>

          <p>
            Japan gives the first clean read, with no exposure to the US MSRP
            decision. Lenovo&apos;s ThinkStation PGX, a GB10 twin, launched there
            on 2025-10-15 at{' '}
            <L href="https://news.mynavi.jp/article/20251015-3552457/">
              ¥759,000 including tax
            </L>, on a ¥690,000 ex-tax basis; the lowest tracked street price for
            that identical 1TB configuration in August 2026 is{' '}
            <L href="https://kakaku.com/item/K0001792529/">
              about ¥929,830
            </L>, up 22.5 percent in ten months. There are realized closes, not just
            asks: three PGX units sold on{' '}
            <L href="https://auctions.yahoo.co.jp/jp/auction/t1235818029">
              Yahoo Auctions Japan
            </L>{' '}
            between June and July 2026 at ¥682,900, ¥681,000 and ¥730,000, or 90
            to 96 percent of tax-inclusive launch list. Strip the 10 percent
            consumption tax a private auction does not carry and the July 12
            close printed 5.8 percent above ex-tax launch list, nine months
            after launch: the first realized GB10-class transaction at or above
            an original list price in any currency. Two debits travel with it.
            At sale-date FX near ¥161 per dollar those closes convert to $4,207
            to $4,510, around the GX10 bar and below Spark&apos;s, and the units
            carried Lenovo Premier Support into 2029, so they are not bare-Spark
            proxies.
          </p>

          <p>
            Measured against contemporaneous Japanese street prices, those same
            closes print a realized GB10-class ratio band of 0.73 to 0.79
            tax-inclusive, 0.81 to 0.86 ex-tax, below both proxies above. On the
            conservative tax-inclusive transfer, a Spark FE would need
            contemporaneous new near $6,200 to $6,800 to clear its real-flat
            bar, while the GX10 clears at $5,300 to $5,800, a level its own list
            is already trending toward.
          </p>

          <p>
            That is the honest bear sitting inside the bull case, and it belongs
            in the open: the only realized ratios anyone has are below the
            proxies the scenario math leans on. Three things stop it short of
            flipping the verdict. It was struck in a float countable on two
            hands, in one country, where a private auction is the discount
            channel of first resort. It was struck at a weak yen, against a
            denominator that had already climbed 22.5 percent, and a rising
            contemporaneous new price is the mechanism itself rather than noise
            around it. And the warranty gap that normally drives the used
            discount is closing on its own by 2028. Under all three, the
            replacement cost of the memory keeps being marked up by the
            manufacturers. The band narrows the margin instead of reversing the
            direction, and it is exactly why the GX10 is the cleaner expression:
            it needs less of that move to clear.
          </p>

          <p>
            Recorded history ends in August 2026. Everything after it is a
            projection. The chart opens seven modeled paths with series toggles
            and linear or logarithmic scales, and its seed history is nominal
            while scenario outputs use real 2025 dollars, so read the joined
            series for direction, not as one continuous real-return curve.
          </p>

          <div className="my-8">
            <DgxPriceChart />
          </div>

          <p>
            The long tails are stress tests. The matrix compares those scenarios
            at December checkpoints and switches between Spark-class and
            flagship prices; a missing line means the modeled consumer market
            has ended, not that a 2040 narrative became a forecast.
          </p>

          <div className="my-8">
            <DgxScenarioMatrix />
          </div>

          <p>
            At December 2028, static Spark projections run from $2,500 or $3,500
            in the AI 2027 branches, to $4,499 baseline, to $7,000 across the AI
            2040 branches; by 2030 they span $300 to $25,000. The spread warns
            about assumptions; it does not validate the dramatic branch.
          </p>

          <h2 className="scroll-mt-20">
            Why 128GB can remain useful through 2028
          </h2>

          <p>
            Local inference is a compounding base with dates on it.{' '}
            <L href="https://www.techtimes.com/articles/320061/20260710/ollama-closes-65m-series-b-reaches-89m-developers-local-open-weight-ai.htm">
              Ollama reported 8.9 million developers and a $65 million Series B
              in July 2026
            </L>, its Python client logs{' '}
            <L href="https://pypistats.org/packages/ollama">
              about 19.1 million downloads a month
            </L>, and Qwen has passed{' '}
            <L href="https://valueaddvc.com/blog/alibaba-qwen-download-statistics-2026-3-billion-downloads-ranked-against-every-open-weight-model">
              3 billion cumulative downloads
            </L>. Renting moved the other way when Anthropic{' '}
            <L href="https://www.techtimes.com/articles/317625/20260602/anthropic-ends-subscription-subsidy-agents-june-15-credit-pool-replaces-flat-rate-access.htm">
              ended flat-rate subscription use for third-party agent workloads
              on June 15, 2026
            </L>{' '}
            and shifted Claude Enterprise toward token billing that April.
            Casual API use stayed cheap; the squeeze landed on heavy, agentic,
            residency-bound workloads, precisely the buyer with the arithmetic
            to justify a $4,699 box.
          </p>

          <p>
            Deloitte&apos;s 2026 infrastructure survey recorded respondents
            expecting edge-AI adoption to rise from 36 percent to 72 percent by
            2028, with infrastructure budgets more than tripling. ABI Research
            projected on-premises AI servers growing from 2.5 million units in
            2026 to 5.8 million in 2031 at an 18 percent annual rate; applying
            that rate evenly gives roughly 3.5 million units in 2028, which is
            our interpolation and not an ABI forecast. Expectations, not
            bookings, but they set the direction of the pool a used Spark sells
            into.
          </p>

          <p>
            The utility ratchet is the concrete part. A 2026 buyer&apos;s box got
            materially more capable with no hardware change: GPT-OSS-120B,
            MiniMax M2.7, and the 284B-parameter DeepSeek V4 Flash at roughly
            80GB to 103GB quantized all landed inside the 128GB line, and a
            Qwen3.5-122B run was demonstrated on a single Spark. The ceiling is
            real: a 400B-class mixture-of-experts model still needs about 240GB
            at INT4, against roughly 109GB to 115GB usable on a Spark.
            Quantization gains and model growth run neck and neck at the 128GB
            line. Neck and neck is enough for a 2028 utility case, though not
            for an indefinite moat.
          </p>

          <h2 className="scroll-mt-20">What could break the 2028 thesis?</h2>

          <h3 className="scroll-mt-20">
            A cheap successor or abundant first-party stock
          </h3>

          <p>
            RTX Spark is the largest unresolved variable, and twelve weeks
            after Computex it still has no price and no consumer pre-order page.
            The{' '}
            <L href="https://www.pcworld.com/article/3156219/the-price-of-nvidia-rtx-spark-pcs-is-going-to-hurt.html">
              $2,500 figure
            </L>{' '}
            and Morgan Stanley&apos;s roughly $2,899 floor were both set in early
            June, before two more months of DRAM inflation, and neither was an
            official MSRP. Mobile DRAM long-term agreements have since{' '}
            <L href="https://wccftech.com/mobile-dram-prices-expected-to-increase-by-100-quarter-over-quarter-as-long-term-agreements-now-getting-signed-at-prices-as-high-as-21-gb/">
              reached reports of $21 per GB
            </L>, about $2,688 per 128GB before the rest of the system: those leaks
            price the memory at nearly the whole machine. ASUS also said its
            first allocation was{' '}
            <L href="https://videocardz.com/newz/asus-says-its-first-rtx-spark-allocation-is-already-fully-pre-ordered-by-channel-partners">
              fully preordered by channel partners
            </L>, so that flood has no supply behind it yet. An official low price
            at volume would still outweigh the leaks and the allocation
            anecdote.
          </p>

          <p>
            The sharper present counter is real:{' '}
            <L href="https://forums.developer.nvidia.com/t/deal-alert-dgx-spark-for-3-999-at-micro-center-best-buy-price-match-works-too-if-not-in-area/374387">
              Micro Center held Spark at $3,999.99
            </L>{' '}
            months after the hike, and Best Buy ran a limited-quantity sale at
            the same price. A rational 2028 buyer references first-party stock
            when it exists, not a $5,449 marketplace ask. But notice what it
            concedes: the pre-hike price is still available. That is why $3,999
            is both the strongest objection and the best entry.
          </p>

          <h3 className="scroll-mt-20">
            DRAM normalization and larger-memory substitutes
          </h3>

          <p>
            <L href="https://www.notebookcheck.net/DRAM-crisis-Analysts-expect-drastic-price-drop-in-2028.1337992.0.html">
              Bernstein and Jefferies forecast a 15 to 20 percent DRAM decline
              during 2028
            </L>{' '}
            from a higher end-2027 peak, while{' '}
            <L href="https://www.benzinga.com/markets/tech/26/06/52907425/goldman-memory-shortage-2028-samsung-hynix-kioxia-sandisk-micron">
              Goldman expects the shortage to run into 2028
            </L>. Prior cycles suggest retail devices lag contract memory by one or
            two quarters: DRAM contract pricing peaked in Q3 2018, yet the RTX
            2080 still sold above MSRP that October and saw no 18 percent street
            cut until February 2019. That analog is noisy, because a Super
            refresh and the post-mining slowdown moved GPU prices in the same
            window. New capacity from Micron New York, SK hynix M17, and Samsung
            P5 is expected from 2029 to 2031, after the measurement date. If it
            arrives faster, the exit window moves earlier.
          </p>

          <p>
            A larger personal-tier machine would also break the capacity
            premium, and that path narrowed rather than widened. Apple removed
            the 512GB Mac Studio in March 2026, then{' '}
            <L href="https://www.tomshardware.com/desktops/apple-quietly-axes-128gb-mac-studio-amid-supply-constraints-and-local-ai-frenzy-highest-memory-capacity-reduced-to-96gb-two-months-after-discontinuation-of-512gb-model">
              cut the 128GB option in May
            </L>, capping that line at 96GB. Today the next steps past 128GB are two
            GB10 boxes clustered over ConnectX-7 at roughly $9,400, or an
            $85,000-plus station. The published 2026 to 2027 roadmap adds
            bandwidth but does not confirm a higher personal-tier memory
            ceiling. That gap supports 128GB through 2028, but roadmap silence
            is not a guarantee.
          </p>

          <h3 className="scroll-mt-20">Forced sales and institutional supply</h3>

          <p>
            The worst observed GB10-class print is a single surplus dealer
            asking $2,000 for a used GX10, half of current list. It prices the
            forced-sale tail, not the peer market. Institutional book lives are
            being extended more than shortened: Meta moved servers from four
            years to 5.5, reducing 2025 depreciation by $2.9 billion, though
            Amazon shortened a server subset from six to five. Lives of five to
            six years point toward a larger disposal flow around 2029 to 2032,
            after the primary window. That timing is an estimate, and refreshes
            can arrive early.
          </p>

          <h2 className="scroll-mt-20">
            Buy to use, then treat resale as optional upside
          </h2>

          <p>
            The calculator isolates the speculative trade on its own terms.
            Sliders cover purchase price, fast takeoff, a large buildout, a cap
            regime, market-ending ruin, execution odds, and two exits, across
            five branches reporting expected resale profit over roughly five
            years.
          </p>

          <div className="my-8">
            <DgxSpeculationLab />
          </div>

          <p>
            At its defaults the model produces about a $571 expected resale
            loss on a $4,699 purchase, and that output excludes usage value
            entirely. It does not call a useful workstation a bad purchase; it
            says resale alone does not justify full price under those
            assumptions.
          </p>

          <p>
            Usage closes that gap. Matched tests found Spark about 3.6 times
            faster in cold prompt processing at 32K context than a $1,999 128GB
            Strix Halo anchor, with the gap widening as context grew. Warm
            caches narrow it, so the premium belongs to long-context,
            cache-miss-heavy, CUDA-dependent work. The compute is consumed
            whether or not a resale bid ever shows up.
          </p>

          <p>
            Two observables can move the verdict quickly, and both are
            checkable in minutes: the first official RTX Spark price against
            that leaked $2,500 to $2,899 range, and any second US Spark increase
            or end-of-life notice. NVIDIA reprices developer hardware mid-cycle
            when memory forces it, and Jetson proved that twice inside three
            weeks.
          </p>

          <p>
            Push the horizon to 2030 and the real-flat Spark hurdle rises to
            about $5,151 while normalization, successors, and institutional
            supply can all arrive together. That is the harder bet. End-2028 is
            the defensible one: buy the GX10 at $3,999 for the cleanest
            expression, or a Spark FE caught between $3,999 and $4,699. Buy it
            because you can use 128GB now, and let resale be upside rather than
            the reason. The silicon ages, but through 2028 the memory may still
            set the price.
          </p>
        </article>
      </div>
    </PageLayout>
  );
}
