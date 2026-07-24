<?xml version="1.0" encoding="UTF-8"?>
<audit version="0.0.38">
<site url="https://rankcues-preview.bricy957711.workers.dev" crawled="7" date="2026-07-22T03:46:31.870Z"/>
<score overall="83" grade="B">
 <cat name="Performance" score="92"/>
 <cat name="Accessibility" score="93"/>
 <cat name="Content" score="94"/>
 <cat name="Core SEO" score="96"/>
 <cat name="Images" score="89"/>
 <cat name="Security" score="97"/>
 <cat name="Crawlability" score="100"/>
 <cat name="E-E-A-T" score="100"/>
 <cat name="Internationalization" score="100"/>
 <cat name="Legal Compliance" score="100"/>
 <cat name="Links" score="100"/>
 <cat name="Mobile" score="100"/>
 <cat name="Social Media" score="100"/>
 <cat name="URL Structure" score="100"/>
</score>
<summary passed="603" warnings="31" failed="4"/>
<issues>
 <category name="Crawlability" errors="0" warnings="1">
  <rule id="crawl/canonical-chain" severity="warning" status="warn" docs="https://docs.squirrelscan.com/rules/crawl/canonical-chain">
   Page redirects before content is served
   Pages (1): /
   Items (1):
    - / (https://rankcues-preview.bricy957711.workers.dev → https://rankcues-preview.bricy957711.workers.dev/) [finalUrl: https://rankcues-preview.bricy957711.workers.dev/, chain: {&quot;sourceUrl&quot;:&quot;https://rankcues-preview.bricy957711.workers.dev/&quot;,&quot;finalUrl&quot;:&quot;https://rankcues-preview.bricy957711.workers.dev/&quot;,&quot;hops&quot;:[{&quot;url&quot;:&quot;https://rankcues-preview.bricy957711.workers.dev/&quot;,&quot;sta…]
  </rule>
 </category>
 <category name="Core SEO" errors="0" warnings="4">
  <rule id="core/meta-title" severity="error" status="warn" docs="https://docs.squirrelscan.com/rules/core/meta-title">
   Title too short
   Pages (1): /privacy
   Items (1):
    - /privacy (Privacy Notice | RankCues (25 chars))
  </rule>
  <rule id="core/meta-description" severity="error" status="warn" docs="https://docs.squirrelscan.com/rules/core/meta-description">
   Description too short; Description too long
   Pages (3): /contact, /pricing, /privacy
   Items (3):
    - /pricing (RankCues is currently an invitation-only private b (117 chars))
    - /privacy (How RankCues handles Google account, Search Consol (91 chars))
    - /contact (Contact RankCues private-beta support about approv (165 chars))
  </rule>
 </category>
 <category name="Security" errors="0" warnings="1">
  <rule id="security/csp" severity="warning" status="warn" docs="https://docs.squirrelscan.com/rules/security/csp">
   CSP allows &apos;unsafe-inline&apos;
  </rule>
 </category>
 <category name="Content" errors="0" warnings="6">
  <rule id="content/word-count" severity="warning" status="warn" docs="https://docs.squirrelscan.com/rules/content/word-count">
   Thin content: N words (min N)
   Pages (5/6): /about, /contact, /pricing, /privacy, /terms
   Items (5/6):
    - /features/automated-seo-reports (Thin content: 268 words (min 300))
    - /about (Thin content: 184 words (min 300))
    - /pricing (Thin content: 129 words (min 300))
    - /contact (Thin content: 102 words (min 300))
    - /terms (Thin content: 237 words (min 300))
  </rule>
 </category>
 <category name="Images" errors="0" warnings="1">
  <rule id="images/image-file-size" severity="error" status="warn" docs="https://docs.squirrelscan.com/rules/images/image-file-size">
   1 image(s) exceed 200.0 KB
   Items (1):
    - /_next/image?url=%2Fvisuals%2Frankcues-02-feature-automated-seo-reports.png&amp;w=3840&amp;q=75 [sizeBytes: 635278, size: 620.4 KB, status: 200, contentType: image/png] (from: /features/automated-seo-reports)
  </rule>
 </category>
 <category name="Performance" errors="2" warnings="11">
  <rule id="perf/lcp-hints" severity="warning" status="warn" docs="https://docs.squirrelscan.com/rules/perf/lcp-hints">
   1 potential LCP image(s) without preload
   Pages (1): /features/automated-seo-reports
   Items (1):
    - /_next/image?url=%2Fvisuals%2Frankcues-02-feature-automated-seo-reports.png&amp;w=3840&amp;q=75
  </rule>
  <rule id="perf/ttfb" severity="warning" status="fail" docs="https://docs.squirrelscan.com/rules/perf/ttfb">
   Slow server response (Nms); Very slow server response (Nms)
   Pages (5): /, /about, /pricing, /terms, /features/automated-seo-reports
   Items (5):
    - /features/automated-seo-reports (Slow server response (696ms))
    - /about (Slow server response (628ms))
    - /pricing (Slow server response (742ms))
    - / (Very slow server response (1287ms))
    - /terms (Very slow server response (1298ms))
  </rule>
  <rule id="perf/critical-request-chains" severity="warning" status="warn" docs="https://docs.squirrelscan.com/rules/perf/critical-request-chains">
   2 critical request chain(s) found
   Pages (5/7): /, /about, /contact, /pricing, /privacy
   Items (2):
    - CSS: /_next/static/css/7690ecbc20dd75e7.css
    - JS: /_next/static/chunks/polyfills-42372ed130431b0a.js
  </rule>
 </category>
 <category name="Accessibility" errors="2" warnings="7">
  <rule id="a11y/label-content-name-mismatch" severity="error" status="fail" docs="https://docs.squirrelscan.com/rules/a11y/label-content-name-mismatch">
   1 element(s) where visible text doesn&apos;t match accessible name
   Pages (2): /pricing, /privacy
   Items (1):
    - a: visible=&quot;rankcuessearch intel&quot; vs aria-label=&quot;rankcues home&quot;
  </rule>
  <rule id="a11y/color-contrast" severity="warning" status="warn" docs="https://docs.squirrelscan.com/rules/a11y/color-contrast">
   2 potential color contrast issue(s)
   Pages (5/7): /, /about, /contact, /pricing, /privacy
   Items (2):
    - White text (verify background): 1 instance(s)
    - Very light text color: 1 instance(s)
  </rule>
 </category>
</issues>
</audit>