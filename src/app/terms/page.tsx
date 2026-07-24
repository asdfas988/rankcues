import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "RankCues Private-Beta Terms of Use",
  description: "Review the RankCues private-beta terms covering invitation-only access, connected website data, acceptable use, human review and current service limitations.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PublicInfoPage eyebrow="Private beta terms" title="Use RankCues as decision support, not as an automatic verdict." intro="Effective July 22, 2026. These beta terms describe a test service and are not a substitute for final counsel-reviewed commercial terms.">
      <h2>Beta access</h2>
      <p>Access is invitation-only, revocable and provided for evaluation. Features may change, pause or be removed while the product is being tested. Do not share access or attempt to access another workspace.</p>
      <h2>Your responsibilities</h2>
      <p>You must have authority to connect each Google property and website. You remain responsible for reviewing recommendations, complying with Google and third-party terms, and approving any change made to a website or client account.</p>
      <h2>AI and SEO results</h2>
      <p>AI output can be incomplete or wrong. Search performance is affected by many external factors, and RankCues does not guarantee rankings, traffic, revenue or a particular outcome. Evidence labels and verification windows are decision aids, not professional assurances.</p>
      <h2>Acceptable use</h2>
      <p>Do not abuse the service, bypass security, crawl properties you do not control, overload connected APIs, upload unlawful data or use RankCues to send unsolicited messages.</p>
      <h2>Availability and liability</h2>
      <p>The beta is provided as available and may experience interruptions. To the extent allowed by law, the operator is not responsible for indirect loss, lost rankings, lost revenue or decisions made without independent review.</p>
      <h2>Ending access</h2>
      <p>You may stop using the beta and revoke Google access at any time. The operator may suspend access to protect the service or connected data. Data deletion requests are handled through the verified onboarding channel.</p>
    </PublicInfoPage>
  );
}
