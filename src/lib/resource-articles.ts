import { additionalResourceArticles } from "./resource-articles-expanded";
import type { ResourceArticle } from "./resource-article-types";

export type { ArticleSection, ResourceArticle } from "@/lib/resource-article-types";

const coreResourceArticles: ResourceArticle[] = [
  {
    slug: "content-decay-detection-tools",
    primaryKeyword: "tools to detect content decay",
    secondaryKeywords: ["content decay detection tools", "content decay checker", "content refresh tool SEO"],
    category: "Content performance",
    title: "Tools to Detect Content Decay: What to Measure Before You Refresh",
    description: "Compare content decay detection tools, the signals they use, and a practical method for separating real decay from seasonality, tracking gaps, and ranking volatility.",
    dek: "A useful decay tool does more than draw a downward line. It should tell you when the loss became sustained, which queries disappeared, what changed on the page, and how to verify a refresh afterward.",
    takeaway: "Treat content decay as a sustained, page-level loss that survives seasonality and tracking checks. Prioritize recoverable lost clicks, not the largest percentage drop.",
    readingMinutes: 9,
    published: "2026-08-30",
    updated: "2026-08-30",
    sections: [
      {
        id: "definition",
        title: "What content decay actually looks like",
        paragraphs: [
          "Content decay is a sustained loss of organic search performance on a page that previously attracted meaningful demand. A one-week dip is not enough. Neither is a lower average position by itself. The useful unit of analysis is a page and its query set across comparable time windows.",
          "The strongest early signal is often lost clicks accompanied by weaker impressions or positions across the same intent cluster. If impressions fall while positions remain steady, demand or SERP composition may have changed. If GA4 falls while GSC clicks stay flat, the problem is more likely measurement, consent, or page delivery than content decay.",
        ],
        bullets: [
          "Require at least four comparable weeks of decline for an initial flag.",
          "Compare year over year when the topic has seasonal demand.",
          "Inspect page and query movement together; sitewide totals hide migrations between URLs.",
          "Record the page state before recommending a refresh.",
        ],
      },
      {
        id: "tool-types",
        title: "Four types of content decay detection tools",
        paragraphs: ["The current tool market falls into four practical groups. No group answers every diagnostic question, so the right choice depends on whether you need discovery, diagnosis, execution, or measurement."],
        table: {
          columns: ["Tool type", "Best at", "Main limitation"],
          rows: [
            ["Google Search Console", "Free page/query evidence and date comparisons", "Manual segmentation; no stored page-change context"],
            ["GSC-focused decay platforms", "Automated decline reports and prioritization", "May treat correlation as the explanation"],
            ["SEO suites", "Rankings, backlinks, competitors and broad audits", "More setup and cost; refresh workflow may be secondary"],
            ["Change-intelligence tools", "Connecting page changes to later search movement", "Need enough historical snapshots before attribution improves"],
          ],
        },
      },
      {
        id: "signals",
        title: "Signals a decay detector should preserve",
        paragraphs: [
          "A score is convenient, but the underlying evidence must remain visible. Otherwise two very different cases can receive the same priority: a page that lost 20 clicks after a seasonal peak and a commercial page that lost 2,000 clicks after its title and internal links changed.",
          "At minimum, keep current and previous clicks, impressions, CTR, average position, the affected queries, and the exact comparison dates. Add page snapshots for title, canonical, headings, word count, internal-link count, status code, and content hash. GA4 sessions and key events provide outcome context, but they should not replace GSC evidence.",
        ],
      },
      {
        id: "triage",
        title: "A practical decay triage model",
        paragraphs: ["Rank pages by recoverable opportunity rather than raw decline. A simple review queue can combine lost clicks, prior business value, confidence that the loss is sustained, and the effort required to recover it."],
        table: {
          columns: ["Observation", "Likely next check", "Do not assume"],
          rows: [
            ["Clicks and positions fall across many queries", "SERP competitors, freshness, intent coverage", "The page only needs more words"],
            ["Impressions fall; position is stable", "Seasonality, demand, SERP features", "Google devalued the page"],
            ["One URL loses while another gains", "Cannibalization and intent ownership", "The topic itself is decaying"],
            ["GA4 sessions fall; GSC clicks are flat", "Consent, tags, redirects, landing-page mapping", "Organic demand fell"],
          ],
        },
      },
      {
        id: "refresh",
        title: "Refresh only after the diagnosis",
        paragraphs: [
          "Choose the intervention that matches the evidence. Update obsolete facts and examples when freshness is the gap. Consolidate overlapping URLs when intent ownership is unstable. Improve internal links when the page is isolated. Rewrite the snippet when impressions and positions hold but CTR weakens. Fix the technical state before touching copy when canonicals, redirects, or indexability changed.",
          "Capture a baseline on the day the work is approved. Recheck leading signals after 14 days and evaluate the result across a 28- to 56-day window, depending on crawl frequency and query volume. Keep the original comparison dates so a later report cannot quietly move the baseline.",
        ],
      },
    ],
    faq: [
      { question: "What is the best free tool to detect content decay?", answer: "Google Search Console is the strongest free starting point because it preserves page and query performance. Export comparable date ranges and review pages with sustained click loss. It still requires manual seasonality, cannibalization, and page-change checks." },
      { question: "How long should a decline last before it counts as content decay?", answer: "Four comparable weeks is a reasonable initial threshold for stable topics. Use longer or year-over-year windows for seasonal and low-volume topics." },
      { question: "Does every decaying page need a content refresh?", answer: "No. The correct action may be consolidation, internal linking, a snippet test, a technical fix, or no action when demand has naturally declined." },
    ],
    sources: [
      { title: "Slate: The 9 Best Content Decay Detection Tools", url: "https://slatehq.com/blog/content-decay-detection-tools" },
      { title: "SEOTesting: Tools for Monitoring Content Decay", url: "https://seotesting.com/blog/content-decay-tools/" },
      { title: "Wellows Content Decay Tool", url: "https://wellows.com/tools/content-decay/" },
      { title: "Animalz Revive", url: "https://www.animalz.co/blog/free-content-tool" },
      { title: "GWContent Content Decay Detector", url: "https://www.gwcontent.com/pages/content-decay-detector" },
      { title: "Metaflow: Content Decay Detection Tools for Agencies", url: "https://metaflow.life/blog/content-decay-detection-tools-for-agencies" },
      { title: "WebNamaste Content Decay Detector", url: "https://webnamaste.com/tools/content-decay-detector" },
      { title: "RobotSpeed Content Refresh", url: "https://www.robot-speed.com/content-refresh" },
      { title: "Refresh Agent: Content Decay Detection", url: "https://refreshagent.com/resources/content-decay-detection" },
    ],
  },
  {
    slug: "keyword-cannibalization-audit",
    primaryKeyword: "keyword cannibalization audit",
    secondaryKeywords: ["how to check keyword cannibalization", "keyword cannibalization checker tool", "cannibalization SEO audit"],
    category: "Search diagnostics",
    title: "Keyword Cannibalization Audit: Find Real Conflicts, Not Shared Keywords",
    description: "Run a keyword cannibalization audit using GSC, diagnose intent ownership, and choose between merging, differentiating, redirecting, canonicalizing, or leaving pages alone.",
    dek: "Two URLs ranking for one query is not automatically a problem. The audit begins when the wrong URL wins, URLs keep switching, or ranking signals split across pages with the same intent.",
    takeaway: "Audit query-to-URL behavior over time. Shared vocabulary is harmless when pages serve different intents; unstable ownership and duplicated intent are the real problems.",
    readingMinutes: 10,
    published: "2026-08-30",
    updated: "2026-08-30",
    sections: [
      {
        id: "definition",
        title: "Define cannibalization narrowly",
        paragraphs: [
          "Keyword cannibalization occurs when multiple pages with substantially the same search intent compete for the same query set and weaken the site's ability to present one clear result. It is not simply two URLs receiving impressions for a broad keyword.",
          "A product page and a tutorial can both mention the same topic without conflict. Concern rises when Google alternates between two near-duplicate guides, the non-converting URL outranks the intended page, or neither URL can hold a stable position despite sufficient relevance and authority.",
        ],
      },
      {
        id: "workflow",
        title: "How to run the audit in Google Search Console",
        paragraphs: ["Start from query-page evidence, not a site search. Site searches reveal indexed pages, but they do not show which pages compete in actual impressions."],
        bullets: [
          "Export at least 90 days of GSC data with query, page, clicks, impressions, CTR, and position.",
          "Group each query by ranking URL and exclude navigational or obviously mixed-intent queries.",
          "Flag queries with two or more meaningful URLs, then calculate how often the leading URL changes.",
          "Review the page pair: intent, funnel stage, canonical, internal anchors, backlinks, and conversions.",
          "Record a preferred owner only after the pair has been reviewed by a person.",
        ],
      },
      {
        id: "signals",
        title: "Signals that distinguish a conflict from normal coverage",
        paragraphs: ["The best cannibalization checkers show history. A static list of duplicate keywords produces too many false positives."],
        table: {
          columns: ["Signal", "Interpretation", "Confidence"],
          rows: [
            ["Leading URL switches repeatedly", "Google receives mixed intent or ownership signals", "High when positions also fluctuate"],
            ["Wrong URL gets clicks and conversions lag", "Intent owner is misaligned with business goal", "High after conversion check"],
            ["Both URLs rank steadily for different long-tail terms", "Healthy topical coverage", "Low risk"],
            ["One URL loses as another gains after a redirect or rewrite", "Planned consolidation may be working", "Monitor before intervening"],
          ],
        },
      },
      {
        id: "decisions",
        title: "Choose the fix from the intent relationship",
        paragraphs: [
          "Merge and redirect when pages answer the same intent and one can preserve the useful sections, links, and historical demand of both. Differentiate when each page has a valid role but the current titles, headings, and internal anchors blur that role. Strengthen internal linking when the preferred owner is already clear but the site sends more contextual links to the wrong URL.",
          "Use a canonical when duplicate or near-duplicate versions must remain accessible. A canonical is not a substitute for resolving two genuinely different pages that target the same intent. Noindex is a visibility control, not a general cannibalization fix. Deleting first is especially risky because the weaker URL may still hold backlinks, conversions, or unique query coverage.",
        ],
      },
      {
        id: "measurement",
        title: "Measure ownership after the change",
        paragraphs: [
          "Save the query-URL distribution before implementation. After the change, watch whether impressions consolidate on the preferred URL, whether URL switching declines, and whether total clicks for the cluster recover. The aim is not to make one line look better by hiding another; it is to improve the combined outcome for the intent.",
          "Use a 28-day minimum follow-up window for established pages and longer for low-volume clusters. Note algorithm updates, major site changes, and seasonality inside the same evidence record so correlation is not overstated.",
        ],
      },
    ],
    faq: [
      { question: "How do I check keyword cannibalization in GSC?", answer: "Filter a query in the Performance report, open the Pages tab, and compare which URLs receive impressions and clicks. For a full audit, export query-page data and measure URL switching over time." },
      { question: "Is keyword cannibalization always bad?", answer: "No. Multiple pages can rank for related queries when their intents differ. It becomes harmful when ownership is unstable, the wrong page wins, or near-duplicate pages split signals." },
      { question: "Should I use a canonical tag to fix cannibalization?", answer: "Use canonicals for duplicate or near-duplicate versions that must remain accessible. For distinct pages, merging, differentiating intent, redirecting, or improving internal links is usually more appropriate." },
    ],
    sources: [
      { title: "Yoast: Keyword and Content Cannibalization", url: "https://yoast.com/keyword-cannibalization/" },
      { title: "Semrush Keyword Cannibalization Guide", url: "https://www.semrush.com/blog/keyword-cannibalization-guide/" },
      { title: "Geoptie Keyword Cannibalization Checker", url: "https://geoptie.com/keyword-cannibalization-checker" },
      { title: "SmartSites: Keyword Cannibalization in SEO", url: "https://www.smartsites.com/blog/keyword-cannibalization-in-seo-how-to-find-and-fix-it/" },
      { title: "Reddit TechSEO discussion", url: "https://www.reddit.com/r/SEO/comments/1r2hgif/what_is_the_best_way_to_diagnose_cannibalized/" },
      { title: "OutsourceSEM Cannibalization Guide", url: "https://www.outsourcesem.com/blog/the-ultimate-guide-to-keyword-cannibalization.html" },
      { title: "SE Ranking: Find and Fix Keyword Cannibalization", url: "https://seranking.com/blog/keyword-cannibalization/" },
      { title: "Topical Map AI Checker Comparison", url: "https://topicalmap.ai/blog/auto/keyword-cannibalization-checker-tools-2026" },
      { title: "LinkedIn Keyword Cannibalization Solutions", url: "https://www.linkedin.com/top-content/marketing/keyword-research-for-seo/keyword-cannibalization-solutions/" },
      { title: "Moz: Keyword Cannibalization", url: "https://moz.com/blog/keyword-cannibalization" },
    ],
  },
  {
    slug: "internal-linking-audit-tool",
    primaryKeyword: "internal linking audit tool",
    secondaryKeywords: ["internal link mapping tool", "internal link analyzer", "internal link audit"],
    category: "Site architecture",
    title: "Internal Linking Audit Tool: The Data and Decisions a Useful Audit Needs",
    description: "Learn what an internal linking audit tool should detect, how to map crawl depth and link equity, and how to turn findings into verified internal-link actions.",
    dek: "Counting links is the easy part. A useful audit identifies orphaned and deeply buried pages, weak hub coverage, broken paths, vague anchors, and relevant places where a new link would help users and search engines.",
    takeaway: "Choose a sitewide crawler that preserves source URL, target URL, anchor, status, indexability and crawl depth. Prioritize structural gaps before mass-producing link suggestions.",
    readingMinutes: 9,
    published: "2026-08-30",
    updated: "2026-08-30",
    sections: [
      {
        id: "scope",
        title: "What an internal link audit should answer",
        paragraphs: [
          "An internal linking audit maps how authority and navigation flow through a site. It should reveal which important pages are hard to reach, which links waste crawl paths, whether anchors explain the destination, and where topical hubs fail to support their child pages.",
          "A single-page link checker cannot answer those questions. It is useful for inspecting one URL, but a sitewide audit needs a crawl graph plus sitemap and analytics inputs so orphaned pages and business priority are visible.",
        ],
      },
      {
        id: "fields",
        title: "Fields the tool must preserve",
        paragraphs: ["Do not settle for a total internal-link count. The export should be usable as evidence and as an implementation queue."],
        bullets: [
          "Source URL, target URL, anchor text, link placement, follow state and HTTP status.",
          "Source and target indexability, canonical target, crawl depth and inlink count.",
          "Sitemap membership to expose pages that exist but receive no crawlable internal links.",
          "Page type or template so repeated navigation links do not overwhelm contextual opportunities.",
          "GSC clicks and impressions to distinguish important pages from low-value inventory.",
        ],
      },
      {
        id: "tool-comparison",
        title: "Choose the tool by audit depth",
        paragraphs: ["Current results mix desktop crawlers, free single-page analyzers, WordPress suggestion plugins, enterprise platforms, and browser extensions. They solve different jobs."],
        table: {
          columns: ["Need", "Suitable tool type", "Check before choosing"],
          rows: [
            ["Technical sitewide map", "Crawler such as Screaming Frog", "JavaScript rendering, exports, crawl limits"],
            ["Quick page check", "Web-based link analyzer", "Whether it follows only one page"],
            ["Editorial suggestions", "CMS internal-link assistant", "Relevance quality and approval workflow"],
            ["Large multi-site governance", "Enterprise link analysis", "Segmentation, change history and API access"],
          ],
        },
      },
      {
        id: "priority",
        title: "Prioritize issues in the right order",
        paragraphs: [
          "Fix broken, redirected, canonicalized, or non-indexable targets before adding new links. Next, connect orphaned priority pages and reduce excessive crawl depth. Then improve hub-to-child coverage and contextual links. Anchor refinement comes after the path itself is sound.",
          "A high inlink count is not automatically healthy. Sitewide navigation can give a page hundreds of low-context links while a key guide still lacks links from related articles. Separate template links from contextual body links whenever the crawler supports it.",
        ],
        table: {
          columns: ["Finding", "Useful threshold", "Action"],
          rows: [
            ["Orphaned priority page", "In sitemap or GSC, zero crawlable inlinks", "Add links from hub and related pages"],
            ["Deep commercial page", "More than three clicks from key entry points", "Shorten the path intentionally"],
            ["Redirected internal target", "Any recurring 3xx target", "Update links to final destination"],
            ["Generic anchor concentration", "Repeated 'click here' or bare URLs", "Rewrite selected contextual anchors"],
          ],
        },
      },
      {
        id: "verification",
        title: "Turn suggestions into measured work",
        paragraphs: [
          "For every approved link, store the source, target, proposed anchor, rationale, and baseline. Re-crawl after implementation to verify the link exists and resolves directly. Then monitor target-page impressions and query coverage over a 28- to 56-day window.",
          "Internal links are one variable among many. A ranking improvement after a link is correlated evidence, especially if content, external links, or SERPs changed at the same time. A trustworthy system records the overlap instead of presenting the new link as proven cause.",
        ],
      },
    ],
    faq: [
      { question: "What is the best internal linking audit tool?", answer: "For a technical sitewide audit, use a crawler that exports source, target, anchor, status, indexability, canonical, and crawl depth. CMS assistants are better for editorial suggestions but should not replace the crawl." },
      { question: "How do I find orphan pages?", answer: "Compare crawl URLs with XML sitemaps, GSC landing pages, GA4 landing pages, and CMS exports. A page present in those sources but absent from the crawl graph may be orphaned." },
      { question: "How often should internal links be audited?", answer: "Run an audit after migrations or template changes and on a regular cadence for active sites. Monthly is reasonable for frequently published sites; quarterly may be enough for stable smaller sites." },
    ],
    sources: [
      { title: "Screaming Frog Internal Linking Audit", url: "https://www.screamingfrog.co.uk/seo-spider/tutorials/internal-linking-audit-with-the-seo-spider/" },
      { title: "SEOptimer Internal Link Checker", url: "https://www.seoptimer.com/internal-link-checker" },
      { title: "Reddit TechSEO tool discussion", url: "https://www.reddit.com/r/TechSEO/comments/1exjjdh/whats_the_best_internal_linking_tool_currently/" },
      { title: "SEO Review Tools Internal Link Analyzer", url: "https://www.seoreviewtools.com/internal-link-analyzer/" },
      { title: "Chrome Internal Link Checker", url: "https://chromewebstore.google.com/detail/internal-link-checker/clnbfflialomannapgmmgoemgplonhik" },
      { title: "Search Engine Watch Internal Linking Tools", url: "https://searchenginewatch.com/best-internal-linking-tools/" },
      { title: "Siteimprove Internal Linking Blueprint", url: "https://www.siteimprove.com/blog/internal-linking-strategy-for-seo/" },
      { title: "Sitechecker Internal Links", url: "https://sitechecker.pro/internal-links/" },
      { title: "seoClarity Internal Link Analysis", url: "https://www.seoclarity.net/internal-link-analysis/" },
      { title: "Link Whisper Internal Links Checker", url: "https://linkwhisper.com/" },
    ],
  },
  {
    slug: "gsc-vs-ga4-data-discrepancies",
    primaryKeyword: "GSC vs GA4 data discrepancies",
    secondaryKeywords: ["GA4 organic traffic higher than GSC", "GSC clicks vs GA4 sessions", "Search Console GA4 mismatch"],
    category: "Analytics",
    title: "GSC vs GA4 Data Discrepancies: A Diagnostic Checklist",
    description: "Understand why GSC clicks and GA4 organic sessions do not match, how to diagnose unusual gaps, and which source to trust for search visibility and on-site outcomes.",
    dek: "GSC counts Google Search interactions; GA4 counts tagged activity after a page loads. The numbers should be directionally explainable, not identical.",
    takeaway: "Use GSC for search visibility and clicks, GA4 for on-site sessions and outcomes. Investigate changes in the size or direction of the gap, not the existence of a gap.",
    readingMinutes: 8,
    published: "2026-08-30",
    updated: "2026-08-30",
    sections: [
      {
        id: "different-events",
        title: "Clicks and sessions measure different events",
        paragraphs: [
          "Google Search Console records a click from a Google Search result to your property. Google Analytics 4 records events from a tagged website or app and groups those events into sessions. A click can occur without a GA4 session when the tag is blocked, consent is denied, the page fails, or the user leaves before measurement runs.",
          "One click can also relate to more than one session under GA4 session rules, and GA4's Organic Search channel may include search engines beyond Google. This is why reconciliation should explain the data-generating process rather than force the totals to match.",
        ],
      },
      {
        id: "causes",
        title: "The most common reasons for a mismatch",
        table: {
          columns: ["Cause", "What it changes", "How to check"],
          rows: [
            ["Consent and blockers", "GA4 undercounts sessions", "Compare by market, device, consent rate"],
            ["Timezone boundaries", "Daily totals shift between dates", "Align property timezone and aggregate weekly"],
            ["Canonical reporting", "GSC attributes data to canonical URLs", "Normalize URL and inspect canonical targets"],
            ["Channel scope", "GA4 Organic Search includes non-Google engines", "Filter source/medium to Google organic"],
            ["Tag or template gaps", "Specific landing pages disappear from GA4", "Audit tag coverage by page template"],
            ["Reporting delay and processing", "Recent dates look incomplete", "Wait until both sources are settled"],
          ],
          },
        paragraphs: ["Other contributors include redirects, cross-domain configuration, server-side tagging, URL parameters, session attribution, thresholding in some GA4 reports, and different filters applied by the two products."],
      },
      {
        id: "workflow",
        title: "Diagnose the gap without a spreadsheet maze",
        paragraphs: ["Normalize the comparison before interpreting it. Use settled dates, the same timezone boundary where possible, the same site scope, and landing-page paths without irrelevant parameters."],
        bullets: [
          "Plot the daily ratio of GA4 Google-organic sessions to GSC web clicks.",
          "Look for a step change in the ratio, not a stable long-term difference.",
          "Segment the change by landing page, device, country, hostname, and date.",
          "Overlay consent, tag, template, redirect, canonical, and deployment changes.",
          "Classify the result as detected, correlated, or still a hypothesis.",
        ],
      },
      {
        id: "patterns",
        title: "What unusual patterns usually mean",
        table: {
          columns: ["Pattern", "First checks", "Likely data owner"],
          rows: [
            ["GA4 rises while GSC is flat", "Source/medium, referral exclusions, channel rules", "GA4 configuration"],
            ["GSC rises while GA4 is flat", "Consent, blockers, tag coverage, page speed", "On-site measurement"],
            ["Only one template diverges", "Tag and consent code on that template", "Implementation"],
            ["Gap changes after migration", "Redirects, hostnames, canonicals, property scope", "Both systems"],
          ],
        },
        paragraphs: ["If both systems move in the same direction, the business signal is stronger even when totals differ. If they diverge, delay strategic conclusions until the measurement path has been checked."],
      },
      {
        id: "trust",
        title: "Which number should you trust?",
        paragraphs: [
          "Trust GSC for Google Search impressions, clicks, query visibility, and average position. Trust GA4 for measured sessions, engagement, key events, and on-site journeys among users who were observed by the implementation. Neither source is a complete census of people.",
          "For SEO investigations, preserve both. GSC shows the search-side movement; GA4 supplies post-click context. A report should state when the two sources agree, when they diverge, and what data limitation remains.",
        ],
      },
    ],
    faq: [
      { question: "Why are GSC clicks higher than GA4 organic sessions?", answer: "GA4 can miss sessions when consent is denied, blockers prevent tags, pages fail to load, or tags are absent. GSC and GA4 also use different scopes, URL attribution, timezones, and processing rules." },
      { question: "Can GA4 organic sessions be higher than GSC clicks?", answer: "Yes. GA4 Organic Search may include engines other than Google, and session and attribution rules can produce more than one measured session around search visits. Filter to Google organic before comparing." },
      { question: "Should GSC and GA4 ever match exactly?", answer: "Exact equality is not a useful expectation because the systems count different events. A stable, explainable relationship is more valuable than matching totals." },
    ],
    sources: [
      { title: "Reddit: Traffic gap between GA4 and Search Console", url: "https://www.reddit.com/r/GoogleAnalytics/comments/1to96tq/traffic_gap_between_ga4_and_search_console/" },
      { title: "Refresh Agent: GA4 vs GSC Discrepancies", url: "https://refreshagent.com/resources/ga4-vs-gsc-data-discrepancies" },
      { title: "LinkedIn: GSC vs GA4 Click Discrepancies", url: "https://www.linkedin.com/posts/marco-giordano96_why-do-clicks-from-gsc-and-ga4-metrics-never-activity-7473314055580188676-CKN_" },
      { title: "Google Analytics Help discussion", url: "https://support.google.com/analytics/thread/371615211/struggling-with-ga4-and-gsc-data-discrepancies-seeking-insights?hl=en" },
      { title: "Google Search Console Help discussion", url: "https://support.google.com/webmasters/thread/322370276/discrepancy-between-gsc-clicks-and-ga4-users?hl=en" },
      { title: "Search Engine Journal: GA4 Higher Than GSC", url: "https://www.searchenginejournal.com/ask-an-seo-why-is-ga4-reporting-higher-traffic-than-gsc/547327/" },
      { title: "Seotistics: GA4 vs GSC Differences", url: "https://seotistics.com/ga4-vs-gsc-differences/" },
      { title: "LinkedIn: Different Organic Search Data", url: "https://www.linkedin.com/posts/billsebald_sometimes-gsc-and-ga4-provide-different-activity-7313187202522374145-vAjO" },
      { title: "SEO Transformer: Why Search Data Never Matches", url: "https://seotransformer.com/blog/decoding-search-data-2/" },
      { title: "Maintouch: GSC Clicks vs GA4 Sessions", url: "https://maintouch.com/blogs/google-search-console-clicks-vs-ga4-pageviews" },
    ],
  },
  {
    slug: "seo-change-tracking",
    primaryKeyword: "SEO change tracking",
    secondaryKeywords: ["SEO change monitoring", "website SEO monitoring tool", "SEO impact measurement"],
    category: "Change intelligence",
    title: "SEO Change Tracking: From Page Alerts to Impact Measurement",
    description: "Learn how SEO change tracking records page and deployment events, connects them to GSC and GA4 movement, and measures impact without overstating causation.",
    dek: "Most monitoring tools tell you that a title, canonical, robots rule, or page changed. The harder and more valuable job is preserving the change as evidence and measuring what happened afterward.",
    takeaway: "A change log becomes decision intelligence only when it stores the before state, change date, affected scope, baseline, confounders, and follow-up result.",
    readingMinutes: 9,
    published: "2026-08-30",
    updated: "2026-08-30",
    sections: [
      {
        id: "levels",
        title: "Three levels of SEO change tracking",
        paragraphs: ["SEO change tracking is often used to describe three different capabilities. Knowing the difference prevents teams from buying alerting when they need impact measurement."],
        table: {
          columns: ["Level", "Question answered", "Typical evidence"],
          rows: [
            ["Detection", "What changed?", "HTML diff, status, robots, title, canonical"],
            ["Correlation", "What moved near the change?", "GSC, GA4, rankings, crawl coverage"],
            ["Measurement", "Did the intended outcome improve?", "Frozen baseline, verification window, result"],
          ],
        },
      },
      {
        id: "events",
        title: "Changes worth recording",
        paragraphs: [
          "Record changes that can alter crawling, indexing, relevance, snippets, link flow, or measurement. This includes status codes, canonicals, robots directives, sitemap membership, titles, descriptions, headings, body content, structured data, internal links, hreflang, and analytics tags.",
          "Page-level crawls are only part of the ledger. Deployment IDs, CMS revisions, migration milestones, template releases, manual SEO tasks, and algorithm updates help define scope and competing explanations. Store the actor and source when available, but do not require perfect instrumentation before beginning.",
        ],
      },
      {
        id: "selection",
        title: "What to look for in an SEO monitoring tool",
        paragraphs: ["The top-ranking tools emphasize alerts, history, page segmentation, technical element monitoring, rank tracking, and agency reporting. For investigations, add evidence durability and follow-up measurement to that checklist."],
        bullets: [
          "A before/after view with timestamp and affected URL scope.",
          "Noise controls for expected template and navigation changes.",
          "GSC and GA4 overlays at page and site-segment level.",
          "Labels that distinguish a detected change from a suspected cause.",
          "Tasks with owner, baseline, verification date, result, and revert path.",
        ],
      },
      {
        id: "method",
        title: "A defensible impact measurement method",
        paragraphs: [
          "Define the expected outcome before implementation. A title test may target CTR within a stable position band. An internal-link change may target query coverage and impressions. A canonical correction may target index consolidation. Choose one primary metric and a small set of guardrails.",
          "Freeze a comparable baseline, record the release date, and choose a lag window that reflects crawling and query volume. Compare the affected group with an unaffected reference group when possible. Note seasonality, algorithm updates, concurrent content releases, and tracking changes. The final evidence state should reflect those limitations.",
        ],
        table: {
          columns: ["Change", "Early check", "Outcome window"],
          rows: [
            ["Title or description", "Snippet recrawl and CTR by position band", "14–28 days"],
            ["Internal links", "Link verification and crawl path", "28–56 days"],
            ["Canonical/indexability", "Detected canonical and indexed coverage", "7–28 days"],
            ["Large template migration", "Errors, coverage, clicks by template", "Daily checks plus 56+ days"],
          ],
        },
      },
      {
        id: "communication",
        title: "Report evidence without inventing certainty",
        paragraphs: [
          "Use detected when the system directly observed a change or metric movement. Use correlated when movement occurred in the expected direction and window but other explanations remain. Use hypothesis when the timing or mechanism is plausible but evidence is incomplete.",
          "This vocabulary makes reports more useful, not less decisive. Teams can approve low-risk next actions, wait for the verification window, or revert a harmful change without rewriting history. Over time, the ledger also shows which kinds of work reliably produce outcomes on that specific site.",
        ],
      },
    ],
    faq: [
      { question: "What is SEO change tracking?", answer: "SEO change tracking records changes to pages, templates, deployments, and technical controls, then relates them to later search and analytics movement. Advanced systems also preserve baselines and verification results." },
      { question: "Which SEO changes should trigger alerts?", answer: "Prioritize status, robots, canonical, sitemap, title, heading, hreflang, structured data, analytics tags, major content, and internal-link changes. Use scope and template rules to suppress expected noise." },
      { question: "Can a monitoring tool prove an SEO change caused a ranking change?", answer: "Usually not by itself. It can establish timing, mechanism, affected scope, and comparative evidence. Controlled tests or strong reference groups increase confidence, but most observations remain correlated rather than proven causal." },
    ],
    sources: [
      { title: "Visualping Website Change Detection", url: "https://visualping.io/" },
      { title: "Sitechecker SEO Change Monitoring", url: "https://sitechecker.pro/website-monitoring/" },
      { title: "seoClarity SEO Monitoring Tools", url: "https://www.seoclarity.net/blog/seo-monitoring-tools" },
      { title: "Semrush Position Tracking", url: "https://www.semrush.com/position-tracking/" },
      { title: "ChangeTower SEO Monitoring", url: "https://changetower.com/uses-seo-monitoring/" },
      { title: "Swydo SEO Monitoring Tools", url: "https://www.swydo.com/blog/best-seo-monitoring-tools/" },
      { title: "DashThis SEO Tracking", url: "https://dashthis.com/blog/seo-tracking/" },
      { title: "OMR SEO Change Monitoring", url: "https://omr.com/en/reviews/category/seo-change-monitoring" },
      { title: "SEOcrawl SEO Monitor", url: "https://seocrawl.ai/seo-tools/seo-monitor" },
    ],
  },
];

export const resourceArticles: ResourceArticle[] = [...coreResourceArticles, ...additionalResourceArticles];

export function getResourceArticle(slug: string) {
  return resourceArticles.find((article) => article.slug === slug);
}
