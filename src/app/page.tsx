import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  FileText,
  Gauge,
  History,
  Link2,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandMark, MarketingHeader } from "@/components/rankcues-ui";

export const metadata: Metadata = {
  title: "SEO Reporting Software for Agencies | RankCues",
  description:
    "RankCues connects GSC, GA4 and website changes to produce evidence-backed SEO investigations and reviewable weekly client reports.",
};

const evidenceLayers = [
  {
    icon: BarChart3,
    number: "01",
    title: "Performance signals",
    body: "Find material movement across pages, queries, countries, devices and conversions without combing through every property.",
    detail: "GSC · GA4 · scheduled baselines",
  },
  {
    icon: History,
    number: "02",
    title: "Change context",
    body: "Keep a durable record of titles, content, links, canonicals, deployments and human annotations beside the affected URLs.",
    detail: "Crawler · CMS · deployment events",
  },
  {
    icon: SearchCheck,
    number: "03",
    title: "Evidence-backed action",
    body: "Separate observed facts from correlations and hypotheses, then turn the investigation into a reviewable client brief.",
    detail: "Confidence · sources · next checks",
  },
];

const workflow = [
  ["Connect", "Add GSC, GA4 and one verified site with read-only access."],
  ["Observe", "RankCues records the baseline and watches meaningful page changes."],
  ["Investigate", "Signals are joined to events, affected entities and external context."],
  ["Review", "Your team approves the evidence and edits the client-facing narrative."],
  ["Measure", "Completed work receives an explicit follow-up window and recorded outcome."],
];

const reportFindings = [
  {
    label: "Detected",
    color: "#59b8a7",
    title: "12 titles and 4 hero sections changed",
    meta: "Crawler snapshot · Tuesday 14:12 UTC",
  },
  {
    label: "Correlated",
    color: "#c9a66b",
    title: "The affected URLs account for 81% of this week’s click loss",
    meta: "GSC page/query join · 82% confidence",
  },
  {
    label: "Hypothesis",
    color: "#6e8deb",
    title: "New copy may have shifted away from local-service intent",
    meta: "Validate against a fresh mobile SERP capture",
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#0a0d0c] text-white">
      <section className="grain relative min-h-[840px] overflow-hidden border-b border-white/8">
        <div className="luxury-grid absolute inset-0" />
        <div className="absolute left-[54%] top-[-18%] size-[680px] rounded-full bg-[#31574b]/25 blur-[140px]" />
        <div className="absolute right-[-12%] top-[18%] size-[520px] rounded-full bg-[#8a6a39]/12 blur-[160px]" />
        <MarketingHeader />

        <div className="relative mx-auto grid max-w-[1440px] items-center gap-14 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:px-12 lg:pb-28 lg:pt-20">
          <div className="relative z-10">
            <div className="reveal inline-flex items-center gap-2 rounded-full border border-[#d8bb89]/25 bg-[#d8bb89]/8 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#e1c89e] shadow-[0_0_28px_rgba(216,187,137,0.1)]">
              <Sparkles size={13} className="animate-pulse-soft" /> SEO reporting software for agencies
            </div>
            <h1 className="reveal reveal-delay-1 mt-6 max-w-[760px] font-display text-[clamp(4.1rem,7.2vw,7.6rem)] font-normal leading-[0.85] tracking-[-0.065em]">
              Know <em className="font-light text-[#d8bb89]">why</em> organic performance changed.
            </h1>
            <p className="reveal reveal-delay-2 mt-7 max-w-xl text-base leading-7 text-white/58 sm:text-lg sm:leading-8">
              RankCues connects Search Console, Analytics and website changes so
              your team can explain what moved, show the evidence, and decide
              what happens next—before the client asks.
            </p>
            <div className="reveal reveal-delay-3 mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#d8bb89] px-5 text-sm font-semibold text-[#0a0d0c] shadow-[0_2px_12px_rgba(216,187,137,0.35),0_8px_32px_rgba(216,187,137,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e7cea2] hover:shadow-[0_4px_20px_rgba(216,187,137,0.45),0_12px_44px_rgba(216,187,137,0.25)] active:translate-y-0"
              >
                Open private beta <ArrowRight size={16} />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/13 bg-white/4 px-5 text-sm font-medium text-white/76 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/8 hover:text-white active:translate-y-0"
              >
                See the workflow
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[11px] text-white/42">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#59b8a7]" /> Read-only Google access
              </span>
              <span className="inline-flex items-center gap-2">
                <Check size={14} className="text-[#59b8a7]" /> Human review before delivery
              </span>
            </div>
          </div>

          <div className="reveal reveal-delay-2 relative lg:pl-6">
            <div className="absolute -inset-10 rounded-full bg-[#d8bb89]/8 blur-[90px]" />
            <div className="relative overflow-hidden rounded-[26px] border border-white/12 bg-[#101714]/92 shadow-[0_44px_150px_rgba(0,0,0,0.48)] backdrop-blur">
              <span className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[#d8bb89]/60 to-transparent" />
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold">Northstar Dental</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/38">
                    Illustrative workflow · INV-042
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#e87962]/22 bg-[#e87962]/8 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#f2a18f]">
                  <span className="size-1.5 animate-pulse-soft rounded-full bg-[#e87962]" /> High impact
                </span>
              </div>

              <div className="grid gap-0 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="border-b border-white/8 p-5 xl:border-b-0 xl:border-r">
                  <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-white/38">
                    Organic clicks · 7 days
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="font-display text-5xl font-light tracking-[-0.05em]">8,421</p>
                      <p className="mt-1 text-xs text-[#f0937f]">−18.4% vs previous period</p>
                    </div>
                    <BarChart3 size={30} className="text-[#d8bb89]" />
                  </div>
                  <svg viewBox="0 0 360 116" className="mt-7 h-28 w-full" aria-label="Organic clicks trend">
                    <path d="M4 30 C42 26, 54 42, 88 38 S138 22, 168 31 S219 46, 244 43 S298 81, 356 92" fill="none" stroke="#e87962" strokeWidth="2" />
                    <path d="M4 30 C42 26, 54 42, 88 38 S138 22, 168 31 S219 46, 244 43 S298 81, 356 92 L356 116 L4 116 Z" fill="url(#trendFill)" />
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#e87962" stopOpacity=".22" />
                        <stop offset="1" stopColor="#e87962" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/7 pt-3">
                    {[["Impressions", "−9.7%"], ["Position", "−2.4"], ["Leads", "−11"]].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[9px] text-white/34">{label}</p>
                        <p className="mt-1 font-mono text-xs text-white/76">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-white/38">
                      Evidence rail
                    </p>
                    <span className="font-mono text-[9px] text-[#d8bb89]">82% confidence</span>
                  </div>
                  <div className="mt-5 grid gap-5">
                    {reportFindings.map((finding) => (
                      <div key={finding.label} className="evidence-rail grid grid-cols-[18px_1fr] gap-3">
                        <span
                          className="relative z-10 mt-1 size-[9px] rounded-full border-2 border-[#101714]"
                          style={{ backgroundColor: finding.color, boxShadow: `0 0 0 1px ${finding.color}` }}
                        />
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: finding.color }}>
                            {finding.label}
                          </p>
                          <p className="mt-1 text-[13px] font-medium leading-5 text-white/84">{finding.title}</p>
                          <p className="mt-1 text-[10px] leading-4 text-white/36">{finding.meta}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-2xl border border-[#d8bb89]/18 bg-[#d8bb89]/7 p-3.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#d8bb89]">Next decision</p>
                    <p className="mt-2 text-xs leading-5 text-white/72">
                      Compare the previous title against current local intent before restoring or testing new copy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-white/10 bg-[#18221e] px-4 py-3 shadow-xl md:block">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-white/36">Weekly brief</p>
              <p className="mt-1 text-xs font-semibold text-white/80">Ready for strategist review</p>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="bg-[#f3f0e8] px-5 py-24 text-[#0a0d0c] sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1340px]">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="section-kicker">From reporting to reasoning</p>
              <h2 className="section-title">Charts are easy. Context is the work.</h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-[#65706a] lg:justify-self-end">
              Most reporting software assembles metrics. RankCues reconstructs
              the event: which segment moved, what changed around it, what the
              evidence supports, and what still needs checking.
            </p>
          </div>

          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {evidenceLayers.map((layer) => {
              const Icon = layer.icon;
              return (
                <article key={layer.number} className="premium-card group relative overflow-hidden p-6 transition-transform duration-500 hover:-translate-y-1.5 sm:p-7">
                  <div className="absolute right-5 top-4 font-display text-6xl font-light text-[#0a0d0c]/[0.045] transition-colors duration-500 group-hover:text-[#0a0d0c]/[0.08]">{layer.number}</div>
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[#101714] text-[#d8bb89] shadow-[0_4px_14px_rgba(16,23,20,0.25)] transition-transform duration-500 group-hover:scale-105">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-8 font-display text-3xl font-medium tracking-[-0.04em]">{layer.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#66706a]">{layer.body}</p>
                  <p className="mt-8 border-t border-[#0a0d0c]/8 pt-4 font-mono text-[9px] uppercase tracking-[0.11em] text-[#8b7654]">{layer.detail}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative border-y border-white/8 bg-[#101714] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="luxury-grid absolute inset-0" />
        <div className="relative mx-auto grid max-w-[1340px] gap-14 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="section-kicker text-[#d8bb89]">Weekly operating rhythm</p>
            <h2 className="section-title text-white">A brief your strategist can defend.</h2>
            <p className="mt-6 max-w-lg text-sm leading-7 text-white/48">
              Every narrative is traceable to source data. Your team keeps the
              final say before anything reaches a client.
            </p>
            <Link href="/features/automated-seo-reports" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#dfc79f]">
              Explore weekly reports <ArrowRight size={15} />
            </Link>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
            {workflow.map(([title, body], index) => (
              <div key={title} className="group grid gap-3 border-b border-white/8 px-5 py-5 transition-colors duration-300 last:border-b-0 hover:bg-white/[0.03] sm:grid-cols-[56px_120px_1fr] sm:items-center">
                <span className="font-mono text-[10px] text-[#d8bb89] transition-transform duration-300 group-hover:translate-x-0.5">0{index + 1}</span>
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-xs leading-6 text-white/44">{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f3f0e8] px-5 py-24 text-[#0a0d0c] sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-[1340px] gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-[24px] bg-[#0a0d0c] p-6 text-white shadow-[0_24px_80px_rgba(10,13,12,0.28)] sm:p-8">
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d8bb89]/50 to-transparent" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker text-[#d8bb89]">Friday client brief</p>
                <h3 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em]">Northstar Dental · Week 29</h3>
              </div>
              <FileText size={28} className="text-[#d8bb89]" />
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[["Material findings", "3"], ["Decisions required", "2"], ["Evidence sources", "8"]].map(([label, value]) => (
                <div key={label} className="dark-card p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-white/35">{label}</p>
                  <p className="mt-3 font-display text-4xl font-light">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[18px] border border-white/9 bg-white/[0.035] p-5">
              <p className="text-sm font-semibold">Executive summary</p>
              <p className="mt-3 text-sm leading-7 text-white/52">
                Organic acquisition weakened on local-service pages after a
                coordinated copy change. Indexing is healthy; the next decision
                is to validate intent before reverting or running a controlled test.
              </p>
            </div>
          </div>

          <div className="premium-card flex flex-col justify-between p-7 sm:p-9">
            <div>
              <p className="section-kicker">Trust by construction</p>
              <h3 className="mt-4 font-display text-5xl font-medium leading-[0.95] tracking-[-0.045em]">AI explains. Evidence decides.</h3>
              <p className="mt-5 text-sm leading-7 text-[#66706a]">
                Platform-managed inference keeps provider configuration internal while
                source citations, confidence labels and human approval keep the
                output accountable.
              </p>
            </div>
            <div className="mt-10 grid gap-3">
              {[
                [ShieldCheck, "Provider credentials stay platform-side"],
                [Link2, "Every finding links to its evidence"],
                [Gauge, "Detected, correlated and hypothesis states"],
                [Clock, "Human review before any delivery"],
              ].map(([Icon, text]) => (
                <div key={String(text)} className="flex items-center gap-3 border-t border-[#0a0d0c]/8 pt-3 text-sm font-medium">
                  <Icon size={17} className="text-[#8a6a39]" /> {String(text)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/8 bg-[#0a0d0c] px-5 py-24 text-center sm:px-8 lg:px-12">
        <div className="absolute left-1/2 top-1/2 size-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#31574b]/20 blur-[130px]" />
        <div className="relative mx-auto max-w-4xl">
          <p className="section-kicker text-[#d8bb89]">The next client question</p>
          <h2 className="mt-5 font-display text-[clamp(3.4rem,7vw,7.2rem)] font-light leading-[0.88] tracking-[-0.06em]">
            Answer it with evidence.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/48">
            Start with one Search Console property and see which changes are already hiding behind the chart.
          </p>
          <Link href="/login" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#d8bb89] px-6 text-sm font-semibold text-[#0a0d0c] shadow-[0_2px_16px_rgba(216,187,137,0.4),0_12px_48px_rgba(216,187,137,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e7cea2] hover:shadow-[0_4px_24px_rgba(216,187,137,0.5),0_16px_64px_rgba(216,187,137,0.3)] active:translate-y-0">
            Open private beta <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/8 bg-[#0a0d0c] px-5 py-7 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1340px] flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <BrandMark inverse />
          <p className="text-[11px] text-white/32">Evidence-backed SEO reporting for teams managing client trust.</p>
          <div className="flex flex-wrap gap-5 text-[11px] text-white/45">
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
