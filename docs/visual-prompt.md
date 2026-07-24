# RankCues Visual Prompt

The requested flow is: generate a ChatGPT image first, then use that visual as
the frontend style reference.

Status on 2026-07-08:

- ChatGPT DALL-E GPT attempt: the conversation returned `Done.`, but the page
  exposed no generated image resource and the visible result was only a gray
  placeholder.
- New ChatGPT `Create image` attempt: the conversation stayed on
  `正在整理答案` for several minutes, with no generated image resource in page
  assets.
- Local `OPENAI_API_KEY` is not set, so the fallback image API/CLI path is not
  available yet.

Keep this prompt as the exact next prompt for a real image asset once ChatGPT
finishes or API credentials are available.

## Screen Image Set

Generate and save one image per screen. Use consistent product style across all
images: off-white workspace, black ink interface, compact B2B SaaS dashboard,
signal yellow, teal, coral and blue accents, no people, no mascots, no purple
gradients, no abstract orbs, no fake Google logos.

Frontend marketing screens:

1. `rankcues-01-website-hero.png` - homepage hero and product preview.
   Status: generated and saved.
2. `rankcues-02-feature-automated-seo-reports.png` - SEO reports feature
   landing page.
   Status: generated and saved.
3. `rankcues-03-pricing.png` - pricing page for English subscription SaaS.
   Status: generated and saved.

Backend app screens:

4. `rankcues-04-app-overview.png` - multi-site operations overview dashboard.
   Status: generated and saved.
5. `rankcues-05-connect-import.png` - GSC/GA4 connect and bulk site import.
   Status: generated and saved.
6. `rankcues-06-site-keywords.png` - site detail with rankings, pages, and
   keyword opportunities.
   Status: generated and saved.
7. `rankcues-07-daily-task-board.png` - daily SEO task board with priorities.
   Status: generated and saved.
8. `rankcues-08-content-brief.png` - AI content brief and content decay
   recommendations.
   Status: generated and saved.
9. `rankcues-09-backlink-outreach.png` - backlink opportunities and cold email
   outreach drafts.
   Status: generated and saved.
10. `rankcues-10-settings-billing.png` - workspace settings, integrations,
    plan, usage, and billing.
    Status: generated and saved.

Prompt for pending screen 10:

```text
Create one new 16:9 image for RankCues screen 10: workspace settings,
integrations, usage, plan, and billing. Show a backend settings UI with tabs
for Profile, Integrations, API Keys, Team, Usage, Billing. Include connected
GSC and GA4 status, Semrush API key placeholder, OpenAI usage, Stripe
subscription plan, invoices, and upgrade controls. Same RankCues visual system:
off-white workspace, black ink UI, signal yellow, teal, coral and blue accents,
compact professional SaaS. No people, no mascots, no purple gradients, no
abstract orbs, no fake Google logos. Visible words only: RankCues, Settings,
Integrations, API Keys, Usage, Billing, Plan, Invoices, Upgrade, Connected.
```

Use case: ui-mockup
Asset type: SaaS website hero visual reference
Primary request: a high-fidelity product mockup for an AI SEO operations
dashboard called RankCues.
Scene/backdrop: an operator desk with a crisp web app dashboard showing multiple
websites, Google Search Console metrics, ranking opportunities, content refresh
tasks, backlink tasks, and cold email outreach drafts.
Subject: the web dashboard is the main subject; no people.
Style/medium: editorial SaaS product mockup, sharp browser UI, practical B2B
software, not a generic gradient illustration.
Composition/framing: wide 16:9 layout, dashboard angled slightly in perspective,
with enough negative space for homepage copy.
Lighting/mood: bright, precise, analytical, energetic but not playful.
Color palette: off-white, black ink, signal yellow, teal, coral, and blue
accents.
Text constraints: if text appears, use only short UI labels like "Daily cues",
"GSC", "GA4", "Backlinks", "Content decay"; avoid fake brand claims.
Avoid: purple gradients, abstract orbs, stock photos, unreadable tiny text,
mascots, dark cyberpunk style, fake Google logos.
