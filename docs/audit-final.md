<?xml version="1.0" encoding="UTF-8"?>
<audit version="0.0.38">
<site url="https://rankcues-preview.bricy957711.workers.dev" crawled="7" date="2026-07-22T03:41:35.332Z"/>
<score overall="76" grade="C">
 <cat name="Accessibility" score="93"/>
 <cat name="Performance" score="92"/>
 <cat name="Crawlability" score="86"/>
 <cat name="Core SEO" score="86"/>
 <cat name="Content" score="94"/>
 <cat name="Images" score="89"/>
 <cat name="Security" score="97"/>
 <cat name="E-E-A-T" score="100"/>
 <cat name="Internationalization" score="100"/>
 <cat name="Legal Compliance" score="100"/>
 <cat name="Links" score="100"/>
 <cat name="Mobile" score="100"/>
 <cat name="Social Media" score="100"/>
 <cat name="URL Structure" score="100"/>
</score>
<summary passed="590" warnings="39" failed="9"/>
<issues>
 <category name="Crawlability" errors="1" warnings="2">
  <rule id="crawl/sitemap-domain" severity="error" status="fail" docs="https://docs.squirrelscan.com/rules/crawl/sitemap-domain">
   7 URL(s) point to different domain(s)
   Items (5/7):
    - https://rankcues.com [host: rankcues.com]
    - https://rankcues.com/features/automated-seo-reports [host: rankcues.com]
    - https://rankcues.com/pricing [host: rankcues.com]
    - https://rankcues.com/about [host: rankcues.com]
    - https://rankcues.com/privacy [host: rankcues.com]
  </rule>
  <rule id="crawl/sitemap-coverage" severity="warning" status="warn" docs="https://docs.squirrelscan.com/rules/crawl/sitemap-coverage">
   7 indexable page(s) not in sitemap (100%); 7 sitemap URL(s) were not crawled
   Items (5/14):
    - /
    - /pricing
    - /about
    - /contact
    - /privacy
  </rule>
 </category>
 <category name="Core SEO" errors="0" warnings="10">
  <rule id="core/meta-title" severity="error" status="warn" docs="https://docs.squirrelscan.com/rules/core/meta-title">
   Title too short
   Pages (4): /about, /contact, /privacy, /terms
   Items (4):
    - /about (About | RankCues (16 chars))
    - /contact (Contact | RankCues (18 chars))
    - /privacy (Privacy Notice | RankCues (25 chars))
    - /terms (Private Beta Terms | RankCues (29 chars))
  </rule>
  <rule id="core/meta-description" severity="error" status="warn" docs="https://docs.squirrelscan.com/rules/core/meta-description">
   Description too short
   Pages (5): /about, /contact, /pricing, /privacy, /terms
   Items (5):
    - /pricing (RankCues is currently an invitation-only private b (117 chars))
    - /about (Why RankCues is building evidence-first SEO change (64 chars))
    - /contact (Contact and support information for the RankCues p (62 chars))
    - /privacy (How RankCues handles Google account, Search Consol (91 chars))
    - /terms (Terms for using the RankCues private-beta service. (50 chars))
  </rule>
  <rule id="core/canonical" severity="warning" status="warn" docs="https://docs.squirrelscan.com/rules/core/canonical">
   Missing canonical URL
   Pages (1): /
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
    - /pricing (Thin content: 129 words (min 300))
    - /about (Thin content: 184 words (min 300))
    - /contact (Thin content: 102 words (min 300))
    - /privacy (Thin content: 277 words (min 300))
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
 <category name="Performance" errors="1" warnings="12">
  <rule id="perf/lcp-hints" severity="warning" status="warn" docs="https://docs.squirrelscan.com/rules/perf/lcp-hints">
   1 potential LCP image(s) without preload
   Pages (1): /features/automated-seo-reports
   Items (1):
    - /_next/image?url=%2Fvisuals%2Frankcues-02-feature-automated-seo-reports.png&amp;w=3840&amp;q=75
  </rule>
  <rule id="perf/ttfb" severity="warning" status="fail" docs="https://docs.squirrelscan.com/rules/perf/ttfb">
   Very slow server response (1381ms); Slow server response (Nms)
   Pages (5): /, /about, /pricing, /terms, /features/automated-seo-reports
   Items (5):
    - / (Very slow server response (1381ms))
    - /pricing (Slow server response (742ms))
    - /about (Slow server response (810ms))
    - /terms (Slow server response (637ms))
    - /features/automated-seo-reports (Slow server response (966ms))
  </rule>
  <rule id="perf/critical-request-chains" severity="warning" status="warn" docs="https://docs.squirrelscan.com/rules/perf/critical-request-chains">
   2 critical request chain(s) found
   Pages (5/7): /, /about, /contact, /pricing, /privacy
   Items (2):
    - CSS: /_next/static/css/7690ecbc20dd75e7.css
    - JS: /_next/static/chunks/polyfills-42372ed130431b0a.js
  </rule>
 </category>
 <category name="Accessibility" errors="7" warnings="7">
  <rule id="a11y/label-content-name-mismatch" severity="error" status="fail" docs="https://docs.squirrelscan.com/rules/a11y/label-content-name-mismatch">
   N element(s) where visible text doesn&apos;t match accessible name
   Pages (5/7): /, /about, /contact, /pricing, /privacy
   Items (2):
    - a: visible=&quot;rankcuessearch intel&quot; vs aria-label=&quot;rankcues home&quot;
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