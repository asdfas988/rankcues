# RankCues Product & UI Direction

Date: 2026-07-21

## Product wedge

RankCues is not another all-in-one SEO suite. It is an SEO change-intelligence
workspace for small agencies managing 5–30 client sites.

Core promise:

> Know what changed, why performance moved, and what to do next—before the
> client asks.

The product connects first-party performance data to a durable event record:

```text
GSC / GA4 signals
        +
page, CMS and deployment changes
        +
SERP, algorithm and backlink context
        ↓
evidence-backed findings
        ↓
reviewable weekly client brief
```

Every finding must be labelled as one of:

- **Detected** — a source event or data change is directly observed.
- **Correlated** — timing and affected entities strongly overlap.
- **Hypothesis** — a plausible explanation that still needs verification.

## Initial information architecture

### Marketing

1. Homepage — category, differentiation, evidence workflow and weekly brief.
2. Automated SEO reporting — commercial feature landing page.
3. Pricing — site-based plans, not keyword-credit pricing.
4. Security and integrations — read-only Google scopes and provider controls.

### Product

1. Portfolio — which client sites need attention now.
2. Investigations — findings ranked by business impact.
3. Changes — page/CMS/deployment event timeline and diffs.
4. Reports — weekly briefs with review and approval state.
5. Integrations — GSC, GA4, crawler and AI inference provider.

Existing crawl, keyword, content and outreach routes may remain accessible
during migration, but they do not lead the primary navigation.

## Visual direction: executive intelligence desk

Tone: refined, editorial, calm and evidence-led. The interface should feel like
an institutional research terminal crossed with a premium client report.

Memorable device: the **evidence rail**—a thin vertical gold line connecting a
performance anomaly to page changes, external context and recommended action.

### Palette

- Obsidian: `#0A0D0C`
- Deep forest: `#101714`
- Warm ivory: `#F3F0E8`
- Paper: `#FCFAF5`
- Champagne: `#C9A66B`
- Mineral teal: `#59B8A7`
- Signal coral: `#E87962`
- Cobalt: `#6E8DEB`

Avoid purple gradients, saturated rainbow dashboards, thick cartoon borders,
large drop shadows and generic glassmorphism.

### Typography

- Display: Newsreader — editorial headlines and report statements.
- Interface: Manrope — controls, navigation and readable dense UI.
- Data: IBM Plex Mono — metrics, timestamps, IDs and confidence values.

### Shape and motion

- 14–24px corner radii on major surfaces; 8–12px on controls.
- Hairline borders, inset highlights and low-blur shadows.
- One staged page-load reveal; restrained hover lift and evidence-line motion.
- Respect `prefers-reduced-motion`.

## Homepage outline

1. Header with product category and one primary CTA.
2. Hero: outcome-led copy plus a live investigation preview.
3. Category tension: reporting tools show charts; RankCues reconstructs events.
4. Three-layer evidence system: performance, changes, external context.
5. Weekly brief preview with detected/correlated/hypothesis labels.
6. Agency workflow: connect, observe, investigate, review, send.
7. Trust section: read-only access, source-level citations, human approval.
8. Pricing teaser and final CTA.

## Core dashboard composition

- Left navigation: Portfolio, Investigations, Changes, Reports, Integrations.
- Top bar: workspace/site switcher, reporting period, sync state, add site.
- Header: “Good morning. Three client sites need a decision.”
- First row: monitored sites, material movements, open investigations, reports.
- Main column: ranked investigation queue with impact and confidence.
- Side column: seven-day change ledger connected by the evidence rail.
- Footer panel: next weekly report status and approval checklist.

## AI provider contract

Inference must remain provider-agnostic and server-side. Required environment
variables:

```text
AI_PROVIDER_NAME=openai-compatible
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=...
AI_MODEL=...
AI_SUPPORTS_STRUCTURED_OUTPUTS=false
AI_CUSTOM_HEADERS_JSON={}
```

The base URL may point to OpenAI directly or a compatible relay. Keys must never
be exposed to browser code. The UI only shows masked status, provider label,
base host and model. Production settings should be stored encrypted when a
database and workspace auth are introduced.

## MVP acceptance criteria

- Homepage and core dashboard are responsive and visually consistent.
- A missing AI provider produces an explicit setup state, not a runtime crash.
- A configured OpenAI-compatible provider can pass a server-side test request.
- SEO report generation returns typed, evidence-labelled findings.
- No generated recommendation is presented as proven causation.
- Build, lint and primary navigation pass browser verification.
