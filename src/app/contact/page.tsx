import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "Contact RankCues Private-Beta Support",
  description: "Contact RankCues private-beta support about approved access, connected Search Console properties, privacy requests, data deletion or responsible security disclosure.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PublicInfoPage eyebrow="Contact" title="Private-beta support stays tied to a verified identity." intro="RankCues is not accepting open self-serve accounts yet.">
      <h2>Product support</h2>
      <p>Use the same onboarding conversation through which your approved Google account received access. This lets the beta operator verify the workspace before discussing connected properties or stored reports.</p>
      <h2>Privacy and deletion requests</h2>
      <p>Send the request through your onboarding channel from the Google email used to sign in. Include the workspace name and whether you want Google disconnected, stored data exported or stored data deleted.</p>
      <h2>Access requests</h2>
      <p>The beta currently uses an allowlist. New accounts are reviewed manually; there is no payment form and no public account-creation flow.</p>
    </PublicInfoPage>
  );
}
