import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "RankCues Privacy Notice for Connected Search Data",
  description: "Read how RankCues processes Google identity, Search Console, Analytics, page snapshots, generated reports and website monitoring data during the private beta.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage eyebrow="Privacy notice" title="Your data is used to investigate your sites." intro="Effective July 22, 2026. This notice describes the current RankCues private-beta product and should be reviewed before a public commercial launch.">
      <h2>Data we process</h2>
      <p>When you connect Google, RankCues receives your Google account identifier and email address, the Search Console properties and GA4 properties visible to that account, and the read-only metrics needed for the product. We also store page snapshots, task history, change evidence, backlink data when enabled, generated reports and service logs.</p>
      <h2>Why we process it</h2>
      <p>We use this data to authenticate access, import verified properties, calculate search and traffic trends, detect website changes, generate evidence-backed analysis, maintain tasks and operate the service securely. We do not ask customers to provide AI-provider API keys.</p>
      <h2>Google API data</h2>
      <p>Google access is read-only. Stored OAuth tokens are encrypted and used only to operate the connected RankCues workspace. RankCues does not sell Google user data or use it for advertising.</p>
      <h2>Service providers and AI processing</h2>
      <p>RankCues uses platform-operated hosting, database and AI-processing infrastructure. Only the evidence needed to create the requested analysis is sent to the managed AI service. Provider names, routing credentials and keys remain internal platform configuration.</p>
      <h2>Retention and deletion</h2>
      <p>Private-beta data is retained while the workspace remains active so comparisons and reports remain auditable. You may revoke Google access in your Google Account at any time. Deletion or export requests are handled through the same verified onboarding channel used to grant beta access.</p>
      <h2>Security and your choices</h2>
      <p>RankCues uses signed HTTP-only sessions, encrypted stored tokens, restricted database roles and server-side credentials. No system can guarantee absolute security. Disconnect Google to stop future collection, and contact the beta operator if you need stored workspace data removed.</p>
    </PublicInfoPage>
  );
}
