import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Bot, CheckCircle2, FileSearch, History, ListTodo, ShieldCheck } from "lucide-react";
import { MarketingHeader, VisualFrame } from "@/components/rankcues-ui";
import { visualAssets } from "@/lib/rankcues-data";

export const metadata: Metadata = {
  title: "Automated SEO Reports with GSC Change Context",
  description: "Generate evidence-backed weekly SEO reports from GSC, GA4 and recorded website changes, with uncertainty labels and reviewable next actions.",
  alternates: { canonical: "/features/automated-seo-reports" },
};

const evidenceLayers = [
  [BarChart3, "Search performance", "Clicks, impressions, CTR and average position are compared across stored GSC windows."],
  [History, "Website changes", "Titles, descriptions, canonicals, headings, content hashes and link counts are recorded as page evidence."],
  [FileSearch, "Traffic context", "Mapped GA4 landing-page sessions, engagement and key events add post-click context without pretending to prove causation."],
  [Bot, "Managed AI analysis", "The platform analyzes the stored evidence and returns a small set of findings with confidence and a verification window."],
] as const;

const workflow = [
  ["Collect", "Read-only GSC and GA4 data plus verified-site snapshots are stored before analysis."],
  ["Compare", "Current and previous periods are calculated from the same durable dataset."],
  ["Label", "Each statement is marked detected, correlated or hypothesis."],
  ["Decide", "Recommendations become reviewable tasks, not automatic website changes."],
  ["Verify", "Completed tasks receive a follow-up measurement window and recorded outcome."],
] as const;

export default function AutomatedSeoReportsPage() {
  return (
    <main className="min-h-screen bg-[#f3f0e8] text-[#0a0d0c]">
      <MarketingHeader />
      <section className="relative overflow-hidden border-y border-[#0a0d0c]/10 px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="paper-grid absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid max-w-[1360px] items-center gap-14 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="section-kicker">Automated SEO reports</p>
            <h1 className="mt-5 font-display text-[clamp(3.8rem,6.8vw,7rem)] font-medium leading-[0.87] tracking-[-0.06em]">A weekly SEO report that remembers what changed.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#66706a]">RankCues combines GSC movement, GA4 landing-page context and stored website changes. The result explains what the evidence supports, what is only correlated and what still needs validation.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0a0d0c] px-5 text-sm font-semibold text-white">Open private beta <ArrowRight size={16} /></Link>
              <Link href="/about" className="inline-flex h-12 items-center rounded-full border border-[#0a0d0c]/15 bg-white/60 px-5 text-sm font-semibold">Read the methodology</Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-[#66706a]"><ShieldCheck size={15} className="text-[#247c6c]" /> Read-only Google scopes · managed AI · human review</p>
          </div>
          <VisualFrame src={visualAssets.reports} alt="RankCues weekly SEO investigation report interface" priority />
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div><p className="section-kicker">What the report uses</p><h2 className="section-title">Context before commentary.</h2></div>
            <p className="max-w-2xl text-base leading-8 text-[#66706a] lg:justify-self-end">Most ranking pages for automated SEO reporting emphasize GSC and GA4 aggregation, AI summaries, scheduled reports and exports. RankCues focuses first on the missing decision layer: a durable change record and explicit evidence state.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {evidenceLayers.map(([Icon, title, body]) => (
              <article key={title} className="premium-card p-6">
                <Icon size={20} className="text-[#8a6a39]" />
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.025em]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#66706a]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#101714] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28">
        <div className="luxury-grid absolute inset-0" />
        <div className="relative mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div><p className="section-kicker text-[#d8bb89]">Method</p><h2 className="section-title text-white">From source data to a measured task.</h2><p className="mt-6 text-sm leading-7 text-white/48">The system never publishes changes to your site and does not claim a correlation is proven causation.</p></div>
          <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035]">
            {workflow.map(([title, body], index) => (
              <div key={title} className="grid gap-3 border-b border-white/8 px-5 py-5 last:border-b-0 sm:grid-cols-[48px_100px_1fr] sm:items-center">
                <span className="font-mono text-[11px] text-[#d8bb89]">0{index + 1}</span><strong className="text-sm">{title}</strong><span className="text-xs leading-6 text-white/48">{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1080px] rounded-[24px] border border-[#0a0d0c]/10 bg-[#fcfaf5] p-6 sm:p-9">
          <div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#101714] text-[#d8bb89]"><ListTodo size={20} /></span><div><p className="section-kicker">Current beta boundary</p><h2 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em]">Generated in the product, reviewed by a person.</h2></div></div>
          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {["Weekly report generation and task creation are active.", "Reports remain tied to their source period and evidence.", "Email/PDF delivery and white-label portals are not active yet.", "Exact geo SERP and managed backlink data require future platform add-ons."].map((item) => <p key={item} className="flex gap-3 border-t border-[#0a0d0c]/8 pt-3 text-sm leading-6 text-[#66706a]"><CheckCircle2 size={16} className="mt-1 shrink-0 text-[#247c6c]" /> {item}</p>)}
          </div>
        </div>
      </section>
    </main>
  );
}
