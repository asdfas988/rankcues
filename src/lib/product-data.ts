export type SeoCueType =
  | "low_ctr"
  | "page_two"
  | "content_decay"
  | "backlink_gap"
  | "indexing"
  | "cannibalization";

export type SeoCue = {
  id: string;
  site: string;
  type: SeoCueType;
  priority: "high" | "medium" | "low";
  title: string;
  evidence: string;
  recommendedAction: string;
};

export const demoSeoCues: SeoCue[] = [
  {
    id: "cue_low_ctr_001",
    site: "launchstack.io",
    type: "low_ctr",
    priority: "high",
    title: "High impressions, weak CTR on commercial query cluster",
    evidence: "12,840 impressions, 1.6% CTR, avg. position 4.8",
    recommendedAction:
      "Generate title/meta variants and test stronger product-led SERP copy.",
  },
  {
    id: "cue_page_two_002",
    site: "nichebench.co",
    type: "page_two",
    priority: "high",
    title: "Page-2 keywords ready for a content refresh",
    evidence: "31 queries between position 8 and 20 across 7 URLs",
    recommendedAction:
      "Create refresh briefs, add missing sections, and build internal links.",
  },
  {
    id: "cue_backlink_gap_003",
    site: "foundercrm.com",
    type: "backlink_gap",
    priority: "medium",
    title: "Money pages need topical authority links",
    evidence: "9 URLs have commercial intent but fewer than 3 referring domains",
    recommendedAction:
      "Find relevant resource pages and draft approved outreach emails.",
  },
];

export const requiredEnv = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID_STARTER",
  "DATABASE_URL",
];
