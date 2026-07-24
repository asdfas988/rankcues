import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "About RankCues and Evidence-First SEO Reporting",
  description: "Learn why RankCues combines verified search data, website change history and uncertainty labels to produce evidence-first SEO investigations and weekly reports.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PublicInfoPage eyebrow="About RankCues" title="SEO reporting should explain the event, not decorate the chart." intro="RankCues is a private-beta product for operators and agencies who need a defensible answer when organic performance changes.">
      <h2>What we are building</h2>
      <p>RankCues joins verified Google Search Console and Google Analytics data with stored page snapshots, backlink baselines and explicit change evidence. Its AI layer summarizes that evidence, labels uncertainty and proposes a measurement window; it is not treated as an independent source of truth.</p>
      <h2>Who it is for</h2>
      <p>The current product is designed for site operators and SEO teams managing multiple properties. It prioritizes investigation, reviewable tasks and weekly decision support over generic dashboards.</p>
      <h2>Current product status</h2>
      <p>RankCues is in private beta. Google data connections, GSC rankings, GA4 context, change detection, task workflows and managed AI reports are active. Self-serve billing, white-label delivery, exact third-party SERP tracking and managed backlink data are not represented as active unless the workspace has them enabled.</p>
      <h2>How we earn trust</h2>
      <p>We use read-only Google scopes, encrypt stored provider tokens, keep infrastructure credentials server-side, distinguish detected facts from correlations and hypotheses, and require a human decision before work is treated as approved.</p>
    </PublicInfoPage>
  );
}
