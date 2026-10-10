import {
  Activity,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CreditCard,
  Globe2,
  Gauge,
  FileText,
  FlaskConical,
  KeyRound,
  Link2,
  MailPlus,
  LayoutDashboard,
  PlugZap,
  Settings,
  Upload,
  ListTodo,
} from "lucide-react";

export const marketingLinks = [
  { href: "/#product", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/features/automated-seo-reports", label: "Weekly reports" },
  { href: "/resources", label: "Resources" },
  { href: "/pricing", label: "Pricing" },
];

// The product is one loop: notice a movement, line it up with a change,
// explain it, fix it, then verify the fix. Navigation only shows that loop.
// Secondary views (keywords, GA4 traffic, report generator, collection log)
// stay reachable from the screen they belong to, via `also`.
export const appLinks = [
  { href: "/app/overview", label: "Overview", icon: LayoutDashboard, also: [] as string[] },
  { href: "/app/audit", label: "Changes", icon: Activity, also: [] as string[] },
  { href: "/app/investigations", label: "Investigations", icon: FlaskConical, also: ["/app/reports"] },
  { href: "/app/tasks", label: "Tasks", icon: ListTodo, also: [] as string[] },
  { href: "/app/connect", label: "Sites", icon: Globe2, also: ["/app/sites", "/app/keywords", "/app/traffic"] },
  { href: "/app/settings", label: "Settings", icon: Settings, also: ["/app/automations"] },
];

// Paused modules: the code is kept (see tag archive/full-version-2026-10-09)
// but they are no longer part of the product surface.
export const pausedAppPaths = ["/app/backlinks", "/app/link-campaigns", "/app/outreach", "/app/content"];

export function isAppLinkActive(link: { href: string; also: readonly string[] }, active: string) {
  return [link.href, ...link.also].some((path) => active === path || active.startsWith(`${path}/`));
}

export const appLinkGroups = [
  { en: "Work", zh: "工作", es: "Trabajo", paths: ["overview", "audit", "investigations", "tasks"] },
  { en: "Setup", zh: "配置", es: "Configuración", paths: ["connect", "settings"] },
].map((group) => ({ ...group, links: group.paths.flatMap((path) => appLinks.filter((link) => link.href === `/app/${path}`)) }));

export const visualAssets = {
  hero: "/visuals/rankcues-01-website-hero.png",
  reports: "/visuals/rankcues-02-feature-automated-seo-reports.png",
  pricing: "/visuals/rankcues-03-pricing.png",
  overview: "/visuals/rankcues-04-app-overview.png",
  connect: "/visuals/rankcues-05-connect-import.png",
  keywords: "/visuals/rankcues-06-site-keywords.png",
  tasks: "/visuals/rankcues-07-daily-task-board.png",
  content: "/visuals/rankcues-08-content-brief.png",
  outreach: "/visuals/rankcues-09-backlink-outreach.png",
  settings: "/visuals/rankcues-10-settings-billing.png",
};

export const sites = [
  {
    domain: "launchstack.io",
    type: "New SaaS site",
    clicks: "26,968",
    impressions: "2.07M",
    ctr: "1.30%",
    position: "12.4",
    health: 86,
    cue: "Page-2 commercial keywords are ready for refresh briefs.",
  },
  {
    domain: "foundercrm.com",
    type: "CRM affiliate",
    clicks: "18,642",
    impressions: "1.24M",
    ctr: "1.50%",
    position: "8.9",
    health: 72,
    cue: "Homepage CTR dropped after title changes last week.",
  },
  {
    domain: "nichebench.co",
    type: "Content portfolio",
    clicks: "9,440",
    impressions: "612K",
    ctr: "1.54%",
    position: "15.1",
    health: 79,
    cue: "Authority pages need targeted backlink outreach.",
  },
];

export const setupSteps = [
  {
    number: "01",
    title: "Connect Google Search Console",
    status: "Required first",
    body: "Import verified properties, permissions, sitemaps, search queries, pages, clicks, impressions, CTR, and position.",
    href: "/api/auth/google",
    method: "GET",
  },
  {
    number: "02",
    title: "Crawl the selected website",
    status: "Next step",
    body: "Run a technical crawl for titles, canonicals, indexability, internal links, broken links, structured data, headings, and content depth.",
    href: "/api/crawl/start",
    method: "POST",
  },
  {
    number: "03",
    title: "Connect GA4",
    status: "Recommended",
    body: "Match landing page engagement, events, conversions, and acquisition context to SEO opportunities.",
    href: "/api/integrations/ga4/properties",
    method: "GET",
  },
  {
    number: "04",
    title: "Generate the first action plan",
    status: "Final setup",
    body: "Prioritize technical fixes, keyword opportunities, content updates, internal links, and outreach tasks.",
    href: "/api/ai/seo-plan",
    method: "POST",
  },
];

export const gscProperties = [
  {
    property: "sc-domain:launchstack.io",
    permission: "Owner",
    pages: "1,284",
    queries: "8,940",
    lastSync: "06:30 UTC",
    status: "Ready for crawl",
  },
  {
    property: "https://foundercrm.com/",
    permission: "Full user",
    pages: "842",
    queries: "5,118",
    lastSync: "06:18 UTC",
    status: "Needs GA4 match",
  },
  {
    property: "https://nichebench.co/",
    permission: "Full user",
    pages: "416",
    queries: "2,703",
    lastSync: "05:55 UTC",
    status: "Crawl queued",
  },
];

export const onboardingChecks = [
  {
    title: "Google Search Console",
    state: "Required",
    detail: "OAuth permission, verified property list, 90-day query/page backfill.",
    href: "/api/auth/google",
    method: "GET",
  },
  {
    title: "Website crawl",
    state: "Required after GSC",
    detail: "Indexability, canonicals, titles, headings, schema, internal links, and broken links.",
    href: "/api/crawl/start",
    method: "POST",
  },
  {
    title: "Google Analytics 4",
    state: "Recommended",
    detail: "Landing-page engagement, events, conversions, and acquisition context.",
    href: "/api/integrations/ga4/properties",
    method: "GET",
  },
  {
    title: "AI action plan",
    state: "Final setup",
    detail: "Prioritized technical fixes, content refreshes, internal links, and outreach tasks.",
    href: "/api/ai/seo-plan",
    method: "POST",
  },
];

export const crawlJobs = [
  {
    site: "launchstack.io",
    status: "Completed",
    started: "06:02 UTC",
    pages: "1,284",
    critical: 18,
    next: "Create technical tasks",
  },
  {
    site: "nichebench.co",
    status: "Queued",
    started: "Waiting",
    pages: "500 limit",
    critical: 0,
    next: "Run crawler",
  },
  {
    site: "foundercrm.com",
    status: "Scheduled",
    started: "Tomorrow 06:00 UTC",
    pages: "2,500 limit",
    critical: 0,
    next: "Confirm crawl depth",
  },
];

export const ga4Matches = [
  ["LaunchStack GA4", "launchstack.io", "Matched", "12 conversions in 28 days"],
  ["FounderCRM Web", "foundercrm.com", "Review", "Property name differs from GSC domain"],
  ["NicheBench GA4", "nichebench.co", "Matched", "Content assists tracked"],
];

export const crawlIssues = [
  {
    severity: "Critical",
    issue: "Indexable pages missing canonical tags",
    pages: 18,
    why: "Google can split ranking signals across duplicate URL variants.",
    next: "Open technical fixes",
  },
  {
    severity: "High",
    issue: "Commercial pages have weak title intent match",
    pages: 12,
    why: "GSC shows high impressions but low CTR for money keywords.",
    next: "Generate title tests",
  },
  {
    severity: "High",
    issue: "Broken internal links on content cluster",
    pages: 31,
    why: "Internal link equity is leaking before refresh briefs can rank.",
    next: "Review links",
  },
  {
    severity: "Medium",
    issue: "Pages with thin supporting content",
    pages: 24,
    why: "Competitors cover missing use cases and comparison sections.",
    next: "Create content briefs",
  },
];

export const auditCategories = [
  ["Technical SEO", "94 checks", "Canonicals, robots, sitemap, status codes, schema."],
  ["Content quality", "38 checks", "Thin pages, duplicate titles, query coverage, freshness."],
  ["Internal links", "21 checks", "Broken links, orphan pages, anchor relevance, hub coverage."],
  ["Google data", "GSC + GA4", "Clicks, impressions, CTR, position, engagement, conversion context."],
];

export const dailyTasks = [
  {
    id: "T-092",
    priority: "High",
    evidence: "18,420 impressions, 1.6% CTR",
    title: "Rewrite title and meta for pricing comparison page",
    page: "/best-crm-for-founders",
    action: "Generate title variants",
    href: "/app/content",
  },
  {
    id: "T-088",
    priority: "High",
    evidence: "31 queries at positions 8-20",
    title: "Expand page-2 keyword cluster with missing use cases",
    page: "/ai-seo-reporting-tools",
    action: "Open content brief",
    href: "/app/content",
  },
  {
    id: "T-076",
    priority: "Medium",
    evidence: "9 money pages under 3 referring domains",
    title: "Build outreach list for automated SEO reports page",
    page: "/features/automated-seo-reports",
    action: "Review prospects",
    href: "/app/outreach",
  },
  {
    id: "T-054",
    priority: "Low",
    evidence: "4 indexed URLs missing internal links",
    title: "Add internal links from fresh blog posts",
    page: "/seo-report-template",
    action: "Open links",
    href: "/app/sites/launchstack",
  },
];

export const keywordRows = [
  {
    keyword: "automated seo reports",
    intent: "Commercial",
    volume: "1,600",
    kd: "24",
    position: "11",
    change: "+3",
    url: "/features/automated-seo-reports",
  },
  {
    keyword: "automated seo reporting tool",
    intent: "Commercial",
    volume: "90",
    kd: "18",
    position: "8",
    change: "+2",
    url: "/pricing",
  },
  {
    keyword: "how to create seo reports",
    intent: "Informational",
    volume: "90",
    kd: "21",
    position: "17",
    change: "-1",
    url: "/blog/create-seo-reports",
  },
  {
    keyword: "best ai seo reporting tools",
    intent: "Comparison",
    volume: "40",
    kd: "29",
    position: "14",
    change: "+5",
    url: "/compare/ai-seo-reporting-tools",
  },
];

export const contentBrief = {
  title: "Refresh brief: automated SEO reports",
  targetPage: "/features/automated-seo-reports",
  decay: "-27% clicks in 90 days",
  sections: [
    "Add GSC + GA4 setup workflow",
    "Compare report-only tools vs task-first tools",
    "Add agency and multi-site operator use cases",
    "Add internal links from SEO reporting template pages",
  ],
  titleIdeas: [
    "Automated SEO Reports That Turn Into Daily Tasks",
    "Automated SEO Reporting for Multi-Site Operators",
    "From GSC Data to Client-Ready SEO Reports",
  ],
};

export const outreachProspects = [
  {
    site: "SaaSStack Weekly",
    relevance: 94,
    target: "/features/automated-seo-reports",
    angle: "Tool roundup update for AI SEO reporting",
    status: "Draft ready",
  },
  {
    site: "Marketing Ops Index",
    relevance: 88,
    target: "/pricing",
    angle: "Add task-first SEO reporting category",
    status: "Needs approval",
  },
  {
    site: "Founder Tools Digest",
    relevance: 82,
    target: "/features/automated-seo-reports",
    angle: "Multi-site founder workflow example",
    status: "Contact found",
  },
];

export const pricingPlans = [
  {
    name: "Starter",
    price: "$29",
    description: "For founders running a few sites.",
    cta: "Start Starter",
    sites: "3 GSC properties",
    features: ["Daily cues", "SEO report page", "10 AI briefs", "25 outreach drafts"],
  },
  {
    name: "Growth",
    price: "$79",
    description: "For operators growing site portfolios.",
    cta: "Start Growth",
    sites: "15 GSC properties",
    features: ["Priority cues", "GA4 context", "50 AI briefs", "250 outreach drafts"],
  },
  {
    name: "Agency",
    price: "$199",
    description: "For agencies and multi-client teams.",
    cta: "Start Agency",
    sites: "50 GSC properties",
    features: ["Client reports", "Team review", "Unlimited briefs", "1,000 outreach drafts"],
  },
];

export const integrations = [
  {
    name: "Google Search Console",
    status: "Connected",
    detail: "2 verified properties synced at 06:30 UTC.",
    icon: PlugZap,
    href: "/api/integrations/gsc/sites",
  },
  {
    name: "Google Analytics 4",
    status: "Connected",
    detail: "2 GA4 properties matched to sites.",
    icon: BarChart3,
    href: "/api/integrations/ga4/properties",
  },
  {
    name: "Semrush",
    status: "API key ready",
    detail: "Import keyword exports or connect a paid API plan.",
    icon: KeyRound,
    href: "/api/keywords/semrush/import",
  },
  {
    name: "OpenAI",
    status: "Usage tracked",
    detail: "AI plan endpoint is ready for model wiring.",
    icon: Bot,
    href: "/api/ai/seo-plan",
  },
];

export const apiActions = [
  { method: "GET", href: "/api/auth/google", label: "Google OAuth", icon: PlugZap },
  { method: "POST", href: "/api/sites/import", label: "Import sites", icon: Upload },
  { method: "POST", href: "/api/crawl/start", label: "Start crawl", icon: Gauge },
  { method: "POST", href: "/api/ai/seo-plan", label: "Generate SEO plan", icon: Bot },
  { method: "POST", href: "/api/content/brief", label: "Create brief", icon: FileText },
  { method: "POST", href: "/api/outreach/approve", label: "Approve outreach", icon: MailPlus },
  { method: "POST", href: "/api/billing/checkout", label: "Checkout", icon: CreditCard },
  { method: "POST", href: "/api/keywords/semrush/import", label: "Semrush import", icon: BriefcaseBusiness },
  { method: "GET", href: "/app/outreach", label: "Review outreach", icon: Link2 },
];

export const investigations = [
  {
    id: "INV-042",
    site: "northstardental.co",
    title: "Service-page clicks fell after a title and hero rewrite",
    delta: "−18.4%",
    impact: "High",
    confidence: "82%",
    confidenceLabel: "Correlated",
    evidence: "3 observed events · 7 query groups",
    action: "Review title intent",
  },
  {
    id: "INV-039",
    site: "launchstack.io",
    title: "Pricing traffic rose, but trial conversions did not follow",
    delta: "+24.8%",
    impact: "High",
    confidence: "96%",
    confidenceLabel: "Detected",
    evidence: "GSC + GA4 landing-page match",
    action: "Inspect conversion path",
  },
  {
    id: "INV-035",
    site: "foundercrm.com",
    title: "Comparison cluster is losing mobile CTR in the US",
    delta: "−0.9pp",
    impact: "Medium",
    confidence: "61%",
    confidenceLabel: "Hypothesis",
    evidence: "SERP layout changed · position stable",
    action: "Capture fresh SERPs",
  },
];

export const changeLedger = [
  {
    time: "Today · 06:30",
    source: "GSC",
    title: "Non-brand mobile clicks crossed the alert threshold",
    tone: "coral",
  },
  {
    time: "Yesterday · 14:12",
    source: "Crawler",
    title: "12 titles and 4 hero sections changed",
    tone: "gold",
  },
  {
    time: "Mon · 09:44",
    source: "Deployment",
    title: "Production release 8d31a2 reached all pages",
    tone: "blue",
  },
  {
    time: "Jul 17 · 18:06",
    source: "GA4",
    title: "Organic lead rate baseline recalculated",
    tone: "teal",
  },
];
