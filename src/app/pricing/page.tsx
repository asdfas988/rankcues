import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/rankcues-ui";

export const metadata: Metadata = {
  title: "Private Beta Access and Pricing",
  description: "RankCues is currently an invitation-only private beta. Review active GSC, GA4, change detection and managed AI capabilities, plus features planned for commercial launch.",
  alternates: { canonical: "/pricing" },
};

const activeCapabilities = [
  "Google Search Console query and page performance",
  "GA4 landing-page context and property mapping",
  "Tracked GSC keyword positions by device",
  "Page-change snapshots and evidence ledger",
  "Managed AI weekly investigation reports",
  "Reviewable SEO tasks with follow-up measurement",
];

const notYetSold = [
  "Exact third-party geo SERP tracking",
  "Managed backlink-provider data",
  "White-label PDF or email delivery",
  "Multiple organizations, roles and invitations",
  "Self-serve billing and plan enforcement",
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f3f0e8] text-[#0a0d0c]">
      <MarketingHeader />
      <section className="relative overflow-hidden border-y border-[#0a0d0c]/10 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="paper-grid absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
          <div>
            <p className="section-kicker">Pricing status</p>
            <h1 className="mt-5 font-display text-[clamp(3.8rem,7vw,7rem)] font-medium leading-[0.88] tracking-[-0.06em]">Private beta. No checkout theatre.</h1>
          </div>
          <div className="lg:pb-3">
            <p className="max-w-2xl text-lg leading-8 text-[#66706a]">RankCues is not accepting self-serve payment yet. Approved testers can use the current workspace while we validate reliability, tenant isolation and the reporting workflow.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0a0d0c] px-5 text-sm font-semibold text-white">Private-beta sign in <ArrowRight size={16} /></Link>
              <Link href="/contact" className="inline-flex h-12 items-center rounded-full border border-[#0a0d0c]/15 bg-white/50 px-5 text-sm font-semibold">Request access information</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-[1280px] gap-5 lg:grid-cols-2">
          <article className="premium-card p-6 sm:p-8">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#101714] text-[#d8bb89]"><Check size={19} /></span>
            <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8a6a39]">Active in the beta</p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em]">Connected evidence and managed analysis</h2>
            <ul className="mt-7 grid gap-3">
              {activeCapabilities.map((item) => <li key={item} className="flex gap-3 border-t border-[#0a0d0c]/8 pt-3 text-sm leading-6"><Check size={16} className="mt-1 shrink-0 text-[#247c6c]" /> {item}</li>)}
            </ul>
          </article>
          <article className="rounded-[20px] border border-white/9 bg-[#101714] p-6 text-white shadow-[0_24px_80px_rgba(10,13,12,0.16)] sm:p-8">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-[#d8bb89]"><FlaskConical size={19} /></span>
            <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.14em] text-[#d8bb89]">Commercial boundary</p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em]">Not presented as available</h2>
            <ul className="mt-7 grid gap-3">
              {notYetSold.map((item) => <li key={item} className="flex gap-3 border-t border-white/9 pt-3 text-sm leading-6 text-white/62"><ShieldCheck size={16} className="mt-1 shrink-0 text-[#8ed8ca]" /> {item}</li>)}
            </ul>
          </article>
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-[#66706a]">Commercial plans and usage limits will be published only after billing, data costs and workspace isolation are enforced in the product.</p>
      </section>
    </main>
  );
}
